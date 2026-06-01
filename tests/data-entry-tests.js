// tests/data-entry-tests.js
// Chay trong browser console:
//   import("./tests/data-entry-tests.js")
// Hoac goi lai:
//   window.runWealthDataEntryTests()

import {
  buildViewModel,
  deleteAssetTransaction,
  deleteReceivable,
  deleteTransaction,
  exportData,
  importData,
  recordDebtPayment,
  recordDerivativeBalanceUpdate,
  recordReceivablePayment,
  seedSampleData,
  startEmptyData,
  updateAssetPrice,
  upsertAccount as stateUpsertAccount,
  upsertAsset,
  upsertAssetTransaction,
  upsertGoal,
  upsertLiability,
  upsertReceivable,
  upsertRecurringTemplate,
  upsertTransaction,
} from "../state.js";

let passed = 0;
let failed = 0;
const errors = [];

function defaultUiState() {
  const now = new Date();
  return {
    activeTab: "overview",
    budgetSubtab: "month",
    portfolioSubtab: "overview",
    budgetYear: now.getFullYear(),
    selectedBudgetMonth: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
    reportType: "income-expense",
    reportYear: now.getFullYear(),
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
    modal: null,
  };
}

function getVM(overrides = {}) {
  return buildViewModel({ ...defaultUiState(), ...overrides });
}

function getAccounts() {
  return getVM().derived.accounts || [];
}

function getTransactions() {
  return getVM().derived.transactionViews || [];
}

function getAssets() {
  return getVM().derived.assets || [];
}

function getBalance(accountId) {
  return getAccounts().find((account) => account.id === accountId)?.balance ?? null;
}

async function test(name, fn) {
  try {
    startEmptyData();
    const result = await fn();
    if (result === false) {
      throw new Error("fn() tra ve false");
    }
    console.log(`✅ PASS: ${name}`);
    passed += 1;
  } catch (error) {
    console.error(`❌ FAIL: ${name}\n   -> ${error.message}`);
    failed += 1;
    errors.push({ name, error: error.message });
  }
}

async function testThrows(name, fn, expectedMsg = "") {
  try {
    startEmptyData();
    await fn();
    throw new Error("Ky vong throw nhung khong throw");
  } catch (error) {
    if (error.message === "Ky vong throw nhung khong throw") {
      console.error(`❌ FAIL: ${name}\n   -> ${error.message}`);
      failed += 1;
      errors.push({ name, error: error.message });
      return;
    }
    if (expectedMsg && !String(error.message).includes(expectedMsg)) {
      const message = `Throw sai message: "${error.message}" (ky vong chua: "${expectedMsg}")`;
      console.error(`❌ FAIL: ${name}\n   -> ${message}`);
      failed += 1;
      errors.push({ name, error: message });
      return;
    }
    console.log(`✅ PASS (throw dung): ${name}`);
    passed += 1;
  }
}

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function upsertAccount(record) {
  if (record?.id && record?._mode === undefined) {
    stateUpsertAccount({ ...record, _mode: "edit" });
    return;
  }
  stateUpsertAccount(record);
}

function setupAssetWithAccount() {
  const accId = "acc-asset-test";
  const assetId = "asset-test-stock";
  upsertAccount({
    id: accId,
    name: "SSI Test",
    type: "securities_cash",
    tracking_mode: "manual",
    last_updated: "2026-01-01",
  });
  upsertTransaction({
    date: "2026-01-01",
    type: "opening_balance",
    account_id: accId,
    amount: 500_000_000,
    category: "Von",
    description: "OB",
  });
  upsertAsset({
    id: assetId,
    name: "Test Stock",
    ticker: "TST",
    asset_type: "stock",
    bucket: "alloc_growth",
    exchange: "HOSE",
    current_price: 50_000,
  });
  return { accId, assetId };
}

async function runDataEntryTests() {
  passed = 0;
  failed = 0;
  errors.length = 0;

  const ACCOUNT_TYPES = ["bank", "cash", "ewallet", "credit_card", "investment", "securities_cash"];
  for (const type of ACCOUNT_TYPES) {
    await test(`upsertAccount: type="${type}" tao thanh cong`, () => {
      upsertAccount({
        name: `Test ${type}`,
        type,
        tracking_mode: "manual",
        last_updated: "2026-01-01",
      });
      ensure(
        getAccounts().some((account) => account.type === type && account.name === `Test ${type}`),
        `Khong tim thay account type=${type}`,
      );
    });
  }

  await test("upsertAccount: credit card day du thong so", () => {
    upsertAccount({
      name: "Visa Test",
      type: "credit_card",
      credit_limit: 50_000_000,
      statement_date: "2026-04-24",
      due_date: "2026-04-28",
      grace_period_days: 20,
      interest_rate_cc: 29.5,
      tracking_mode: "auto",
      last_updated: "2026-04-01",
    });
    const account = getAccounts().find((item) => item.name === "Visa Test");
    ensure(Boolean(account), "Khong tim thay account");
    ensure(account.credit_limit === 50_000_000, `credit_limit sai: ${account.credit_limit}`);
    ensure(account.availableLimit === 50_000_000, `availableLimit sai: ${account.availableLimit}`);
  });

  await test("upsertAccount: ten rong -> khong throw (ghi nhan behavior)", () => {
    upsertAccount({ name: "", type: "cash", tracking_mode: "manual", last_updated: "2026-01-01" });
  });

  // FIX 4: credit_limit âm cho credit_card phải throw
  await testThrows(
    "upsertAccount: credit_limit am -> throw",
    () => upsertAccount({
      name: "CC Neg",
      type: "credit_card",
      credit_limit: -1_000_000,
      tracking_mode: "manual",
      last_updated: "2026-01-01",
    }),
    "không được âm",
  );

  await test("upsertAccount: edit mode cap nhat dung record", () => {
    upsertAccount({ id: "acc-edit-1", name: "Old Name", type: "bank", tracking_mode: "manual", last_updated: "2026-01-01" });
    upsertAccount({ _mode: "edit", id: "acc-edit-1", name: "New Name", type: "bank", tracking_mode: "manual", last_updated: "2026-04-01" });
    const accounts = getAccounts();
    ensure(!accounts.some((item) => item.name === "Old Name"), "Van con Old Name");
    ensure(accounts.some((item) => item.name === "New Name" && item.id === "acc-edit-1"), "Khong co New Name");
  });

  await test("upsertTransaction: opening_balance tang dung balance", () => {
    const accId = "acc-test-ob";
    upsertAccount({ id: accId, name: "Test OB", type: "bank", tracking_mode: "manual", last_updated: "2026-01-01" });
    upsertTransaction({
      date: "2026-01-01",
      type: "opening_balance",
      account_id: accId,
      amount: 5_000_000,
      category: "Von co san",
      description: "So du ban dau",
    });
    ensure(getBalance(accId) === 5_000_000, `Balance sai: ${getBalance(accId)}`);
  });

  await test("upsertTransaction: income tang balance", () => {
    const accId = "acc-income-test";
    upsertAccount({ id: accId, name: "Income Acc", type: "bank", tracking_mode: "manual", last_updated: "2026-01-01" });
    upsertTransaction({
      date: "2026-04-01",
      type: "income",
      account_id: accId,
      amount: 10_000_000,
      category: "Freelance",
      description: "Test income",
    });
    ensure(getBalance(accId) === 10_000_000, `Balance sau income sai: ${getBalance(accId)}`);
  });

  await test("upsertTransaction: expense giam balance", () => {
    const accId = "acc-exp-test";
    upsertAccount({ id: accId, name: "Exp Acc", type: "bank", tracking_mode: "manual", last_updated: "2026-01-01" });
    upsertTransaction({ date: "2026-01-01", type: "opening_balance", account_id: accId, amount: 20_000_000, category: "Von", description: "OB" });
    upsertTransaction({ date: "2026-04-02", type: "expense", account_id: accId, amount: 5_000_000, category: "An uong", description: "Test expense" });
    ensure(getBalance(accId) === 15_000_000, `Balance sau expense sai: ${getBalance(accId)}`);
  });

  await test("upsertTransaction: transfer cap nhat 2 tai khoan", () => {
    const fromId = "acc-from";
    const toId = "acc-to";
    upsertAccount({ id: fromId, name: "From", type: "bank", tracking_mode: "manual", last_updated: "2026-01-01" });
    upsertAccount({ id: toId, name: "To", type: "ewallet", tracking_mode: "manual", last_updated: "2026-01-01" });
    upsertTransaction({ date: "2026-01-01", type: "opening_balance", account_id: fromId, amount: 10_000_000, category: "Von", description: "OB From" });
    upsertTransaction({ date: "2026-04-01", type: "transfer", from_account_id: fromId, to_account_id: toId, amount: 3_000_000, category: "Nap vi", description: "Test transfer" });
    ensure(getBalance(fromId) === 7_000_000, `From balance sai: ${getBalance(fromId)}`);
    ensure(getBalance(toId) === 3_000_000, `To balance sai: ${getBalance(toId)}`);
  });

  await testThrows(
    "upsertTransaction: type=asset_purchase phai throw",
    () => upsertTransaction({ date: "2026-04-01", type: "asset_purchase", account_id: "x", amount: 100_000 }),
    "Giao dịch mua/bán",
  );

  await testThrows(
    "upsertTransaction: type=asset_sale phai throw",
    () => upsertTransaction({ date: "2026-04-01", type: "asset_sale", account_id: "x", amount: 100_000 }),
    "Giao dịch mua/bán",
  );

  // FIX 5: amount = 0 và amount âm cho income/expense phải throw
  await testThrows(
    "upsertTransaction: amount = 0 income throw",
    () => {
      const accId = "acc-zero";
      upsertAccount({ id: accId, name: "Zero Acc", type: "bank", tracking_mode: "manual", last_updated: "2026-01-01" });
      upsertTransaction({ date: "2026-04-01", type: "income", account_id: accId, amount: 0, category: "Test", description: "Zero amount" });
    },
    "phải lớn hơn 0",
  );

  await testThrows(
    "upsertTransaction: amount am income throw",
    () => {
      const accId = "acc-neg";
      upsertAccount({ id: accId, name: "Neg", type: "bank", tracking_mode: "manual", last_updated: "2026-01-01" });
      upsertTransaction({ date: "2026-04-01", type: "income", account_id: accId, amount: -5_000_000, category: "Test", description: "Neg" });
    },
    "phải lớn hơn 0",
  );

  await test("upsertTransaction: edit cap nhat, khong tao duplicate", () => {
    const accId = "acc-edit";
    upsertAccount({ id: accId, name: "Edit Acc", type: "bank", tracking_mode: "manual", last_updated: "2026-01-01" });
    upsertTransaction({ id: "txn-edit-1", date: "2026-04-01", type: "income", account_id: accId, amount: 5_000_000, category: "Test", description: "Original" });
    upsertTransaction({ id: "txn-edit-1", date: "2026-04-01", type: "income", account_id: accId, amount: 8_000_000, category: "Test", description: "Updated" });
    const rows = getTransactions().filter((item) => item.id === "txn-edit-1");
    ensure(rows.length === 1, `Duplicate record: ${rows.length}`);
    ensure(rows[0].amount === 8_000_000, `amount khong update: ${rows[0].amount}`);
  });

  await test("upsertTransaction: income lon + trigger_allocation => co suggestion", () => {
    const accId = "acc-alloc";
    upsertAccount({ id: accId, name: "Alloc", type: "bank", tracking_mode: "manual", last_updated: "2026-01-01" });
    const result = upsertTransaction({
      date: "2026-04-01",
      type: "income",
      account_id: accId,
      amount: 50_000_000,
      category: "Freelance",
      description: "Big income",
      trigger_allocation: true,
    });
    ensure(Boolean(result) && result.amount === 50_000_000, `Khong tra ve suggestion dung: ${JSON.stringify(result)}`);
  });

  await test("upsertTransaction: income nho + trigger_allocation => khong suggestion", () => {
    const accId = "acc-small";
    upsertAccount({ id: accId, name: "Small", type: "bank", tracking_mode: "manual", last_updated: "2026-01-01" });
    const result = upsertTransaction({
      date: "2026-04-01",
      type: "income",
      account_id: accId,
      amount: 500_000,
      category: "Test",
      description: "Small",
      trigger_allocation: true,
    });
    ensure(result === null, `Suggestion sai: ${JSON.stringify(result)}`);
  });

  const ASSET_TYPES = ["stock", "etf", "bond", "gold", "real_estate", "crypto", "savings", "cash_equiv", "warrant", "other"];
  for (const assetType of ASSET_TYPES) {
    await test(`upsertAsset: asset_type="${assetType}" tao OK`, () => {
      upsertAsset({
        name: `Test ${assetType}`,
        ticker: "TST",
        asset_type: assetType,
        bucket: "alloc_growth",
        exchange: "TEST",
        current_price: 100_000,
      });
      ensure(getAssets().some((asset) => asset.asset_type === assetType), `Khong tim thay asset type=${assetType}`);
    });
  }

  await test("upsertAssetTransaction BUY -> tao mirror asset_purchase + tru balance", () => {
    const { accId, assetId } = setupAssetWithAccount();
    upsertAssetTransaction({
      date: "2026-04-01",
      asset_id: assetId,
      action: "BUY",
      quantity: 1000,
      price: 50_000,
      fee: 100_000,
      total_cash: 50_100_000,
      account_id: accId,
    });
    ensure(getBalance(accId) === 449_900_000, `Balance sai sau BUY: ${getBalance(accId)}`);
    ensure(getTransactions().some((item) => item.type === "asset_purchase"), "Khong co mirror asset_purchase");
    ensure(getAssets().find((item) => item.id === assetId)?.holdingQty === 1000, "holdingQty sai sau BUY");
  });

  await test("upsertAssetTransaction SELL -> tao mirror asset_sale + cong balance", () => {
    const { accId, assetId } = setupAssetWithAccount();
    upsertAssetTransaction({ date: "2026-04-01", asset_id: assetId, action: "BUY", quantity: 1000, price: 45_000, fee: 90_000, total_cash: 45_090_000, account_id: accId });
    const balAfterBuy = getBalance(accId);
    upsertAssetTransaction({ date: "2026-04-15", asset_id: assetId, action: "SELL", quantity: 500, price: 55_000, fee: 100_000, total_cash: 27_400_000, account_id: accId });
    const balAfterSell = getBalance(accId);
    ensure(balAfterSell === balAfterBuy + 27_400_000, `Balance sau SELL sai: ${balAfterSell}`);
    const asset = getAssets().find((item) => item.id === assetId);
    ensure(asset.holdingQty === 500, `holdingQty sau SELL sai: ${asset.holdingQty}`);
    ensure(asset.realizedPnL > 0, `realizedPnL khong dung: ${asset.realizedPnL}`);
  });

  await test("upsertAssetTransaction DIVIDEND -> mirror income + cong balance", () => {
    const { accId, assetId } = setupAssetWithAccount();
    upsertAssetTransaction({ date: "2026-04-01", asset_id: assetId, action: "BUY", quantity: 1000, price: 50_000, fee: 0, total_cash: 50_000_000, account_id: accId });
    const balBefore = getBalance(accId);
    upsertAssetTransaction({ date: "2026-04-20", asset_id: assetId, action: "DIVIDEND", quantity: 1, price: 0, fee: 0, total_cash: 2_000_000, account_id: accId });
    ensure(getBalance(accId) === balBefore + 2_000_000, `Balance sau DIVIDEND sai: ${getBalance(accId)}`);
    ensure(getTransactions().some((item) => item.type === "income" && item.category === "Cổ tức"), "Khong co mirror income Co tuc");
  });

  await test("upsertAssetTransaction INTEREST -> mirror income Lai tiet kiem", () => {
    const { accId, assetId } = setupAssetWithAccount();
    upsertAssetTransaction({ date: "2026-04-01", asset_id: assetId, action: "BUY", quantity: 1, price: 300_000_000, fee: 0, total_cash: 300_000_000, account_id: accId });
    upsertAssetTransaction({ date: "2026-04-20", asset_id: assetId, action: "INTEREST", quantity: 1, price: 0, fee: 0, total_cash: 3_000_000, account_id: accId });
    ensure(getTransactions().some((item) => item.category === "Lãi tiết kiệm"), "Khong co mirror income Lai tiet kiem");
  });

  await test("upsertAssetTransaction OPENING -> khong mirror, khong doi cash", () => {
    const { accId, assetId } = setupAssetWithAccount();
    const balBefore = getBalance(accId);
    upsertAssetTransaction({ date: "2026-01-01", asset_id: assetId, action: "OPENING", quantity: 500, price: 40_000, fee: 0, total_cash: 0, account_id: accId });
    ensure(getBalance(accId) === balBefore, `Balance doi sau OPENING: ${balBefore} -> ${getBalance(accId)}`);
    const mirrors = getTransactions().filter((item) => item.asset_id === assetId && ["asset_purchase", "asset_sale", "income"].includes(item.type));
    ensure(mirrors.length === 0, `Co mirror transaction sau OPENING: ${mirrors.length}`);
    ensure(getAssets().find((item) => item.id === assetId)?.holdingQty === 500, "holdingQty sai sau OPENING");
  });

  await test("deleteAssetTransaction -> xoa ca mirror transaction", () => {
    const { accId, assetId } = setupAssetWithAccount();
    upsertAssetTransaction({ id: "at-delete-test", date: "2026-04-01", asset_id: assetId, action: "BUY", quantity: 100, price: 50_000, fee: 0, total_cash: 5_000_000, account_id: accId });
    ensure(getTransactions().some((item) => item.type === "asset_purchase"), "Chua co mirror");
    deleteAssetTransaction("at-delete-test");
    ensure(!getTransactions().some((item) => item.type === "asset_purchase"), "Mirror van con sau deleteAssetTransaction");
  });

  await test("upsertLiability: tao khoan no co monthlyInterest/payoffMonths", () => {
    upsertLiability({
      name: "Vay mua xe",
      type: "car_loan",
      total_amount: 300_000_000,
      remaining_amount: 250_000_000,
      interest_rate: 8.5,
      monthly_payment: 8_000_000,
      start_date: "2025-01-01",
      end_date: "2028-01-01",
    });
    const liability = getVM().derived.liabilities.find((item) => item.name === "Vay mua xe");
    ensure(Boolean(liability), "Khong tim thay liability");
    ensure(liability.monthlyInterest > 0, `monthlyInterest sai: ${liability.monthlyInterest}`);
    ensure(liability.payoffMonths !== null, "payoffMonths null khi co du lieu");
  });

  await test("recordDebtPayment: tru tien account + giam remaining", () => {
    const accId = "acc-debt-pay";
    upsertAccount({ id: accId, name: "Payment Acc", type: "bank", tracking_mode: "manual", last_updated: "2026-01-01" });
    upsertTransaction({ date: "2026-01-01", type: "opening_balance", account_id: accId, amount: 50_000_000, category: "Von", description: "OB" });
    const liabId = "liab-test";
    upsertLiability({
      id: liabId,
      name: "Test Loan",
      type: "loan",
      total_amount: 100_000_000,
      remaining_amount: 50_000_000,
      interest_rate: 10,
      monthly_payment: 5_000_000,
      start_date: "2025-01-01",
      end_date: "2028-01-01",
    });
    recordDebtPayment({ liabilityId: liabId, principalAmount: 3_000_000, fromAccountId: accId, date: "2026-04-01", notes: "Test payment" });
    const liability = getVM().derived.liabilities.find((item) => item.id === liabId);
    ensure(liability.remaining_amount === 47_000_000, `remaining sai: ${liability.remaining_amount}`);
    const interest = Math.round((50_000_000 * 10) / 100 / 12);
    const expected = 50_000_000 - (3_000_000 + interest);
    ensure(getBalance(accId) === expected, `Balance sai: ${getBalance(accId)} (ky vong ${expected})`);
  });

  await testThrows("recordDebtPayment: principal > remaining phai throw", () => {
    const accId = "acc-over";
    upsertAccount({ id: accId, name: "Over", type: "bank", tracking_mode: "manual", last_updated: "2026-01-01" });
    upsertTransaction({ date: "2026-01-01", type: "opening_balance", account_id: accId, amount: 500_000_000, category: "Von", description: "OB" });
    const liabId = "liab-over";
    upsertLiability({
      id: liabId,
      name: "Over Loan",
      type: "loan",
      total_amount: 50_000_000,
      remaining_amount: 20_000_000,
      interest_rate: 8,
      monthly_payment: 3_000_000,
      start_date: "2025-01-01",
      end_date: "2028-01-01",
    });
    recordDebtPayment({ liabilityId: liabId, principalAmount: 30_000_000, fromAccountId: accId, date: "2026-04-01", notes: "" });
  }, "vượt quá");

  await test("recordDebtPayment: principal = 0 (ghi nhan behavior hien tai)", () => {
    const accId = "acc-zero-principal";
    upsertAccount({ id: accId, name: "Zero P", type: "bank", tracking_mode: "manual", last_updated: "2026-01-01" });
    upsertTransaction({ date: "2026-01-01", type: "opening_balance", account_id: accId, amount: 10_000_000, category: "Von", description: "OB" });
    const liabId = "liab-zero";
    upsertLiability({
      id: liabId,
      name: "Zero",
      type: "loan",
      total_amount: 50_000_000,
      remaining_amount: 20_000_000,
      interest_rate: 8,
      monthly_payment: 3_000_000,
      start_date: "2025-01-01",
      end_date: "2028-01-01",
    });
    recordDebtPayment({ liabilityId: liabId, principalAmount: 0, fromAccountId: accId, date: "2026-04-01", notes: "" });
    console.log("  ℹ principal=0 hien tai duoc phep (chi tra lai thang)");
  });

  await test("upsertGoal: tao goal + linked source account", () => {
    const accId = "acc-goal";
    upsertAccount({ id: accId, name: "Goal Acc", type: "bank", tracking_mode: "manual", last_updated: "2026-01-01" });
    upsertTransaction({ date: "2026-01-01", type: "opening_balance", account_id: accId, amount: 100_000_000, category: "Von", description: "OB" });
    upsertGoal({
      name: "Mua xe 2027",
      type: "asset_purchase",
      target_amount: 500_000_000,
      deadline: "2027-12-31",
      priority: "high",
      linked_sources: [
        {
          type: "account",
          source_id: accId,
          label: "Goal Acc",
          include_full_balance: true,
          share_percentage: 100,
          current_value: 0,
          monthly_contribution: 5_000_000,
        },
      ],
      notes: "Test goal",
    });
    const goal = getVM().derived.goalViews.find((item) => item.name === "Mua xe 2027");
    ensure(Boolean(goal), "Khong tim thay goal");
    ensure(goal.totalAllocated === 100_000_000, `totalAllocated sai: ${goal.totalAllocated}`);
    ensure(goal.progressPct > 0, `progressPct sai: ${goal.progressPct}`);
  });

  await test("upsertGoal: target_amount = 0 (ghi nhan behavior)", () => {
    upsertGoal({ name: "Zero Target", type: "wealth", target_amount: 0, deadline: "2027-01-01", priority: "low", linked_sources: [] });
    const goal = getVM().derived.goalViews.find((item) => item.name === "Zero Target");
    console.log(`  ℹ target_amount=0 -> progressPct=${goal?.progressPct}`);
  });

  await test("Net Worth consistency co asset + cash + debt", () => {
    const accId = "acc-nw";
    const assetId = "asset-nw";
    upsertAccount({ id: accId, name: "NW Bank", type: "bank", tracking_mode: "manual", last_updated: "2026-01-01" });
    upsertTransaction({ date: "2026-01-01", type: "opening_balance", account_id: accId, amount: 100_000_000, category: "Von", description: "OB" });
    upsertAsset({ id: assetId, name: "NW Stock", ticker: "NW", asset_type: "stock", bucket: "alloc_growth", exchange: "HOSE", current_price: 50_000 });
    upsertAssetTransaction({ date: "2026-04-01", asset_id: assetId, action: "BUY", quantity: 1000, price: 50_000, fee: 0, total_cash: 50_000_000, account_id: accId });
    upsertLiability({ name: "NW Loan", type: "loan", total_amount: 30_000_000, remaining_amount: 30_000_000, interest_rate: 5, monthly_payment: 1_000_000, start_date: "2025-01-01", end_date: "2030-01-01" });
    const netWorth = getVM().derived.netWorth.netWorth;
    const expected = 50_000_000 + 50_000_000 - 30_000_000;
    ensure(Math.abs(netWorth - expected) <= 1000, `Net Worth sai: ${netWorth} (ky vong ${expected})`);
  });

  await test("OPENING asset khong doi cash, van tang Net Worth", () => {
    const accId = "acc-opening-nw";
    const assetId = "asset-opening-nw";
    upsertAccount({ id: accId, name: "Opening Bank", type: "bank", tracking_mode: "manual", last_updated: "2026-01-01" });
    upsertTransaction({ date: "2026-01-01", type: "opening_balance", account_id: accId, amount: 100_000_000, category: "Von", description: "OB" });
    upsertAsset({ id: assetId, name: "Opening Gold", ticker: "GOLD", asset_type: "gold", bucket: "alloc_safe", exchange: "SJC", current_price: 8_000_000 });
    upsertAssetTransaction({ date: "2026-01-01", asset_id: assetId, action: "OPENING", quantity: 10, price: 8_000_000, fee: 0, total_cash: 0 });
    ensure(getBalance(accId) === 100_000_000, `Balance doi sau OPENING: ${getBalance(accId)}`);
    const netWorth = getVM().derived.netWorth.netWorth;
    const expected = 100_000_000 + 80_000_000;
    ensure(Math.abs(netWorth - expected) <= 1000, `Net Worth sau OPENING sai: ${netWorth} (ky vong ${expected})`);
  });

  await test("Receivable: tao moi co account_id -> tao mirror expense", () => {
    const accId = "acc-recv";
    upsertAccount({ id: accId, name: "Recv Bank", type: "bank", tracking_mode: "manual", last_updated: "2026-01-01" });
    upsertTransaction({ date: "2026-01-01", type: "opening_balance", account_id: accId, amount: 80_000_000, category: "Von", description: "OB" });
    upsertReceivable({
      id: "recv-test",
      name: "Cho B vay",
      type: "personal_loan",
      counterparty: "B",
      original_amount: 20_000_000,
      remaining_amount: 20_000_000,
      start_date: "2026-04-01",
      expected_return_date: "2026-08-01",
      likelihood: "medium",
      account_id: accId,
    });
    ensure(getTransactions().some((item) => item.category === "Cho vay" && item.receivable_id === "recv-test"), "Khong co mirror expense Cho vay");
    ensure(getBalance(accId) === 60_000_000, `Balance sau Cho vay sai: ${getBalance(accId)}`);
  });

  await test("recordReceivablePayment: tao mirror income + giam remaining", () => {
    const accId = "acc-recv-pay";
    upsertAccount({ id: accId, name: "Recv Pay Bank", type: "bank", tracking_mode: "manual", last_updated: "2026-01-01" });
    upsertTransaction({ date: "2026-01-01", type: "opening_balance", account_id: accId, amount: 100_000_000, category: "Von", description: "OB" });
    upsertReceivable({
      id: "recv-pay-test",
      name: "Cho C vay",
      type: "personal_loan",
      counterparty: "C",
      original_amount: 30_000_000,
      remaining_amount: 30_000_000,
      start_date: "2026-04-01",
      expected_return_date: "2026-09-01",
      likelihood: "medium",
      account_id: accId,
    });
    const balBefore = getBalance(accId);
    recordReceivablePayment("recv-pay-test", 5_000_000, accId, "2026-04-10", "Thu dot 1");
    ensure(getBalance(accId) === balBefore + 5_000_000, `Balance sau thu no sai: ${getBalance(accId)}`);
    const receivable = getVM().derived.receivables.find((item) => item.id === "recv-pay-test");
    ensure(receivable.remaining_amount === 25_000_000, `remaining_amount sai: ${receivable.remaining_amount}`);
    ensure(getTransactions().some((item) => item.category === "Thu hồi nợ" && item.receivable_id === "recv-pay-test"), "Khong co mirror income Thu hoi no");
  });

  await test("deleteReceivable: xoa record + payments, giu transactions lich su", () => {
    const accId = "acc-recv-del";
    upsertAccount({ id: accId, name: "Recv Del Bank", type: "bank", tracking_mode: "manual", last_updated: "2026-01-01" });
    upsertTransaction({ date: "2026-01-01", type: "opening_balance", account_id: accId, amount: 50_000_000, category: "Von", description: "OB" });
    upsertReceivable({
      id: "recv-del",
      name: "Cho D vay",
      type: "personal_loan",
      counterparty: "D",
      original_amount: 10_000_000,
      remaining_amount: 10_000_000,
      start_date: "2026-04-01",
      likelihood: "low",
      account_id: accId,
    });
    recordReceivablePayment("recv-del", 2_000_000, accId, "2026-04-11", "");
    deleteReceivable("recv-del");
    const tables = JSON.parse(exportData()).tables;
    ensure(!tables.receivables.some((item) => item.id === "recv-del"), "Receivable chua xoa");
    ensure(!tables.receivable_payments.some((item) => item.receivable_id === "recv-del"), "Payments chua xoa");
    ensure(tables.transactions.filter((item) => item.receivable_id === "recv-del").length >= 1, "Khong giu lich su transactions");
  });

  await test("updateAssetPrice + recordDerivativeBalanceUpdate co side effect dung", () => {
    upsertAccount({ id: "acc-derivative", name: "Der", type: "derivative", tracking_mode: "manual", last_updated: "2026-01-01" });
    upsertTransaction({ date: "2026-01-01", type: "opening_balance", account_id: "acc-derivative", amount: 10_000_000, category: "Von", description: "OB" });
    recordDerivativeBalanceUpdate({ accountId: "acc-derivative", actualBalance: 12_000_000, classification: "lãi", date: "2026-04-01", notes: "Adj" });
    ensure(getBalance("acc-derivative") === 12_000_000, `Balance derivative sai: ${getBalance("acc-derivative")}`);

    upsertAsset({ id: "asset-price", name: "Price Asset", asset_type: "stock", bucket: "alloc_growth", current_price: 10_000 });
    updateAssetPrice("asset-price", 12_345);
    ensure(getAssets().find((item) => item.id === "asset-price")?.current_price === 12_345, "Cap nhat gia asset that bai");
  });

  await testThrows(
    "updateAssetPrice: gia am phai throw",
    () => {
      upsertAsset({ id: "asset-neg-price", name: "Neg Price", asset_type: "stock", bucket: "alloc_growth", current_price: 10_000 });
      updateAssetPrice("asset-neg-price", -5_000);
    },
    "không được âm",
  );

  await test("Import: current_price am bi kep ve 0", () => {
    const payload = JSON.stringify({
      version: "2.0-html",
      tables: {
        cash_accounts: [],
        transactions: [],
        assets: [{ id: "imp-neg", created_at: "2026-01-01", name: "Imp Neg", asset_type: "stock", current_price: -9999 }],
        asset_transactions: [],
        liabilities: [],
        debt_payments: [],
        receivables: [],
        receivable_payments: [],
        allocation_rules: [{ id: "alloc-default", is_active: true, buckets: [] }],
        annual_budgets: [],
        goals: [],
        recurring_templates: [],
        reinvest_rules: [],
        net_worth_history: [],
        user_settings: {},
      },
    });
    importData(payload);
    const asset = JSON.parse(exportData()).tables.assets.find((item) => item.id === "imp-neg");
    ensure(asset.current_price === 0, `current_price am khong bi kep: ${asset.current_price}`);
  });

  await test("upsertRecurringTemplate: CRUD co ban", () => {
    upsertRecurringTemplate({ id: "rec-1", name: "Luong", type: "income", amount: 25_000_000, category: "Luong", frequency: "monthly", default_account_id: "", notes: "" });
    const tables = JSON.parse(exportData()).tables;
    ensure(tables.recurring_templates.some((item) => item.id === "rec-1"), "Khong tao duoc recurring");
  });

  await test("Audit trail: xoa transaction ghi nhat ky + export giu audit_log", () => {
    const accId = "acc-audit";
    upsertAccount({ id: accId, name: "Audit Acc", type: "bank", tracking_mode: "manual", last_updated: "2026-01-01" });
    upsertTransaction({ id: "txn-audit", date: "2026-04-01", type: "income", account_id: accId, amount: 5_000_000, category: "Test", description: "Audit" });
    deleteTransaction("txn-audit", { amount: 5_000_000, date: "2026-04-01", type: "income" });
    const tables = JSON.parse(exportData()).tables;
    ensure(Array.isArray(tables.audit_log), "Khong co bang audit_log");
    const entry = tables.audit_log.find((item) => item.entity === "transaction" && item.action === "delete" && item.entity_id === "txn-audit");
    ensure(Boolean(entry), "Khong ghi nhat ky xoa transaction");
    ensure(entry.snapshot && entry.snapshot.amount === 5_000_000, "Snapshot audit sai");
  });

  await test("Audit trail: sua transaction ghi before/after", () => {
    const accId = "acc-audit2";
    upsertAccount({ id: accId, name: "Audit2", type: "bank", tracking_mode: "manual", last_updated: "2026-01-01" });
    upsertTransaction({ id: "txn-audit2", date: "2026-04-01", type: "income", account_id: accId, amount: 5_000_000, category: "Test", description: "v1" });
    upsertTransaction({ id: "txn-audit2", date: "2026-04-01", type: "income", account_id: accId, amount: 8_000_000, category: "Test", description: "v2" });
    const tables = JSON.parse(exportData()).tables;
    const entry = tables.audit_log.find((item) => item.entity === "transaction" && item.action === "update" && item.entity_id === "txn-audit2");
    ensure(Boolean(entry), "Khong ghi nhat ky sua transaction");
    ensure(entry.snapshot.before.amount === 5_000_000 && entry.snapshot.after.amount === 8_000_000, "before/after audit sai");
  });

  await test("deleteTransaction: xoa mirror-linked asset transaction", () => {    const { accId, assetId } = setupAssetWithAccount();
    upsertAssetTransaction({ id: "at-del-txn", date: "2026-04-01", asset_id: assetId, action: "BUY", quantity: 100, price: 50_000, fee: 0, total_cash: 5_000_000, account_id: accId });
    const mirror = getTransactions().find((item) => item.type === "asset_purchase");
    ensure(Boolean(mirror), "Khong tim thay mirror asset_purchase");
    deleteTransaction(mirror.id, { amount: mirror.amount, date: mirror.date, type: mirror.type });
    ensure(!JSON.parse(exportData()).tables.asset_transactions.some((item) => item.id === "at-del-txn"), "Asset transaction van con sau deleteTransaction");
  });

  await test("Export -> Import giu nguyen net worth va so account", () => {
    seedSampleData();
    const before = getVM();
    const snapshot = exportData();
    importData(snapshot);
    const after = getVM();
    ensure(Math.abs(before.derived.netWorth.netWorth - after.derived.netWorth.netWorth) <= 1000, "Net worth doi sau import");
    ensure(before.derived.accounts.length === after.derived.accounts.length, "So account doi sau import");
  });

  await testThrows("Import JSON thieu tables -> throw", () => {
    importData(JSON.stringify({ version: "2.0-html", exportDate: "2026-01-01" }));
  }, "tables");

  await test("Budget integration: expense vao exp_food", () => {
    const accId = "acc-budget";
    upsertAccount({ id: accId, name: "Budget Acc", type: "bank", tracking_mode: "manual", last_updated: "2026-01-01" });
    upsertTransaction({ date: "2026-01-01", type: "opening_balance", account_id: accId, amount: 100_000_000, category: "Von", description: "OB" });
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-15`;
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    upsertTransaction({ date, type: "expense", account_id: accId, amount: 3_000_000, category: "Ăn uống", description: "Test budget" });
    const vm = getVM({ activeTab: "budgets", budgetYear: now.getFullYear(), selectedBudgetMonth: monthKey });
    const foodBucket = vm.budgetsPage.monthData?.buckets?.find((item) => item.allocationId === "exp_food");
    ensure(Boolean(foodBucket), "Khong tim thay bucket exp_food");
    ensure(foodBucket.spentAmount >= 3_000_000, `spentAmount sai: ${foodBucket.spentAmount}`);
  });

  await test("Budget integration: asset_purchase tru rollover hũ đầu tư", () => {
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-10`;
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const accId = "acc-budget-invest";
    const assetId = "asset-budget-invest";
    upsertAccount({ id: accId, name: "Budget Invest", type: "securities_cash", tracking_mode: "manual", last_updated: date });
    upsertTransaction({ date, type: "opening_balance", account_id: accId, amount: 100_000_000, category: "Von", description: "OB" });
    upsertTransaction({ date, type: "income", account_id: accId, amount: 100_000_000, category: "Freelance", description: "Income" });
    upsertAsset({ id: assetId, name: "Budget Stock", asset_type: "stock", bucket: "alloc_growth", current_price: 100_000 });
    upsertAssetTransaction({ date, asset_id: assetId, action: "BUY", quantity: 100, price: 100_000, fee: 0, total_cash: 10_000_000, account_id: accId });
    const vm = getVM({ activeTab: "budgets", budgetYear: now.getFullYear(), selectedBudgetMonth: monthKey });
    const growthBucket = vm.budgetsPage.monthData?.buckets?.find((item) => item.allocationId === "alloc_growth");
    ensure(Boolean(growthBucket), "Khong tim thay bucket alloc_growth");
    ensure(growthBucket.investedAmount === 10_000_000, `investedAmount sai: ${growthBucket.investedAmount}`);
    ensure(
      growthBucket.rawRolloverOut === growthBucket.effectiveBudget - growthBucket.investedAmount,
      `rawRolloverOut sai: ${growthBucket.rawRolloverOut}`,
    );
    ensure(growthBucket.rolloverOut === growthBucket.rawRolloverOut, `rolloverOut sai: ${growthBucket.rolloverOut}`);
  });

  console.log(`\n${"═".repeat(60)}`);
  console.log("📊 KET QUA TEST");
  console.log(`✅ PASS: ${passed}`);
  console.log(`❌ FAIL: ${failed}`);
  console.log(`📋 Tong: ${passed + failed}`);
  if (errors.length > 0) {
    console.log("\n🔴 Danh sach FAIL:");
    errors.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.name}`);
      console.log(`     ${item.error}`);
    });
  }
  console.log("═".repeat(60));

  return { passed, failed, errors: [...errors] };
}

const host = typeof window !== "undefined" ? window : globalThis;
host.runWealthDataEntryTests = runDataEntryTests;
// Tự chạy khi import (giữ nguyên cách dùng trong browser console).
// Headless wrapper có thể đặt cờ __SKIP_AUTORUN_WEALTH_TESTS__ để tự gọi và bắt kết quả.
if (!host.__SKIP_AUTORUN_WEALTH_TESTS__) {
  await runDataEntryTests();
}
