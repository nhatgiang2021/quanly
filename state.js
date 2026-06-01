
import {
  ASSET_ACTION_LABELS,
  ACCOUNT_TYPE_LABELS,
  BUCKET_PRESETS,
  INVESTMENT_BUCKET_IDS,
  TRANSACTION_TYPE_LABELS,
  calcMonthlyInterest,
  calcSavingsInterest,
  computeAssetPosition,
  computeAssetXirr,
  computeAssetComposition,
  computeEmergencyFund,
  computeGoalProgress,
  computeMonthlyBucket,
  computeNetWorth,
  computeNetWorthHistory,
  computeAllAccountBalances,
  computeRollingBase,
  daysBetween,
  detectDoubleCountingGoals,
  formatVND,
  getAccountBalance,
  getDaysUntil,
  getLastNMonths,
  getMonthBudgetBase,
  getPrevMonth,
  toMonthKey,
} from "./computations.js";
import { createSampleData } from "./sample-data.js";

const STORAGE_KEY = "wealth-html-app::v2";
const VERSION = "2.0-html";
const DEFAULT_AI_PROVIDER = "deepseek-v4";
const DEFAULT_AI_BASE_URL = "https://api.deepseek.com/v1";
const DEFAULT_AI_MODEL = "deepseek-v4-flash";
const LEGACY_AI_PROVIDER = "openrouter";
const LEGACY_AI_BASE_URL = "https://openrouter.ai/api/v1";
const LEGACY_AI_MODEL = "google/gemini-1.5-flash";
const listeners = new Set();

const state = {
  data: createEmptyData(),
  derived: {},
  runtime: {
    toasts: [],
    banners: [],
    firedAlerts: {},
    dismissedAlerts: {},
    welcomePending: false,
  },
};

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createId(prefix = "id") {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

function safeNumber(value) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : 0;
}

function roundInt(value) {
  return Math.round(safeNumber(value));
}

function normalizeCounterpartyName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

function getCounterpartyKey(value) {
  return normalizeCounterpartyName(value).toLowerCase();
}

function sortByDateDesc(left, right) {
  if (left.date === right.date) {
    return String(right.id).localeCompare(String(left.id));
  }
  return String(right.date).localeCompare(String(left.date));
}

function monthKey(year, monthIndex) {
  return `${year}-${String(monthIndex).padStart(2, "0")}`;
}

// Ghi một mục vào nhật ký kiểm toán (append-only). Dùng cho sửa/xóa dữ liệu tài chính
// để có dấu vết thay đổi. Giới hạn 1000 mục gần nhất ngay khi ghi để tránh phình bộ nhớ.
// entity: loại bản ghi (transaction/account/asset/...); action: create/update/delete;
// snapshot: dữ liệu tóm tắt trước thay đổi (để truy vết).
function recordAudit(action, entity, entityId, snapshot) {
  if (!Array.isArray(state.data.audit_log)) {
    state.data.audit_log = [];
  }
  state.data.audit_log.push({
    id: createId("audit"),
    at: new Date().toISOString(),
    action: String(action || ""),
    entity: String(entity || ""),
    entity_id: String(entityId || ""),
    snapshot: snapshot === undefined ? null : snapshot,
  });
  if (state.data.audit_log.length > 1000) {
    state.data.audit_log = state.data.audit_log.slice(-1000);
  }
}

function createDefaultSettings() {
  return {
    income_mode: "irregular",
    rolling_window: 6,
    min_allocation_trigger: 10_000_000,
    passive_income_default: 10_000_000,
    bucket_targets: {
      alloc_growth: 45,
      alloc_cf: 25,
      alloc_trade: 10,
      alloc_safe: 20,
    },
    rebalance_threshold: 8,
    category_allocation_map: {
      "Tiền nhà": "exp_fixed",
      "Điện nước": "exp_fixed",
      "Bảo hiểm": "exp_fixed",
      "Internet": "exp_fixed",
      "Trả góp": "exp_fixed",
      "Học phí": "exp_fixed",
      "Ăn uống": "exp_food",
      "Siêu thị": "exp_food",
      "Chợ": "exp_food",
      "Cafe": "exp_food",
      "Đi lại": "exp_food",
      "Xăng xe": "exp_food",
      "Sức khỏe": "exp_health",
      "Khám bệnh": "exp_health",
      "Thuốc": "exp_health",
      "Gym": "exp_health",
      "Sữa": "exp_health",
      "Tã": "exp_health",
      "Đồ dùng trẻ em": "exp_health",
      "Giải trí": "exp_enjoy",
      "Du lịch": "exp_enjoy",
      "Mua sắm": "exp_enjoy",
      "Quần áo": "exp_enjoy",
      "Nhà hàng": "exp_enjoy",
      "Spa": "exp_enjoy",
      "Từ thiện": "exp_give",
      "Biếu tặng": "exp_give",
      "Hỗ trợ gia đình": "exp_give",
      "Đóng góp": "exp_give",
      "Sinh hoạt gia đình": "exp_food",
      "Di chuyển": "exp_food",
      "Trả nợ vay": "exp_fixed",
      "Y tế": "exp_health",
    },
    income_categories: ["Freelance", "Cho thuê", "Đầu tư thụ động", "Cổ tức", "Lãi tiết kiệm"],
    expense_categories: [
      "Sinh hoạt gia đình",
      "Tiền nhà",
      "Điện nước",
      "Ăn uống",
      "Di chuyển",
      "Đi lại",
      "Xăng xe",
      "Siêu thị",
      "Chợ",
      "Cafe",
      "Mua sắm",
      "Du lịch",
      "Quần áo",
      "Nhà hàng",
      "Spa",
      "Học phí",
      "Bảo hiểm",
      "Trả góp",
      "Internet",
      "Trả nợ vay",
      "Y tế",
      "Khám bệnh",
      "Thuốc",
      "Gym",
      "Sữa",
      "Tã",
      "Đồ dùng trẻ em",
      "Giải trí",
      "Từ thiện",
      "Biếu tặng",
      "Hỗ trợ gia đình",
      "Đóng góp",
    ],
    ai_api_key: "",
    ai_provider: DEFAULT_AI_PROVIDER,
    ai_base_url: DEFAULT_AI_BASE_URL,
    ai_model: DEFAULT_AI_MODEL,
    ai_prompt_style: "balanced",
    created_at: todayIso(),
  };
}

function defaultAllocationRules() {
  return [
    {
      id: "alloc-default",
      is_active: true,
      created_at: todayIso(),
      buckets: deepClone(BUCKET_PRESETS),
    },
  ];
}

function createEmptyData() {
  return {
    cash_accounts: [],
    transactions: [],
    assets: [],
    asset_transactions: [],
    liabilities: [],
    debt_payments: [],
    receivables: [],
    receivable_payments: [],
    allocation_rules: defaultAllocationRules(),
    annual_budgets: [],
    goals: [],
    recurring_templates: [],
    reinvest_rules: [],
    net_worth_history: [],
    audit_log: [],
    user_settings: createDefaultSettings(),
  };
}

function hasMeaningfulData(data) {
  return (
    (data.transactions || []).length > 0 ||
    (data.assets || []).length > 0 ||
    (data.liabilities || []).length > 0 ||
    (data.receivables || []).length > 0 ||
    (data.goals || []).length > 0 ||
    (data.cash_accounts || []).length > 0
  );
}

function readCache() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function writeCache() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: VERSION,
        exportDate: new Date().toISOString(),
        tables: state.data,
      }),
    );
  } catch (error) {
    // no-op when localStorage is unavailable
  }
}

function notify() {
  listeners.forEach((listener) => listener());
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeRows(rows, prefix) {
  return ensureArray(rows).map((row) => {
    const safeRow = row && typeof row === "object" ? { ...row } : {};
    if (!safeRow.id) {
      safeRow.id = createId(prefix);
    }
    if (!safeRow.created_at) {
      safeRow.created_at = safeRow.date || safeRow.month || todayIso();
    }
    return safeRow;
  });
}

function getActiveAllocationRule(data = state.data) {
  return data.allocation_rules.find((rule) => rule.is_active) || data.allocation_rules[0];
}

// Chuẩn hóa naming loại tài sản về một dạng duy nhất.
// "realestate" (biến thể cũ) -> "real_estate" (dạng chuẩn). Cùng nhãn "Bất động sản",
// đây là chuẩn hóa tên, không thay đổi giá trị tài chính.
const ASSET_TYPE_ALIASES = {
  realestate: "real_estate",
};

function normalizeAssetType(assetType) {
  const key = String(assetType || "").trim();
  return ASSET_TYPE_ALIASES[key] || key;
}

function sanitizeTables(input) {
  const base = createEmptyData();
  const source = input || {};
  const sourceSettings = source.user_settings || {};
  const hasUserSettings = Boolean(source.user_settings && typeof source.user_settings === "object");
  const hasCategoryMap =
    hasUserSettings && Object.prototype.hasOwnProperty.call(source.user_settings, "category_allocation_map");
  const hasIncomeCategories =
    hasUserSettings && Object.prototype.hasOwnProperty.call(source.user_settings, "income_categories");
  const hasExpenseCategories =
    hasUserSettings && Object.prototype.hasOwnProperty.call(source.user_settings, "expense_categories");
  const annual_budgets = ensureArray(source.annual_budgets).map((budget) => ({
    ...budget,
    buckets: ensureArray(budget.buckets).map((bucket) => ({
      ...bucket,
      monthlyData: ensureArray(bucket.monthlyData),
    })),
  }));
  const shouldMigrateLegacyAiDefaults =
    (!sourceSettings.ai_provider || sourceSettings.ai_provider === LEGACY_AI_PROVIDER) &&
    (!sourceSettings.ai_base_url || sourceSettings.ai_base_url === LEGACY_AI_BASE_URL) &&
    (!sourceSettings.ai_model || sourceSettings.ai_model === LEGACY_AI_MODEL);

  return {
    cash_accounts: normalizeRows(source.cash_accounts, "acc"),
    transactions: normalizeRows(source.transactions, "txn"),
    assets: normalizeRows(source.assets, "asset").map((asset) => ({
      ...asset,
      asset_type: normalizeAssetType(asset.asset_type),
      // Giá không thể âm; kẹp về 0 khi import dữ liệu để tránh giá trị tài sản âm.
      current_price: Math.max(0, safeNumber(asset.current_price)),
    })),
    asset_transactions: normalizeRows(source.asset_transactions, "asset-txn"),
    liabilities: normalizeRows(source.liabilities, "liability"),
    debt_payments: normalizeRows(source.debt_payments, "debt-payment"),
    receivables: normalizeRows(source.receivables, "recv"),
    receivable_payments: normalizeRows(source.receivable_payments, "recv-payment"),
    allocation_rules: normalizeRows(source.allocation_rules, "alloc").length
      ? normalizeRows(source.allocation_rules, "alloc")
      : base.allocation_rules,
    annual_budgets,
    goals: normalizeRows(source.goals, "goal"),
    recurring_templates: normalizeRows(source.recurring_templates, "recurring"),
    reinvest_rules: normalizeRows(source.reinvest_rules, "reinvest"),
    net_worth_history: normalizeRows(source.net_worth_history, "nw"),
    // Nhật ký kiểm toán (append-only), giới hạn 1000 bản ghi gần nhất để tránh phình localStorage.
    audit_log: ensureArray(source.audit_log).slice(-1000),
    user_settings: {
      ...base.user_settings,
      ...sourceSettings,
      bucket_targets: {
        ...base.user_settings.bucket_targets,
        ...((source.user_settings || {}).bucket_targets || {}),
      },
      category_allocation_map: hasCategoryMap
        ? { ...((source.user_settings || {}).category_allocation_map || {}) }
        : { ...base.user_settings.category_allocation_map },
      income_categories: hasIncomeCategories
        ? ensureArray((source.user_settings || {}).income_categories)
        : base.user_settings.income_categories,
      expense_categories: hasExpenseCategories
        ? ensureArray((source.user_settings || {}).expense_categories)
        : base.user_settings.expense_categories,
      ai_api_key: sourceSettings.ai_api_key || "",
      ai_provider: shouldMigrateLegacyAiDefaults ? DEFAULT_AI_PROVIDER : sourceSettings.ai_provider || DEFAULT_AI_PROVIDER,
      ai_base_url: shouldMigrateLegacyAiDefaults ? DEFAULT_AI_BASE_URL : sourceSettings.ai_base_url || DEFAULT_AI_BASE_URL,
      ai_model: shouldMigrateLegacyAiDefaults ? DEFAULT_AI_MODEL : sourceSettings.ai_model || DEFAULT_AI_MODEL,
      ai_prompt_style: sourceSettings.ai_prompt_style || "balanced",
    },
  };
}

function validateImportTables(tables) {
  const requiredArrayTables = [
    "cash_accounts",
    "transactions",
    "assets",
    "asset_transactions",
    "liabilities",
    "debt_payments",
    "receivables",
    "receivable_payments",
    "allocation_rules",
    "annual_budgets",
    "goals",
    "recurring_templates",
    "reinvest_rules",
    "net_worth_history",
  ];

  if (!Array.isArray(tables.receivable_payments)) {
    tables.receivable_payments = [];
  }

  requiredArrayTables.forEach((tableName) => {
    if (!Array.isArray(tables[tableName])) {
      throw new Error(`Bảng ${tableName} phải là mảng.`);
    }
  });

  if (!tables.user_settings || typeof tables.user_settings !== "object" || Array.isArray(tables.user_settings)) {
    throw new Error("Bảng user_settings phải là object.");
  }

  const rowChecks = [
    { table: "cash_accounts", required: ["id", "created_at", "name", "type"] },
    { table: "transactions", required: ["id", "created_at", "date", "type", "amount"] },
    { table: "assets", required: ["id", "created_at", "name", "asset_type", "current_price"] },
    { table: "asset_transactions", required: ["id", "created_at", "date", "asset_id", "action"] },
    { table: "liabilities", required: ["id", "created_at", "name", "remaining_amount"] },
    { table: "debt_payments", required: ["id", "created_at", "date", "liability_id"] },
    { table: "receivables", required: ["id", "created_at", "name", "remaining_amount"] },
    { table: "receivable_payments", required: ["id", "created_at", "receivable_id", "date", "amount"] },
    { table: "allocation_rules", required: ["id", "is_active"] },
    { table: "annual_budgets", required: ["id", "year", "buckets"] },
    { table: "goals", required: ["id", "created_at", "name", "target_amount"] },
  ];

  rowChecks.forEach(({ table, required }) => {
    tables[table].forEach((row, index) => {
      required.forEach((field) => {
        if (!(field in row)) {
          throw new Error(`Thiếu trường ${field} trong ${table}[${index}].`);
        }
      });
    });
  });
}

// Phát hiện liên kết khóa ngoại "mồ côi" (trỏ tới bản ghi không tồn tại) khi import.
// Trả về danh sách cảnh báo (không throw) để import vẫn tiến hành nhưng người dùng được báo,
// tránh việc dữ liệu tài chính bị chặn hoàn toàn chỉ vì vài liên kết hỏng.
export function findReferentialIssues(tables) {
  const issues = [];
  const accountIds = new Set((tables.cash_accounts || []).map((row) => row.id));
  const assetIds = new Set((tables.assets || []).map((row) => row.id));
  const liabilityIds = new Set((tables.liabilities || []).map((row) => row.id));
  const receivableIds = new Set((tables.receivables || []).map((row) => row.id));

  const checkRef = (table, rows, field, validSet, label) => {
    (rows || []).forEach((row, index) => {
      const value = row[field];
      if (value && !validSet.has(value)) {
        issues.push(`${table}[${index}] tham chiếu ${label} không tồn tại: ${value}`);
      }
    });
  };

  (tables.transactions || []).forEach((row, index) => {
    ["account_id", "from_account_id", "to_account_id"].forEach((field) => {
      if (row[field] && !accountIds.has(row[field])) {
        issues.push(`transactions[${index}].${field} trỏ tài khoản không tồn tại: ${row[field]}`);
      }
    });
    if (row.asset_id && !assetIds.has(row.asset_id)) {
      issues.push(`transactions[${index}].asset_id trỏ tài sản không tồn tại: ${row.asset_id}`);
    }
    if (row.liability_id && !liabilityIds.has(row.liability_id)) {
      issues.push(`transactions[${index}].liability_id trỏ khoản nợ không tồn tại: ${row.liability_id}`);
    }
    if (row.receivable_id && !receivableIds.has(row.receivable_id)) {
      issues.push(`transactions[${index}].receivable_id trỏ khoản cho vay không tồn tại: ${row.receivable_id}`);
    }
  });

  checkRef("asset_transactions", tables.asset_transactions, "asset_id", assetIds, "tài sản");
  checkRef("asset_transactions", tables.asset_transactions, "account_id", accountIds, "tài khoản");
  checkRef("debt_payments", tables.debt_payments, "liability_id", liabilityIds, "khoản nợ");
  checkRef("debt_payments", tables.debt_payments, "from_account_id", accountIds, "tài khoản");
  checkRef("receivable_payments", tables.receivable_payments, "receivable_id", receivableIds, "khoản cho vay");
  checkRef("receivable_payments", tables.receivable_payments, "to_account_id", accountIds, "tài khoản");

  return issues;
}

function ensureAnnualBudget(year) {
  let annual = state.data.annual_budgets.find((item) => Number(item.year) === Number(year));
  if (!annual) {
    annual = {
      id: `budget-${year}`,
      year,
      target_annual_income: 0,
      actual_annual_income: 0,
      is_setup: true,
      setup_date: `${year}-01-02`,
      created_at: `${year}-01-02`,
      buckets: [],
    };
    state.data.annual_budgets.push(annual);
  }
  return annual;
}

function sumExpenseForBucket(month, allocationId, categoryMap) {
  return roundInt(
    state.data.transactions.reduce((sum, transaction) => {
      if (toMonthKey(transaction.date) !== month) {
        return sum;
      }
      if (transaction.type === "expense" && !transaction.receivable_id) {
        return categoryMap[transaction.category] === allocationId ? sum + safeNumber(transaction.amount) : sum;
      }
      return sum;
    }, 0),
  );
}

function sumInvestmentForBucket(month, allocationId, assetBucketMap) {
  let hasTransferTagged = false;
  const investedFromTransfer = roundInt(
    state.data.transactions.reduce((sum, transaction) => {
      if (toMonthKey(transaction.date) !== month) {
        return sum;
      }
      if (transaction.type === "transfer" && transaction.affect_bucket && transaction.bucket_id === allocationId) {
        hasTransferTagged = true;
        const direction = String(transaction.bucket_impact || "allocate");
        const signed = direction === "withdraw" ? -safeNumber(transaction.amount) : safeNumber(transaction.amount);
        return sum + signed;
      }
      return sum;
    }, 0),
  );

  const investedFromAssetPurchase = roundInt(
    state.data.transactions.reduce((sum, transaction) => {
      if (toMonthKey(transaction.date) !== month || transaction.type !== "asset_purchase") {
        return sum;
      }
      return assetBucketMap[transaction.asset_id] === allocationId ? sum + safeNumber(transaction.amount) : sum;
    }, 0),
  );

  return hasTransferTagged ? investedFromTransfer : investedFromAssetPurchase;
}

function syncAnnualBudgetSnapshots() {
  const years = new Set([
    new Date().getFullYear(),
    new Date().getFullYear() - 1,
    ...state.data.transactions.map((transaction) => Number(String(transaction.date).slice(0, 4))),
  ]);
  const settings = state.data.user_settings;
  const activeRule = getActiveAllocationRule();
  const categoryMap = settings.category_allocation_map || {};
  const assetBucketMap = Object.fromEntries(
    state.data.assets.map((asset) => [asset.id, asset.bucket || asset.linked_bucket || ""]),
  );

  years.forEach((year) => {
    const annual = ensureAnnualBudget(year);
    if (
      annual.target_annual_income === undefined ||
      annual.target_annual_income === null ||
      annual.target_annual_income === ""
    ) {
      annual.target_annual_income = roundInt(
        (computeRollingBase(state.data.transactions, settings.rolling_window || 6).avgNonZero || 0) * 12,
      );
    } else {
      annual.target_annual_income = roundInt(annual.target_annual_income);
    }
    annual.actual_annual_income = roundInt(
      state.data.transactions.reduce((sum, transaction) => {
        if (transaction.type !== "income" || transaction.receivable_id) {
          return sum;
        }
        return String(transaction.date).startsWith(String(year)) ? sum + safeNumber(transaction.amount) : sum;
      }, 0),
    );

    const bucketRows = new Map();
    activeRule.buckets.forEach((bucket) => {
      let bucketRow = annual.buckets.find((item) => item.allocationId === bucket.id);
      if (!bucketRow) {
        bucketRow = {
          allocationId: bucket.id,
          monthlyData: [],
        };
        annual.buckets.push(bucketRow);
      }
      bucketRows.set(bucket.id, bucketRow);
    });

    // Initialize carry from previous year's December rollover (if exists)
    const sortedYears = Array.from(years).sort((a, b) => a - b);
    const yearIndex = sortedYears.indexOf(year);
    const prevYear = yearIndex > 0 ? sortedYears[yearIndex - 1] : null;
    let carryToNextMonth = Object.fromEntries(
      activeRule.buckets.map((bucket) => {
        if (prevYear) {
          // Try to get December rolloverOut from previous year
          const prevAnnual = state.data.annual_budgets.find((item) => Number(item.year) === prevYear);
          const prevBucketRow = prevAnnual?.buckets.find((item) => item.allocationId === bucket.id);
          const decemberMonth = prevBucketRow?.monthlyData.find((item) => item.month === monthKey(prevYear, 12));
          if (decemberMonth) {
            return [bucket.id, safeNumber(decemberMonth.rawRolloverOut)];
          }
        }
        // Fallback: use January rolloverIn if available
        const january = bucketRows.get(bucket.id)?.monthlyData.find((item) => item.month === monthKey(year, 1));
        return [bucket.id, safeNumber(january?.rolloverIn)];
      }),
    );

    for (let index = 1; index <= 12; index += 1) {
      const currentMonth = monthKey(year, index);
      const monthBase = getMonthBudgetBase(currentMonth, state.data.transactions, settings);
      const transfers = {};
      const nextCarry = {};

      activeRule.buckets.forEach((bucket) => {
        const bucketRow = bucketRows.get(bucket.id);
        const baseAmount = roundInt((monthBase.baseAmount * safeNumber(bucket.percentage)) / 100);
        const spentAmount = sumExpenseForBucket(currentMonth, bucket.id, categoryMap);
        const investedAmount = sumInvestmentForBucket(currentMonth, bucket.id, assetBucketMap);
        const usedAmount = bucket.type === "expense_budget" ? spentAmount : investedAmount;
        let monthRow = bucketRow.monthlyData.find((item) => item.month === currentMonth);
        if (!monthRow) {
          monthRow = {
            month: currentMonth,
            baseAmount: 0,
            rolloverIn: 0,
            effectiveBudget: 0,
            spentAmount: 0,
            investedAmount: 0,
            rolloverOut: 0,
          };
          bucketRow.monthlyData.push(monthRow);
        }

        const rolloverType = bucket.rolloverType || bucket.rollover_type || "accumulate";
        const targetBucketId = bucket.targetBucketId || bucket.target_bucket_id || "";
        const rolloverIn = index === 1 ? safeNumber(monthRow.rolloverIn) : safeNumber(carryToNextMonth[bucket.id]);
        const effectiveBudget = roundInt(baseAmount + rolloverIn);
        const rawRolloverOut = roundInt(effectiveBudget - usedAmount);
        const shouldTransfer = rolloverType === "transfer_to" && targetBucketId;
        const rolloverOut = rolloverType === "accumulate" ? rawRolloverOut : 0;

        if (shouldTransfer) {
          transfers[targetBucketId] = roundInt(safeNumber(transfers[targetBucketId]) + rawRolloverOut);
        }

        monthRow.baseAmount = baseAmount;
        monthRow.rolloverIn = roundInt(rolloverIn);
        monthRow.effectiveBudget = effectiveBudget;
        monthRow.spentAmount = spentAmount;
        monthRow.investedAmount = investedAmount;
        monthRow.rawRolloverOut = rawRolloverOut;
        monthRow.rolloverOut = roundInt(rolloverOut);
        monthRow.rolloverType = rolloverType;
        monthRow.targetBucketId = targetBucketId;

        nextCarry[bucket.id] = roundInt(rolloverType === "accumulate" ? rolloverOut : 0);
      });

      Object.entries(transfers).forEach(([targetBucketId, amount]) => {
        nextCarry[targetBucketId] = roundInt(safeNumber(nextCarry[targetBucketId]) + safeNumber(amount));
      });

      carryToNextMonth = nextCarry;
    }

    activeRule.buckets.forEach((bucket) => {
      const bucketRow = bucketRows.get(bucket.id);
      bucketRow.monthlyData.sort((left, right) => left.month.localeCompare(right.month));
    });
  });
}

function ensureCurrentMonthSnapshot() {
  const currentMonth = toMonthKey(new Date());
  const snapshot = computeNetWorth(
    state.data.cash_accounts,
    state.data.transactions,
    state.data.assets,
    state.data.asset_transactions,
    state.data.liabilities,
    state.data.receivables,
  );
  const existing = state.data.net_worth_history.find((entry) => entry.month === currentMonth);
  if (existing) {
    existing.snapshot_date = todayIso();
    existing.net_worth = snapshot.netWorth;
    return;
  }
  state.data.net_worth_history.push({
    id: createId("nw"),
    month: currentMonth,
    snapshot_date: todayIso(),
    net_worth: snapshot.netWorth,
    created_at: todayIso(),
  });
}

function queueToast({ level = "soft", title, message, duration = 3600, key }) {
  if (key && state.runtime.dismissedAlerts[key]) {
    return;
  }
  if (key && state.runtime.firedAlerts[key]) {
    return;
  }
  const id = createId("toast");
  state.runtime.toasts = [
    ...state.runtime.toasts,
    {
      id,
      key: key || "",
      level,
      title,
      message,
      duration,
      createdAt: Date.now(),
    },
  ].slice(-10);
  if (key) {
    state.runtime.firedAlerts[key] = true;
  }
}

function pushBanner(banners, { key, level = "info", title, message }) {
  if (!key) {
    return;
  }
  if (state.runtime.dismissedAlerts[key]) {
    return;
  }
  banners.push({
    key,
    level,
    title,
    message,
  });
}

function evaluateAlerts(derived) {
  const banners = [];

  derived.accounts
    .filter(
      (account) =>
        account.type === "credit_card" &&
        account.balance < 0 &&
        Number.isFinite(account.daysUntilDue) &&
        account.daysUntilDue <= 10,
    )
    .forEach((account) => {
      queueToast({
        key: `cc-due-${account.id}-${account.daysUntilDue}`,
        level: account.daysUntilDue <= 5 ? "critical" : "warning",
        duration: account.daysUntilDue <= 5 ? 4000 : 3200,
        title: "Nhắc hạn thẻ tín dụng",
        message: `${account.name} còn ${account.daysUntilDue} ngày đến hạn, dư nợ hiện tại ${formatVND(
          Math.abs(account.balance),
        )}.`,
      });
    });

  derived.assets
    .filter((asset) => asset.asset_type === "warrant" && asset.holdingQty > 0 && asset.daysToExpiry !== null)
    .forEach((asset) => {
      if (asset.daysToExpiry < 0) {
        queueToast({
          key: `warrant-expired-${asset.id}`,
          level: "critical",
          duration: 4000,
          title: "Chứng quyền đã hết hạn",
          message: `${asset.name} vẫn còn nắm giữ sau ngày đáo hạn.`,
        });
      } else if (asset.daysToExpiry <= 7) {
        queueToast({
          key: `warrant-near-${asset.id}`,
          level: "warning",
          title: "Chứng quyền sắp đáo hạn",
          message: `${asset.name} còn ${asset.daysToExpiry} ngày tới hạn.`,
        });
      }
    });

  const nearingSavings = derived.assets.filter(
    (asset) => asset.asset_type === "savings" && asset.holdingQty > 0 && asset.daysToMaturity !== null && asset.daysToMaturity <= 30,
  );
  if (nearingSavings.length > 0) {
    pushBanner(banners, {
      key: `saving-maturity-${derived.currentMonthKey}`,
      level: "warning",
      title: "Sổ tiết kiệm sắp đáo hạn",
      message: nearingSavings
        .map((asset) => `${asset.name} còn ${asset.daysToMaturity} ngày`)
        .slice(0, 3)
        .join(" • "),
    });
  }

  derived.accounts
    .filter((account) => account.tracking_mode === "manual" && account.stalenessDays > 35)
    .forEach((account) => {
      queueToast({
        key: `stale-account-${account.id}`,
        level: "warning",
        title: "Tài khoản thủ công quá hạn cập nhật",
        message: `${account.name} đã ${account.stalenessDays} ngày chưa cập nhật số dư.`,
      });
    });

  // Nhắc cập nhật giá tài sản thị trường để net worth/đường lịch sử không bị lệch.
  // Chỉ áp dụng cho tài sản biến động giá (cổ phiếu/ETF/crypto/vàng/CW), bỏ qua BĐS & tiết kiệm.
  const priceVolatileTypes = ["stock", "etf", "crypto", "gold", "warrant", "bond"];
  const stalePricedAssets = derived.assets.filter(
    (asset) =>
      priceVolatileTypes.includes(String(asset.asset_type || "").toLowerCase()) &&
      asset.holdingQty > 0 &&
      Number.isFinite(asset.lastUpdatedDays) &&
      asset.lastUpdatedDays > 45,
  );
  if (stalePricedAssets.length > 0) {
    pushBanner(banners, {
      key: `stale-price-${derived.currentMonthKey}`,
      level: "info",
      title: "Giá tài sản cần cập nhật",
      message: stalePricedAssets
        .map((asset) => `${asset.name} (${asset.lastUpdatedDays} ngày)`)
        .slice(0, 3)
        .join(" • "),
    });
  }

  derived.currentBudgetBuckets
    .filter((bucket) => bucket.type === "expense_budget" && bucket.utilization >= 85)
    .forEach((bucket) => {
      queueToast({
        key: `budget-${bucket.allocationId}-${derived.currentMonthKey}`,
        level: "soft",
        title: "Ngân sách sắp chạm trần",
        message: `${bucket.name} đã dùng ${Math.round(bucket.utilization)}% ngân sách tháng này.`,
      });
    });

  if (derived.rebalanceAlerts.length > 0) {
    pushBanner(banners, {
      key: `rebalance-${derived.currentMonthKey}`,
      level: "info",
      title: "Gợi ý tái cân bằng",
      message: derived.rebalanceAlerts
        .map((item) => `${item.name} lệch ${item.deviationLabel}`)
        .slice(0, 3)
        .join(" • "),
    });
  }

  if (derived.doubleCountingWarnings.length > 0) {
    queueToast({
      key: "goal-double-counting",
      level: "warning",
      title: "Cảnh báo đếm trùng mục tiêu",
      message: `Có ${derived.doubleCountingWarnings.length} nguồn đang được dùng toàn bộ cho nhiều mục tiêu.`,
      duration: 4200,
    });
  }

  state.runtime.banners = banners;
}

function buildMonthlyStats(transactions) {
  const months = getLastNMonths(14);
  return months.map((month) => {
    const income = roundInt(
      transactions.reduce((sum, transaction) => {
        return transaction.type === "income" && !transaction.receivable_id && toMonthKey(transaction.date) === month
          ? sum + safeNumber(transaction.amount)
          : sum;
      }, 0),
    );
    const expense = roundInt(
      transactions.reduce((sum, transaction) => {
        return transaction.type === "expense" && !transaction.receivable_id && toMonthKey(transaction.date) === month
          ? sum + safeNumber(transaction.amount)
          : sum;
      }, 0),
    );
    const balance = income - expense;
    return {
      month,
      income,
      expense,
      balance,
      savingsRate: income > 0 ? (balance / income) * 100 : 0,
    };
  });
}

function buildTransactionViews(data, maps) {
  const linkedMirrorIds = new Set(
    (data.asset_transactions || []).map((transaction) => transaction.mirror_transaction_id).filter(Boolean),
  );
  const activeRule = getActiveAllocationRule(data);
  const bucketMap = Object.fromEntries((activeRule?.buckets || []).map((bucket) => [bucket.id, bucket.name]));
  return data.transactions
    .slice()
    .sort(sortByDateDesc)
    .map((transaction) => {
      const amount = safeNumber(transaction.amount);
      const accountName =
        transaction.type === "transfer"
          ? `${maps.accountMap[transaction.from_account_id] || "?"} → ${
              maps.accountMap[transaction.to_account_id] || "?"
            }`
          : maps.accountMap[transaction.account_id || transaction.to_account_id || transaction.from_account_id] || "Chưa gán";
      let typeLabel = TRANSACTION_TYPE_LABELS[transaction.type] || transaction.type;
      let signedAmount = amount;
      let tone = "neutral";

      if (transaction.receivable_id) {
        // FIX: Cho vay/Thu hồi nợ không phải thu nhập/chi tiêu thực — hiển thị neutral
        typeLabel = transaction.type === "income" ? "Thu hồi nợ" : "Cho vay";
        signedAmount = transaction.type === "expense" ? -amount : amount;
        tone = "transfer";
      } else if (transaction.type === "expense" || transaction.type === "asset_purchase") {
        signedAmount = -amount;
        tone = "expense";
      } else if (
        ["income", "loan_disbursement", "asset_sale", "opening_balance", "balance_adjustment", "collection"].includes(transaction.type)
      ) {
        signedAmount = amount;
        tone = "income";
      } else if (transaction.type === "lending") {
        signedAmount = -amount;
        tone = "transfer";
      } else if (transaction.type === "transfer") {
        signedAmount = 0;
        tone = "transfer";
      } else {
        tone = "neutral";
      }

      return {
        ...transaction,
        typeLabel,
        amount,
        signedAmount,
        tone,
        accountName,
        displayCategory:
          transaction.type === "asset_purchase" || transaction.type === "asset_sale"
            ? maps.assetMap[transaction.asset_id] || transaction.category || typeLabel
            : transaction.type === "transfer" && transaction.affect_bucket
              ? `${transaction.bucket_impact === "withdraw" ? "Rút vốn" : "Nạp vốn"} ${
                  bucketMap[transaction.bucket_id] || transaction.bucket_id || "hũ đầu tư"
                }`
              : transaction.category || typeLabel,
        assetName: maps.assetMap[transaction.asset_id] || "",
        liabilityName: maps.liabilityMap[transaction.liability_id] || "",
        sourceLabel: transaction.income_source || "",
        isLinkedAssetMirror: linkedMirrorIds.has(transaction.id),
        searchText: `${transaction.category || ""} ${transaction.description || ""} ${accountName} ${
          transaction.notes || ""
        } ${transaction.typeLabel || ""} ${transaction.sourceLabel || ""} ${maps.assetMap[transaction.asset_id] || ""} ${
          maps.liabilityMap[transaction.liability_id] || ""
        }`.toLowerCase(),
      };
    });
}

function buildAssetViews(data) {
  return data.assets
    .map((asset) => {
      const position = computeAssetPosition(asset.id, data.asset_transactions, asset.current_price);
      const daysToMaturity = asset.maturity_date ? getDaysUntil(asset.maturity_date) : null;
      const daysToExpiry = asset.expiry_date ? getDaysUntil(asset.expiry_date) : null;
      const totalReturn = position.realizedPnL + position.unrealizedPnL + position.totalDividends;
      const lastUpdatedDays = asset.last_price_update ? daysBetween(asset.last_price_update, todayIso()) : null;
      const xirrResult = computeAssetXirr(asset.id, data.asset_transactions, asset.current_price, todayIso());

      return {
        ...asset,
        ...position,
        daysToMaturity,
        daysToExpiry,
        totalReturn: roundInt(totalReturn),
        returnPct: position.totalCost > 0 ? (totalReturn / position.totalCost) * 100 : 0,
        xirrPct: xirrResult && xirrResult.annualizedPct !== null ? xirrResult.annualizedPct : null,
        currentValue: roundInt(position.currentValue),
        lastUpdatedDays,
      };
    })
    .sort((left, right) => right.currentValue - left.currentValue);
}

function buildPortfolioBuckets(assetViews, settings, activeBuckets, accountViews = []) {
  const tradeBucketId =
    activeBuckets.find((bucket) => bucket.id === "alloc_trade")?.id ||
    activeBuckets.find((bucket) => bucket.type !== "expense_budget")?.id ||
    "";
  const tradingCash = roundInt(
    accountViews.reduce((sum, account) => {
      if (["investment", "derivative", "securities_cash"].includes(account.type)) {
        return sum + safeNumber(account.balance);
      }
      return sum;
    }, 0),
  );
  const baseRows = activeBuckets
    .filter((bucket) => INVESTMENT_BUCKET_IDS.includes(bucket.id))
    .map((bucket) => {
      const bucketAssets = assetViews.filter((asset) => asset.bucket === bucket.id);
      const assetValue = roundInt(bucketAssets.reduce((sum, asset) => sum + asset.currentValue, 0));
      const cashBuffer = bucket.id === tradeBucketId ? tradingCash : 0;
      const value = roundInt(assetValue + cashBuffer);
      const unrealizedPnL = roundInt(bucketAssets.reduce((sum, asset) => sum + asset.unrealizedPnL, 0));
      const realizedPnL = roundInt(bucketAssets.reduce((sum, asset) => sum + asset.realizedPnL, 0));
      return {
        ...bucket,
        value,
        assetValue,
        cashBuffer,
        unrealizedPnL,
        realizedPnL,
      };
    });
  const totalPortfolio = roundInt(baseRows.reduce((sum, row) => sum + row.value, 0));
  return activeBuckets
    .filter((bucket) => INVESTMENT_BUCKET_IDS.includes(bucket.id))
    .map((bucket) => {
      const row = baseRows.find((item) => item.id === bucket.id) || {
        value: 0,
        assetValue: 0,
        cashBuffer: 0,
        unrealizedPnL: 0,
        realizedPnL: 0,
      };
      const value = roundInt(row.value);
      const unrealizedPnL = roundInt(row.unrealizedPnL);
      const realizedPnL = roundInt(row.realizedPnL);
      const pct = totalPortfolio > 0 ? (value / totalPortfolio) * 100 : 0;
      const target = safeNumber((settings.bucket_targets || {})[bucket.id]);
      const deviation = pct - target;

      return {
        ...bucket,
        value,
        assetValue: roundInt(row.assetValue),
        cashBuffer: roundInt(row.cashBuffer),
        unrealizedPnL,
        realizedPnL,
        pct,
        target,
        deviation,
        deviationLabel: `${deviation >= 0 ? "+" : ""}${deviation.toFixed(1)}%`,
      };
    });
}

function buildBudgetYears(data) {
  const settings = data.user_settings;
  const activeRule = getActiveAllocationRule(data);
  const activeBuckets = activeRule.buckets || BUCKET_PRESETS;
  const budgetYears = {};

  data.annual_budgets.forEach((annual) => {
    const months = {};
    activeBuckets.forEach((bucket) => {
      const bucketRow = annual.buckets.find((item) => item.allocationId === bucket.id);
      ensureArray(bucketRow?.monthlyData).forEach((monthRow) => {
        if (!months[monthRow.month]) {
          months[monthRow.month] = {
            month: monthRow.month,
            budgetBase: getMonthBudgetBase(monthRow.month, data.transactions, settings),
            buckets: [],
            totalSpent: 0,
            totalBudget: 0,
          };
        }
        const computed = computeMonthlyBucket(
          bucket.id,
          monthRow.month,
          data.transactions,
          data.annual_budgets,
          data.allocation_rules,
          settings.category_allocation_map || {},
          data.assets,
        );
        months[monthRow.month].buckets.push(computed);
      });
    });

      Object.values(months).forEach((monthEntry) => {
        monthEntry.buckets.sort((left, right) => {
          const leftIndex = activeBuckets.findIndex((bucket) => bucket.id === left.allocationId);
          const rightIndex = activeBuckets.findIndex((bucket) => bucket.id === right.allocationId);
          return leftIndex - rightIndex;
        });
        monthEntry.totalSpent = roundInt(
          monthEntry.buckets.reduce(
            (sum, item) => sum + safeNumber(item.type === "expense_budget" ? item.spentAmount : item.investedAmount),
            0,
          ),
        );
        monthEntry.totalBudget = roundInt(monthEntry.buckets.reduce((sum, item) => sum + item.effectiveBudget, 0));
      });

    budgetYears[annual.year] = {
      year: annual.year,
      targetAnnualIncome: annual.target_annual_income,
      actualAnnualIncome: annual.actual_annual_income,
      months,
      bucketTotals: activeBuckets.map((bucket) => ({
        ...bucket,
        currentYearSpent: roundInt(
          Object.values(months).reduce((sum, monthEntry) => {
            const match = monthEntry.buckets.find((item) => item.allocationId === bucket.id);
            if (!match) {
              return sum;
            }
            return sum + safeNumber(match.type === "expense_budget" ? match.spentAmount : match.investedAmount);
          }, 0),
        ),
      })),
    };
  });

  return budgetYears;
}

function buildLiabilityViews(data, accountMap) {
  return data.liabilities.map((liability) => {
    const paymentHistory = data.debt_payments
      .filter((payment) => payment.liability_id === liability.id)
      .slice()
      .sort(sortByDateDesc);
    const monthlyInterest = calcMonthlyInterest(liability);
    const paidRatio =
      safeNumber(liability.total_amount) > 0
        ? ((safeNumber(liability.total_amount) - safeNumber(liability.remaining_amount)) /
            safeNumber(liability.total_amount)) *
          100
        : 0;
    const payoffMonths =
      safeNumber(liability.monthly_payment) > monthlyInterest
        ? Math.ceil(safeNumber(liability.remaining_amount) / (safeNumber(liability.monthly_payment) - monthlyInterest))
        : null;

    return {
      ...liability,
      monthlyInterest,
      paidRatio,
      payoffMonths,
      paymentHistory: paymentHistory.map((payment) => ({
        ...payment,
        accountName: accountMap[payment.from_account_id] || "Chưa gán",
      })),
    };
  });
}

function buildReceivableViews(data, accountMap) {
  const likelihoodConfig = {
    high: { factor: 1, label: "Khả năng cao", tone: "success" },
    medium: { factor: 0.7, label: "Khả năng trung bình", tone: "warning" },
    low: { factor: 0.3, label: "Khả năng thấp", tone: "danger" },
  };

  return (data.receivables || [])
    .map((receivable) => {
      const payments = (data.receivable_payments || [])
        .filter((payment) => payment.receivable_id === receivable.id)
        .slice()
        .sort(sortByDateDesc);
      const totalPaid = roundInt(payments.reduce((sum, payment) => sum + safeNumber(payment.amount), 0));
      const likelihoodKey = String(receivable.likelihood || "medium").toLowerCase();
      const config = likelihoodConfig[likelihoodKey] || likelihoodConfig.medium;
      const originalAmount = roundInt(receivable.original_amount);
      const remainingAmount = Math.max(0, roundInt(receivable.remaining_amount));
      const collectedAmount = Math.max(0, roundInt(originalAmount - remainingAmount));
      const progressPct = originalAmount > 0 ? Math.min(100, (collectedAmount / originalAmount) * 100) : 0;
      const expectedDays = receivable.expected_return_date ? getDaysUntil(receivable.expected_return_date) : null;
      return {
        ...receivable,
        original_amount: originalAmount,
        remaining_amount: remainingAmount,
        payments: payments.map((payment) => ({
          ...payment,
          accountName: accountMap[payment.to_account_id] || "Chưa gán",
        })),
        totalPaid,
        discountFactor: config.factor,
        discountedValue: roundInt(remainingAmount * config.factor),
        likelihoodLabel: config.label,
        likelihoodTone: config.tone,
        collectedAmount,
        progressPct,
        expectedDays,
        isFullyCollected: remainingAmount <= 0,
      };
    })
    .sort((left, right) => safeNumber(right.remaining_amount) - safeNumber(left.remaining_amount));
}

function buildCounterpartyLedgerViews(data, liabilityViews, receivableViews, accountMap) {
  const buckets = new Map();
  const ensureBucket = (rawName) => {
    const normalizedName = normalizeCounterpartyName(rawName) || "Chưa gán đối tượng";
    const key = getCounterpartyKey(normalizedName);
    if (!buckets.has(key)) {
      buckets.set(key, {
        key,
        counterparty: normalizedName,
        liabilities: [],
        receivables: [],
        flows: [],
      });
    }
    return buckets.get(key);
  };

  (liabilityViews || []).forEach((liability) => {
    const bucket = ensureBucket(liability.counterparty || liability.name);
    bucket.liabilities.push(liability);
  });

  (receivableViews || []).forEach((receivable) => {
    const bucket = ensureBucket(receivable.counterparty || receivable.name);
    bucket.receivables.push(receivable);
  });

  (data.debt_payments || []).forEach((payment) => {
    const liability = (liabilityViews || []).find((item) => item.id === payment.liability_id);
    if (!liability) return;
    const bucket = ensureBucket(liability.counterparty || liability.name);
    bucket.flows.push({
      date: payment.date,
      type: "debt_payment",
      label: `Trả nợ ${liability.name}`,
      amount: roundInt(payment.total_payment),
      direction: "out",
      accountName: accountMap[payment.from_account_id] || "Chưa gán",
    });
  });

  (data.receivable_payments || []).forEach((payment) => {
    const receivable = (receivableViews || []).find((item) => item.id === payment.receivable_id);
    if (!receivable) return;
    const bucket = ensureBucket(receivable.counterparty || receivable.name);
    bucket.flows.push({
      date: payment.date,
      type: "receivable_payment",
      label: `Thu nợ ${receivable.name}`,
      amount: roundInt(payment.amount),
      direction: "in",
      accountName: accountMap[payment.to_account_id] || "Chưa gán",
    });
  });

  (data.transactions || []).forEach((transaction) => {
    if (transaction.type !== "loan_disbursement" || !transaction.liability_id) {
      return;
    }
    const liability = (liabilityViews || []).find((item) => item.id === transaction.liability_id);
    if (!liability) {
      return;
    }
    const bucket = ensureBucket(liability.counterparty || liability.name);
    bucket.flows.push({
      date: transaction.date,
      type: "loan_disbursement",
      label: `Vay thêm ${liability.name}`,
      amount: roundInt(transaction.amount),
      direction: "in",
      accountName: accountMap[transaction.account_id] || "Chưa gán",
    });
  });

  (data.transactions || []).forEach((transaction) => {
    if (transaction.type !== "expense" || !transaction.receivable_id || transaction.category !== "Cho vay") {
      return;
    }
    const receivable = (receivableViews || []).find((item) => item.id === transaction.receivable_id);
    if (!receivable) {
      return;
    }
    const bucket = ensureBucket(receivable.counterparty || receivable.name);
    bucket.flows.push({
      date: transaction.date,
      type: "receivable_disbursement",
      label: `Cho vay thêm ${receivable.name}`,
      amount: roundInt(transaction.amount),
      direction: "out",
      accountName: accountMap[transaction.account_id] || "Chưa gán",
    });
  });

  return Array.from(buckets.values())
    .map((entry) => {
      const liabilityRemaining = roundInt(
        entry.liabilities.reduce((sum, item) => sum + safeNumber(item.remaining_amount), 0),
      );
      const receivableRemaining = roundInt(
        entry.receivables.reduce((sum, item) => sum + safeNumber(item.remaining_amount), 0),
      );
      const netPosition = roundInt(receivableRemaining - liabilityRemaining);
      const flowIn = roundInt(
        entry.flows
          .filter((flow) => flow.direction === "in")
          .reduce((sum, flow) => sum + safeNumber(flow.amount), 0),
      );
      const flowOut = roundInt(
        entry.flows
          .filter((flow) => flow.direction === "out")
          .reduce((sum, flow) => sum + safeNumber(flow.amount), 0),
      );
      return {
        ...entry,
        liabilityRemaining,
        receivableRemaining,
        netPosition,
        flowIn,
        flowOut,
        flowHistory: entry.flows.slice().sort(sortByDateDesc).slice(0, 6),
      };
    })
    .sort((left, right) => Math.abs(right.netPosition) - Math.abs(left.netPosition));
}

function buildAccountViews(data) {
  const balanceMap = computeAllAccountBalances(data.cash_accounts, data.transactions);
  return data.cash_accounts.map((account) => {
    const balance = balanceMap[account.id] ?? getAccountBalance(account.id, data.transactions);
    const stalenessDays = account.last_updated ? daysBetween(account.last_updated, todayIso()) : 0;
    const daysUntilDue = account.due_date ? getDaysUntil(account.due_date) : null;
    const availableLimit =
      account.type === "credit_card"
        ? roundInt(safeNumber(account.credit_limit) - Math.abs(Math.min(balance, 0)))
        : 0;
    return {
      ...account,
      label: ACCOUNT_TYPE_LABELS[account.type] || account.type,
      balance,
      stalenessDays,
      daysUntilDue,
      availableLimit,
    };
  });
}

function buildDerived() {
  const data = state.data;
  const settings = data.user_settings;
  const activeRule = getActiveAllocationRule(data);
  const activeBuckets = activeRule.buckets || BUCKET_PRESETS;
  const accountViews = buildAccountViews(data);
  const accountMap = Object.fromEntries(accountViews.map((account) => [account.id, account.name]));
  const assetViews = buildAssetViews(data);
  const assetMap = Object.fromEntries(assetViews.map((asset) => [asset.id, asset.name]));
  const liabilityMap = Object.fromEntries(data.liabilities.map((liability) => [liability.id, liability.name]));
  const transactionViews = buildTransactionViews(data, { accountMap, assetMap, liabilityMap });
  const monthlyStats = buildMonthlyStats(data.transactions);
  const monthlyStatsMap = Object.fromEntries(monthlyStats.map((item) => [item.month, item]));
  const currentMonthKey = toMonthKey(new Date());
  const prevMonthKey = getPrevMonth(currentMonthKey);
  const netWorth = computeNetWorth(
    data.cash_accounts,
    data.transactions,
    data.assets,
    data.asset_transactions,
    data.liabilities,
    data.receivables,
  );
  const emergencyFund = computeEmergencyFund(
    data.cash_accounts,
    data.transactions,
    data.assets,
    data.asset_transactions,
  );
  const assetComposition = computeAssetComposition(
    data.cash_accounts,
    data.transactions,
    data.assets,
    data.asset_transactions,
    data.receivables,
  );
  const rollingBase = computeRollingBase(data.transactions, settings.rolling_window || 6);
  const goalViews = data.goals.map((goal) => ({
    ...goal,
    ...computeGoalProgress(goal, data.cash_accounts, data.transactions, data.assets, data.asset_transactions),
  }));
  const receivableViews = buildReceivableViews(data, accountMap);
  const doubleCountingWarnings = detectDoubleCountingGoals(data.goals);
  const portfolioBuckets = buildPortfolioBuckets(assetViews, settings, activeBuckets, accountViews);
  const portfolioValue = portfolioBuckets.reduce((sum, bucket) => sum + safeNumber(bucket.value), 0);
  const rebalanceAlerts =
    portfolioValue > 0
      ? portfolioBuckets.filter((bucket) => Math.abs(bucket.deviation) > safeNumber(settings.rebalance_threshold))
      : [];
  const budgetYears = buildBudgetYears(data);
  const currentBudgetBuckets = budgetYears[new Date().getFullYear()]?.months[currentMonthKey]?.buckets || [];
  const liabilityViews = buildLiabilityViews(data, accountMap);
  const counterpartyLedgers = buildCounterpartyLedgerViews(data, liabilityViews, receivableViews, accountMap);
  const accountGroups = Object.values(
    accountViews.reduce((groups, account) => {
      const label = ACCOUNT_TYPE_LABELS[account.type] || account.type;
      if (!groups[label]) {
        groups[label] = {
          label,
          items: [],
        };
      }
      groups[label].items.push(account);
      return groups;
    }, {}),
  );

  const netWorthHistory = data.net_worth_history
    .slice()
    .sort((left, right) => left.month.localeCompare(right.month))
    .map((entry) => ({
      ...entry,
      value: safeNumber(entry.net_worth),
    }));
  const historyMonths = getLastNMonths(12);
  // Tái dựng đường 12 tháng từ sổ giao dịch; snapshot đã lưu được ưu tiên,
  // tháng hiện tại luôn ép về net worth sống để khớp KPI.
  const reconstructed = computeNetWorthHistory(data, historyMonths, netWorthHistory);
  const netWorthHistory12 = reconstructed.map((entry) => {
    if (entry.month === currentMonthKey) {
      return {
        month: entry.month,
        value: roundInt(netWorth.netWorth),
        net_worth: roundInt(netWorth.netWorth),
        reconstructed: entry.reconstructed,
      };
    }
    return entry;
  });
  const latestNetWorth = netWorthHistory12[netWorthHistory12.length - 1]?.value ?? netWorth.netWorth;
  const prevNetWorth = netWorthHistory12[netWorthHistory12.length - 2]?.value ?? latestNetWorth;
  const netWorthMoM = latestNetWorth - prevNetWorth;

  const averageMonthlyExpense =
    monthlyStats.filter((item) => item.expense > 0).reduce((sum, item) => sum + item.expense, 0) /
      Math.max(1, monthlyStats.filter((item) => item.expense > 0).length) || 0;

  const topAssets = assetViews.slice(0, 5);
  const recentTransactions = transactionViews.slice(0, 8);

  return {
    settings,
    activeRule,
    activeBuckets,
    accounts: accountViews,
    accountGroups,
    assets: assetViews,
    liabilities: liabilityViews,
    receivables: receivableViews,
    counterpartyLedgers,
    transactionViews,
    recentTransactions,
    topAssets,
    monthlyStats,
    monthlyStatsMap,
    currentMonthKey,
    prevMonthKey,
    currentYear: new Date().getFullYear(),
    netWorth,
    emergencyFund,
    assetComposition,
    rollingBase,
    goalViews,
    doubleCountingWarnings,
    portfolioBuckets,
    rebalanceAlerts,
    budgetYears,
    currentBudgetBuckets,
    netWorthHistory,
    netWorthHistory12,
    netWorthMoM,
    accountMap,
    assetMap,
    liabilityMap,
    averageMonthlyExpense: roundInt(averageMonthlyExpense),
  };
}

function recomputeState({ persist = true, announce = true } = {}) {
  state.data = sanitizeTables(state.data);
  syncAnnualBudgetSnapshots();
  ensureCurrentMonthSnapshot();
  state.derived = buildDerived();
  state.runtime.banners = [];
  evaluateAlerts(state.derived);
  if (persist) {
    writeCache();
  }
  if (announce) {
    notify();
  }
}

function filterTransactions(rows, filters) {
  const query = (filters.search || "").trim().toLowerCase();
  const month = filters.month || "";
  const year = filters.year || "";

  const filtered = rows.filter((row) => {
    if (month && String(row.date).slice(5, 7) !== String(month).padStart(2, "0")) {
      return false;
    }
    if (year && String(row.date).slice(0, 4) !== String(year)) {
      return false;
    }
    if (filters.type && row.type !== filters.type) {
      return false;
    }
    if (filters.source && row.sourceLabel !== filters.source) {
      return false;
    }
    if (filters.category && row.category !== filters.category) {
      return false;
    }
    if (filters.account && ![row.account_id, row.from_account_id, row.to_account_id].includes(filters.account)) {
      return false;
    }
    if (query && !row.searchText.includes(query)) {
      return false;
    }
    return true;
  });

  const totalIncome = roundInt(
    filtered.reduce((sum, row) => (row.type === "income" && !row.receivable_id ? sum + safeNumber(row.amount) : sum), 0),
  );
  const totalExpense = roundInt(
    filtered.reduce((sum, row) => (row.type === "expense" && !row.receivable_id ? sum + safeNumber(row.amount) : sum), 0),
  );

  const activeChips = [];
  Object.entries(filters).forEach(([key, value]) => {
    if (!value) {
      return;
    }
    activeChips.push({
      key,
      label:
        key === "month"
          ? `Tháng ${value}`
          : key === "year"
            ? `Năm ${value}`
            : `${key}: ${value}`,
    });
  });

  return {
    rows: filtered,
    summary: {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      savingsRate: totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0,
    },
    activeChips,
  };
}

function filterAssetTransactions(rows, filters) {
  return rows.filter((row) => {
    if (filters.asset && row.asset_id !== filters.asset) {
      return false;
    }
    if (filters.action && row.action !== filters.action) {
      return false;
    }
    if (filters.from && row.date < filters.from) {
      return false;
    }
    if (filters.to && row.date > filters.to) {
      return false;
    }
    return true;
  });
}

function buildAssetLedgerViews() {
  return state.data.asset_transactions
    .slice()
    .sort(sortByDateDesc)
    .map((transaction) => ({
      ...transaction,
      actionLabel:
        ASSET_ACTION_LABELS[String(transaction.action || "").toUpperCase()] ||
        String(transaction.action || "").toUpperCase(),
      assetName: state.derived.assetMap[transaction.asset_id] || transaction.asset_id,
      accountName: state.derived.accountMap[transaction.account_id] || "",
    }));
}

function buildReportView(type, reportYear) {
  const year = Number(reportYear) || state.derived.currentYear;
  const yearRows = state.derived.monthlyStats.filter((row) => Number(row.month.slice(0, 4)) === year);

  if (type === "allocation") {
    const rows = state.derived.portfolioBuckets.map((bucket) => ({
      hạng_mục: bucket.name,
      giá_trị: bucket.value,
      tỷ_trọng: `${bucket.pct.toFixed(1)}%`,
      mục_tiêu: `${bucket.target.toFixed(1)}%`,
      lệch: bucket.deviationLabel,
    }));
    return {
      type,
      title: "Phân bổ danh mục",
      rows,
      chartRows: state.derived.portfolioBuckets.map((bucket) => ({
        label: bucket.name,
        value: bucket.value,
        color: bucket.color,
      })),
    };
  }

  if (type === "performance") {
    const rows = state.derived.assets.map((asset) => ({
      tài_sản: asset.name,
      giá_trị: asset.currentValue,
      pnl_chưa_thực_hiện: asset.unrealizedPnL,
      pnl_đã_thực_hiện: asset.realizedPnL,
      cổ_tức_lãi: asset.totalDividends,
    }));
    return {
      type,
      title: "Hiệu suất đầu tư",
      rows,
      chartRows: state.derived.assets.slice(0, 6).map((asset) => ({
        label: asset.ticker || asset.name,
        value: asset.totalReturn,
        color: asset.totalReturn >= 0 ? "#27a644" : "#e5484d",
      })),
    };
  }

  if (type === "net-worth") {
    const rows = state.derived.netWorthHistory.map((item) => ({
      tháng: item.month,
      tài_sản_ròng: item.value,
    }));
    return {
      type,
      title: "Tài sản ròng",
      rows,
      chartRows: state.derived.netWorthHistory.map((item) => ({
        label: item.month.slice(5),
        value: item.value,
        color: "#5e6ad2",
      })),
    };
  }

  if (type === "year-summary") {
    const rows = yearRows.map((item) => ({
      tháng: item.month,
      thu_nhập: item.income,
      chi_tiêu: item.expense,
      chênh_lệch: item.balance,
    }));
    return {
      type,
      title: `Tổng kết năm ${year}`,
      rows,
      chartRows: yearRows.map((item) => ({
        label: item.month.slice(5),
        value: item.balance,
        color: item.balance >= 0 ? "#27a644" : "#e5484d",
      })),
    };
  }

  if (type === "liquidity") {
    const rows = state.derived.accounts
      .filter((account) => ["bank", "ewallet", "cash", "securities_cash"].includes(account.type))
      .map((account) => ({
        tài_khoản: account.name,
        nhóm: ACCOUNT_TYPE_LABELS[account.type] || account.type,
        số_dư: account.balance,
      }));
    rows.push({
      tài_khoản: "Layer 2 tiết kiệm",
      nhóm: "Quỹ khẩn cấp",
      số_dư: state.derived.emergencyFund.layer2,
    });
    return {
      type,
      title: "Phân tích thanh khoản",
      rows,
      chartRows: [
        { label: "Layer 1", value: state.derived.emergencyFund.layer1, color: "#5e6ad2" },
        { label: "Layer 2", value: state.derived.emergencyFund.layer2, color: "#8b7cf0" },
      ],
    };
  }

  const rows = state.derived.monthlyStats.map((item) => ({
    tháng: item.month,
    thu_nhập: item.income,
    chi_tiêu: item.expense,
    chênh_lệch: item.balance,
  }));
  return {
    type: "income-expense",
    title: "Thu chi theo tháng",
    rows,
    chartRows: state.derived.monthlyStats.map((item) => ({
      label: item.month.slice(5),
      value: item.balance,
      color: item.balance >= 0 ? "#27a644" : "#e5484d",
    })),
  };
}

function reportRowsToCsv(rows) {
  if (!rows.length) {
    return "";
  }
  const headers = Object.keys(rows[0]);
  const body = rows.map((row) =>
    headers
      .map((header) => {
        const raw = row[header];
        const value = typeof raw === "number" ? String(raw) : String(raw ?? "");
        return `"${value.replace(/"/g, '""')}"`;
      })
      .join(","),
  );
  return [headers.join(","), ...body].join("\n");
}

function buildModalData(modal) {
  if (!modal) {
    return null;
  }

  const accountOptions = state.derived.accounts.map((account) => ({
    value: account.id,
    label: account.name,
  }));
  const nonCreditAccountOptions = state.derived.accounts
    .filter((account) => account.type !== "credit_card")
    .map((account) => ({
      value: account.id,
      label: account.name,
    }));
  const assetOptions = state.derived.assets.map((asset) => ({
    value: asset.id,
    label: `${asset.name}${asset.ticker ? ` (${asset.ticker})` : ""}`,
  }));
  const liabilityOptions = state.derived.liabilities.map((liability) => ({
    value: liability.id,
    label: liability.name,
  }));
  const bucketOptions = state.derived.activeBuckets.map((bucket) => ({
    value: bucket.id,
    label: bucket.name,
  }));
  const assetBucketOptions = state.derived.activeBuckets
    .filter((bucket) => bucket.type !== "expense_budget")
    .map((bucket) => ({
    value: bucket.id,
    label: bucket.name,
  }));

  if (modal.type === "help") {
    // Panel "Hỏi cách dùng app" — sample questions cố định; question/result do app.js điền.
    return {
      type: "help",
      sampleQuestions: [
        "Làm sao nhập tài sản mới?",
        "Làm sao dùng AI nhập liệu?",
        "Tôi cần kiểm tra gì trước khi lưu?",
        "Net worth nghĩa là gì?",
        "Dashboard này đọc thế nào?",
      ],
      question: modal.question || "",
      result: modal.result || null,
    };
  }

  if (modal.type === "welcome") {
    return { type: "welcome" };
  }

  if (modal.type === "ai-entry") {
    // Dữ liệu cho modal nhập liệu bằng AI: danh sách tài khoản/tài sản để khớp tên,
    // gợi ý danh mục, và (nếu có) danh sách kết quả đã parse để hiển thị preview.
    return {
      type: "ai-entry",
      accountOptions,
      assetOptions,
      liabilityOptions,
      bucketOptions: assetBucketOptions,
      incomeCategories: state.data.user_settings.income_categories,
      expenseCategories: state.data.user_settings.expense_categories,
      hasAiKey: Boolean((state.data.user_settings.ai_api_key || "").trim()),
      inputText: modal.inputText || "",
      parsedList: Array.isArray(modal.parsedList) ? modal.parsedList : modal.parsed ? [modal.parsed] : null,
      loading: Boolean(modal.loading),
      error: modal.error || "",
    };
  }

  if (modal.type === "transaction") {
    const record = modal.id
      ? state.data.transactions.find((transaction) => transaction.id === modal.id)
      : {
          date: todayIso(),
          type: "expense",
          amount: 0,
          category: "",
          description: "",
          account_id: accountOptions[0]?.value || "",
          trigger_allocation: true,
          affect_bucket: false,
          bucket_id: assetBucketOptions[0]?.value || "",
          bucket_impact: "allocate",
        };
    return {
      type: "transaction",
      record,
      accountOptions,
      assetOptions,
      liabilityOptions,
      investmentBucketOptions: assetBucketOptions,
      incomeCategories: state.data.user_settings.income_categories,
      expenseCategories: state.data.user_settings.expense_categories,
    };
  }

  if (modal.type === "account") {
    const record = modal.id
      ? (() => {
          const account = state.data.cash_accounts.find((item) => item.id === modal.id);
          const openingTxn = state.data.transactions.find(
            (transaction) => transaction.type === "opening_balance" && transaction.account_id === modal.id,
          );
          return {
            ...account,
            opening_balance: safeNumber(openingTxn?.amount),
            opening_date: openingTxn?.date || account?.last_updated || todayIso(),
          };
        })()
      : {
          name: "",
          type: "bank",
          bank_name: "",
          broker: "",
          tracking_mode: "auto",
          is_active: true,
          credit_limit: 0,
          due_date: "",
          statement_date: "",
          opening_date: todayIso(),
          opening_balance: 0,
          last_updated: todayIso(),
          notes: "",
        };
    return { type: "account", record };
  }

  if (modal.type === "asset") {
    const record = modal.id
      ? state.data.assets.find((asset) => asset.id === modal.id)
      : {
          name: "",
          ticker: "",
          asset_type: "stock",
          bucket: "alloc_growth",
          exchange: "",
          current_price: 0,
          interest_rate: 0,
          term_months: 0,
          start_date: todayIso(),
          maturity_date: "",
          interest_type: "simple",
          auto_rollover: false,
          is_pledged: false,
          bank_name: "",
          underlying_asset: "",
          exercise_price: 0,
          expiry_date: "",
          conversion_ratio: 0,
          issuer: "",
          notes: "",
          ...(modal.prefill || {}),
        };
    return { type: "asset", record, bucketOptions: assetBucketOptions };
  }

  if (modal.type === "asset-transaction") {
    const record = modal.id
      ? state.data.asset_transactions.find((transaction) => transaction.id === modal.id)
      : {
          date: todayIso(),
          asset_id: assetOptions[0]?.value || "",
          action: "BUY",
          quantity: 0,
          price: 0,
          fee: 0,
          total_cash: 0,
          account_id: accountOptions[0]?.value || "",
          notes: "",
        };
    return { type: "asset-transaction", record, assetOptions, accountOptions };
  }

  if (modal.type === "liability") {
    const record = modal.id
      ? state.data.liabilities.find((liability) => liability.id === modal.id)
      : {
          name: "",
          counterparty: "",
          type: "loan",
          total_amount: 0,
          remaining_amount: 0,
          interest_rate: 0,
          monthly_payment: 0,
          start_date: todayIso(),
          end_date: "",
          notes: "",
        };
    return { type: "liability", record };
  }

  if (modal.type === "counterparty-flow") {
    const counterpartySeed = normalizeCounterpartyName(modal.counterparty || "");
    const ledgers = state.derived.counterpartyLedgers || [];
    const selectedLedger =
      ledgers.find((item) => item.key === getCounterpartyKey(counterpartySeed)) ||
      ledgers.find((item) => item.counterparty === counterpartySeed) ||
      null;
    const counterparty = selectedLedger?.counterparty || counterpartySeed;
    const ledgerKey = getCounterpartyKey(counterparty);
    const liabilityOptions = state.derived.liabilities
      .filter((item) => getCounterpartyKey(item.counterparty || item.name) === ledgerKey)
      .map((item) => ({ value: item.id, label: `${item.name} (${formatVND(item.remaining_amount)})` }));
    const receivableOptions = state.derived.receivables
      .filter((item) => getCounterpartyKey(item.counterparty || item.name) === ledgerKey)
      .map((item) => ({ value: item.id, label: `${item.name} (${formatVND(item.remaining_amount)})` }));
    return {
      type: "counterparty-flow",
      counterparty,
      counterpartyOptions: ledgers.map((item) => ({ value: item.counterparty, label: item.counterparty })),
      accountOptions: nonCreditAccountOptions,
      liabilityOptions,
      receivableOptions,
      defaultSide:
        modal.side ||
        (liabilityOptions.length && !receivableOptions.length
          ? "liability"
          : receivableOptions.length && !liabilityOptions.length
            ? "receivable"
            : "liability"),
    };
  }

  if (modal.type === "debt-payment") {
    const liability = state.derived.liabilities.find((item) => item.id === modal.liabilityId);
    return {
      type: "debt-payment",
      liability,
      accountOptions,
      defaultInterest: calcMonthlyInterest(liability),
    };
  }

  if (modal.type === "receivable") {
    const record = modal.id
      ? state.data.receivables.find((item) => item.id === modal.id)
      : {
          name: "",
          type: "personal_loan",
          counterparty: "",
          original_amount: 0,
          remaining_amount: 0,
          start_date: todayIso(),
          expected_return_date: "",
          is_secured: false,
          likelihood: "medium",
          is_pledged: false,
          notes: "",
          account_id: accountOptions[0]?.value || "",
        };
    const hasPayments = Boolean(
      record?.id && state.data.receivable_payments.some((payment) => payment.receivable_id === record.id),
    );
    return {
      type: "receivable",
      record,
      accountOptions,
      hasPayments,
    };
  }

  if (modal.type === "receivable-payment") {
    const receivable =
      state.derived.receivables?.find((item) => item.id === modal.receivableId) ||
      state.data.receivables.find((item) => item.id === modal.receivableId);
    return {
      type: "receivable-payment",
      receivable,
      accountOptions,
      maxAmount: safeNumber(receivable?.remaining_amount),
    };
  }

  if (modal.type === "goal") {
    const record = modal.id
      ? state.data.goals.find((goal) => goal.id === modal.id)
      : {
          name: "",
          type: "wealth",
          target_amount: 0,
          deadline: "",
          priority: "medium",
          linked_sources: [],
          notes: "",
        };
    return {
      type: "goal",
      record,
      sourceOptions: {
        accounts: accountOptions,
        assets: assetOptions,
        buckets: bucketOptions,
      },
    };
  }

  if (modal.type === "account-history") {
    const account = state.derived.accounts.find((item) => item.id === modal.accountId);
    const rows = state.derived.transactionViews.filter((row) =>
      [row.account_id, row.from_account_id, row.to_account_id].includes(modal.accountId),
    );
    const truncated = rows.length > 30;
    return {
      type: "account-history",
      account,
      rows: rows.slice(0, 30),
      truncated,
      totalCount: rows.length,
    };
  }

  if (modal.type === "price-update") {
    const asset = state.derived.assets.find((item) => item.id === modal.assetId);
    return { type: "price-update", asset };
  }

  if (modal.type === "derivative-update") {
    const account = state.derived.accounts.find((item) => item.id === modal.accountId);
    return { type: "derivative-update", account };
  }

  if (modal.type === "allocation-preview") {
    const amount = safeNumber(modal.amount);
    return {
      type: "allocation-preview",
      amount,
      suggestions: state.derived.activeBuckets.map((bucket) => ({
        ...bucket,
        amount: roundInt((amount * safeNumber(bucket.percentage)) / 100),
      })),
    };
  }

  if (modal.type === "reinvest-suggestion") {
    return {
      type: "reinvest-suggestion",
      amount: safeNumber(modal.amount),
      assetName: state.derived.assetMap[modal.assetId] || "tài sản",
    };
  }

  if (modal.type === "reset-confirm") {
    return {
      type: "reset-confirm",
    };
  }

  return null;
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function loadState() {
  const cached = readCache();
  if (cached?.tables) {
    state.data = sanitizeTables(cached.tables);
  } else {
    state.data = createEmptyData();
  }
  state.runtime.welcomePending = !hasMeaningfulData(state.data);
  recomputeState({ persist: false, announce: true });
}

export function buildViewModel(uiState = {}) {
  const transactionFilters = uiState.transactionFilters || {};
  const assetTxnFilters = uiState.assetTxnFilters || {};
  const budgetYear = Number(uiState.budgetYear) || state.derived.currentYear;
  const selectedBudgetMonth = uiState.selectedBudgetMonth || state.derived.currentMonthKey;
  const reportType = uiState.reportType || "income-expense";
  const report = buildReportView(reportType, uiState.reportYear || state.derived.currentYear);
  const filteredTransactions = filterTransactions(state.derived.transactionViews, transactionFilters);
  const assetLedger = filterAssetTransactions(buildAssetLedgerViews(), assetTxnFilters);
  const budgetYearView = state.derived.budgetYears[budgetYear] || { months: {}, bucketTotals: [] };
  const previousYearView = state.derived.budgetYears[budgetYear - 1] || { months: {}, bucketTotals: [] };
  const budgetMonthData = budgetYearView.months[selectedBudgetMonth] || {
    month: selectedBudgetMonth,
    budgetBase: getMonthBudgetBase(selectedBudgetMonth, state.data.transactions, state.data.user_settings),
    buckets: [],
    totalSpent: 0,
    totalBudget: 0,
  };
  const budgetMonthBuckets = ensureArray(budgetMonthData.buckets);
  const expenseBudgetBuckets = budgetMonthBuckets.filter((bucket) => bucket.type === "expense_budget");
  const investmentBudgetBuckets = budgetMonthBuckets.filter((bucket) => bucket.type !== "expense_budget");

  const compareRows = state.derived.activeBuckets.map((bucket) => ({
    ...bucket,
    currentYear:
      budgetYearView.bucketTotals.find((item) => item.id === bucket.id || item.allocationId === bucket.id)
        ?.currentYearSpent || 0,
    previousYear:
      previousYearView.bucketTotals.find((item) => item.id === bucket.id || item.allocationId === bucket.id)
        ?.currentYearSpent || 0,
  }));

  const monthsEquivalent =
    state.derived.averageMonthlyExpense > 0
      ? state.derived.emergencyFund.total / state.derived.averageMonthlyExpense
      : 0;

  return {
    version: VERSION,
    now: todayIso(),
    runtime: {
      toasts: state.runtime.toasts,
      banners: state.runtime.banners,
      welcomePending: state.runtime.welcomePending,
    },
    navigation: [
      { id: "overview", label: "Tổng Quan" },
      { id: "transactions", label: "Thu Chi" },
      { id: "accounts", label: "Tài Khoản" },
      { id: "budgets", label: "Ngân Sách" },
      { id: "portfolio", label: "Danh Mục ĐT" },
      { id: "debts-goals", label: "Nợ & Mục Tiêu" },
      { id: "reports", label: "Báo Cáo" },
      { id: "insights", label: "AI Insights" },
      { id: "settings", label: "Cài Đặt" },
    ],
    derived: state.derived,
    dashboard: {
      kpis: [
        { label: "Tài sản ròng", value: state.derived.netWorth.netWorth, tone: "primary" },
        { label: "Tổng tài sản", value: state.derived.netWorth.totalAssets, tone: "neutral" },
        { label: "Tổng nợ", value: state.derived.netWorth.totalLiabilities, tone: "danger" },
        {
          label: "Thu tháng",
          value: state.derived.monthlyStatsMap[state.derived.currentMonthKey]?.income || 0,
          tone: "success",
        },
        {
          label: "Chi tháng",
          value: state.derived.monthlyStatsMap[state.derived.currentMonthKey]?.expense || 0,
          tone: "danger",
        },
      ],
      netWorthHistory: state.derived.netWorthHistory12 || state.derived.netWorthHistory.slice(-12),
      netWorthMoM: state.derived.netWorthMoM,
      portfolioBuckets: state.derived.portfolioBuckets,
      assetComposition: state.derived.assetComposition,
      emergencyFund: {
        ...state.derived.emergencyFund,
        monthsEquivalent,
      },
      volatility: state.derived.rollingBase,
      currentBudget: state.derived.currentBudgetBuckets,
      recentTransactions: state.derived.recentTransactions,
      topAssets: state.derived.topAssets,
      goals: state.derived.goalViews.slice(0, 4),
      rebalancing: state.derived.rebalanceAlerts,
    },
    transactionsPage: {
      filters: transactionFilters,
      rows: filteredTransactions.rows,
      summary: filteredTransactions.summary,
      activeChips: filteredTransactions.activeChips,
      options: {
        accounts: state.derived.accounts,
        types: Object.entries(TRANSACTION_TYPE_LABELS).map(([value, label]) => ({ value, label })),
        categories: [
          ...new Set([
            ...state.data.user_settings.expense_categories,
            ...state.data.user_settings.income_categories,
            ...state.data.transactions.map((item) => item.category).filter(Boolean),
          ]),
        ],
        sources: [
          ...new Set(state.data.transactions.map((item) => item.income_source).filter(Boolean)),
        ],
      },
    },
    accountsPage: {
      groups: state.derived.accountGroups,
    },
    budgetsPage: {
      year: budgetYear,
      month: selectedBudgetMonth,
      availableYears: Object.keys(state.derived.budgetYears)
        .map(Number)
        .sort((left, right) => right - left),
      monthData: {
        ...budgetMonthData,
        expenseBuckets: expenseBudgetBuckets,
        investmentBuckets: investmentBudgetBuckets,
      },
      matrixRows: Object.values(budgetYearView.months).sort((left, right) => left.month.localeCompare(right.month)),
      compareRows,
    },
    portfolioPage: {
      bucketCards: state.derived.portfolioBuckets,
      assetLedger,
      assets: state.derived.assets,
      assetTxnFilters,
    },
    debtsGoalsPage: {
      liabilities: state.derived.liabilities,
      receivables: state.derived.receivables,
      counterpartyLedgers: state.derived.counterpartyLedgers || [],
      goals: state.derived.goalViews,
      warnings: state.derived.doubleCountingWarnings,
    },
    reportsPage: {
      report,
      csv: reportRowsToCsv(report.rows),
      reportType,
      reportYear: Number(uiState.reportYear) || state.derived.currentYear,
    },
    insightsPage: {
      panels: [
        { id: "unusual-spending", title: "Chi tiêu bất thường" },
        { id: "rebalance", title: "Tái cân bằng" },
        { id: "lookup", title: "Tra cứu" },
        { id: "forecast", title: "Dự báo năm" },
        { id: "idle-cash", title: "Tiền nhàn rỗi" },
        { id: "irregular-income", title: "Thu nhập không đều" },
      ].map((panel) => {
        const insight = (uiState.generatedInsights || {})[panel.id];
        return {
          ...panel,
          result: typeof insight === "string" ? insight : insight?.text || "",
          loading: insight?.loading || false,
        };
      }),
      chat: {
        messages: (uiState.aiChat?.messages || []).map((message) => ({
          id: message.id || createId("chat"),
          role: message.role || "assistant",
          text: String(message.text || ""),
          time: message.time || todayIso(),
        })),
        loading: Boolean(uiState.aiChat?.loading),
      },
    },
    settingsPage: {
      general: state.data.user_settings,
      activeBuckets: state.derived.activeBuckets,
      expenseBuckets: state.derived.activeBuckets.filter((bucket) => bucket.type === "expense_budget"),
      investmentBuckets: state.derived.activeBuckets.filter((bucket) => bucket.type !== "expense_budget"),
      allocationTotal: roundInt(
        state.derived.activeBuckets.reduce((sum, bucket) => sum + safeNumber(bucket.percentage), 0),
      ),
      accounts: state.derived.accounts,
      recurringTemplates: state.data.recurring_templates,
      categories: {
        income: state.data.user_settings.income_categories,
        expense: state.data.user_settings.expense_categories,
      },
      categoryMap: state.data.user_settings.category_allocation_map,
      auditLog: (state.data.audit_log || []).slice(-50).reverse(),
    },
    modal: buildModalData(uiState.modal),
  };
}

export function exportData() {
  return JSON.stringify(
    {
      version: VERSION,
      exportDate: new Date().toISOString(),
      tables: state.data,
    },
    null,
    2,
  );
}

export function importData(payload) {
  const raw = typeof payload === "string" ? JSON.parse(payload) : payload;
  if (!raw || typeof raw !== "object") {
    throw new Error("Dữ liệu import không hợp lệ.");
  }
  if (!raw.tables) {
    throw new Error("Thiếu trường tables trong file JSON.");
  }
  validateImportTables(raw.tables);
  const referentialIssues = findReferentialIssues(raw.tables);
  state.data = sanitizeTables(raw.tables);
  state.runtime.welcomePending = false;
  state.runtime.toasts = [];
  state.runtime.banners = [];
  state.runtime.firedAlerts = {};
  state.runtime.dismissedAlerts = {};
  recomputeState();
  if (referentialIssues.length > 0) {
    queueToast({
      level: "warning",
      title: "Import có liên kết mồ côi",
      message: `Phát hiện ${referentialIssues.length} liên kết trỏ tới bản ghi không tồn tại. Dữ liệu vẫn được nạp, nên kiểm tra lại.`,
      duration: 5000,
    });
    if (typeof console !== "undefined") {
      console.warn("[Import] Liên kết mồ côi:", referentialIssues);
    }
  }
  queueToast({
    level: "success",
    title: "Import thành công",
    message: "Dữ liệu đã được nạp vào ứng dụng.",
    duration: 2800,
  });
  notify();
}

export function seedSampleData() {
  state.data = sanitizeTables(createSampleData());
  state.runtime.welcomePending = false;
  state.runtime.toasts = [];
  state.runtime.banners = [];
  state.runtime.firedAlerts = {};
  state.runtime.dismissedAlerts = {};
  recomputeState();
}

export function startEmptyData() {
  state.data = createEmptyData();
  state.runtime.welcomePending = false;
  state.runtime.toasts = [];
  state.runtime.banners = [];
  state.runtime.firedAlerts = {};
  state.runtime.dismissedAlerts = {};
  recomputeState();
}

export function resetAllData(confirmText) {
  const normalized = String(confirmText || "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (normalized !== "XOA") {
    throw new Error('Bạn cần nhập "XÓA" (chấp nhận cả "XOA").');
  }
  startEmptyData();
  queueToast({
    level: "warning",
    title: "Đã làm mới dữ liệu",
    message: "Ứng dụng đang ở trạng thái trống.",
  });
  notify();
}

export function dismissToast(id) {
  const target = state.runtime.toasts.find((toast) => toast.id === id);
  if (target?.key) {
    state.runtime.dismissedAlerts[target.key] = true;
  }
  state.runtime.toasts = state.runtime.toasts.filter((toast) => toast.id !== id);
  notify();
}

export function dismissBanner(key) {
  if (!key) {
    return;
  }
  state.runtime.dismissedAlerts[key] = true;
  state.runtime.banners = state.runtime.banners.filter((banner) => banner.key !== key);
  notify();
}

export function upsertTransaction(record) {
  // FIX 3: Message không chứa "mua" khi type là asset_sale
  if (record.type === "asset_purchase" || record.type === "asset_sale") {
    throw new Error("Giao dịch mua/bán tài sản phải được tạo qua màn hình Danh mục.");
  }
  // FIX 5: Validate amount > 0 cho income/expense
  const amount = roundInt(record.amount);
  if ((record.type === "income" || record.type === "expense") && amount <= 0) {
    throw new Error("Số tiền thu/chi phải lớn hơn 0.");
  }
  if (
    record.id &&
    state.data.asset_transactions.some((assetTransaction) => assetTransaction.mirror_transaction_id === record.id)
  ) {
    throw new Error("Giao dịch này được tạo từ ledger tài sản. Vui lòng sửa tại Danh Mục ĐT > Giao dịch.");
  }
  const existingIndex = state.data.transactions.findIndex((item) => item.id === record.id);
  const normalized = {
    ...record,
    id: record.id || createId("txn"),
    created_at: record.created_at || todayIso(),
    notes: record.notes || "",
    amount: roundInt(record.amount),
    affect_bucket: record.type === "transfer" ? Boolean(record.affect_bucket) : false,
    bucket_id: record.type === "transfer" ? record.bucket_id || "" : "",
    bucket_impact: record.type === "transfer" && record.bucket_impact === "withdraw" ? "withdraw" : "allocate",
    trigger_allocation:
      record.type === "loan_disbursement" || record.type === "asset_sale" || record.type === "balance_adjustment" || record.type === "lending" || record.type === "collection"
        ? false
        : record.trigger_allocation !== false,
  };

  if (existingIndex >= 0) {
    const previous = state.data.transactions[existingIndex];
    recordAudit("update", "transaction", normalized.id, {
      before: { type: previous.type, amount: previous.amount, date: previous.date, category: previous.category },
      after: { type: normalized.type, amount: normalized.amount, date: normalized.date, category: normalized.category },
    });
    state.data.transactions.splice(existingIndex, 1, normalized);
  } else {
    state.data.transactions.push(normalized);
  }
  state.runtime.welcomePending = false;
  recomputeState();

  const shouldSuggestAllocation =
    normalized.type === "income" &&
    normalized.trigger_allocation !== false &&
    normalized.amount >= safeNumber(state.data.user_settings.min_allocation_trigger);

  return shouldSuggestAllocation ? { amount: normalized.amount } : null;
}

export function deleteTransaction(id, matcher = {}) {
  let targetId = id;
  if (!targetId) {
    // Safety check: matcher must have at least date or type to avoid accidental deletion
    if (!matcher.date && !matcher.type && !matcher.account_id) {
      throw new Error("Không tìm thấy giao dịch để xóa. Cần cung cấp thông tin định danh (ngày, loại, hoặc tài khoản).");
    }
    // Safety check: matcher.amount must be a valid positive number
    if (matcher.amount === undefined || matcher.amount === null || safeNumber(matcher.amount) <= 0) {
      throw new Error("Không tìm thấy giao dịch để xóa. Số tiền không hợp lệ.");
    }
    const matched = state.data.transactions.find((transaction) => {
      const amountMatch = roundInt(transaction.amount) === roundInt(matcher.amount);
      const dateMatch = !matcher.date || transaction.date === matcher.date;
      const typeMatch = !matcher.type || transaction.type === matcher.type;
      const accountMatch =
        !matcher.account_id ||
        [transaction.account_id, transaction.from_account_id, transaction.to_account_id].includes(matcher.account_id);
      return amountMatch && dateMatch && typeMatch && accountMatch;
    });
    targetId = matched?.id || "";
  }
  if (!targetId) {
    throw new Error("Không tìm thấy giao dịch để xóa.");
  }
  const linkedAssetTxnId = getLinkedAssetTxnIdFromMirrorId(targetId);
  state.data.asset_transactions = state.data.asset_transactions.filter(
    (transaction) => transaction.mirror_transaction_id !== targetId && transaction.id !== linkedAssetTxnId,
  );
  // Cascade cleanup: sync receivable_payments/debt_payments + restore remaining_amount
  const targetTxn = state.data.transactions.find((t) => t.id === targetId);
  if (targetTxn?.receivable_id) {
    const removedPayments = state.data.receivable_payments.filter(
      (p) => p.receivable_id === targetTxn.receivable_id && p.date === targetTxn.date && roundInt(p.amount) === roundInt(targetTxn.amount),
    );
    state.data.receivable_payments = state.data.receivable_payments.filter((p) => !removedPayments.includes(p));
    const receivable = state.data.receivables.find((r) => r.id === targetTxn.receivable_id);
    if (receivable) {
      const restoredAmount = removedPayments.reduce((sum, p) => sum + safeNumber(p.amount), 0);
      if (restoredAmount > 0) {
        // Có payment record — khôi phục remaining_amount từ payment
        receivable.remaining_amount = roundInt(safeNumber(receivable.remaining_amount) + restoredAmount);
      } else {
        // Không có payment record (vd: "cho vay thêm" từ counterparty flow) — đảo ngược original_amount + remaining_amount
        receivable.original_amount = roundInt(Math.max(0, safeNumber(receivable.original_amount) - safeNumber(targetTxn.amount)));
        receivable.remaining_amount = roundInt(Math.max(0, safeNumber(receivable.remaining_amount) - safeNumber(targetTxn.amount)));
      }
    }
  }
  if (targetTxn?.liability_id) {
    const removedPayments = state.data.debt_payments.filter(
      (p) => p.liability_id === targetTxn.liability_id && p.date === targetTxn.date && roundInt(p.total_payment) === roundInt(targetTxn.amount),
    );
    state.data.debt_payments = state.data.debt_payments.filter((p) => !removedPayments.includes(p));
    const liability = state.data.liabilities.find((l) => l.id === targetTxn.liability_id);
    if (liability) {
      const restoredPrincipal = removedPayments.reduce((sum, p) => sum + safeNumber(p.principal_amount), 0);
      if (restoredPrincipal > 0) {
        liability.remaining_amount = roundInt(safeNumber(liability.remaining_amount) + restoredPrincipal);
      } else {
        // Không có payment record — đảo ngược trực tiếp
        liability.remaining_amount = roundInt(Math.max(0, safeNumber(liability.remaining_amount) - safeNumber(targetTxn.amount)));
      }
    }
  }
  state.data.transactions = state.data.transactions.filter((transaction) => transaction.id !== targetId);
  recordAudit("delete", "transaction", targetId, targetTxn
    ? { type: targetTxn.type, amount: targetTxn.amount, date: targetTxn.date, category: targetTxn.category }
    : null);
  recomputeState();
}

export function upsertAccount(record) {
  if (record.type === "credit_card" && safeNumber(record.credit_limit) < 0) {
    throw new Error("Hạn mức thẻ tín dụng không được âm.");
  }
  const shouldUpdate = record?._mode === "edit" && Boolean(record.id);
  const nextId = shouldUpdate ? record.id : createId("acc");
  const openingBalance = roundInt(record.opening_balance);
  const openingDate = record.opening_date || record.last_updated || todayIso();
  const normalized = {
    ...record,
    id: nextId,
    created_at: record.created_at || todayIso(),
    credit_limit: roundInt(record.credit_limit),
    grace_period_days: roundInt(record.grace_period_days),
    interest_rate_cc: safeNumber(record.interest_rate_cc),
    is_active: record.is_active !== false,
    last_updated: record.last_updated || todayIso(),
  };
  delete normalized.opening_balance;
  delete normalized.opening_date;
  delete normalized._mode;
  const index = state.data.cash_accounts.findIndex((item) => item.id === normalized.id);
  if (index >= 0) {
    state.data.cash_accounts.splice(index, 1, normalized);
  } else {
    state.data.cash_accounts.push(normalized);
  }

  const existingOpeningIndex = state.data.transactions.findIndex(
    (transaction) => transaction.type === "opening_balance" && transaction.account_id === normalized.id,
  );
  if (openingBalance !== 0) {
    const openingTxn = {
      id: existingOpeningIndex >= 0 ? state.data.transactions[existingOpeningIndex].id : createId("txn"),
      date: openingDate,
      type: "opening_balance",
      account_id: normalized.id,
      amount: openingBalance,
      category: "Vốn có sẵn",
      description: `Số dư ban đầu ${normalized.name}`.trim(),
      trigger_allocation: false,
      notes: "__auto_opening_balance__",
      created_at:
        existingOpeningIndex >= 0 ? state.data.transactions[existingOpeningIndex].created_at || todayIso() : todayIso(),
    };
    if (existingOpeningIndex >= 0) {
      state.data.transactions.splice(existingOpeningIndex, 1, openingTxn);
    } else {
      state.data.transactions.push(openingTxn);
    }
  } else if (existingOpeningIndex >= 0 && state.data.transactions[existingOpeningIndex].notes === "__auto_opening_balance__") {
    state.data.transactions.splice(existingOpeningIndex, 1);
  }

  recomputeState();
}

export function deleteAccount(id) {
  const account = state.data.cash_accounts.find((item) => item.id === id);
  if (!account) {
    throw new Error("Không tìm thấy tài khoản để xóa.");
  }

  const linkedTransactions = state.data.transactions.filter(
    (transaction) => [transaction.account_id, transaction.from_account_id, transaction.to_account_id].includes(id),
  );
  const autoOpeningTransactions = linkedTransactions.filter(
    (transaction) =>
      transaction.type === "opening_balance" &&
      transaction.account_id === id &&
      transaction.notes === "__auto_opening_balance__",
  );
  const blockingTransactions = linkedTransactions.filter(
    (transaction) =>
      !(
        transaction.type === "opening_balance" &&
        transaction.account_id === id &&
        transaction.notes === "__auto_opening_balance__"
      ),
  );
  const linkedAssetTransactions = state.data.asset_transactions.filter((transaction) => transaction.account_id === id);
  const linkedDebtPayments = state.data.debt_payments.filter((payment) => payment.from_account_id === id);
  const linkedReceivablePayments = state.data.receivable_payments.filter((payment) => payment.to_account_id === id);

  if (
    blockingTransactions.length > 0 ||
    linkedAssetTransactions.length > 0 ||
    linkedDebtPayments.length > 0 ||
    linkedReceivablePayments.length > 0
  ) {
    throw new Error(
      `Không thể xóa tài khoản "${account.name}" vì còn dữ liệu liên quan: ` +
        `${blockingTransactions.length} giao dịch, ` +
        `${linkedAssetTransactions.length} giao dịch tài sản, ` +
        `${linkedDebtPayments.length} thanh toán nợ, ` +
        `${linkedReceivablePayments.length} thu nợ.`,
    );
  }

  state.data.cash_accounts = state.data.cash_accounts.filter((item) => item.id !== id);
  if (autoOpeningTransactions.length > 0) {
    const openingIds = new Set(autoOpeningTransactions.map((item) => item.id));
    state.data.transactions = state.data.transactions.filter((transaction) => !openingIds.has(transaction.id));
  }
  recordAudit("delete", "account", id, { name: account.name, type: account.type });
  recomputeState();
}

export function upsertAsset(record) {
  const normalized = {
    ...record,
    id: record.id || createId("asset"),
    created_at: record.created_at || todayIso(),
    asset_type: normalizeAssetType(record.asset_type),
    current_price: safeNumber(record.current_price),
    interest_rate: safeNumber(record.interest_rate),
    term_months: roundInt(record.term_months),
    auto_rollover: Boolean(record.auto_rollover),
    is_pledged: Boolean(record.is_pledged),
    exercise_price: safeNumber(record.exercise_price),
    conversion_ratio: safeNumber(record.conversion_ratio),
  };
  const index = state.data.assets.findIndex((item) => item.id === normalized.id);
  if (index >= 0) {
    state.data.assets.splice(index, 1, normalized);
  } else {
    state.data.assets.push(normalized);
  }
  recomputeState();
}

export function deleteAsset(assetId) {
  const asset = state.data.assets.find((item) => item.id === assetId);
  state.data.asset_transactions = state.data.asset_transactions.filter(
    (txn) => txn.asset_id !== assetId,
  );
  state.data.assets = state.data.assets.filter((item) => item.id !== assetId);
  recordAudit("delete", "asset", assetId, asset ? { name: asset.name, asset_type: asset.asset_type } : null);
  recomputeState();
}

function buildMirrorTransaction(assetTxn) {
  const assetName = state.data.assets.find((asset) => asset.id === assetTxn.asset_id)?.name || "Tài sản";
  if (assetTxn.action === "OPENING") {
    return null;
  }
  if (assetTxn.action === "BUY" || assetTxn.action === "REALLOCATE") {
    return {
      id: assetTxn.mirror_transaction_id || createId("txn"),
      date: assetTxn.date,
      type: "asset_purchase",
      account_id: assetTxn.account_id,
      amount: roundInt(assetTxn.total_cash),
      category: assetTxn.action === "REALLOCATE" ? "Tái phân bổ" : "Đầu tư tài sản",
      description: assetTxn.action === "REALLOCATE" ? `Tái phân bổ ${assetName}` : `Mua ${assetName}`,
      asset_id: assetTxn.asset_id,
      trigger_allocation: false,
      notes: assetTxn.notes || "",
      created_at: assetTxn.created_at || todayIso(),
    };
  }
  if (assetTxn.action === "SELL") {
    return {
      id: assetTxn.mirror_transaction_id || createId("txn"),
      date: assetTxn.date,
      type: "asset_sale",
      to_account_id: assetTxn.account_id,
      amount: roundInt(assetTxn.total_cash),
      category: "Thoái vốn",
      description: `Bán ${assetName}`,
      asset_id: assetTxn.asset_id,
      trigger_allocation: false,
      notes: assetTxn.notes || "",
      created_at: assetTxn.created_at || todayIso(),
    };
  }
  if (assetTxn.action === "DIVIDEND" || assetTxn.action === "INTEREST") {
    return {
      id: assetTxn.mirror_transaction_id || createId("txn"),
      date: assetTxn.date,
      type: "income",
      account_id: assetTxn.account_id,
      amount: roundInt(assetTxn.total_cash),
      category: assetTxn.action === "DIVIDEND" ? "Cổ tức" : "Lãi tiết kiệm",
      description: `${assetTxn.action === "DIVIDEND" ? "Nhận cổ tức" : "Nhận lãi"} ${assetName}`,
      asset_id: assetTxn.asset_id,
      income_source: assetTxn.action === "DIVIDEND" ? "Cổ tức" : "Lãi tiết kiệm",
      income_frequency: "irregular",
      trigger_allocation: false,
      notes: assetTxn.notes || "",
      created_at: assetTxn.created_at || todayIso(),
    };
  }
  return null;
}

function resolveMirrorTransactionId(assetTxn, previous) {
  const explicitId = assetTxn.mirror_transaction_id || previous?.mirror_transaction_id;
  if (explicitId && state.data.transactions.some((item) => item.id === explicitId)) {
    return explicitId;
  }

  const conventionId = `${assetTxn.id}-cash`;
  if (state.data.transactions.some((item) => item.id === conventionId)) {
    return conventionId;
  }

  const expectedType =
    assetTxn.action === "BUY"
      ? "asset_purchase"
      : assetTxn.action === "SELL"
        ? "asset_sale"
        : assetTxn.action === "DIVIDEND" || assetTxn.action === "INTEREST"
          ? "income"
          : "";

  if (!expectedType) {
    return "";
  }

  const fallback = state.data.transactions
    .slice()
    .reverse()
    .find((item) => {
      if (item.type !== expectedType || item.asset_id !== assetTxn.asset_id || item.date !== assetTxn.date) {
        return false;
      }
      if (expectedType === "asset_purchase") {
        return item.account_id === assetTxn.account_id;
      }
      if (expectedType === "asset_sale") {
        return item.to_account_id === assetTxn.account_id;
      }
      if (assetTxn.action === "DIVIDEND") {
        return item.account_id === assetTxn.account_id && item.category === "Cổ tức";
      }
      return item.account_id === assetTxn.account_id && item.category === "Lãi tiết kiệm";
    });

  return fallback?.id || "";
}

export function upsertAssetTransaction(record) {
  const previous = state.data.asset_transactions.find((item) => item.id === record.id);
  const normalized = {
    ...record,
    id: record.id || createId("asset-txn"),
    created_at: record.created_at || todayIso(),
    action: String(record.action || "").toUpperCase(),
    quantity: safeNumber(record.quantity),
    price: safeNumber(record.price),
    fee: safeNumber(record.fee),
    total_cash: roundInt(record.total_cash),
  };

  if (!normalized.total_cash) {
    normalized.total_cash = roundInt(
      normalized.quantity * normalized.price +
        (normalized.action === "BUY" ? normalized.fee : normalized.action === "SELL" ? -normalized.fee : 0),
    );
  }

  if (normalized.action === "OPENING") {
    normalized.mirror_transaction_id = null;
    if (previous?.mirror_transaction_id) {
      state.data.transactions = state.data.transactions.filter(
        (transaction) => transaction.id !== previous.mirror_transaction_id,
      );
    }
  } else {
    normalized.mirror_transaction_id = resolveMirrorTransactionId(normalized, previous);
    const mirror = buildMirrorTransaction(normalized);
    if (mirror) {
      normalized.mirror_transaction_id = mirror.id;
      const mirrorIndex = state.data.transactions.findIndex((item) => item.id === mirror.id);
      if (mirrorIndex >= 0) {
        state.data.transactions.splice(mirrorIndex, 1, mirror);
      } else {
        state.data.transactions.push(mirror);
      }
    } else if (previous?.mirror_transaction_id) {
      state.data.transactions = state.data.transactions.filter(
        (transaction) => transaction.id !== previous.mirror_transaction_id,
      );
    }
  }

  const index = state.data.asset_transactions.findIndex((item) => item.id === normalized.id);
  if (index >= 0) {
    state.data.asset_transactions.splice(index, 1, normalized);
  } else {
    state.data.asset_transactions.push(normalized);
  }

  recomputeState();

  if (normalized.action === "SELL" && normalized.quantity > 0 && normalized.total_cash > 0) {
    return {
      suggestReinvest: {
        amount: normalized.total_cash,
        assetId: normalized.asset_id,
      },
    };
  }
  return null;
}

export function deleteAssetTransaction(id) {
  const target = state.data.asset_transactions.find((item) => item.id === id);
  if (target?.mirror_transaction_id) {
    state.data.transactions = state.data.transactions.filter(
      (transaction) => transaction.id !== target.mirror_transaction_id,
    );
  }
  state.data.asset_transactions = state.data.asset_transactions.filter((item) => item.id !== id);
  recordAudit("delete", "asset_transaction", id, target
    ? { action: target.action, asset_id: target.asset_id, date: target.date, quantity: target.quantity, total_cash: target.total_cash }
    : null);
  recomputeState();
}

function getLinkedAssetTxnIdFromMirrorId(transactionId) {
  if (!String(transactionId).endsWith("-cash")) {
    return "";
  }
  return String(transactionId).slice(0, -5);
}

export function updateAssetPrice(assetId, currentPrice) {
  const asset = state.data.assets.find((item) => item.id === assetId);
  if (!asset) {
    return;
  }
  const price = safeNumber(currentPrice);
  if (price < 0) {
    throw new Error("Giá tài sản không được âm.");
  }
  asset.current_price = price;
  asset.last_price_update = todayIso();
  recomputeState();
}

export function recordDerivativeBalanceUpdate({ accountId, actualBalance, classification, notes, date }) {
  const account = state.data.cash_accounts.find((item) => item.id === accountId);
  if (!account) {
    throw new Error("Không tìm thấy tài khoản để cập nhật số dư.");
  }
  if (!["investment", "derivative", "securities_cash"].includes(account.type)) {
    throw new Error("Chỉ tài khoản đầu tư/phái sinh mới hỗ trợ cập nhật số dư.");
  }
  const currentBalance = getAccountBalance(accountId, state.data.transactions);
  const difference = roundInt(actualBalance - currentBalance);
  if (difference === 0) {
    return;
  }
  state.data.transactions.push({
    id: createId("txn"),
    date: date || todayIso(),
    type: "balance_adjustment",
    account_id: accountId,
    amount: difference,
    category: classification || "thủ công",
    description: `Điều chỉnh số dư ${account?.name || ""}`.trim(),
    notes: notes || "",
    created_at: todayIso(),
  });
  if (account) {
    account.last_updated = date || todayIso();
  }
  recomputeState();
}

export function upsertLiability(record) {
  const normalized = {
    ...record,
    id: record.id || createId("liability"),
    created_at: record.created_at || todayIso(),
    counterparty: normalizeCounterpartyName(record.counterparty || ""),
    total_amount: roundInt(record.total_amount),
    remaining_amount: roundInt(record.remaining_amount),
    interest_rate: safeNumber(record.interest_rate),
    monthly_payment: roundInt(record.monthly_payment),
  };
  const index = state.data.liabilities.findIndex((item) => item.id === normalized.id);
  if (index >= 0) {
    state.data.liabilities.splice(index, 1, normalized);
  } else {
    state.data.liabilities.push(normalized);
  }
  recomputeState();
}

export function deleteLiability(liabilityId) {
  const liability = state.data.liabilities.find((item) => item.id === liabilityId);
  state.data.liabilities = state.data.liabilities.filter((item) => item.id !== liabilityId);
  recordAudit("delete", "liability", liabilityId, liability
    ? { name: liability.name, remaining_amount: liability.remaining_amount }
    : null);
  recomputeState();
}

export function recordCounterpartyFlow({
  counterparty,
  side,
  direction,
  amount,
  accountId,
  date,
  notes,
  liabilityId,
  receivableId,
}) {
  const cp = normalizeCounterpartyName(counterparty);
  if (!cp) {
    throw new Error("Vui lòng nhập đối tượng công nợ.");
  }
  if (!["liability", "receivable"].includes(side)) {
    throw new Error("Loại công nợ không hợp lệ.");
  }
  if (!["increase", "decrease"].includes(direction)) {
    throw new Error("Chiều biến động không hợp lệ.");
  }
  const flowAmount = roundInt(amount);
  if (flowAmount <= 0) {
    throw new Error("Số tiền phải lớn hơn 0.");
  }
  if (!accountId) {
    throw new Error("Vui lòng chọn tài khoản tiền.");
  }
  const account = state.data.cash_accounts.find((item) => item.id === accountId);
  if (!account || account.type === "credit_card") {
    throw new Error("Tài khoản tiền không hợp lệ.");
  }
  const flowDate = date || todayIso();

  if (side === "liability") {
    let liability = liabilityId
      ? state.data.liabilities.find((item) => item.id === liabilityId)
      : state.data.liabilities.find((item) => getCounterpartyKey(item.counterparty || item.name) === getCounterpartyKey(cp));
    if (!liability) {
      liability = {
        id: createId("liability"),
        name: `Nợ ${cp}`,
        counterparty: cp,
        type: "loan",
        total_amount: 0,
        remaining_amount: 0,
        interest_rate: 0,
        monthly_payment: 0,
        start_date: flowDate,
        end_date: "",
        notes: "",
        created_at: todayIso(),
      };
      state.data.liabilities.push(liability);
    }
    liability.counterparty = cp;

    if (direction === "increase") {
      liability.total_amount = roundInt(safeNumber(liability.total_amount) + flowAmount);
      liability.remaining_amount = roundInt(safeNumber(liability.remaining_amount) + flowAmount);
      state.data.transactions.push({
        id: createId("txn"),
        date: flowDate,
        type: "loan_disbursement",
        account_id: accountId,
        amount: flowAmount,
        category: "Vay thêm",
        description: `Vay thêm từ ${cp}`,
        liability_id: liability.id,
        trigger_allocation: false,
        notes: notes || "",
        created_at: todayIso(),
      });
    } else {
      if (flowAmount > safeNumber(liability.remaining_amount)) {
        throw new Error("Số tiền trả vượt quá dư nợ còn lại.");
      }
      liability.remaining_amount = roundInt(safeNumber(liability.remaining_amount) - flowAmount);
      state.data.debt_payments.push({
        id: createId("debt-payment"),
        date: flowDate,
        liability_id: liability.id,
        from_account_id: accountId,
        total_payment: flowAmount,
        principal_amount: flowAmount,
        interest_amount: 0,
        notes: notes || "Trả gốc nhanh theo đối tượng",
        created_at: todayIso(),
      });
      state.data.transactions.push({
        id: createId("txn"),
        date: flowDate,
        type: "expense",
        account_id: accountId,
        amount: flowAmount,
        category: "Trả nợ vay",
        description: `Trả nợ ${cp}`,
        liability_id: liability.id,
        trigger_allocation: false,
        notes: notes || "",
        created_at: todayIso(),
      });
    }
  } else {
    let receivable = receivableId
      ? state.data.receivables.find((item) => item.id === receivableId)
      : state.data.receivables.find((item) => getCounterpartyKey(item.counterparty || item.name) === getCounterpartyKey(cp));
    if (!receivable) {
      receivable = {
        id: createId("recv"),
        name: `Cho vay ${cp}`,
        type: "personal_loan",
        counterparty: cp,
        original_amount: 0,
        remaining_amount: 0,
        start_date: flowDate,
        expected_return_date: "",
        is_secured: false,
        likelihood: "medium",
        is_pledged: false,
        notes: "",
        created_at: todayIso(),
      };
      state.data.receivables.push(receivable);
    }
    receivable.counterparty = cp;

    if (direction === "increase") {
      receivable.original_amount = roundInt(safeNumber(receivable.original_amount) + flowAmount);
      receivable.remaining_amount = roundInt(safeNumber(receivable.remaining_amount) + flowAmount);
      state.data.transactions.push({
        id: createId("txn"),
        date: flowDate,
        type: "expense",
        account_id: accountId,
        amount: flowAmount,
        category: "Cho vay",
        description: `Cho ${cp} vay thêm`,
        receivable_id: receivable.id,
        trigger_allocation: false,
        notes: notes || "",
        created_at: todayIso(),
      });
    } else {
      if (flowAmount > safeNumber(receivable.remaining_amount)) {
        throw new Error("Số tiền thu vượt quá khoản còn phải thu.");
      }
      receivable.remaining_amount = roundInt(safeNumber(receivable.remaining_amount) - flowAmount);
      state.data.receivable_payments.push({
        id: createId("recv-payment"),
        receivable_id: receivable.id,
        date: flowDate,
        amount: flowAmount,
        to_account_id: accountId,
        notes: notes || "Thu nợ nhanh theo đối tượng",
        created_at: todayIso(),
      });
      state.data.transactions.push({
        id: createId("txn"),
        date: flowDate,
        type: "income",
        account_id: accountId,
        amount: flowAmount,
        category: "Thu hồi nợ",
        description: `Thu nợ ${cp}`,
        receivable_id: receivable.id,
        trigger_allocation: false,
        notes: notes || "",
        created_at: todayIso(),
      });
    }
  }

  recomputeState();
}

export function recordDebtPayment({ liabilityId, principalAmount, fromAccountId, date, notes }) {
  const liability = state.data.liabilities.find((item) => item.id === liabilityId);
  if (!liability) {
    throw new Error("Không tìm thấy khoản nợ.");
  }
  if (!fromAccountId) {
    throw new Error("Vui lòng chọn tài khoản thanh toán.");
  }
  const payerAccount = state.data.cash_accounts.find((item) => item.id === fromAccountId);
  if (!payerAccount) {
    throw new Error("Tài khoản thanh toán không tồn tại.");
  }
  const interestAmount = calcMonthlyInterest(liability);
  const principal = roundInt(principalAmount);
  if (principal < 0) {
    throw new Error("Số tiền gốc phải lớn hơn hoặc bằng 0.");
  }
  if (principal > safeNumber(liability.remaining_amount)) {
    throw new Error("Số tiền gốc vượt quá dư nợ còn lại.");
  }
  const totalPayment = principal + interestAmount;

  liability.remaining_amount = Math.max(0, roundInt(safeNumber(liability.remaining_amount) - principal));
  state.data.debt_payments.push({
    id: createId("debt-payment"),
    date: date || todayIso(),
    liability_id: liabilityId,
    from_account_id: fromAccountId,
    total_payment: totalPayment,
    principal_amount: principal,
    interest_amount: interestAmount,
    notes: notes || "",
    created_at: todayIso(),
  });
  state.data.transactions.push({
    id: createId("txn"),
    date: date || todayIso(),
    type: "expense",
    account_id: fromAccountId,
    amount: totalPayment,
    category: "Trả nợ vay",
    description: `Thanh toán ${liability.name}`,
    liability_id: liabilityId,
    notes: notes || "",
    created_at: todayIso(),
  });
  recomputeState();
}

export function upsertReceivable(record) {
  const isEditing = Boolean(record.id);
  const existing = isEditing ? state.data.receivables.find((item) => item.id === record.id) : null;
  const normalized = {
    ...record,
    id: record.id || createId("recv"),
    created_at: record.created_at || existing?.created_at || todayIso(),
    counterparty: normalizeCounterpartyName(record.counterparty || ""),
    original_amount: roundInt(record.original_amount),
    remaining_amount: roundInt(record.remaining_amount),
    is_secured: Boolean(record.is_secured),
    is_pledged: Boolean(record.is_pledged),
    likelihood: record.likelihood || "medium",
  };
  const sourceAccountId = record.account_id || "";
  delete normalized.account_id;

  const paymentRows = (state.data.receivable_payments || []).filter(
    (payment) => payment.receivable_id === normalized.id,
  );
  if (paymentRows.length) {
    const paid = roundInt(paymentRows.reduce((sum, payment) => sum + safeNumber(payment.amount), 0));
    // Only recalculate if this is a new receivable or if original_amount changed
    // For editing, preserve user's remaining_amount if they explicitly set it
    const existingReceivable = isEditing ? state.data.receivables.find((item) => item.id === normalized.id) : null;
    if (!isEditing || !existingReceivable) {
      normalized.remaining_amount = Math.max(0, roundInt(normalized.original_amount - paid));
    } else if (normalized.original_amount !== existingReceivable.original_amount) {
      // Original amount changed, recalculate
      normalized.remaining_amount = Math.max(0, roundInt(normalized.original_amount - paid));
    }
    // If editing and original_amount didn't change, keep user's remaining_amount
  } else if (!isEditing && normalized.original_amount > 0 && normalized.remaining_amount <= 0) {
    normalized.remaining_amount = normalized.original_amount;
  }

  const index = state.data.receivables.findIndex((item) => item.id === normalized.id);
  if (index >= 0) {
    state.data.receivables.splice(index, 1, normalized);
  } else {
    state.data.receivables.push(normalized);
    if (sourceAccountId && normalized.original_amount > 0) {
      state.data.transactions.push({
        id: createId("txn"),
        date: normalized.start_date || todayIso(),
        type: "expense",
        account_id: sourceAccountId,
        amount: normalized.original_amount,
        category: "Cho vay",
        description: `Cho vay: ${normalized.name}`,
        receivable_id: normalized.id,
        trigger_allocation: false,
        notes: normalized.notes || "",
        created_at: todayIso(),
      });
    }
  }
  recomputeState();
}

export function recordReceivablePayment(receivableId, amount, toAccountId, date, notes) {
  const receivable = state.data.receivables.find((item) => item.id === receivableId);
  if (!receivable) {
    throw new Error("Không tìm thấy khoản cho vay.");
  }
  const paymentAmount = roundInt(amount);
  if (paymentAmount <= 0) {
    throw new Error("Số tiền thu phải lớn hơn 0.");
  }
  if (paymentAmount > safeNumber(receivable.remaining_amount)) {
    throw new Error("Số tiền thu vượt quá số dư còn lại.");
  }
  if (!toAccountId) {
    throw new Error("Vui lòng chọn tài khoản nhận.");
  }
  const targetAccount = state.data.cash_accounts.find((item) => item.id === toAccountId);
  if (!targetAccount) {
    throw new Error("Tài khoản nhận không tồn tại.");
  }

  const paymentDate = date || todayIso();
  state.data.receivable_payments.push({
    id: createId("recv-payment"),
    receivable_id: receivableId,
    date: paymentDate,
    amount: paymentAmount,
    to_account_id: toAccountId,
    notes: notes || "",
    created_at: todayIso(),
  });
  state.data.transactions.push({
    id: createId("txn"),
    date: paymentDate,
    type: "income",
    account_id: toAccountId,
    amount: paymentAmount,
    category: "Thu hồi nợ",
    description: `Thu nợ ${receivable.name}`,
    receivable_id: receivableId,
    trigger_allocation: false,
    notes: notes || "",
    created_at: todayIso(),
  });
  receivable.remaining_amount = Math.max(0, roundInt(safeNumber(receivable.remaining_amount) - paymentAmount));
  recomputeState();
}

export function deleteReceivable(id) {
  const receivable = state.data.receivables.find((item) => item.id === id);
  state.data.receivable_payments = state.data.receivable_payments.filter((item) => item.receivable_id !== id);
  state.data.receivables = state.data.receivables.filter((item) => item.id !== id);
  recordAudit("delete", "receivable", id, receivable
    ? { name: receivable.name, remaining_amount: receivable.remaining_amount }
    : null);
  recomputeState();
}

export function upsertGoal(record) {
  const normalized = {
    ...record,
    id: record.id || createId("goal"),
    created_at: record.created_at || todayIso(),
    target_amount: roundInt(record.target_amount),
    linked_sources: ensureArray(record.linked_sources),
  };
  const index = state.data.goals.findIndex((item) => item.id === normalized.id);
  if (index >= 0) {
    state.data.goals.splice(index, 1, normalized);
  } else {
    state.data.goals.push(normalized);
  }
  recomputeState();
}

export function deleteGoal(id) {
  const goal = state.data.goals.find((item) => item.id === id);
  state.data.goals = state.data.goals.filter((goal) => goal.id !== id);
  recordAudit("delete", "goal", id, goal ? { name: goal.name, target_amount: goal.target_amount } : null);
  recomputeState();
}

export function updateGeneralSettings(patch) {
  state.data.user_settings = {
    ...state.data.user_settings,
    ...patch,
  };
  recomputeState();
}

export function updateAllocationBuckets(nextBucketsById) {
  const rule = getActiveAllocationRule();
  rule.buckets = rule.buckets.map((bucket) => ({
    ...bucket,
    percentage:
      typeof nextBucketsById?.[bucket.id] === "number"
        ? roundInt(nextBucketsById[bucket.id])
        : roundInt(nextBucketsById?.[bucket.id]?.percentage ?? bucket.percentage),
    rolloverType: nextBucketsById?.[bucket.id]?.rolloverType || bucket.rolloverType || "accumulate",
    targetBucketId: nextBucketsById?.[bucket.id]?.targetBucketId ?? bucket.targetBucketId ?? "",
    defaultCategories: Array.isArray(nextBucketsById?.[bucket.id]?.defaultCategories)
      ? nextBucketsById[bucket.id].defaultCategories.filter(Boolean)
      : Array.isArray(bucket.defaultCategories)
        ? bucket.defaultCategories
        : [],
  }));

  const nextCategoryMap = {
    ...(state.data.user_settings.category_allocation_map || {}),
  };
  const nextExpenseCategories = new Set(state.data.user_settings.expense_categories || []);
  rule.buckets
    .filter((bucket) => bucket.type === "expense_budget")
    .forEach((bucket) => {
      (bucket.defaultCategories || []).forEach((category) => {
        if (!category) {
          return;
        }
        nextCategoryMap[category] = bucket.id;
        nextExpenseCategories.add(category);
      });
    });

  state.data.user_settings.category_allocation_map = nextCategoryMap;
  state.data.user_settings.expense_categories = Array.from(nextExpenseCategories);
  recomputeState();
}

export function updateBucketTargets(targets) {
  state.data.user_settings.bucket_targets = {
    ...state.data.user_settings.bucket_targets,
    ...targets,
  };
  recomputeState();
}

export function updateCategoryMapping(nextMap) {
  state.data.user_settings.category_allocation_map = {
    ...(state.data.user_settings.category_allocation_map || {}),
    ...nextMap,
  };
  recomputeState();
}

export function replaceCategories({ income_categories, expense_categories }) {
  const nextIncome = ensureArray(income_categories).map((item) => String(item).trim()).filter(Boolean);
  const nextExpense = ensureArray(expense_categories).map((item) => String(item).trim()).filter(Boolean);

  state.data.user_settings.income_categories = nextIncome;
  state.data.user_settings.expense_categories = nextExpense;

  const allowedExpenseSet = new Set(nextExpense);
  const nextMap = {};
  Object.entries(state.data.user_settings.category_allocation_map || {}).forEach(([category, bucketId]) => {
    if (allowedExpenseSet.has(category)) {
      nextMap[category] = bucketId;
    }
  });
  state.data.user_settings.category_allocation_map = nextMap;

  const rule = getActiveAllocationRule();
  if (rule?.buckets) {
    const bucketCategoryMap = {};
    Object.entries(nextMap).forEach(([category, bucketId]) => {
      bucketCategoryMap[bucketId] = bucketCategoryMap[bucketId] || [];
      bucketCategoryMap[bucketId].push(category);
    });
    rule.buckets = rule.buckets.map((bucket) => {
      if (bucket.type !== "expense_budget") {
        return bucket;
      }
      return {
        ...bucket,
        defaultCategories: (bucketCategoryMap[bucket.id] || []).slice(),
      };
    });
  }

  recomputeState();
}

export function pushRuntimeToast({ level = "success", title = "Đã lưu", message = "", duration = 2200 }) {
  queueToast({
    level,
    title,
    message,
    duration,
  });
  notify();
}

export function upsertRecurringTemplate(record) {
  const normalized = {
    ...record,
    id: record.id || createId("recurring"),
    created_at: record.created_at || todayIso(),
    amount: roundInt(record.amount),
  };
  const index = state.data.recurring_templates.findIndex((item) => item.id === normalized.id);
  if (index >= 0) {
    state.data.recurring_templates.splice(index, 1, normalized);
  } else {
    state.data.recurring_templates.push(normalized);
  }
  recomputeState();
}

export function deleteRecurringTemplate(id) {
  state.data.recurring_templates = state.data.recurring_templates.filter((item) => item.id !== id);
  recomputeState();
}

export function generateInsight(panelId) {
  const currentMonth = state.derived.currentMonthKey;
  const currentStats = state.derived.monthlyStatsMap[currentMonth] || { income: 0, expense: 0, balance: 0 };

  if (panelId === "unusual-spending") {
    const recentExpenses = state.derived.transactionViews
      .filter((row) => row.type === "expense" && !row.receivable_id && toMonthKey(row.date) === currentMonth)
      .reduce((map, row) => {
        map[row.category] = (map[row.category] || 0) + row.amount;
        return map;
      }, {});
    const topCategory = Object.entries(recentExpenses).sort((a, b) => b[1] - a[1])[0];
    if (!topCategory) {
      return "Chưa có đủ dữ liệu chi tiêu tháng này để phát hiện bất thường.";
    }
    return `${topCategory[0]} đang là khoản chi lớn nhất tháng này với ${formatVND(
      topCategory[1],
    )}. Nên rà lại xem đây là nhu cầu một lần hay đã bắt đầu trở thành nhịp chi cố định.`;
  }

  if (panelId === "rebalance") {
    if (!state.derived.rebalanceAlerts.length) {
      return "Danh mục đang nằm trong biên tái cân bằng cho phép. Chưa cần hành động mạnh.";
    }
    return state.derived.rebalanceAlerts
      .map(
        (bucket) =>
          `${bucket.name} đang lệch ${bucket.deviationLabel} so với mục tiêu ${bucket.target.toFixed(0)}%. Cân nhắc nạp thêm vào nhóm còn thiếu thay vì bán mạnh.`,
      )
      .join(" ");
  }

  if (panelId === "lookup") {
    const biggestAsset = state.derived.topAssets[0];
    const biggestDebt = state.derived.liabilities
      .slice()
      .sort((a, b) => b.remaining_amount - a.remaining_amount)[0];
    return `Tài sản lớn nhất hiện tại là ${biggestAsset?.name || "chưa có"} với giá trị ${formatVND(
      biggestAsset?.currentValue || 0,
    )}. Khoản nợ lớn nhất là ${biggestDebt?.name || "không có"} còn ${formatVND(
      biggestDebt?.remaining_amount || 0,
    )}.`;
  }

  if (panelId === "forecast") {
    const avgIncome = state.derived.rollingBase.avgNonZero || state.derived.rollingBase.avg;
    const avgExpense =
      roundInt(
        state.derived.monthlyStats.reduce((sum, row) => sum + row.expense, 0) /
          Math.max(1, state.derived.monthlyStats.length),
      ) || 0;
    const projectedAnnualBalance = roundInt((avgIncome - avgExpense) * 12);
    return `Nếu giữ nhịp hiện tại, thu nhập chạy trung bình khoảng ${formatVND(
      avgIncome,
    )}/tháng và chi khoảng ${formatVND(avgExpense)}/tháng. Phần dư tiềm năng cả năm vào khoảng ${formatVND(
      projectedAnnualBalance,
    )}.`;
  }

  if (panelId === "idle-cash") {
    const layer1 = state.derived.emergencyFund.layer1;
    const sixMonths = state.derived.averageMonthlyExpense * 6;
    if (layer1 <= sixMonths) {
      return "Lượng tiền mặt đang tương đối gọn, chưa có dấu hiệu dư nhàn rỗi quá lớn ngoài quỹ an toàn.";
    }
    return `Layer 1 hiện có ${formatVND(layer1)}, cao hơn mức 6 tháng chi phí khoảng ${formatVND(
      layer1 - sixMonths,
    )}. Có thể cân nhắc chia phần dư vào bucket tăng trưởng hoặc bảo đảm theo khẩu vị rủi ro.`;
  }

  if (panelId === "irregular-income") {
    return `Thu nhập 6 tháng gần đây có độ lệch chuẩn khoảng ${formatVND(
      state.derived.rollingBase.volatility,
    )}. Mức nền bảo thủ đang là ${formatVND(
      state.derived.rollingBase.conservative,
    )}; nên dùng mức này cho ngân sách cố định thay vì dựa vào tháng đỉnh.`;
  }

  return `Thu tháng này ${formatVND(currentStats.income)}, chi ${formatVND(
    currentStats.expense,
  )}, chênh lệch ${formatVND(currentStats.balance)}.`;
}
