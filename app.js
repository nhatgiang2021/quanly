import {
  buildViewModel,
  dismissBanner,
  deleteAsset,
  deleteAssetTransaction,
  deleteAccount,
  deleteGoal,
  deleteLiability,
  deleteRecurringTemplate,
  deleteTransaction,
  dismissToast,
  exportData,
  generateInsight,
  importData,
  loadState,
  pushRuntimeToast,
  recordDebtPayment,
  recordCounterpartyFlow,
  recordDerivativeBalanceUpdate,
  recordReceivablePayment,
  replaceCategories,
  resetAllData,
  seedSampleData,
  startEmptyData,
  subscribe,
  updateAllocationBuckets,
  updateAssetPrice,
  updateBucketTargets,
  updateCategoryMapping,
  updateGeneralSettings,
  upsertAccount,
  upsertAsset,
  upsertAssetTransaction,
  upsertGoal,
  upsertLiability,
  upsertReceivable,
  upsertRecurringTemplate,
  upsertTransaction,
  deleteReceivable,
} from "./state.js?v=20260531-1";
import { renderApp } from "./ui/index.js";
import { createGoalSourceRowHtml } from "./ui/modal-goal.js";
import { parseFinancialInput, parseFinancialInputMulti, parseFinancialInputWithAI, parseFinancialInputWithAIMulti } from "./ai-entry.js?v=20260531-1";
import { searchHelp } from "./help-content.js?v=20260531-1";

const root = document.getElementById("app");
const toastTimers = new Map();
const DEFAULT_AI_PROVIDER = "deepseek-v4";
const DEFAULT_AI_BASE_URL = "https://api.deepseek.com/v1";
const DEFAULT_AI_MODEL = "deepseek-v4-flash";

const now = new Date();
// FIX 1: sidebarCollapsed default false, không localStorage
// FIX 6: theme từ uiState, default từ matchMedia
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
const savedTheme = (() => { try { return localStorage.getItem("theme"); } catch { return null; } })();
const uiState = {
  activeTab: "overview",
  budgetSubtab: "month",
  portfolioSubtab: "overview",
  portfolioAssetGroupBy: "type",
  portfolioAssetSortBy: "value_desc",
  budgetYear: now.getFullYear(),
  selectedBudgetMonth: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
  reportType: "income-expense",
  reportYear: now.getFullYear(),
  sidebarCollapsed: false,
  theme: savedTheme || (prefersDark ? "dark" : "light"),
  transactionFilters: {
    month: "",
    year: "",
    type: "",
    source: "",
    category: "",
    account: "",
    search: "",
  },
  assetTxnFilters: {
    asset: "",
    action: "",
    from: "",
    to: "",
  },
  generatedInsights: {},
  aiChat: {
    messages: [
      {
        id: `chat-${Date.now()}`,
        role: "assistant",
        text: "Xin chào, mình có thể tư vấn danh mục tài sản, quản lý thu chi và hướng dẫn bạn dùng ứng dụng.",
        time: new Date().toISOString(),
      },
    ],
    loading: false,
  },
  modal: null,
};

// FIX 6: Apply initial theme to document on page load
document.documentElement.setAttribute("data-theme", uiState.theme);

let latestViewModel = null;

const FINANCIAL_EXPERT_SYSTEM_PROMPT = `
Bạn là chuyên gia tư vấn tài chính cá nhân tại Việt Nam, giọng điệu chuyên nghiệp, rõ ràng, thực tế.
Mục tiêu: giúp người dùng quản lý tài sản, thu chi, ngân sách, nợ và mục tiêu tài chính an toàn.

Quy tắc bắt buộc:
- Luôn trả lời bằng tiếng Việt, ngắn gọn, có cấu trúc, ưu tiên hành động cụ thể.
- Không cam kết lợi nhuận, không khuyến nghị đầu cơ mù quáng.
- Nêu rõ giả định khi thiếu dữ liệu; không bịa số liệu.
- Ưu tiên bảo toàn dòng tiền, quỹ khẩn cấp, kiểm soát nợ, và phân bổ rủi ro hợp lý.
- Dùng đơn vị VND, số nguyên; có thể gợi ý theo mốc 3-6-12 tháng.
- Khi phù hợp, trình bày theo: (1) Chẩn đoán nhanh, (2) Khuyến nghị ưu tiên, (3) Bước thực hiện ngay.

Ngữ cảnh nghiệp vụ của ứng dụng:
- Loan disbursement không phải thu nhập.
- Asset purchase/sale không phải chi tiêu sinh hoạt.
- Net worth và ngân sách được tính theo logic nội bộ ứng dụng, phải bám đúng.
`.trim();

function getFinancialExpertSystemPrompt(style = "balanced") {
  const key = String(style || "balanced").toLowerCase();
  if (key === "conservative") {
    return `${FINANCIAL_EXPERT_SYSTEM_PROMPT}

Phong cách tư vấn: Bảo thủ.
- Ưu tiên số 1: an toàn vốn, thanh khoản, quỹ khẩn cấp, giảm nợ.
- Chỉ đề xuất giải pháp rủi ro thấp đến trung bình.
- Khi có nhiều phương án, ưu tiên phương án ổn định dòng tiền trước.`;
  }
  if (key === "growth") {
    return `${FINANCIAL_EXPERT_SYSTEM_PROMPT}

Phong cách tư vấn: Tăng trưởng.
- Ưu tiên tăng trưởng tài sản dài hạn nhưng vẫn kiểm soát rủi ro.
- Cho phép mức biến động cao hơn nếu có lý do hợp lý.
- Luôn kèm biện pháp kiểm soát drawdown và giới hạn tỷ trọng.`;
  }
  return `${FINANCIAL_EXPERT_SYSTEM_PROMPT}

Phong cách tư vấn: Cân bằng.
- Cân bằng giữa tăng trưởng, an toàn vốn và dòng tiền.
- Khuyến nghị theo lộ trình khả thi 30-90 ngày.`;
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function showError(error) {
  const message = error instanceof Error ? error.message : String(error);
  // Inject error toast directly without triggering notify→render loop
  try {
    const toastStack = document.querySelector(".toast-stack");
    const div = document.createElement("div");
    div.className = "toast toast-error";
    div.innerHTML = `<div><strong>Lỗi</strong><p>${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p></div>`;
    if (toastStack) {
      toastStack.appendChild(div);
      setTimeout(() => div.remove(), 4000);
    } else {
      console.error("[WealthApp Error]", message);
    }
  } catch {
    console.error("[WealthApp Error]", message);
  }
}

// Add input validation feedback
function addValidationFeedback(input) {
  if (!input) return;
  input.addEventListener("input", () => {
    if (input.required && !input.value.trim()) {
      input.classList.add("input-error");
      input.classList.remove("input-valid");
    } else if (input.value.trim()) {
      input.classList.remove("input-error");
      input.classList.add("input-valid");
    } else {
      input.classList.remove("input-error", "input-valid");
    }
  });
}

function closeModal() {
  uiState.modal = null;
}

function render() {
  let viewModel = buildViewModel(uiState);
  if (viewModel.runtime.welcomePending && !uiState.modal) {
    uiState.modal = { type: "welcome" };
    viewModel = buildViewModel(uiState);
  }
  latestViewModel = viewModel;
  root.innerHTML = renderApp(viewModel, uiState);
  syncConditionalFields(root);
  syncTransactionCategoryList(root);
  syncGoalSourceRows(root);
  syncAllocationTransferTargets(root);
  syncAllocationTotal(root);
  syncToastTimers(viewModel.runtime.toasts || []);
  syncAiChatScroll();
  syncStaggeredRows(root);
  initCountUp(root);
  attachInlineValidation(root);
  syncAmountHints(root);
}

function syncAiChatScroll() {
  const chatLog = document.getElementById("ai-chat-log");
  if (!chatLog) {
    return;
  }
  chatLog.scrollTop = chatLog.scrollHeight;
}

// Hiển thị gợi ý độ lớn số tiền ngay dưới ô nhập (vd "= 50 triệu ₫"),
// giúp chống lỗi nhập thừa/thiếu số 0. Chỉ là chú thích hiển thị,
// không thay đổi giá trị thực được submit.
const MONEY_FIELD_NAMES = new Set([
  "amount",
  "total_cash",
  "total_amount",
  "remaining_amount",
  "original_amount",
  "target_amount",
  "principal_amount",
  "monthly_payment",
  "monthly_contribution",
  "credit_limit",
  "current_price",
  "opening_balance",
  "current_value",
  "actual_balance",
]);

function formatAmountHint(rawValue) {
  const num = Number(rawValue);
  if (!Number.isFinite(num) || num === 0) {
    return "";
  }
  const sign = num < 0 ? "-" : "";
  const abs = Math.abs(num);
  if (abs >= 1e9) {
    return `≈ ${sign}${(abs / 1e9).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} tỷ ₫`;
  }
  if (abs >= 1e6) {
    return `≈ ${sign}${(abs / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} triệu ₫`;
  }
  if (abs >= 1e3) {
    return `≈ ${sign}${(abs / 1e3).toLocaleString("vi-VN", { maximumFractionDigits: 0 })} nghìn ₫`;
  }
  return `${sign}${abs.toLocaleString("vi-VN")} ₫`;
}

function syncAmountHint(input) {
  if (!(input instanceof HTMLInputElement) || !MONEY_FIELD_NAMES.has(input.name)) {
    return;
  }
  let hint = input.parentNode?.querySelector(":scope > .amount-hint");
  const text = formatAmountHint(input.value);
  if (!text) {
    if (hint) hint.remove();
    return;
  }
  if (!hint) {
    hint = document.createElement("span");
    hint.className = "amount-hint";
    input.parentNode.appendChild(hint);
  }
  hint.textContent = text;
}

function syncAmountHints(scope) {
  if (!scope) return;
  scope.querySelectorAll('input[type="number"]').forEach((input) => syncAmountHint(input));
}

function attachInlineValidation(scope) {
  if (!scope) return;
  const form = scope.querySelector("form");
  if (!form) return;
  form.querySelectorAll('input[required], select[required]').forEach((input) => {
    addValidationFeedback(input);
  });
  form.querySelectorAll('input[type="number"]').forEach((input) => {
    input.addEventListener("blur", () => {
      const val = Number(input.value);
      const negativeFields = ["amount", "total_cash", "fee", "price", "quantity",
        "credit_limit", "original_amount", "remaining_amount", "target_amount"];
      if (negativeFields.includes(input.name) && val < 0) {
        // Cho phép số âm với balance_adjustment
        const formType = input.closest("form")?.elements?.type?.value;
        if (formType === "balance_adjustment") {
          input.classList.remove("input-error");
          const existingMsg = input.nextElementSibling;
          if (existingMsg?.classList.contains("field-error")) existingMsg.remove();
          return;
        }
        input.classList.add("input-error");
        let msg = input.nextElementSibling;
        if (!msg || !msg.classList.contains("field-error")) {
          msg = document.createElement("span");
          msg.className = "field-error";
          input.parentNode.insertBefore(msg, input.nextSibling);
        }
        msg.textContent = "Giá trị không được âm";
      } else {
        input.classList.remove("input-error");
        const msg = input.nextElementSibling;
        if (msg?.classList.contains("field-error")) msg.remove();
      }
    });
  });
}

function syncToastTimers(toasts) {
  const activeIds = new Set(toasts.map((toast) => toast.id));
  toastTimers.forEach((timer, id) => {
    if (!activeIds.has(id)) {
      clearTimeout(timer);
      toastTimers.delete(id);
    }
  });

  toasts.forEach((toast) => {
    if (toastTimers.has(toast.id)) {
      return;
    }
    const timer = window.setTimeout(() => {
      dismissToast(toast.id);
      toastTimers.delete(toast.id);
    }, toast.duration || 3200);
    toastTimers.set(toast.id, timer);
  });
}

function syncStaggeredRows(scope) {
  scope.querySelectorAll(".data-table tbody tr").forEach((row, i) => {
    row.style.setProperty("--i", i);
  });
}

function initCountUp(scope) {
  scope.querySelectorAll("[data-countup]").forEach((el) => {
    const target = Number(el.dataset.countup) || 0;
    const absTarget = Math.abs(target);
    if (!absTarget) return;
    const isNegative = target < 0;
    const start = performance.now();
    const duration = 600;
    function fmt(val) {
      const num = Number(val) || 0;
      const absNum = Math.abs(num);
      const s = num < 0 ? "-" : "";
      if (absNum >= 1e9) return `${s}${(absNum / 1e9).toFixed(2)} tỷ`;
      if (absNum >= 1e6) {
        const millions = Math.floor(absNum / 1e6);
        const thousands = Math.round((absNum % 1e6) / 1000);
        if (thousands === 0) return `${s}${millions.toLocaleString("vi-VN")} tr`;
        return `${s}${millions.toLocaleString("vi-VN")}tr${thousands}`;
      }
      return `${s}${Math.round(absNum).toLocaleString("vi-VN")} ₫`;
    }
    function step(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(absTarget * eased);
      el.textContent = fmt(isNegative ? -current : current);
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  });
}

function parseCondition(rule) {
  const [field, ...rest] = String(rule).split("=");
  const values = rest.join("=");
  return {
    field,
    values: String(values || "")
      .split("|")
      .map((value) => value.trim()),
  };
}

function getControlValue(form, field) {
  const control = form.querySelector(`[name="${field}"]`);
  if (!control) {
    return "";
  }
  if (control.type === "checkbox") {
    return control.checked ? "true" : "false";
  }
  return control.value;
}

function syncConditionalFields(scope) {
  scope.querySelectorAll("[data-show-if]").forEach((element) => {
    const form = element.closest("form");
    if (!form) {
      return;
    }
    const { field, values } = parseCondition(element.dataset.showIf);
    const value = getControlValue(form, field);
    element.style.display = values.includes(value) ? "" : "none";
  });
}

function syncTransactionCategoryList(scope) {
  scope.querySelectorAll('form[data-form="transaction"]').forEach((form) => {
    const typeControl = form.querySelector('select[name="type"]');
    const categoryControl = form.querySelector('input[name="category"]');
    if (!(typeControl instanceof HTMLSelectElement) || !(categoryControl instanceof HTMLInputElement)) {
      return;
    }
    const type = typeControl.value;
    const listId =
      type === "income"
        ? "transaction-category-income"
        : type === "expense"
          ? "transaction-category-expense"
          : "transaction-category-all";
    categoryControl.setAttribute("list", listId);
  });
}

function syncGoalSourceRows(scope) {
  const rows = [];
  if (scope instanceof HTMLElement && scope.matches("[data-goal-source-row]")) {
    rows.push(scope);
  }
  scope.querySelectorAll("[data-goal-source-row]").forEach((row) => rows.push(row));
  rows.forEach((row) => {
    const typeSelect = row.querySelector("[data-goal-source-type]");
    const selectedType = typeSelect?.value || "account";
    row.querySelectorAll("[data-source-select]").forEach((field) => {
      const isActive = field.dataset.sourceSelect === selectedType;
      field.style.display = isActive ? "" : "none";
      const select = field.querySelector("select");
      if (select) {
        select.disabled = !isActive;
      }
    });
  });
}

function setUiValue(key, value) {
  uiState[key] = value;
  render();
}

function getFormNumber(form, name) {
  return Number(form.elements[name]?.value || 0);
}

function getCheckbox(form, name) {
  return Boolean(form.elements[name]?.checked);
}

function isValidDateInput(value) {
  if (!value) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function assertDate(value, label, { required = true } = {}) {
  const v = String(value || "").trim();
  if (!v && !required) return;
  if (!isValidDateInput(v)) {
    throw new Error(`${label} không đúng định dạng YYYY-MM-DD.`);
  }
}

function assertDateNotTooFarFuture(value, label) {
  if (!value) return;
  const d = new Date(value);
  const maxFuture = new Date();
  maxFuture.setFullYear(maxFuture.getFullYear() + 1);
  if (d > maxFuture)
    throw new Error(`${label} không được quá 1 năm trong tương lai.`);
}

function assertEnum(value, options, label) {
  if (!options.includes(value)) {
    throw new Error(`${label} không hợp lệ.`);
  }
}

// Trần giá trị tiền tệ hợp lý cho tài chính cá nhân: 10^15 ₫ (1 triệu tỷ).
// Trên mức này gần như chắc chắn là lỗi nhập liệu và bắt đầu mất chính xác IEEE-754 (2^53).
const MAX_MONEY_VALUE = 1e15;

function assertWithinMoneyBound(value, label) {
  const n = Number(value);
  if (Math.abs(n) > MAX_MONEY_VALUE) {
    throw new Error(`${label} vượt ngưỡng hợp lý (tối đa 1 triệu tỷ ₫). Kiểm tra lại số đã nhập.`);
  }
}

function assertPositiveNumber(value, label) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`${label} phải lớn hơn 0.`);
  }
  assertWithinMoneyBound(n, label);
}

function assertNonNegativeNumber(value, label) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`${label} phải lớn hơn hoặc bằng 0.`);
  }
  assertWithinMoneyBound(n, label);
}

function assertRequiredText(value, label) {
  if (!String(value || "").trim()) {
    throw new Error(`${label} không được để trống.`);
  }
}

function validateTransactionForm(form) {
  const type = form.elements.type.value;
  const affectBucket = getCheckbox(form, "affect_bucket");
  assertDate(form.elements.date.value, "Ngày");
  assertDateNotTooFarFuture(form.elements.date.value, "Ngày");
  assertEnum(type, ["income", "expense", "transfer", "loan_disbursement", "lending", "collection", "balance_adjustment"], "Loại giao dịch");
  const amount = getFormNumber(form, "amount");
  if (type === "income" || type === "expense") {
    if (amount <= 0) throw new Error("Số tiền thu/chi phải lớn hơn 0.");
  } else if (type === "lending" || type === "collection") {
    // Cho vay/Thu hồi nợ: amount > 0, bắt buộc chọn tài khoản
    assertPositiveNumber(amount, "Số tiền");
  } else if (type === "balance_adjustment") {
    if (amount === 0) throw new Error("Số tiền điều chỉnh phải khác 0.");
  } else {
    assertPositiveNumber(amount, "Số tiền");
  }
  if (type === "income" || type === "expense" || type === "lending" || type === "collection" || type === "balance_adjustment") {
    assertRequiredText(form.elements.account_id?.value, "Tài khoản");
  }
  if (type === "loan_disbursement") {
    assertRequiredText(form.elements.account_id?.value, "Tài khoản");
    assertRequiredText(form.elements.liability_id?.value, "Khoản nợ liên kết");
  }
  if (type === "transfer") {
    const from = form.elements.from_account_id?.value || "";
    const to = form.elements.to_account_id?.value || "";
    assertRequiredText(from, "Từ tài khoản");
    assertRequiredText(to, "Đến tài khoản");
    if (from === to) {
      throw new Error("Tài khoản nguồn và đích không được trùng nhau.");
    }
    if (affectBucket) {
      assertRequiredText(form.elements.bucket_id?.value, "Hũ đầu tư liên kết");
      assertEnum(form.elements.bucket_impact?.value || "allocate", ["allocate", "withdraw"], "Chiều tác động hũ");
      const investmentBucketIds = new Set(
        (latestViewModel?.derived?.activeBuckets || [])
          .filter((bucket) => bucket.type !== "expense_budget")
          .map((bucket) => bucket.id),
      );
      if (!investmentBucketIds.has(form.elements.bucket_id?.value)) {
        throw new Error("Hũ liên kết phải thuộc nhóm hũ đầu tư.");
      }
      const accountTypeById = Object.fromEntries(
        (latestViewModel?.derived?.accounts || []).map((account) => [account.id, account.type]),
      );
      const fromType = accountTypeById[from];
      const toType = accountTypeById[to];
      const validInvestmentAccounts = ["investment", "derivative", "securities_cash"];
      if (!validInvestmentAccounts.includes(fromType) && !validInvestmentAccounts.includes(toType)) {
        throw new Error("Muốn tác động ngân sách hũ đầu tư, giao dịch cần liên quan tài khoản đầu tư/phái sinh.");
      }
    }
  }
}

function validateAccountForm(form) {
  const type = form.elements.type.value;
  const trackingMode = form.elements.tracking_mode.value;
  assertRequiredText(form.elements.name.value, "Tên tài khoản");
  assertEnum(type, ["bank", "ewallet", "cash", "securities_cash", "investment", "derivative", "credit_card"], "Loại tài khoản");
  assertEnum(trackingMode, ["auto", "manual"], "Chế độ theo dõi");
  assertDate(form.elements.last_updated?.value, "Cập nhật cuối", { required: false });
  assertDate(form.elements.opening_date?.value, "Ngày số dư ban đầu", { required: false });
  assertNonNegativeNumber(getFormNumber(form, "opening_balance"), "Số dư ban đầu");
  if (type === "credit_card") {
    assertNonNegativeNumber(getFormNumber(form, "credit_limit"), "Hạn mức thẻ");
    if (getFormNumber(form, "credit_limit") > 0 && getFormNumber(form, "credit_limit") < 100000)
      throw new Error("Hạn mức thẻ tối thiểu 100,000₫.");
    assertDate(form.elements.statement_date?.value, "Ngày sao kê", { required: false });
    assertDate(form.elements.due_date?.value, "Ngày đến hạn", { required: false });
  }
}

function validateAssetForm(form) {
  const assetType = form.elements.asset_type.value;
  assertRequiredText(form.elements.name.value, "Tên tài sản");
  assertEnum(assetType, ["stock", "etf", "bond", "real_estate", "realestate", "crypto", "warrant", "gold", "savings", "cash_equiv", "other"], "Loại tài sản");
  assertRequiredText(form.elements.bucket.value, "Hũ phân bổ");
  assertNonNegativeNumber(getFormNumber(form, "current_price"), "Giá hiện tại");
  assertDate(form.elements.start_date?.value, "Ngày bắt đầu", { required: false });
  if (assetType === "savings") {
    assertDate(form.elements.maturity_date?.value, "Ngày đáo hạn", { required: false });
  }
  if (assetType === "warrant") {
    assertDate(form.elements.expiry_date?.value, "Ngày hết hạn", { required: false });
  }
}

function validateAssetTransactionForm(form) {
  const action = String(form.elements.action.value || "").toUpperCase();
  assertDate(form.elements.date.value, "Ngày");
  assertDateNotTooFarFuture(form.elements.date.value, "Ngày");
  assertRequiredText(form.elements.asset_id.value, "Tài sản");
  assertEnum(action, ["BUY", "SELL", "OPENING", "DIVIDEND", "INTEREST", "FEE", "SPLIT", "REALLOCATE"], "Hành động");
  if (["BUY", "SELL", "OPENING", "SPLIT", "REALLOCATE"].includes(action)) {
    assertPositiveNumber(getFormNumber(form, "quantity"), "Số lượng");
  } else {
    assertNonNegativeNumber(getFormNumber(form, "quantity"), "Số lượng");
  }
  if (["BUY", "SELL", "OPENING", "REALLOCATE"].includes(action)) {
    assertPositiveNumber(getFormNumber(form, "price"), "Giá");
  } else {
    assertNonNegativeNumber(getFormNumber(form, "price"), "Giá");
  }
  assertNonNegativeNumber(getFormNumber(form, "fee"), "Phí");
  if (["BUY", "SELL", "DIVIDEND", "INTEREST", "FEE", "REALLOCATE"].includes(action)) {
    assertNonNegativeNumber(getFormNumber(form, "total_cash"), "Tổng tiền cash");
  }
  if (["BUY", "SELL", "DIVIDEND", "INTEREST", "REALLOCATE"].includes(action)) {
    assertRequiredText(form.elements.account_id?.value, "Tài khoản cash");
  }
}

function validateLiabilityForm(form) {
  const total = getFormNumber(form, "total_amount");
  const remaining = getFormNumber(form, "remaining_amount");
  assertRequiredText(form.elements.name.value, "Tên khoản nợ");
  assertPositiveNumber(total, "Tổng vay");
  assertNonNegativeNumber(remaining, "Dư nợ còn lại");
  if (remaining > total) {
    throw new Error("Dư nợ còn lại không được lớn hơn tổng vay.");
  }
  assertNonNegativeNumber(getFormNumber(form, "interest_rate"), "Lãi suất");
  assertNonNegativeNumber(getFormNumber(form, "monthly_payment"), "Gánh tháng");
  assertDate(form.elements.start_date?.value, "Ngày bắt đầu", { required: false });
  assertDate(form.elements.end_date?.value, "Ngày kết thúc", { required: false });
  if (form.elements.start_date?.value && form.elements.end_date?.value) {
    if (form.elements.end_date.value < form.elements.start_date.value) {
      throw new Error("Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.");
    }
  }
}

function validateDebtPaymentForm(form) {
  assertRequiredText(form.elements.liability_id.value, "Khoản nợ");
  assertPositiveNumber(getFormNumber(form, "principal_amount"), "Tiền gốc trả");
  assertRequiredText(form.elements.from_account_id.value, "Tài khoản nguồn");
  assertDate(form.elements.date.value, "Ngày thanh toán");
}

function validateReceivableForm(form) {
  const original = getFormNumber(form, "original_amount");
  const remaining = getFormNumber(form, "remaining_amount");
  assertRequiredText(form.elements.name.value, "Tên khoản cho vay");
  assertEnum(form.elements.type.value, ["personal_loan", "business_loan", "deposit", "other"], "Loại khoản cho vay");
  assertEnum(form.elements.likelihood.value, ["high", "medium", "low"], "Khả năng thu hồi");
  assertPositiveNumber(original, "Số tiền gốc");
  assertNonNegativeNumber(remaining, "Số dư còn lại");
  if (remaining > original) {
    throw new Error("Số dư còn lại không được lớn hơn số tiền gốc.");
  }
  assertDate(form.elements.start_date.value, "Ngày bắt đầu");
  assertDate(form.elements.expected_return_date?.value, "Ngày dự kiến trả", { required: false });
  if (form.elements.expected_return_date?.value && form.elements.expected_return_date.value < form.elements.start_date.value) {
    throw new Error("Ngày dự kiến trả phải sau hoặc bằng ngày bắt đầu.");
  }
}

function validateReceivablePaymentForm(form) {
  assertRequiredText(form.elements.receivable_id.value, "Khoản cho vay");
  assertPositiveNumber(getFormNumber(form, "amount"), "Số tiền thu");
  assertRequiredText(form.elements.to_account_id.value, "Tài khoản nhận");
  assertDate(form.elements.date.value, "Ngày thu nợ");
}

function validateCounterpartyFlowForm(form) {
  assertRequiredText(form.elements.counterparty.value, "Đối tượng");
  assertEnum(form.elements.side.value, ["liability", "receivable"], "Loại công nợ");
  assertEnum(form.elements.direction.value, ["increase", "decrease"], "Chiều biến động");
  assertPositiveNumber(getFormNumber(form, "amount"), "Số tiền");
  assertRequiredText(form.elements.account_id.value, "Tài khoản tiền");
  assertDate(form.elements.date.value, "Ngày");
}

function validateGoalForm(form) {
  assertRequiredText(form.elements.name.value, "Tên mục tiêu");
  assertPositiveNumber(getFormNumber(form, "target_amount"), "Số tiền mục tiêu");
  assertDate(form.elements.deadline.value, "Hạn chót");
  const deadline = new Date(form.elements.deadline.value);
  if (deadline <= new Date())
    throw new Error("Hạn chót phải là ngày trong tương lai.");
  assertEnum(form.elements.priority.value, ["high", "medium", "low"], "Mức ưu tiên");
}

function validateSettingsGeneralForm(form) {
  assertEnum(form.elements.income_mode.value, ["regular", "irregular"], "Chế độ thu nhập");
  const rollingWindow = getFormNumber(form, "rolling_window");
  if (rollingWindow < 3 || rollingWindow > 18) {
    throw new Error("Rolling window phải trong khoảng 3 đến 18 tháng.");
  }
  assertNonNegativeNumber(getFormNumber(form, "min_allocation_trigger"), "Ngưỡng trigger phân bổ");
  assertNonNegativeNumber(getFormNumber(form, "passive_income_default"), "Mức thụ động mặc định");
  assertNonNegativeNumber(getFormNumber(form, "rebalance_threshold"), "Ngưỡng tái cân bằng");
  assertEnum(form.elements.ai_prompt_style?.value || "balanced", ["conservative", "balanced", "growth"], "Phong cách AI");
}

function validateRecurringTemplateForm(form) {
  assertRequiredText(form.elements.name.value, "Tên template");
  assertEnum(form.elements.type.value, ["income", "expense"], "Loại template");
  assertPositiveNumber(getFormNumber(form, "amount"), "Số tiền");
}

function normalizeTextList(value) {
  return String(value || "")
    .split(/\n|,/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function rebalanceToHundred(values) {
  const items = values.map((value) => Math.max(0, Number(value || 0)));
  if (!items.length) {
    return [];
  }
  const total = items.reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    const base = Math.floor(100 / items.length);
    const result = Array.from({ length: items.length }, () => base);
    for (let index = 0; index < 100 - base * items.length; index += 1) {
      result[index] += 1;
    }
    return result;
  }
  const normalized = items.map((value) => (value / total) * 100);
  const roundedDown = normalized.map((value) => Math.floor(value));
  const rank = normalized
    .map((value, index) => ({
      index,
      fraction: value - roundedDown[index],
    }))
    .sort((left, right) => right.fraction - left.fraction);
  let remaining = 100 - roundedDown.reduce((sum, value) => sum + value, 0);
  let cursor = 0;
  while (remaining > 0) {
    roundedDown[rank[cursor % rank.length].index] += 1;
    remaining -= 1;
    cursor += 1;
  }
  return roundedDown;
}

function syncAllocationTotal(scope) {
  const form = (scope || document).querySelector('[data-form="allocation-settings"]');
  if (!form) {
    return;
  }
  const indicator = form.querySelector("#allocation-total-indicator");
  if (!indicator) {
    return;
  }
  const total = Array.from(form.querySelectorAll("[data-allocation-percentage]")).reduce(
    (sum, input) => sum + Number(input.value || 0),
    0,
  );
  indicator.textContent = `${Math.round(total)}%`;
  indicator.classList.toggle("text-success", Math.round(total) === 100);
  indicator.classList.toggle("text-danger", Math.round(total) !== 100);
}

function syncAllocationTransferTargets(scope) {
  const form = (scope || document).querySelector('[data-form="allocation-settings"]');
  if (!form) {
    return;
  }
  form.querySelectorAll('select[name^="bucket_rollover_"]').forEach((select) => {
    const bucketId = select.name.replace("bucket_rollover_", "");
    const targetField = form.querySelector(`[data-rollover-target="${bucketId}"]`);
    if (!targetField) {
      return;
    }
    targetField.style.display = select.value === "transfer_to" ? "" : "none";
  });
}

function buildGoalSources(form) {
  return Array.from(form.querySelectorAll("[data-goal-source-row]"))
    .map((row) => {
      const type = row.querySelector('[name="source_type"]')?.value || "account";
      const sourceId =
        type === "account"
          ? row.querySelector('[name="account_source_id"]')?.value
          : type === "asset"
            ? row.querySelector('[name="asset_source_id"]')?.value
            : row.querySelector('[name="bucket_source_id"]')?.value;
      const optionLabel = row.querySelector(
        type === "account"
          ? '[name="account_source_id"] option:checked'
          : type === "asset"
            ? '[name="asset_source_id"] option:checked'
            : '[name="bucket_source_id"] option:checked',
      )?.textContent;

      if (!sourceId) {
        return null;
      }

      return {
        id: row.dataset.sourceId || undefined,
        type,
        source_id: sourceId,
        label: row.querySelector('[name="source_label"]')?.value || optionLabel || sourceId,
        include_full_balance: row.querySelector('[name="include_full_balance"]')?.checked || false,
        share_percentage: Number(row.querySelector('[name="share_percentage"]')?.value || 0),
        current_value: Number(row.querySelector('[name="current_value"]')?.value || 0),
        monthly_contribution: Number(row.querySelector('[name="monthly_contribution"]')?.value || 0),
      };
    })
    .filter(Boolean);
}

// Xác nhận kết quả AI parse và lưu qua các hàm mutation sẵn có (đã có validation).
// AI KHÔNG tự lưu — chỉ tới đây khi người dùng bấm "Xác nhận & lưu".
// Hỗ trợ nhiều giao dịch (form có item_count + field hậu tố _<index>).
function handleAiEntryConfirm(form) {
  const count = Math.max(1, Number(form.elements.item_count?.value || 1));
  const get = (name, i) => form.elements[`${name}_${i}`]?.value;

  // Thu thập từng mục.
  const items = [];
  for (let i = 0; i < count; i += 1) {
    if (form.elements[`intent_${i}`] === undefined) continue;
    items.push({
      intent: String(get("intent", i) || "unknown"),
      amount: Number(get("amount", i) || 0),
      currency: String(get("currency", i) || "VND").toUpperCase(),
      date: String(get("date", i) || ""),
      asset_name: String(get("asset_name", i) || "").trim(),
      quantity: get("quantity", i) === undefined ? null : Number(get("quantity", i) || 0),
      price: get("price", i) === undefined ? null : Number(get("price", i) || 0),
      category: String(get("category", i) || "").trim(),
      note: String(get("note", i) || "").trim(),
      account_id: String(get("account_id", i) || ""),
      from_account_id: String(get("from_account_id", i) || ""),
      to_account_id: String(get("to_account_id", i) || ""),
      liability_id: String(get("liability_id", i) || ""),
    });
  }

  // Tách tài sản (cần biểu mẫu riêng) khỏi giao dịch tiền.
  const assetItems = items.filter((it) => it.intent === "add_asset" || it.intent === "update_value");
  const txnItems = items.filter((it) => it.intent !== "add_asset" && it.intent !== "update_value");

  // PASS 1 — validate TẤT CẢ giao dịch tiền trước, để không lưu một phần rồi mới lỗi.
  const prepared = txnItems.map((it, idx) => {
    const label = txnItems.length > 1 ? `Giao dịch ${idx + 1}: ` : "";
    if (it.currency !== "VND") {
      throw new Error(`${label}Ứng dụng hiện chỉ hỗ trợ VND. Vui lòng quy đổi số tiền về VND.`);
    }
    assertDate(it.date, `${label}Ngày`);
    if (it.intent === "unknown") {
      throw new Error(`${label}Chưa xác định loại thao tác. Vui lòng chọn loại phù hợp.`);
    }
    if (it.intent === "transfer") {
      assertRequiredText(it.from_account_id, `${label}Từ tài khoản`);
      assertRequiredText(it.to_account_id, `${label}Đến tài khoản`);
      if (it.from_account_id === it.to_account_id) throw new Error(`${label}Tài khoản nguồn và đích không được trùng nhau.`);
      assertPositiveNumber(it.amount, `${label}Số tiền`);
      return {
        date: it.date, type: "transfer", amount: it.amount,
        category: it.category || "Chuyển khoản", description: it.note,
        from_account_id: it.from_account_id, to_account_id: it.to_account_id, notes: it.note,
      };
    }
    if (it.intent === "debt_payment") {
      assertRequiredText(it.from_account_id, `${label}Tài khoản nguồn`);
      assertPositiveNumber(it.amount, `${label}Số tiền`);
      return {
        date: it.date, type: "expense", amount: it.amount,
        category: it.category || "Trả nợ vay", description: it.note,
        account_id: it.from_account_id, liability_id: it.liability_id, notes: it.note,
      };
    }
    // income / expense
    assertRequiredText(it.account_id, `${label}Tài khoản`);
    assertPositiveNumber(it.amount, `${label}Số tiền`);
    return {
      date: it.date, type: it.intent, amount: it.amount,
      category: it.category || "Khác", description: it.note,
      account_id: it.account_id, income_source: it.intent === "income" ? it.category : "", notes: it.note,
    };
  });

  // PASS 2 — đã validate hết, giờ mới ghi.
  let savedCount = 0;
  for (const payload of prepared) {
    upsertTransaction(payload);
    savedCount += 1;
  }

  // update_value: nếu khớp được tài sản đang có theo tên -> cập nhật giá trực tiếp.
  const stripForMatch = (v) =>
    String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const existingAssets = latestViewModel?.derived?.assets || [];
  const updateItems = assetItems.filter((it) => it.intent === "update_value");
  const addItems = assetItems.filter((it) => it.intent !== "update_value");
  let priceUpdatedCount = 0;
  for (const it of updateItems) {
    if (it.currency !== "VND") throw new Error("Tài sản: ứng dụng hiện chỉ hỗ trợ VND.");
    const newPrice = it.price !== null ? it.price : it.amount;
    assertPositiveNumber(newPrice, "Giá mới");
    const target = it.asset_name
      ? existingAssets.find((a) => stripForMatch(a.name) === stripForMatch(it.asset_name)) ||
        existingAssets.find((a) => stripForMatch(a.name).includes(stripForMatch(it.asset_name)))
      : null;
    if (target) {
      updateAssetPrice(target.id, newPrice);
      priceUpdatedCount += 1;
    } else {
      // Không tìm thấy tài sản trùng tên -> coi như thêm mới, đẩy vào luồng add.
      addItems.push(it);
    }
  }

  // Nếu có tài sản cần thêm mới: mở biểu mẫu tài sản điền sẵn (cần hũ phân bổ + xác nhận lưu riêng).
  if (addItems.length > 0) {
    const first = addItems[0];
    if (first.currency !== "VND") {
      throw new Error("Tài sản: ứng dụng hiện chỉ hỗ trợ VND.");
    }
    uiState.modal = {
      type: "asset",
      prefill: {
        name: first.asset_name,
        notes: first.note,
        current_price: first.price || (first.quantity ? Math.round(first.amount / first.quantity) : first.amount) || 0,
      },
    };
    render();
    const donePieces = [];
    if (savedCount > 0) donePieces.push(`${savedCount} giao dịch`);
    if (priceUpdatedCount > 0) donePieces.push(`cập nhật giá ${priceUpdatedCount} tài sản`);
    pushRuntimeToast({
      level: "soft",
      title: donePieces.length ? `Đã lưu ${donePieces.join(" + ")}` : "Hoàn tất thông tin tài sản",
      message:
        addItems.length > 1
          ? `Còn ${addItems.length} tài sản — nhập từng cái. Bổ sung số lượng/giá và hũ phân bổ rồi lưu.`
          : "Bổ sung số lượng/giá và hũ phân bổ rồi lưu.",
      duration: 3600,
    });
    return;
  }

  closeModal();
  const parts = [];
  if (savedCount > 0) parts.push(`${savedCount} giao dịch`);
  if (priceUpdatedCount > 0) parts.push(`cập nhật giá ${priceUpdatedCount} tài sản`);
  showSaved(parts.length ? `Đã lưu ${parts.join(" + ")} từ AI nhập liệu.` : "Đã lưu từ AI nhập liệu.");
  render();
}

async function handleImportFile(file) {
  if (!file) {
    return;
  }
  try {
    const text = await file.text();
    importData(text);
    closeModal();
    render();
  } catch (error) {
    showError(error);
  }
}

function fillRecurringForm(button) {
  const form = document.querySelector('[data-form="recurring-template"]');
  if (!form) {
    return;
  }
  form.elements.id.value = button.dataset.id || "";
  form.elements.name.value = button.dataset.name || "";
  form.elements.type.value = button.dataset.type || "income";
  form.elements.amount.value = button.dataset.amount || 0;
  form.elements.category.value = button.dataset.category || "";
  form.elements.frequency.value = button.dataset.frequency || "";
  form.elements.default_account_id.value = button.dataset.account || "";
  form.elements.notes.value = button.dataset.notes || "";
}

function showSaved(message) {
  pushRuntimeToast({
    level: "success",
    title: "Đã lưu thay đổi",
    message,
    duration: 1800,
  });
}

document.addEventListener("click", (event) => {
  const actionButton = event.target.closest("[data-action]");
  if (!actionButton) {
    return;
  }

  const { action } = actionButton.dataset;

  try {
    if (action === "navigate") {
      uiState.activeTab = actionButton.dataset.tab;
      render();
      return;
    }

    if (action === "close-modal") {
      closeModal();
      render();
      return;
    }

    if (action === "open-modal") {
      uiState.modal = { type: actionButton.dataset.modal };
      render();
      return;
    }

    if (action === "open-ai-entry") {
      uiState.modal = { type: "ai-entry", inputText: "", parsedList: null, loading: false, error: "" };
      render();
      return;
    }

    if (action === "open-help") {
      uiState.modal = { type: "help", question: "", result: null };
      render();
      return;
    }

    if (action === "help-sample") {
      const q = actionButton.dataset.text || "";
      uiState.modal = { type: "help", question: q, result: searchHelp(q) };
      render();
      return;
    }

    if (action === "ai-entry-example") {
      uiState.modal = {
        type: "ai-entry",
        inputText: actionButton.dataset.text || "",
        parsedList: null,
        loading: false,
        error: "",
      };
      render();
      return;
    }

    if (action === "ai-entry-back") {
      if (uiState.modal?.type === "ai-entry") {
        uiState.modal = {
          type: "ai-entry",
          inputText: uiState.modal.inputText || "",
          parsedList: null,
          loading: false,
          error: "",
        };
        render();
      }
      return;
    }

    if (action === "seed-sample") {
      closeModal();
      seedSampleData();
      return;
    }

    if (action === "start-empty") {
      closeModal();
      startEmptyData();
      return;
    }

    if (action === "edit-transaction") {
      uiState.modal = { type: "transaction", id: actionButton.dataset.id };
      render();
      return;
    }

    if (action === "delete-transaction") {
      if (window.confirm("Xóa giao dịch này?")) {
        deleteTransaction(actionButton.dataset.id, {
          date: actionButton.dataset.date || "",
          type: actionButton.dataset.type || "",
          amount: Number(actionButton.dataset.amount || 0),
          account_id: actionButton.dataset.accountId || "",
        });
        showSaved("Đã xóa giao dịch.");
      }
      return;
    }

    if (action === "edit-account") {
      uiState.modal = { type: "account", id: actionButton.dataset.id };
      render();
      return;
    }

    if (action === "delete-account") {
      const accountId = actionButton.dataset.id;
      const accountName = actionButton.dataset.name || "tài khoản này";
      if (window.confirm(`Xóa ${accountName}?`)) {
        deleteAccount(accountId);
        showSaved("Đã xóa tài khoản.");
      }
      return;
    }

    if (action === "open-history") {
      uiState.modal = { type: "account-history", accountId: actionButton.dataset.accountId };
      render();
      return;
    }

    if (action === "open-derivative-update") {
      const accountId = actionButton.dataset.accountId || "";
      const account = (latestViewModel?.derived?.accounts || []).find((item) => item.id === accountId);
      const balanceTrackableTypes = new Set(["investment", "derivative", "securities_cash"]);
      if (!account || !balanceTrackableTypes.has(account.type)) {
        throw new Error("Chỉ tài khoản đầu tư/phái sinh mới hỗ trợ cập nhật số dư.");
      }
      uiState.modal = { type: "derivative-update", accountId };
      render();
      return;
    }

    if (action === "set-budget-subtab") {
      uiState.budgetSubtab = actionButton.dataset.value;
      render();
      return;
    }

    if (action === "set-portfolio-subtab") {
      uiState.portfolioSubtab = actionButton.dataset.value;
      render();
      return;
    }

    if (action === "edit-asset") {
      uiState.modal = { type: "asset", id: actionButton.dataset.id };
      render();
      return;
    }

    if (action === "open-price-update") {
      uiState.modal = { type: "price-update", assetId: actionButton.dataset.assetId };
      render();
      return;
    }

    if (action === "edit-asset-transaction") {
      uiState.modal = { type: "asset-transaction", id: actionButton.dataset.id };
      render();
      return;
    }

    if (action === "delete-asset-transaction") {
      if (window.confirm("Xóa giao dịch tài sản này?")) {
        deleteAssetTransaction(actionButton.dataset.id);
      }
      return;
    }

    if (action === "delete-asset") {
      if (window.confirm("Xóa tài sản này? Thao tác không thể hoàn tác.")) {
        try {
          deleteAsset(actionButton.dataset.id);
          showSaved("Đã xóa tài sản.");
        } catch (err) {
          showError(err);
        }
      }
      return;
    }

    if (action === "edit-liability") {
      uiState.modal = { type: "liability", id: actionButton.dataset.id };
      render();
      return;
    }

    if (action === "delete-liability") {
      if (window.confirm("Xóa khoản nợ này? Các thanh toán liên quan cũng sẽ bị xóa.")) {
        try {
          deleteLiability(actionButton.dataset.id);
          showSaved("Đã xóa khoản nợ.");
        } catch (err) {
          showError(err);
        }
      }
      return;
    }

    if (action === "record-debt-payment") {
      uiState.modal = { type: "debt-payment", liabilityId: actionButton.dataset.liabilityId };
      render();
      return;
    }

    if (action === "edit-receivable") {
      uiState.modal = { type: "receivable", id: actionButton.dataset.id };
      render();
      return;
    }

    if (action === "delete-receivable") {
      if (window.confirm("Xóa khoản cho vay này?")) {
        deleteReceivable(actionButton.dataset.id);
        showSaved("Đã xóa khoản cho vay.");
      }
      return;
    }

    if (action === "record-receivable-payment") {
      uiState.modal = { type: "receivable-payment", receivableId: actionButton.dataset.receivableId };
      render();
      return;
    }

    if (action === "open-counterparty-flow") {
      uiState.modal = {
        type: "counterparty-flow",
        counterparty: actionButton.dataset.counterparty || "",
        side: actionButton.dataset.side || "",
      };
      render();
      return;
    }

    if (action === "edit-goal") {
      uiState.modal = { type: "goal", id: actionButton.dataset.id };
      render();
      return;
    }

    if (action === "delete-goal") {
      if (window.confirm("Xóa mục tiêu này?")) {
        deleteGoal(actionButton.dataset.id);
      }
      return;
    }

    if (action === "generate-insight") {
      const panelId = actionButton.dataset.panelId;
      const config = latestViewModel.derived.settings;
      
      if (config.ai_api_key) {
        // AI Real mode
        uiState.generatedInsights[panelId] = { text: "", loading: true };
        render();
        
        fetchAiInsight(panelId, config, latestViewModel)
          .then(result => {
            uiState.generatedInsights[panelId] = { text: result, loading: false };
            render();
          })
          .catch(err => {
            uiState.generatedInsights[panelId] = { text: "Lỗi AI: " + err.message, loading: false };
            render();
          });
      } else {
        // Retro-compatible / Manual mode
        uiState.generatedInsights[panelId] = generateInsight(panelId);
        render();
      }
      return;
    }

    if (action === "clear-ai-chat") {
      uiState.aiChat = {
        messages: [
          {
            id: `chat-${Date.now()}`,
            role: "assistant",
            text: "Đã xóa hội thoại. Bạn muốn bắt đầu tư vấn phần nào trước?",
            time: new Date().toISOString(),
          },
        ],
        loading: false,
      };
      render();
      return;
    }

    if (action === "dismiss-toast") {
      dismissToast(actionButton.dataset.toastId);
      return;
    }

    if (action === "dismiss-banner") {
      dismissBanner(actionButton.dataset.bannerKey);
      return;
    }

    if (action === "export-json") {
      downloadFile("wealth-backup.json", exportData(), "application/json");
      return;
    }

    // FIX 1: toggle-sidebar chỉ dùng uiState, không localStorage
    if (action === "toggle-sidebar") {
      uiState.sidebarCollapsed = !uiState.sidebarCollapsed;
      render();
      return;
    }

    // FIX 6: toggle-theme dùng uiState.theme, đồng bộ document + localStorage
    if (action === "toggle-theme") {
      const next = uiState.theme === "dark" ? "light" : "dark";
      uiState.theme = next;
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch { /* noop */ }
      render();
      return;
    }

    if (action === "trigger-import") {
      document.getElementById("import-json-input")?.click();
      return;
    }

    if (action === "export-report") {
      downloadFile(`bao-cao-${uiState.reportType}.csv`, latestViewModel.reportsPage.csv, "text/csv;charset=utf-8");
      return;
    }

    if (action === "remove-transaction-chip") {
      uiState.transactionFilters[actionButton.dataset.chipKey] = "";
      render();
      return;
    }

    if (action === "add-goal-source") {
      const container = document.getElementById("goal-source-list");
      if (container && latestViewModel?.modal?.sourceOptions) {
        container.insertAdjacentHTML("beforeend", createGoalSourceRowHtml(latestViewModel.modal.sourceOptions, {}));
        syncGoalSourceRows(container);
      }
      return;
    }

    if (action === "remove-goal-source-row") {
      actionButton.closest("[data-goal-source-row]")?.remove();
      return;
    }

    if (action === "fill-recurring") {
      fillRecurringForm(actionButton);
      return;
    }

    if (action === "auto-adjust-allocation") {
      const form = document.querySelector('[data-form="allocation-settings"]');
      if (!form) {
        return;
      }
      const inputs = Array.from(form.querySelectorAll("[data-allocation-percentage]"));
      const rebalanced = rebalanceToHundred(inputs.map((input) => Number(input.value || 0)));
      inputs.forEach((input, index) => {
        input.value = String(rebalanced[index] || 0);
      });
      syncAllocationTotal(form);
      return;
    }

    if (action === "delete-recurring") {
      if (window.confirm("Xóa recurring template này?")) {
        deleteRecurringTemplate(actionButton.dataset.id);
      }
      return;
    }
  } catch (error) {
    showError(error);
  }
});

// ── Chart tooltip interaction ──
document.addEventListener("mouseover", (e) => {
  const rect = e.target.closest('.chart-container svg rect[data-value]');
  if (!rect) return;
  const container = rect.closest('.chart-container');
  const tooltip = container?.querySelector('.chart-tooltip');
  if (!tooltip) return;
  tooltip.querySelector('.chart-tooltip-month').textContent = rect.dataset.month || '';
  tooltip.querySelector('.chart-tooltip-value').textContent = rect.dataset.value || '';
  tooltip.style.display = 'block';
});
document.addEventListener("mousemove", (e) => {
  const rect = e.target.closest('.chart-container svg rect[data-value]');
  if (!rect) return;
  const container = rect.closest('.chart-container');
  const tooltip = container?.querySelector('.chart-tooltip');
  if (!tooltip) return;
  const bounds = container.getBoundingClientRect();
  const x = e.clientX - bounds.left + 12;
  const y = e.clientY - bounds.top - 12;
  tooltip.style.left = x + 'px';
  tooltip.style.top = y + 'px';
});
document.addEventListener("mouseout", (e) => {
  const rect = e.target.closest('.chart-container svg rect[data-value]');
  if (!rect) return;
  const container = rect.closest('.chart-container');
  const tooltip = container?.querySelector('.chart-tooltip');
  if (tooltip) tooltip.style.display = 'none';
});

document.addEventListener("change", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  try {
    if (target.matches("[data-filter-group='transaction']")) {
      uiState.transactionFilters[target.name] = target.value;
      render();
      return;
    }

    if (target.matches("[data-filter-group='asset']")) {
      uiState.assetTxnFilters[target.name] = target.value;
      render();
      return;
    }

    if (target.matches("[data-ui-state]")) {
      uiState[target.dataset.uiState] = target.value;
      render();
      return;
    }

    if (target.id === "import-json-input" && target.files?.[0]) {
      handleImportFile(target.files[0]).catch(showError);
      return;
    }

    if (
      target.name === "type" ||
      target.name === "asset_type" ||
      target.name === "action" ||
      target.name === "affect_bucket"
    ) {
      const form = target.closest("form");
      if (form) {
        syncConditionalFields(form);
        if (target.name === "type") {
          syncTransactionCategoryList(form);
        }
      }
      return;
    }

    if (target.matches("[data-goal-source-type]")) {
      syncGoalSourceRows(target.closest("[data-goal-source-row]") || document);
      return;
    }

    if (target.matches('select[name^="bucket_rollover_"]')) {
      syncAllocationTransferTargets(target.closest("form") || document);
      return;
    }
  } catch (error) {
    showError(error);
  }
});

document.addEventListener("input", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }
  if (target instanceof HTMLInputElement && target.type === "number") {
    syncAmountHint(target);
  }
  if (target.matches("[data-allocation-percentage]")) {
    syncAllocationTotal(target.closest("form") || document);
    return;
  }
  if (target.matches('input[name^="target_"]')) {
    const field = target.closest(".slider-field");
    const valueLabel = field?.querySelector("strong");
    if (valueLabel) {
      valueLabel.textContent = `${Number(target.value || 0)}%`;
    }
  }
});

document.addEventListener("submit", (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) {
    return;
  }

  event.preventDefault();

  try {
    if (form.dataset.form === "ai-entry-parse") {
      const text = String(form.elements.ai_text?.value || "").trim();
      if (!text) {
        uiState.modal = { type: "ai-entry", inputText: "", parsedList: null, loading: false, error: "Vui lòng nhập một câu mô tả." };
        render();
        return;
      }
      const context = {
        accounts: (latestViewModel?.derived?.accounts || []).map((a) => ({ id: a.id, name: a.name })),
        assets: (latestViewModel?.derived?.assets || []).map((a) => ({ id: a.id, name: a.name })),
      };
      const config = latestViewModel?.derived?.settings || {};
      // Hiển thị trạng thái đang phân tích.
      uiState.modal = { type: "ai-entry", inputText: text, parsedList: null, loading: true, error: "" };
      render();
      // Parse: dùng AI nếu có key, ngược lại parser cục bộ. Câu ghép -> nhiều giao dịch.
      parseFinancialInputWithAIMulti(text, config, context)
        .then((parsedList) => {
          uiState.modal = { type: "ai-entry", inputText: text, parsedList, loading: false, error: "" };
          render();
        })
        .catch((error) => {
          // Fallback cuối: parser cục bộ thuần.
          const parsedList = parseFinancialInputMulti(text, context);
          parsedList.forEach((p) => p.warnings.push(`Lỗi phân tích: ${error.message}`));
          uiState.modal = { type: "ai-entry", inputText: text, parsedList, loading: false, error: "" };
          render();
        });
      return;
    }

    if (form.dataset.form === "ai-entry-confirm") {
      handleAiEntryConfirm(form);
      return;
    }

    if (form.dataset.form === "help-ask") {
      const q = String(form.elements.help_q?.value || "").trim();
      uiState.modal = { type: "help", question: q, result: searchHelp(q) };
      render();
      return;
    }

    if (form.dataset.form === "transaction") {      validateTransactionForm(form);
      const transactionType = form.elements.type.value;
      const fromAccountId = form.elements.from_account_id?.value || "";
      const toAccountId = form.elements.to_account_id?.value || "";
      const accountTypeById = Object.fromEntries(
        (latestViewModel?.derived?.accounts || []).map((account) => [account.id, account.type]),
      );
      const investmentTypes = new Set(["investment", "derivative", "securities_cash"]);

      let affectBucket = getCheckbox(form, "affect_bucket");
      let bucketId = form.elements.bucket_id?.value || "";
      let bucketImpact = form.elements.bucket_impact?.value || "allocate";

      if (transactionType === "transfer" && !affectBucket) {
        const fromType = accountTypeById[fromAccountId];
        const toType = accountTypeById[toAccountId];
        const fromInvestment = investmentTypes.has(fromType);
        const toInvestment = investmentTypes.has(toType);

        if (toInvestment && !fromInvestment) {
          affectBucket = true;
          bucketImpact = "allocate";
        } else if (fromInvestment && !toInvestment) {
          affectBucket = true;
          bucketImpact = "withdraw";
        }

        if (affectBucket && !bucketId) {
          const investmentBuckets = (latestViewModel?.derived?.activeBuckets || []).filter(
            (bucket) => bucket.type !== "expense_budget",
          );
          bucketId =
            investmentBuckets.find((bucket) => bucket.id === "alloc_trade")?.id || investmentBuckets[0]?.id || "";
        }
      }

      const suggestion = upsertTransaction({
        id: form.elements.id.value || undefined,
        date: form.elements.date.value,
        type: transactionType,
        amount: getFormNumber(form, "amount"),
        category: form.elements.category.value,
        description: form.elements.description.value,
        account_id: form.elements.account_id?.value || "",
        income_source: form.elements.income_source?.value || "",
        from_account_id: fromAccountId,
        to_account_id: toAccountId,
        liability_id: form.elements.liability_id?.value || "",
        asset_id: form.elements.asset_id?.value || "",
        affect_bucket: affectBucket,
        bucket_id: bucketId,
        bucket_impact: bucketImpact,
        notes: form.elements.notes.value,
        trigger_allocation: form.elements.trigger_allocation?.checked,
      });
      closeModal();
      if (suggestion) {
        uiState.modal = { type: "allocation-preview", amount: suggestion.amount };
      }
      showSaved("Đã lưu giao dịch.");
      render();
      return;
    }

    if (form.dataset.form === "account") {
      validateAccountForm(form);
      const editingAccountId = uiState.modal?.type === "account" ? uiState.modal.id : undefined;
      upsertAccount({
        _mode: editingAccountId ? "edit" : "create",
        id: editingAccountId || undefined,
        name: form.elements.name.value,
        type: form.elements.type.value,
        bank_name: form.elements.bank_name.value,
        broker: form.elements.broker.value,
        tracking_mode: form.elements.tracking_mode.value,
        last_updated: form.elements.last_updated.value,
        credit_limit: getFormNumber(form, "credit_limit"),
        statement_date: form.elements.statement_date?.value || "",
        due_date: form.elements.due_date?.value || "",
        opening_balance: getFormNumber(form, "opening_balance"),
        opening_date: form.elements.opening_date?.value || "",
        notes: form.elements.notes.value,
      });
      closeModal();
      showSaved("Đã lưu tài khoản.");
      render();
      return;
    }

    if (form.dataset.form === "asset") {
      validateAssetForm(form);
      upsertAsset({
        id: form.elements.id.value || undefined,
        name: form.elements.name.value,
        ticker: form.elements.ticker.value,
        asset_type: form.elements.asset_type.value,
        bucket: form.elements.bucket.value,
        exchange: form.elements.exchange.value,
        current_price: getFormNumber(form, "current_price"),
        interest_rate: getFormNumber(form, "interest_rate"),
        term_months: getFormNumber(form, "term_months"),
        start_date: form.elements.start_date.value,
        maturity_date: form.elements.maturity_date?.value || "",
        interest_type: form.elements.interest_type?.value || "",
        auto_rollover: getCheckbox(form, "auto_rollover"),
        is_pledged: getCheckbox(form, "is_pledged"),
        underlying_asset: form.elements.underlying_asset?.value || "",
        expiry_date: form.elements.expiry_date?.value || "",
        exercise_price: getFormNumber(form, "exercise_price"),
        conversion_ratio: getFormNumber(form, "conversion_ratio"),
        issuer: form.elements.issuer?.value || "",
        notes: form.elements.notes.value,
      });
      closeModal();
      showSaved("Đã lưu tài sản.");
      render();
      return;
    }

    if (form.dataset.form === "asset-transaction") {
      validateAssetTransactionForm(form);
      const result = upsertAssetTransaction({
        id: form.elements.id.value || undefined,
        date: form.elements.date.value,
        asset_id: form.elements.asset_id.value,
        action: form.elements.action.value,
        account_id: form.elements.account_id.value,
        quantity: getFormNumber(form, "quantity"),
        price: getFormNumber(form, "price"),
        fee: getFormNumber(form, "fee"),
        total_cash: getFormNumber(form, "total_cash"),
        notes: form.elements.notes.value,
      });
      closeModal();
      if (result?.suggestReinvest) {
        uiState.modal = {
          type: "reinvest-suggestion",
          amount: result.suggestReinvest.amount,
          assetId: result.suggestReinvest.assetId,
        };
      }
      showSaved("Đã lưu giao dịch tài sản.");
      render();
      return;
    }

    if (form.dataset.form === "liability") {
      validateLiabilityForm(form);
      upsertLiability({
        id: form.elements.id.value || undefined,
        name: form.elements.name.value,
        counterparty: form.elements.counterparty?.value || "",
        type: form.elements.type.value,
        total_amount: getFormNumber(form, "total_amount"),
        remaining_amount: getFormNumber(form, "remaining_amount"),
        interest_rate: getFormNumber(form, "interest_rate"),
        monthly_payment: getFormNumber(form, "monthly_payment"),
        start_date: form.elements.start_date.value,
        end_date: form.elements.end_date.value,
        notes: form.elements.notes.value,
      });
      closeModal();
      showSaved("Đã lưu khoản nợ.");
      render();
      return;
    }

    if (form.dataset.form === "counterparty-flow") {
      validateCounterpartyFlowForm(form);
      recordCounterpartyFlow({
        counterparty: form.elements.counterparty.value,
        side: form.elements.side.value,
        direction: form.elements.direction.value,
        amount: getFormNumber(form, "amount"),
        accountId: form.elements.account_id.value,
        date: form.elements.date.value,
        notes: form.elements.notes.value,
        liabilityId: form.elements.liability_id?.value || "",
        receivableId: form.elements.receivable_id?.value || "",
      });
      closeModal();
      showSaved("Đã ghi nhận dòng tiền công nợ theo đối tượng.");
      render();
      return;
    }

    if (form.dataset.form === "debt-payment") {
      validateDebtPaymentForm(form);
      recordDebtPayment({
        liabilityId: form.elements.liability_id.value,
        principalAmount: getFormNumber(form, "principal_amount"),
        fromAccountId: form.elements.from_account_id.value,
        date: form.elements.date.value,
        notes: form.elements.notes.value,
      });
      closeModal();
      showSaved("Đã ghi nhận thanh toán nợ.");
      render();
      return;
    }

    if (form.dataset.form === "receivable") {
      validateReceivableForm(form);
      upsertReceivable({
        id: form.elements.id?.value || undefined,
        name: form.elements.name.value,
        type: form.elements.type.value,
        counterparty: form.elements.counterparty.value,
        original_amount: getFormNumber(form, "original_amount"),
        remaining_amount: getFormNumber(form, "remaining_amount"),
        start_date: form.elements.start_date.value,
        expected_return_date: form.elements.expected_return_date?.value || "",
        likelihood: form.elements.likelihood.value,
        is_secured: getCheckbox(form, "is_secured"),
        is_pledged: getCheckbox(form, "is_pledged"),
        account_id: form.elements.account_id?.value || "",
        notes: form.elements.notes.value,
      });
      closeModal();
      showSaved("Lưu khoản cho vay.");
      render();
      return;
    }

    if (form.dataset.form === "receivable-payment") {
      validateReceivablePaymentForm(form);
      recordReceivablePayment(
        form.elements.receivable_id.value,
        getFormNumber(form, "amount"),
        form.elements.to_account_id.value,
        form.elements.date.value,
        form.elements.notes.value,
      );
      closeModal();
      showSaved("Ghi nhận thu nợ.");
      render();
      return;
    }

    if (form.dataset.form === "goal") {
      validateGoalForm(form);
      upsertGoal({
        id: form.elements.id.value || undefined,
        name: form.elements.name.value,
        type: form.elements.type.value,
        target_amount: getFormNumber(form, "target_amount"),
        deadline: form.elements.deadline.value,
        priority: form.elements.priority.value,
        linked_sources: buildGoalSources(form),
        notes: form.elements.notes.value,
      });
      closeModal();
      showSaved("Đã lưu mục tiêu.");
      render();
      return;
    }

    if (form.dataset.form === "price-update") {
      updateAssetPrice(form.elements.asset_id.value, getFormNumber(form, "current_price"));
      closeModal();
      showSaved("Đã cập nhật giá tài sản.");
      render();
      return;
    }

    if (form.dataset.form === "derivative-update") {
      recordDerivativeBalanceUpdate({
        accountId: form.elements.account_id.value,
        actualBalance: getFormNumber(form, "actual_balance"),
        classification: form.elements.classification.value,
        date: form.elements.date.value,
        notes: form.elements.notes.value,
      });
      closeModal();
      showSaved("Đã cập nhật số dư tài khoản đầu tư.");
      render();
      return;
    }

    if (form.dataset.form === "settings-general") {
      validateSettingsGeneralForm(form);
      updateGeneralSettings({
        income_mode: form.elements.income_mode.value,
        rolling_window: getFormNumber(form, "rolling_window"),
        min_allocation_trigger: getFormNumber(form, "min_allocation_trigger"),
        passive_income_default: getFormNumber(form, "passive_income_default"),
        rebalance_threshold: getFormNumber(form, "rebalance_threshold"),
        ai_provider: DEFAULT_AI_PROVIDER,
        ai_api_key: form.elements.ai_api_key.value,
        ai_base_url: form.elements.ai_base_url.value || DEFAULT_AI_BASE_URL,
        ai_model: form.elements.ai_model.value,
        ai_prompt_style: form.elements.ai_prompt_style?.value || "balanced",
      });
      showSaved("Đã lưu thiết lập chung.");
      return;
    }

    if (form.dataset.form === "allocation-settings") {
      const nextBuckets = {};
      Array.from(form.elements).forEach((element) => {
        if (!(element instanceof HTMLInputElement || element instanceof HTMLSelectElement)) {
          return;
        }
        if (element.name.startsWith("bucket_percentage_")) {
          const bucketId = element.name.replace("bucket_percentage_", "");
          nextBuckets[bucketId] = nextBuckets[bucketId] || {};
          nextBuckets[bucketId].percentage = Number(element.value || 0);
        }
        if (element.name.startsWith("bucket_rollover_")) {
          const bucketId = element.name.replace("bucket_rollover_", "");
          nextBuckets[bucketId] = nextBuckets[bucketId] || {};
          nextBuckets[bucketId].rolloverType = element.value || "accumulate";
        }
        if (element.name.startsWith("bucket_target_")) {
          const bucketId = element.name.replace("bucket_target_", "");
          nextBuckets[bucketId] = nextBuckets[bucketId] || {};
          nextBuckets[bucketId].targetBucketId = element.value || "";
        }
        if (element.name.startsWith("bucket_categories_")) {
          const bucketId = element.name.replace("bucket_categories_", "");
          nextBuckets[bucketId] = nextBuckets[bucketId] || {};
          nextBuckets[bucketId].defaultCategories = normalizeTextList(element.value);
        }
      });
      updateAllocationBuckets(nextBuckets);
      showSaved("Đã lưu rule phân bổ.");
      return;
    }

    if (form.dataset.form === "bucket-targets") {
      const targets = {};
      Array.from(form.elements).forEach((element) => {
        if (element instanceof HTMLInputElement && element.name.startsWith("target_")) {
          targets[element.name.replace("target_", "")] = Number(element.value || 0);
        }
      });
      updateBucketTargets(targets);
      showSaved("Đã lưu target bucket.");
      return;
    }

    if (form.dataset.form === "category-map") {
      const mapping = {};
      Array.from(form.elements).forEach((element) => {
        if (element instanceof HTMLSelectElement && element.name.startsWith("map_")) {
          mapping[element.name.replace("map_", "")] = element.value;
        }
      });
      updateCategoryMapping(mapping);
      showSaved("Đã lưu map danh mục.");
      return;
    }

    if (form.dataset.form === "categories") {
      replaceCategories({
        income_categories: normalizeTextList(form.elements.income_categories.value),
        expense_categories: normalizeTextList(form.elements.expense_categories.value),
      });
      showSaved("Đã lưu danh mục.");
      return;
    }

    if (form.dataset.form === "recurring-template") {
      validateRecurringTemplateForm(form);
      upsertRecurringTemplate({
        id: form.elements.id.value || undefined,
        name: form.elements.name.value,
        type: form.elements.type.value,
        amount: getFormNumber(form, "amount"),
        category: form.elements.category.value,
        frequency: form.elements.frequency.value,
        default_account_id: form.elements.default_account_id.value,
        notes: form.elements.notes.value,
      });
      form.reset();
      showSaved("Đã lưu recurring template.");
      return;
    }

    if (form.dataset.form === "ai-chat") {
      const question = String(form.elements.message?.value || "").trim();
      if (!question || uiState.aiChat.loading) {
        return;
      }

      form.reset();
      uiState.aiChat.messages.push({
        id: `chat-${Date.now()}-u`,
        role: "user",
        text: question,
        time: new Date().toISOString(),
      });
      uiState.aiChat.loading = true;
      render();

      const config = latestViewModel?.derived?.settings || {};
      const done = (text) => {
        uiState.aiChat.messages.push({
          id: `chat-${Date.now()}-a`,
          role: "assistant",
          text,
          time: new Date().toISOString(),
        });
        uiState.aiChat.loading = false;
        render();
      };

      if (config.ai_api_key) {
        fetchAiChat(question, config, latestViewModel)
          .then(done)
          .catch((error) => done(`Lỗi AI: ${error.message}`));
      } else {
        done(generateLocalChatReply(question, latestViewModel));
      }
      return;
    }

    if (form.dataset.form === "reset-data") {
      resetAllData(form.elements.confirm_text.value);
      closeModal();
      render();
    }
  } catch (error) {
    showError(error);
  }
});

function sanitizeHeaderValue(value) {
  return String(value || "")
    .replace(/[\r\n]/g, "")
    .replace(/[^\u0009\u0020-\u007E\u00A0-\u00FF]/g, "")
    .trim();
}

async function fetchAiInsight(panelId, config, vm) {

  const apiKey = sanitizeHeaderValue(config.ai_api_key);
  if (!apiKey) {
    throw new Error("Vui lòng nhập DeepSeek API key trong Cài đặt.");
  }
  const baseUrl = (config.ai_base_url || DEFAULT_AI_BASE_URL).replace(/\/$/, "");
  const endpoint = `${baseUrl}/chat/completions`;
  
  const financialSummary = {
    netWorth: vm.dashboard.kpis.find(k => k.label.toLowerCase().includes("ròng"))?.value || 0,
    cash: vm.dashboard.kpis.find(k => k.label.toLowerCase().includes("thanh khoản"))?.value || 0,
    debt: vm.dashboard.kpis.find(k => k.label.toLowerCase().includes("tổng nợ"))?.value || 0,
    emergencyFundMonths: vm.dashboard.emergencyFund?.monthsEquivalent || 0,
    recentIncome: vm.transactionsPage?.summary?.totalIncome || 0,
    recentExpense: vm.transactionsPage?.summary?.totalExpense || 0,
    topAssets: vm.dashboard.topAssets.map(a => `${a.name}: ${a.currentValue}`).join(", ")
  };
  const fullDataContext = buildAiFullDataContext(vm);
  const logicContext = buildAiLogicContext();

  const prompts = {
    "unusual-spending": "Phân tích các khoản chi tiêu hiện tại và tìm ra các điểm bất thường hoặc lãng phí.",
    "rebalance": "Dựa trên phân bổ danh mục hiện tại, hãy gợi ý cách tái cân bằng tối ưu.",
    "lookup": "Tổng quan sức khỏe tài chính hiện tại của tôi thế nào?",
    "forecast": "Dự báo tình hình tài chính trong 6-12 tháng tới dựa trên thu nhập và chi tiêu hiện tại.",
    "idle-cash": "Tôi có đang để quá nhiều tiền mặt nhàn rỗi không? Gợi ý hướng tối ưu hóa.",
    "irregular-income": "Với thu nhập không đều, tôi nên điều chỉnh kế hoạch dự phòng như thế nào?"
  };

  const userPrompt = `${prompts[panelId] || "Hãy đưa ra lời khuyên tài chính."} 
  Dữ liệu tài chính hiện tại:
  - Giá trị ròng: ${financialSummary.netWorth}
  - Tiền mặt: ${financialSummary.cash}
  - Tổng nợ: ${financialSummary.debt}
  - Quỹ dự phòng: ${financialSummary.emergencyFundMonths.toFixed(1)} tháng chi phí
  - Thu nhập tháng này: ${financialSummary.recentIncome}
  - Chi tiêu tháng này: ${financialSummary.recentExpense}
  - Danh mục tài sản: ${financialSummary.topAssets}

  Dữ liệu đầy đủ (JSON):
  ${JSON.stringify(fullDataContext)}

  Logic xử lý nghiệp vụ (JSON):
  ${JSON.stringify(logicContext)}

  Yêu cầu: Viết ngắn gọn, chuyên nghiệp, thực tế bằng tiếng Việt. Tối đa 3-4 câu. Trả về kết quả dưới dạng văn bản thuần túy.`;

  const headers = new Headers();
  try {
    headers.set("Content-Type", "application/json");
    headers.set("Authorization", `Bearer ${apiKey}`);
  } catch {
    throw new Error("Header API không hợp lệ. Vui lòng dán lại DeepSeek API key (không chứa ký tự ẩn).");
  }

  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: config.ai_model || DEFAULT_AI_MODEL,
        messages: [
          {
            role: "system",
            content: getFinancialExpertSystemPrompt(config.ai_prompt_style),
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
        temperature: 0.5,
      }),
    });
  } catch (error) {
    if (String(error?.message || "").toLowerCase().includes("headers")) {
      throw new Error("Lỗi mã hóa header API. Hãy xóa và dán lại DeepSeek API key bằng ký tự thường, không dùng smart quote.");
    }
    throw error;
  }

  if (!response.ok) {
    let message = "Lỗi gọi DeepSeek API";
    try {
      const errorData = await response.json();
      message = errorData.error?.message || errorData.message || message;
    } catch {
      // Ignore parse error and keep default message.
    }
    throw new Error(message);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || "Không có phản hồi từ AI.";
}

function generateLocalChatReply(question, vm) {
  const netWorth = Number(vm?.derived?.netWorth?.netWorth || 0);
  const emergencyFund = Number(vm?.derived?.emergencyFund?.total || 0);
  const averageExpense = Number(vm?.derived?.averageMonthlyExpense || 0);
  const months = averageExpense > 0 ? emergencyFund / averageExpense : 0;
  return `Bạn đang dùng chế độ chat cục bộ vì chưa có DeepSeek API key. Mình đã nhận câu hỏi: "${question}".
Tổng tài sản ròng hiện khoảng ${netWorth.toLocaleString("vi-VN")} ₫ và quỹ khẩn cấp tương đương ${months.toFixed(1)} tháng chi phí.
  Để nhận phản hồi AI đầy đủ theo ngữ cảnh hội thoại, hãy vào Cài đặt và nhập DeepSeek API key.`;
}

function buildAiFullDataContext(vm) {
  const derived = vm?.derived || {};
  const dashboard = vm?.dashboard || {};
  const txRows = (derived.transactionViews || []).map((row) => ({
    id: row.id,
    date: row.date,
    type: row.type,
    typeLabel: row.typeLabel,
    amount: row.amount,
    signedAmount: row.signedAmount,
    category: row.category || "",
    description: row.description || "",
    accountName: row.accountName || "",
    income_source: row.income_source || "",
    notes: row.notes || "",
  }));

  return {
    meta: {
      now: new Date().toISOString(),
      currentMonth: derived.currentMonthKey,
      incomeMode: derived.settings?.income_mode || "regular",
    },
    netWorth: derived.netWorth || {},
    emergencyFund: derived.emergencyFund || {},
    averageMonthlyExpense: derived.averageMonthlyExpense || 0,
    rollingBase: derived.rollingBase || {},
    monthlyStats: derived.monthlyStats || [],
    netWorthHistory12: derived.netWorthHistory12 || [],
    accountGroups: derived.accountGroups || [],
    accounts: derived.accounts || [],
    transactions: txRows,
    assets: derived.assets || [],
    portfolioBuckets: derived.portfolioBuckets || [],
    liabilities: derived.liabilities || [],
    receivables: derived.receivables || [],
    goals: derived.goalViews || [],
    budgetCurrent: dashboard.currentBudget || [],
    topAssets: dashboard.topAssets || [],
    alerts: {
      banners: vm?.runtime?.banners || [],
      toasts: vm?.runtime?.toasts || [],
    },
  };
}

function buildAiLogicContext() {
  return {

    // ─── 1. QUY TẮC LOẠI GIAO DỊCH ───────────────────────────────────────
    transactionTypes: {
      income: "Thu nhập thực tế. NHƯNG phải kiểm tra receivable_id và asset_id trước khi kết luận (xem mirrorTransactions).",
      expense: "Chi tiêu thực tế. NHƯNG phải kiểm tra receivable_id trước khi kết luận.",
      transfer: "Chuyển tiền nội bộ giữa tài khoản. Không thay đổi net worth. Nếu affect_bucket=true thì tác động bucket đầu tư.",
      loan_disbursement: "Giải ngân vay — tiền vào tài khoản từ ngân hàng. KHÔNG phải thu nhập. Không tính income, không trigger allocation.",
      asset_purchase: "Mua tài sản — tiền ra để mua cổ phiếu/vàng/... KHÔNG phải chi tiêu sinh hoạt. Chỉ đổi dạng tài sản.",
      asset_sale: "Bán tài sản — tiền về tài khoản. KHÔNG phải thu nhập. Chỉ đổi dạng tài sản.",
      opening_balance: "Số dư ban đầu khi tạo tài khoản. KHÔNG phải thu nhập thực sự.",
      balance_adjustment: "Điều chỉnh số dư tài khoản phái sinh/đầu tư (mark-to-market). KHÔNG phải income hay expense sinh hoạt. Bỏ qua khi phân tích thu chi."
    },

    // ─── 2. HỆ THỐNG MIRROR TRANSACTION (QUAN TRỌNG NHẤT) ─────────────────
    mirrorTransactions: {
      _warning: "Một số hành động tạo 2 bản ghi đồng thời. KHÔNG được đếm đôi. PHẢI dùng field nhận dạng để lọc đúng.",

      receivableLend: {
        trigger: "upsertReceivable() với account_id",
        creates: "type:'expense', category:'Cho vay', có receivable_id",
        meaning: "Tiền ra khỏi tài khoản nhưng KHÔNG PHẢI chi tiêu sinh hoạt. Khoản tiền này vẫn là tài sản (nợ phải thu).",
        filterKey: "transaction.receivable_id != null && transaction.category === 'Cho vay'",
        rule: "LOẠI TRỪ khỏi phân tích chi tiêu và budget"
      },

      receivableCollect: {
        trigger: "recordReceivablePayment()",
        creates: "type:'income', category:'Thu hồi nợ', có receivable_id, trigger_allocation:false",
        meaning: "Tiền về tài khoản nhưng KHÔNG PHẢI thu nhập mới. Chỉ đổi dạng tài sản từ 'nợ phải thu' thành tiền mặt.",
        filterKey: "transaction.receivable_id != null",
        rule: "LOẠI TRỪ khỏi phân tích thu nhập. Thu nợ gốc ≠ thu nhập thực tế.",
        knownBug: "Hiện lưu type:'income' nên monthlyStats.income bị tăng ảo khi có thu nợ. Khi AI tính thu nhập thực tế phải tự lọc bằng filterKey trên."
      },

      assetBuy: {
        trigger: "upsertAssetTransaction(BUY)",
        creates: "type:'asset_purchase', có asset_id",
        rule: "LOẠI TRỪ khỏi phân tích chi tiêu"
      },

      assetSell: {
        trigger: "upsertAssetTransaction(SELL)",
        creates: "type:'asset_sale', có asset_id",
        rule: "LOẠI TRỪ khỏi phân tích thu nhập"
      },

      assetDividend: {
        trigger: "upsertAssetTransaction(DIVIDEND)",
        creates: "type:'income', category:'Cổ tức', có asset_id, trigger_allocation:false",
        meaning: "ĐÂY LÀ THU NHẬP THẬT từ cổ tức. Không bị lọc như thu nợ.",
        rule: "GIỮ LẠI khi phân tích thu nhập thụ động"
      },

      assetInterest: {
        trigger: "upsertAssetTransaction(INTEREST)",
        creates: "type:'income', category:'Lãi tiết kiệm', có asset_id, trigger_allocation:false",
        meaning: "ĐÂY LÀ THU NHẬP THẬT từ lãi tiết kiệm/trái phiếu.",
        rule: "GIỮ LẠI khi phân tích thu nhập thụ động"
      }
    },

    // ─── 3. CÔNG THỨC TÍNH THU NHẬP THỰC TẾ ──────────────────────────────
    realIncomeFormula: {
      formula: "income thực = transactions.filter(t => t.type==='income' && !t.receivable_id)",
      includes: ["Lương", "Freelance", "Cho thuê", "Cổ tức (asset_id có)", "Lãi tiết kiệm (asset_id có)"],
      excludes: [
        "type:income có receivable_id → thu nợ gốc",
        "type:opening_balance → số dư ban đầu",
        "type:loan_disbursement → vay ngân hàng",
        "type:asset_sale → bán tài sản",
        "type:balance_adjustment → điều chỉnh phái sinh"
      ],
      note: "monthlyStats.income trong data context CÓ THỂ bị thổi phồng nếu tháng đó có thu nợ. AI nên tự tính lại từ mảng transactions[] khi cần chính xác."
    },

    // ─── 4. CÔNG THỨC NET WORTH ───────────────────────────────────────────
    netWorthFormula: {
      formula: "netWorth = cash + portfolio + receivables_discounted - debts - ccDebt",
      receivableDiscount: "high=100%, medium=70%, low=30%. Loại trừ is_pledged=true.",
      emergencyFundLayer1: "bank + ewallet + cash + securities_cash có số dư dương",
      emergencyFundLayer2: "tài sản savings không cầm cố, đáo hạn trong 30 ngày, haircut 10% (gồm lãi dự tính)",
      emergencyFundExcluded: "stock, etf, gold, real_estate, crypto, receivables, hạn mức thẻ, savings đã cầm cố"
    },

    // ─── 5. QUY TẮC BUDGET ────────────────────────────────────────────────
    budgetRules: {
      spentAmount: "Chỉ cộng type:expense theo category_allocation_map của bucket trong tháng. Loại trừ: transfer, loan_disbursement, asset_purchase, asset_sale, và expense có receivable_id.",
      rollover: "Expense bucket: rolloverOut = effectiveBudget - spentAmount. Investment bucket: rolloverOut = effectiveBudget - investedAmount. Nếu rolloverType=accumulate thì cộng dồn tháng sau.",
      effectiveBudget: "baseAmount + rolloverIn từ tháng trước"
    },

    // ─── 6. QUY TẮC TRẢ NỢ ───────────────────────────────────────────────
    debtPaymentRules: {
      interestFormula: "interestAmount = round(remaining_amount × interest_rate / 100 / 12)",
      principalEffect: "Giảm remaining_amount theo principal_amount",
      cashEffect: "Tiền ra = principal_amount + interestAmount",
      mirrorTransaction: "Tạo type:expense trong transactions để trừ balance tài khoản"
    },

    // ─── 7. TRIGGER ALLOCATION FLAG ───────────────────────────────────────
    triggerAllocationFlag: {
      meaning: "trigger_allocation:false → không tính vào rolling income base (computeRollingBase lọc ra)",
      transactionsWithFalse: [
        "asset_purchase, asset_sale (tự động false)",
        "loan_disbursement (tự động false)",
        "DIVIDEND/INTEREST mirror (trigger_allocation:false)",
        "Thu hồi nợ / Cho vay mirror (trigger_allocation:false)"
      ],
      implication: "rollingBase.avg và rollingBase.conservative đã loại các khoản này — đây là thu nhập cơ sở đáng tin cậy hơn monthlyStats.income"
    },

    // ─── 8. QUY TẮC MỤC TIÊU ─────────────────────────────────────────────
    goalRules: {
      doubleCounting: "Nếu include_full_balance=true trùng nguồn giữa nhiều goal → cảnh báo, không chặn.",
      progressPct: "totalAllocated / target_amount × 100",
      linkedSources: "account (lấy balance), asset (lấy current_value × share_percentage%), bucket (lấy investedAmount)"
    },

    // ─── 9. RÀNG BUỘC PHẢN HỒI AI ────────────────────────────────────────
    aiResponseConstraints: {
      language: "Tiếng Việt",
      currency: "VND, số nguyên, có dấu phân cách ngàn",
      style: "Ngắn gọn, có cấu trúc, hành động rõ ràng",
      forbidden: ["cam kết lợi nhuận", "khuyến nghị đầu cơ mạo hiểm", "bịa số liệu khi thiếu data"],
      format: "1. Chẩn đoán nhanh → 2. Khuyến nghị ưu tiên → 3. Bước thực hiện ngay"
    }

  };
}

// ─── EXECUTE AI ACTIONS ─────────────────────────────────────────────────────

function executeAiActions(actions) {
  if (!Array.isArray(actions) || actions.length === 0) return [];
  const results = [];

  for (const action of actions) {
    try {
      switch (action.type) {

        case "upsertTransaction":
          upsertTransaction({
            date: action.date,
            type: action.transactionType,
            account_id: action.accountId,
            from_account_id: action.fromAccountId,
            to_account_id: action.toAccountId,
            amount: action.amount,
            category: action.category,
            description: action.description,
            notes: action.notes,
            trigger_allocation: action.triggerAllocation !== false,
          });
          results.push(`✅ Đã ghi: ${action.transactionType} ${(action.amount || 0).toLocaleString("vi-VN")} ₫ — ${action.description || ""}`);
          break;

        case "upsertAccount":
          upsertAccount({
            name: action.name,
            type: action.accountType,
            tracking_mode: action.trackingMode || "manual",
            last_updated: action.lastUpdated || new Date().toISOString().slice(0, 10),
            opening_balance: action.openingBalance || 0,
            opening_date: action.openingDate,
            notes: action.notes,
          });
          results.push(`✅ Đã tạo tài khoản: ${action.name}`);
          break;

        case "upsertLiability":
          upsertLiability({
            name: action.name,
            type: action.liabilityType || "loan",
            total_amount: action.totalAmount,
            remaining_amount: action.remainingAmount,
            interest_rate: action.interestRate,
            monthly_payment: action.monthlyPayment,
            start_date: action.startDate,
            end_date: action.endDate,
            notes: action.notes,
          });
          results.push(`✅ Đã ghi khoản nợ: ${action.name}`);
          break;

        case "upsertGoal":
          upsertGoal({
            name: action.name,
            type: action.goalType || "wealth",
            target_amount: action.targetAmount,
            deadline: action.deadline,
            priority: action.priority || "medium",
            notes: action.notes,
          });
          results.push(`✅ Đã tạo mục tiêu: ${action.name}`);
          break;

        case "updateAssetPrice":
          updateAssetPrice(action.assetId, action.newPrice);
          results.push(`✅ Đã cập nhật giá: ${action.assetId} = ${(action.newPrice || 0).toLocaleString("vi-VN")}`);
          break;

        case "adjustBalance": {
          const accountId = action.accountId;
          const freshVM = buildViewModel(uiState);
          const account = freshVM?.derived?.accounts?.find((a) => a.id === accountId);
          if (!account) {
            results.push(`❌ Không tìm thấy tài khoản ID: ${accountId}`);
            break;
          }
          const targetBal = Math.round(Number(action.targetBalance) || 0);
          const currentBal = Math.round(Number(account.balance) || 0);
          const diff = targetBal - currentBal;
          if (Math.abs(diff) < 1) {
            results.push(`ℹ️ ${account.name}: số dư đã đúng (${targetBal.toLocaleString("vi-VN")} ₫)`);
            break;
          }
          const invests = ["investment", "derivative", "securities_cash"];
          if (invests.includes(account.type)) {
            recordDerivativeBalanceUpdate(
              accountId,
              targetBal,
              diff > 0 ? "thu nhập" : "chi phí",
              action.description || "Điều chỉnh số dư qua AI",
              action.date || new Date().toISOString().slice(0, 10),
            );
          } else {
            upsertTransaction({
              date: action.date || new Date().toISOString().slice(0, 10),
              type: diff > 0 ? "income" : "expense",
              account_id: accountId,
              amount: Math.abs(diff),
              category: "Điều chỉnh số dư",
              description: action.description || `Điều chỉnh ${account.name} → ${targetBal.toLocaleString("vi-VN")} ₫`,
              trigger_allocation: false,
              notes: "ai-balance-adjust",
            });
          }
          results.push(`✅ ${account.name}: ${diff > 0 ? "+" : ""}${diff.toLocaleString("vi-VN")} ₫ → ${targetBal.toLocaleString("vi-VN")} ₫`);
          break;
        }

        default:
          results.push(`⚠️ Action không hỗ trợ: ${action.type}`);
      }
    } catch (err) {
      results.push(`❌ "${action.type}": ${err.message}`);
      console.error("[AI Action Error]", action.type, err);
    }
  }

  render();
  return results;
}

// ─── FETCH AI CHAT (Data-Entry Mode) ────────────────────────────────────────

async function fetchAiChat(question, config, vm) {
  const apiKey = sanitizeHeaderValue(config.ai_api_key);
  if (!apiKey) throw new Error("Thiếu DeepSeek API key.");

  const baseUrl = (config.ai_base_url || DEFAULT_AI_BASE_URL).replace(/\/$/, "");
  const endpoint = `${baseUrl}/chat/completions`;
  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  headers.set("Authorization", `Bearer ${apiKey}`);

  const fullDataContext = buildAiFullDataContext(vm);
  const logicContext = buildAiLogicContext();

  const recentContext = (uiState.aiChat.messages || []).slice(-8).map((message) => ({
    role: message.role === "user" ? "user" : "assistant",
    content: String(message.text || ""),
  }));

  const accountRef = (vm.derived.accounts || []).map((a) => ({
    id: a.id, name: a.name, type: a.type, balance: a.balance,
  }));

  const DATA_ENTRY_PROMPT = `Bạn là trợ lý nhập liệu tài chính cho ứng dụng Wealth Manager. Bạn CÓ THỂ nhập dữ liệu khi người dùng yêu cầu.

## KHẢ NĂNG
Bạn có thể trả về JSON với \`actions[]\` để thực thi:

### 1. Ghi giao dịch
\`\`\`json
{"type":"upsertTransaction","transactionType":"income|expense|transfer","date":"YYYY-MM-DD","accountId":"<id từ danh sách>","amount":5000000,"category":"Ăn uống","description":"","triggerAllocation":true}
\`\`\`
Transfer dùng fromAccountId + toAccountId.

### 2. Tạo tài khoản
\`\`\`json
{"type":"upsertAccount","name":"Tên","accountType":"bank|ewallet|cash|investment|derivative|credit_card|securities_cash","openingBalance":0}
\`\`\`

### 3. Ghi khoản nợ
\`\`\`json
{"type":"upsertLiability","name":"Tên vay","totalAmount":100000000,"remainingAmount":100000000,"interestRate":8.5,"monthlyPayment":5000000,"startDate":"YYYY-MM-DD"}
\`\`\`

### 4. Tạo mục tiêu
\`\`\`json
{"type":"upsertGoal","name":"Tên mục tiêu","targetAmount":500000000,"deadline":"YYYY-MM-DD","priority":"high|medium|low"}
\`\`\`

### 5. Cập nhật giá tài sản
\`\`\`json
{"type":"updateAssetPrice","assetId":"<id>","newPrice":55000}
\`\`\`

### 6. Điều chỉnh số dư tài khoản
\`\`\`json
{"type":"adjustBalance","accountId":"<id>","targetBalance":43418840,"date":"YYYY-MM-DD","description":"Lý do điều chỉnh"}
\`\`\`
⚠️ Dùng khi người dùng nói "số dư hiện là X", "điều chỉnh về X". Dùng targetBalance (số dư đích), KHÔNG dùng delta. KHÔNG dùng upsertTransaction với type balance_adjustment.

## QUY TẮC
Phản hồi LUÔN là JSON:
\`\`\`json
{"text":"Giải thích tiếng Việt","actions":[]}
\`\`\`
- Nếu không nhập liệu: actions rỗng
- Nếu thiếu thông tin: hỏi trong text, KHÔNG đoán
- accountId từ danh sách thực tế
- Số tiền là số nguyên VND

## NGHIỆP VỤ
${JSON.stringify(logicContext.transactionTypes, null, 2)}
${JSON.stringify(logicContext.mirrorTransactions ? logicContext.mirrorTransactions._warning : "")}
`.trim();

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: config.ai_model || DEFAULT_AI_MODEL,
      messages: [
        { role: "system", content: DATA_ENTRY_PROMPT },
        { role: "system", content: `Danh sách tài khoản: ${JSON.stringify(accountRef)}` },
        { role: "system", content: `Dữ liệu tài chính: ${JSON.stringify(fullDataContext)}` },
        ...recentContext,
        { role: "user", content: question },
      ],
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    let message = "Lỗi gọi DeepSeek API";
    try { const err = await response.json(); message = err.error?.message || err.message || message; } catch { /* ignore */ }
    throw new Error(message);
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content?.trim() || "{}";

  let parsed;
  try { parsed = JSON.parse(raw); } catch { return raw; }

  if (Array.isArray(parsed.actions) && parsed.actions.length > 0) {
    const execResults = executeAiActions(parsed.actions);
    return `${parsed.text || ""}\n\n${execResults.join("\n")}`.trim();
  }

  return parsed.text || raw;
}

subscribe(() => {
  try {
    render();
  } catch (err) {
    console.error("[WealthApp] render error in subscriber:", err);
  }
});
loadState();
render();
