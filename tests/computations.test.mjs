// tests/computations.test.mjs
// Bộ test tự động cho lớp logic tài chính thuần (computations.js).
// Chạy bằng: npm test  (dùng node:test built-in, không cần dependency).
//
// Mục tiêu: kiểm chứng các phép tính cốt lõi mà toàn bộ dashboard phụ thuộc vào:
// số dư tài khoản, vị thế tài sản (avg cost, realized/unrealized PnL, cổ tức),
// net worth, quỹ khẩn cấp, lãi tiết kiệm, tiến độ mục tiêu, cảnh báo đếm trùng.

import test from "node:test";
import assert from "node:assert/strict";

import {
  getAccountImpact,
  getAccountBalance,
  computeAssetPosition,
  computeNetWorth,
  computeNetWorthHistory,
  computeAllAccountBalances,
  computeAssetComposition,
  computeEmergencyFund,
  calcSavingsInterest,
  calcMonthlyInterest,
  computeGoalProgress,
  detectDoubleCountingGoals,
  computeRollingBase,
  average,
  median,
  stdDev,
  toMonthKey,
  formatVND,
  xirr,
  computeAssetXirr,
} from "../computations.js";

// ─────────────────────────────────────────────────────────────
// getAccountImpact / getAccountBalance
// ─────────────────────────────────────────────────────────────
test("getAccountImpact: income cộng, expense trừ trên đúng tài khoản", () => {
  assert.equal(getAccountImpact({ type: "income", account_id: "a", amount: 100 }, "a"), 100);
  assert.equal(getAccountImpact({ type: "expense", account_id: "a", amount: 40 }, "a"), -40);
  assert.equal(getAccountImpact({ type: "income", account_id: "a", amount: 100 }, "b"), 0);
});

test("getAccountImpact: transfer trừ nguồn, cộng đích", () => {
  const txn = { type: "transfer", from_account_id: "a", to_account_id: "b", amount: 30 };
  assert.equal(getAccountImpact(txn, "a"), -30);
  assert.equal(getAccountImpact(txn, "b"), 30);
  assert.equal(getAccountImpact(txn, "c"), 0);
});

test("getAccountImpact: lending trừ tiền, collection cộng tiền (không phải thu/chi)", () => {
  assert.equal(getAccountImpact({ type: "lending", account_id: "a", amount: 50 }, "a"), -50);
  assert.equal(getAccountImpact({ type: "collection", account_id: "a", amount: 50 }, "a"), 50);
});

test("getAccountImpact: balance_adjustment cho phép âm và dương", () => {
  assert.equal(getAccountImpact({ type: "balance_adjustment", account_id: "a", amount: -1000 }, "a"), -1000);
  assert.equal(getAccountImpact({ type: "balance_adjustment", account_id: "a", amount: 2000 }, "a"), 2000);
});

test("getAccountBalance: cộng dồn nhiều giao dịch", () => {
  const txns = [
    { type: "opening_balance", account_id: "a", amount: 20_000_000 },
    { type: "income", account_id: "a", amount: 10_000_000 },
    { type: "expense", account_id: "a", amount: 5_000_000 },
    { type: "transfer", from_account_id: "a", to_account_id: "b", amount: 3_000_000 },
  ];
  assert.equal(getAccountBalance("a", txns), 22_000_000);
  assert.equal(getAccountBalance("b", txns), 3_000_000);
});

test("computeAllAccountBalances: tương đương getAccountBalance cho mọi tài khoản (single-pass)", () => {
  const accounts = [
    { id: "a", type: "bank" },
    { id: "b", type: "ewallet" },
    { id: "cc", type: "credit_card" },
    { id: "inv", type: "securities_cash" },
  ];
  const transactions = [
    { type: "opening_balance", account_id: "a", amount: 50_000_000 },
    { type: "income", account_id: "a", amount: 12_000_000 },
    { type: "expense", account_id: "a", amount: 3_000_000 },
    { type: "transfer", from_account_id: "a", to_account_id: "b", amount: 5_000_000 },
    { type: "expense", account_id: "cc", amount: 8_000_000 },
    { type: "lending", account_id: "a", amount: 2_000_000 },
    { type: "collection", account_id: "b", amount: 1_000_000 },
    { type: "asset_purchase", account_id: "inv", amount: 10_000_000 },
    { type: "asset_sale", account_id: "inv", amount: 4_000_000 },
    { type: "balance_adjustment", account_id: "inv", amount: -500_000 },
  ];
  const map = computeAllAccountBalances(accounts, transactions);
  for (const account of accounts) {
    assert.equal(
      map[account.id],
      getAccountBalance(account.id, transactions),
      `Lệch ở account ${account.id}`,
    );
  }
});

// REGRESSION (fuzzer tìm ra): self-transfer (from === to) chỉ được trừ MỘT lần,
// khớp với getAccountImpact (nhánh from return trước). Cache không được cộng lại thành 0.
test("computeAllAccountBalances: self-transfer trừ một lần, khớp getAccountBalance", () => {
  const accounts = [{ id: "a", type: "securities_cash" }];
  const transactions = [
    { type: "opening_balance", account_id: "a", amount: 10_000_000 },
    { type: "transfer", from_account_id: "a", to_account_id: "a", amount: 3_000_000 },
  ];
  const map = computeAllAccountBalances(accounts, transactions);
  assert.equal(map.a, getAccountBalance("a", transactions), "self-transfer lệch giữa cache và ref");
  assert.equal(map.a, 7_000_000, "self-transfer phải trừ một lần (10tr - 3tr)");
});

// ─────────────────────────────────────────────────────────────
// computeAssetPosition — trái tim của phần đầu tư
// ─────────────────────────────────────────────────────────────
test("computeAssetPosition: BUY tính đúng holding, cost, unrealized PnL", () => {
  const txns = [
    { id: "1", asset_id: "x", date: "2026-01-01", action: "BUY", quantity: 1000, price: 50_000, fee: 100_000 },
  ];
  const pos = computeAssetPosition("x", txns, 55_000);
  assert.equal(pos.holdingQty, 1000);
  assert.equal(pos.totalCost, 50_100_000); // 1000*50,000 + 100,000 phí
  assert.equal(pos.totalInvested, 50_100_000);
  assert.equal(pos.currentValue, 55_000_000); // 1000 * 55,000
  assert.equal(pos.unrealizedPnL, 4_900_000); // 55,000,000 - 50,100,000
  assert.equal(pos.realizedPnL, 0);
});

test("computeAssetPosition: SELL một phần dùng average cost, realized PnL đúng", () => {
  const txns = [
    { id: "1", asset_id: "x", date: "2026-01-01", action: "BUY", quantity: 1000, price: 50_000, fee: 100_000 },
    { id: "2", asset_id: "x", date: "2026-02-01", action: "SELL", quantity: 500, price: 55_000, fee: 100_000 },
  ];
  const pos = computeAssetPosition("x", txns, 55_000);
  // avgCost = 50,100,000/1000 = 50,100 ; costBasis(500) = 25,050,000
  // proceeds = 500*55,000 - 100,000 = 27,400,000 ; realized = 2,350,000
  assert.equal(pos.holdingQty, 500);
  assert.equal(pos.realizedPnL, 2_350_000);
  assert.equal(pos.totalCost, 25_050_000); // cost còn lại
});

test("computeAssetPosition: bán hết đưa holding và cost về 0", () => {
  const txns = [
    { id: "1", asset_id: "x", date: "2026-01-01", action: "BUY", quantity: 100, price: 10_000, fee: 0 },
    { id: "2", asset_id: "x", date: "2026-02-01", action: "SELL", quantity: 100, price: 12_000, fee: 0 },
  ];
  const pos = computeAssetPosition("x", txns, 12_000);
  assert.equal(pos.holdingQty, 0);
  assert.equal(pos.totalCost, 0);
  assert.equal(pos.realizedPnL, 200_000); // (12,000-10,000)*100
  assert.equal(pos.currentValue, 0);
});

test("computeAssetPosition: DIVIDEND cộng vào totalDividends, không đổi holding", () => {
  const txns = [
    { id: "1", asset_id: "x", date: "2026-01-01", action: "BUY", quantity: 100, price: 10_000, fee: 0 },
    { id: "2", asset_id: "x", date: "2026-03-01", action: "DIVIDEND", quantity: 1, price: 0, fee: 0, total_cash: 2_000_000 },
  ];
  const pos = computeAssetPosition("x", txns, 10_000);
  assert.equal(pos.holdingQty, 100);
  assert.equal(pos.totalDividends, 2_000_000);
});

test("computeAssetPosition: OPENING tăng holding và cost nhưng không tính là invested", () => {
  const txns = [
    { id: "1", asset_id: "x", date: "2026-01-01", action: "OPENING", quantity: 10, price: 8_000_000, fee: 0 },
  ];
  const pos = computeAssetPosition("x", txns, 8_000_000);
  assert.equal(pos.holdingQty, 10);
  assert.equal(pos.totalCost, 80_000_000);
  assert.equal(pos.totalInvested, 0);
  assert.equal(pos.currentValue, 80_000_000);
});

test("computeAssetPosition: SPLIT nhân số lượng nắm giữ", () => {
  const txns = [
    { id: "1", asset_id: "x", date: "2026-01-01", action: "BUY", quantity: 100, price: 10_000, fee: 0 },
    { id: "2", asset_id: "x", date: "2026-02-01", action: "SPLIT", quantity: 2, price: 0, fee: 0 },
  ];
  const pos = computeAssetPosition("x", txns, 5_000);
  assert.equal(pos.holdingQty, 200); // 100 * 2
});

// BUG FIX: giá hiện tại âm không được tạo giá trị tài sản âm (giá không thể < 0).
test("computeAssetPosition: giá hiện tại âm được kẹp về 0 (không tạo currentValue âm)", () => {
  const txns = [
    { id: "1", asset_id: "x", date: "2026-01-01", action: "BUY", quantity: 100, price: 10_000, fee: 0 },
  ];
  const pos = computeAssetPosition("x", txns, -5_000);
  assert.equal(pos.currentValue, 0, "currentValue không được âm");
});

// ─────────────────────────────────────────────────────────────
// computeNetWorth
// ─────────────────────────────────────────────────────────────
test("computeNetWorth: cash + portfolio - nợ", () => {
  const accounts = [{ id: "a", type: "bank" }];
  const transactions = [{ type: "opening_balance", account_id: "a", amount: 100_000_000 }];
  const assets = [{ id: "s", asset_type: "stock", current_price: 50_000 }];
  const assetTxns = [{ id: "1", asset_id: "s", date: "2026-01-01", action: "OPENING", quantity: 1000, price: 50_000, fee: 0 }];
  const liabilities = [{ remaining_amount: 30_000_000 }];
  const nw = computeNetWorth(accounts, transactions, assets, assetTxns, liabilities, []);
  assert.equal(nw.cash, 100_000_000);
  assert.equal(nw.portfolio, 50_000_000);
  assert.equal(nw.debts, 30_000_000);
  assert.equal(nw.netWorth, 120_000_000);
});

test("computeNetWorth: thẻ tín dụng dư nợ âm tính vào ccDebt", () => {
  const accounts = [{ id: "cc", type: "credit_card", credit_limit: 50_000_000 }];
  const transactions = [{ type: "expense", account_id: "cc", amount: 8_000_000 }];
  const nw = computeNetWorth(accounts, transactions, [], [], [], []);
  assert.equal(nw.ccDebt, 8_000_000);
  assert.equal(nw.totalLiabilities, 8_000_000);
  assert.equal(nw.netWorth, -8_000_000);
});

test("computeNetWorth: receivable chiết khấu theo likelihood", () => {
  const receivables = [
    { remaining_amount: 100_000_000, likelihood: "high" },   // *1.0
    { remaining_amount: 100_000_000, likelihood: "medium" }, // *0.7
    { remaining_amount: 100_000_000, likelihood: "low" },    // *0.3
  ];
  const nw = computeNetWorth([], [], [], [], [], receivables);
  assert.equal(nw.receivables, 200_000_000); // 100 + 70 + 30
});

test("computeNetWorth: receivable đã cầm cố (is_pledged) không tính", () => {
  const receivables = [{ remaining_amount: 100_000_000, likelihood: "high", is_pledged: true }];
  const nw = computeNetWorth([], [], [], [], [], receivables);
  assert.equal(nw.receivables, 0);
});

// ─────────────────────────────────────────────────────────────
// computeAssetComposition — cơ cấu tài sản ròng cho dashboard
// ─────────────────────────────────────────────────────────────
test("computeAssetComposition: phân nhóm cash / equity / real_estate / receivable đúng", () => {
  const accounts = [{ id: "a", type: "bank" }];
  const transactions = [{ type: "opening_balance", account_id: "a", amount: 100_000_000 }];
  const assets = [
    { id: "s", asset_type: "stock", current_price: 50_000 },
    { id: "re", asset_type: "real_estate", current_price: 2_000_000_000 },
  ];
  const assetTxns = [
    { id: "1", asset_id: "s", date: "2026-01-01", action: "OPENING", quantity: 1000, price: 50_000, fee: 0 },
    { id: "2", asset_id: "re", date: "2026-01-01", action: "OPENING", quantity: 1, price: 2_000_000_000, fee: 0 },
  ];
  const receivables = [{ remaining_amount: 100_000_000, likelihood: "high" }];
  const comp = computeAssetComposition(accounts, transactions, assets, assetTxns, receivables);

  const byKey = Object.fromEntries(comp.segments.map((s) => [s.key, s.value]));
  assert.equal(byKey.cash, 100_000_000);
  assert.equal(byKey.equity, 50_000_000); // 1000 * 50,000
  assert.equal(byKey.real_estate, 2_000_000_000);
  assert.equal(byKey.receivables, 100_000_000);
  assert.equal(comp.total, 2_250_000_000);
});

test("computeAssetComposition: tỷ trọng cộng lại xấp xỉ 100% và sắp xếp giảm dần", () => {
  const accounts = [{ id: "a", type: "cash" }];
  const transactions = [{ type: "opening_balance", account_id: "a", amount: 50_000_000 }];
  const assets = [{ id: "g", asset_type: "gold", current_price: 8_000_000 }];
  const assetTxns = [{ id: "1", asset_id: "g", date: "2026-01-01", action: "OPENING", quantity: 10, price: 8_000_000, fee: 0 }];
  const comp = computeAssetComposition(accounts, transactions, assets, assetTxns, []);
  const totalPct = comp.segments.reduce((sum, s) => sum + s.pct, 0);
  assert.ok(Math.abs(totalPct - 100) < 0.01, `tổng pct = ${totalPct}`);
  // gold (80tr) > cash (50tr) nên đứng trước
  assert.equal(comp.segments[0].key, "gold");
});

test("computeAssetComposition: rỗng khi không có tài sản", () => {
  const comp = computeAssetComposition([], [], [], [], []);
  assert.equal(comp.total, 0);
  assert.deepEqual(comp.segments, []);
});

// ─────────────────────────────────────────────────────────────
// computeNetWorthHistory — tái dựng đường net worth 12 tháng
// ─────────────────────────────────────────────────────────────
test("computeNetWorthHistory: ưu tiên snapshot đã lưu", () => {
  const months = ["2026-01", "2026-02", "2026-03"];
  const persisted = [
    { month: "2026-01", net_worth: 100_000_000 },
    { month: "2026-02", net_worth: 150_000_000 },
  ];
  const data = {
    transactions: [], assets: [], asset_transactions: [],
    cash_accounts: [], liabilities: [], receivables: [],
    debt_payments: [], receivable_payments: [],
  };
  const hist = computeNetWorthHistory(data, months, persisted);
  assert.equal(hist[0].value, 100_000_000);
  assert.equal(hist[0].reconstructed, false);
  assert.equal(hist[1].value, 150_000_000);
  assert.equal(hist[2].reconstructed, true); // tháng 3 không có snapshot -> dựng lại
});

test("computeNetWorthHistory: replay tiền mặt theo ngày giao dịch", () => {
  const months = ["2026-01", "2026-02", "2026-03"];
  const data = {
    cash_accounts: [{ id: "a", type: "bank" }],
    transactions: [
      { type: "opening_balance", account_id: "a", amount: 50_000_000, date: "2026-01-10" },
      { type: "income", account_id: "a", amount: 30_000_000, date: "2026-02-15" },
      { type: "expense", account_id: "a", amount: 10_000_000, date: "2026-03-05" },
    ],
    assets: [], asset_transactions: [], liabilities: [], receivables: [],
    debt_payments: [], receivable_payments: [],
  };
  const hist = computeNetWorthHistory(data, months, []);
  assert.equal(hist[0].value, 50_000_000);  // hết T1
  assert.equal(hist[1].value, 80_000_000);  // hết T2 (+30tr)
  assert.equal(hist[2].value, 70_000_000);  // hết T3 (-10tr)
});

test("computeNetWorthHistory: dựng lại dư nợ bằng cách cộng gốc đã trả sau mốc", () => {
  const months = ["2026-01", "2026-02"];
  const data = {
    cash_accounts: [],
    transactions: [],
    assets: [], asset_transactions: [],
    liabilities: [{ id: "L", remaining_amount: 80_000_000, start_date: "2025-12-01" }],
    receivables: [],
    debt_payments: [
      // Trả 20tr gốc trong T2 -> trước đó (hết T1) nợ phải là 100tr
      { liability_id: "L", principal_amount: 20_000_000, date: "2026-02-20" },
    ],
    receivable_payments: [],
  };
  const hist = computeNetWorthHistory(data, months, []);
  // Hết T1: nợ 100tr => net worth -100tr
  assert.equal(hist[0].value, -100_000_000);
  // Hết T2: nợ còn 80tr => net worth -80tr
  assert.equal(hist[1].value, -80_000_000);
});

test("computeNetWorthHistory: khoản vay chưa phát sinh không tính trước start_date", () => {
  const months = ["2026-01", "2026-02"];
  const data = {
    cash_accounts: [], transactions: [], assets: [], asset_transactions: [],
    liabilities: [{ id: "L", remaining_amount: 50_000_000, start_date: "2026-02-01" }],
    receivables: [], debt_payments: [], receivable_payments: [],
  };
  const hist = computeNetWorthHistory(data, months, []);
  assert.equal(hist[0].value, 0); // T1: khoản vay chưa phát sinh
  assert.equal(hist[1].value, -50_000_000); // T2: đã phát sinh
});

test("computeNetWorthHistory: portfolio replay holding theo ngày, định giá theo giá hiện tại", () => {
  const months = ["2026-01", "2026-02"];
  const data = {
    cash_accounts: [], transactions: [],
    assets: [{ id: "s", asset_type: "stock", current_price: 60_000 }],
    asset_transactions: [
      { id: "1", asset_id: "s", date: "2026-02-10", action: "BUY", quantity: 1000, price: 50_000, fee: 0 },
    ],
    liabilities: [], receivables: [], debt_payments: [], receivable_payments: [],
  };
  const hist = computeNetWorthHistory(data, months, []);
  assert.equal(hist[0].value, 0); // T1: chưa mua
  assert.equal(hist[1].value, 60_000_000); // T2: 1000 * giá hiện tại 60k
});

// BUG FIX: ngày giao dịch sai định dạng không được "biến mất" khỏi lịch sử.
// Chuỗi rác như "not-a-date" so sánh > mọi ngày ISO nên trước đây bị loại khỏi mọi tháng,
// gây lệch giữa KPI live (vẫn cộng) và đường tái dựng.
test("computeNetWorthHistory: giao dịch ngày sai định dạng vẫn được tính (coi như đã phát sinh)", () => {
  const months = ["2026-02", "2026-03"];
  const data = {
    cash_accounts: [{ id: "a", type: "bank" }],
    transactions: [
      { type: "opening_balance", account_id: "a", amount: 10_000_000, date: "not-a-date" },
      { type: "income", account_id: "a", amount: 5_000_000, date: "2026-03-15" },
    ],
    assets: [], asset_transactions: [], liabilities: [], receivables: [],
    debt_payments: [], receivable_payments: [],
  };
  const hist = computeNetWorthHistory(data, months, []);
  // Giao dịch ngày rác coi như phát sinh sớm -> có mặt ở cả 2 tháng.
  assert.equal(hist[0].value, 10_000_000, "tháng 2 phải gồm opening ngày rác");
  assert.equal(hist[1].value, 15_000_000, "tháng 3 phải gồm cả income hợp lệ");
});

// BUG FIX: nợ/phải thu KHÔNG có start_date không được tính ngược về vô tận quá khứ.
// Trước đây nợ không start_date xuất hiện ở mọi tháng (kể cả nhiều năm trước).
// Sau fix: dùng created_at làm mốc phát sinh; trước mốc đó không tính.
test("computeNetWorthHistory: nợ không start_date dùng created_at làm mốc phát sinh", () => {
  const months = ["2025-01", "2026-05"];
  const data = {
    cash_accounts: [], transactions: [], assets: [], asset_transactions: [],
    liabilities: [{ id: "L", remaining_amount: 50_000_000, created_at: "2026-03-01" }], // không start_date
    receivables: [], debt_payments: [], receivable_payments: [],
  };
  const hist = computeNetWorthHistory(data, months, []);
  assert.equal(hist[0].value, 0, "2025-01 trước created_at -> chưa tính nợ");
  assert.equal(hist[1].value, -50_000_000, "2026-05 sau created_at -> tính nợ");
});

// ─────────────────────────────────────────────────────────────
// computeEmergencyFund
// ─────────────────────────────────────────────────────────────
test("computeEmergencyFund: layer1 chỉ gồm số dư dương của tài khoản thanh khoản", () => {
  const accounts = [
    { id: "a", type: "bank" },
    { id: "b", type: "cash" },
    { id: "c", type: "investment" }, // không thuộc layer1
  ];
  const transactions = [
    { type: "opening_balance", account_id: "a", amount: 50_000_000 },
    { type: "opening_balance", account_id: "b", amount: 10_000_000 },
    { type: "opening_balance", account_id: "c", amount: 999_000_000 },
  ];
  const ef = computeEmergencyFund(accounts, transactions, [], []);
  assert.equal(ef.layer1, 60_000_000);
});

// ─────────────────────────────────────────────────────────────
// calcSavingsInterest / calcMonthlyInterest
// ─────────────────────────────────────────────────────────────
test("calcSavingsInterest: lãi đơn theo số ngày", () => {
  // 100tr, 6%/năm, 365 ngày => 6tr
  const interest = calcSavingsInterest(100_000_000, 6, "2026-01-01", "2027-01-01", "simple");
  assert.equal(interest, 6_000_000);
});

test("calcSavingsInterest: thiếu dữ liệu trả 0", () => {
  assert.equal(calcSavingsInterest(0, 6, "2026-01-01", "2027-01-01", "simple"), 0);
  assert.equal(calcSavingsInterest(100_000_000, 0, "2026-01-01", "2027-01-01", "simple"), 0);
});

test("calcMonthlyInterest: lãi vay tháng", () => {
  // 120tr, 10%/năm => 1tr/tháng
  assert.equal(calcMonthlyInterest({ remaining_amount: 120_000_000, interest_rate: 10 }), 1_000_000);
});

// ─────────────────────────────────────────────────────────────
// computeGoalProgress / detectDoubleCountingGoals
// ─────────────────────────────────────────────────────────────
test("computeGoalProgress: include_full_balance cộng toàn bộ số dư nguồn", () => {
  const goal = {
    id: "g", name: "Mua xe", target_amount: 500_000_000,
    linked_sources: [{ type: "account", source_id: "a", include_full_balance: true }],
  };
  const accounts = [{ id: "a", type: "bank" }];
  const transactions = [{ type: "opening_balance", account_id: "a", amount: 100_000_000 }];
  const p = computeGoalProgress(goal, accounts, transactions, [], []);
  assert.equal(p.totalAllocated, 100_000_000);
  assert.equal(p.progressPct, 20);
  assert.equal(p.remaining, 400_000_000);
});

test("computeGoalProgress: share_percentage chỉ lấy một phần", () => {
  const goal = {
    id: "g", name: "Quỹ", target_amount: 100_000_000,
    linked_sources: [{ type: "account", source_id: "a", share_percentage: 50 }],
  };
  const accounts = [{ id: "a", type: "bank" }];
  const transactions = [{ type: "opening_balance", account_id: "a", amount: 80_000_000 }];
  const p = computeGoalProgress(goal, accounts, transactions, [], []);
  assert.equal(p.totalAllocated, 40_000_000); // 80tr * 50%
});

test("detectDoubleCountingGoals: phát hiện nguồn dùng full cho 2 mục tiêu", () => {
  const goals = [
    { name: "G1", linked_sources: [{ type: "account", source_id: "a", include_full_balance: true }] },
    { name: "G2", linked_sources: [{ type: "account", source_id: "a", include_full_balance: true }] },
    { name: "G3", linked_sources: [{ type: "account", source_id: "b", include_full_balance: true }] },
  ];
  const warnings = detectDoubleCountingGoals(goals);
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].sourceId, "a");
  assert.deepEqual(warnings[0].goalNames, ["G1", "G2"]);
});

// ─────────────────────────────────────────────────────────────
// Thống kê & helpers
// ─────────────────────────────────────────────────────────────
test("average / median / stdDev", () => {
  assert.equal(average([10, 20, 30]), 20);
  assert.equal(median([10, 20, 30]), 20);
  assert.equal(median([10, 20, 30, 40]), 25);
  assert.equal(stdDev([10, 10, 10]), 0);
});

test("computeRollingBase: loại bỏ income gắn receivable và trigger_allocation=false", () => {
  const m = toMonthKey(new Date());
  const transactions = [
    { type: "income", date: `${m}-05`, amount: 30_000_000 },
    { type: "income", date: `${m}-06`, amount: 10_000_000, receivable_id: "r1" }, // loại
    { type: "income", date: `${m}-07`, amount: 10_000_000, trigger_allocation: false }, // loại
  ];
  const base = computeRollingBase(transactions, 6);
  // chỉ 30tr được tính cho tháng hiện tại
  assert.equal(base.monthlyIncome[base.monthlyIncome.length - 1], 30_000_000);
});

test("formatVND: định dạng tiền VND có dấu phân tách và ký hiệu", () => {
  assert.match(formatVND(1_500_000), /1.500.000/);
  assert.match(formatVND(-2_000_000), /^-/);
});

// ─────────────────────────────────────────────────────────────
// xirr / computeAssetXirr — tỷ suất sinh lời có tính thời gian
// ─────────────────────────────────────────────────────────────
test("xirr: lợi nhuận 10% sau đúng 1 năm ≈ 0.10", () => {
  const rate = xirr([
    { date: "2025-01-01", amount: -1_000_000 },
    { date: "2026-01-01", amount: 1_100_000 },
  ]);
  assert.ok(rate !== null, "xirr trả null");
  assert.ok(Math.abs(rate - 0.10) < 0.005, `xirr = ${rate}, kỳ vọng ~0.10`);
});

test("xirr: huề vốn sau 1 năm ≈ 0", () => {
  const rate = xirr([
    { date: "2025-01-01", amount: -1_000_000 },
    { date: "2026-01-01", amount: 1_000_000 },
  ]);
  assert.ok(Math.abs(rate) < 0.005, `xirr = ${rate}, kỳ vọng ~0`);
});

test("xirr: lỗ 50% sau 1 năm ≈ -0.5", () => {
  const rate = xirr([
    { date: "2025-01-01", amount: -1_000_000 },
    { date: "2026-01-01", amount: 500_000 },
  ]);
  assert.ok(Math.abs(rate - (-0.5)) < 0.01, `xirr = ${rate}, kỳ vọng ~-0.5`);
});

test("xirr: nhiều dòng tiền (DCA) cho ra nghiệm hợp lý dương", () => {
  const rate = xirr([
    { date: "2025-01-01", amount: -1_000_000 },
    { date: "2025-07-01", amount: -1_000_000 },
    { date: "2026-01-01", amount: 2_300_000 },
  ]);
  assert.ok(rate !== null && rate > 0, `xirr = ${rate}, kỳ vọng dương`);
});

test("xirr: thiếu dòng tiền hoặc cùng dấu trả null", () => {
  assert.equal(xirr([{ date: "2025-01-01", amount: -1000 }]), null);
  assert.equal(xirr([
    { date: "2025-01-01", amount: -1000 },
    { date: "2026-01-01", amount: -2000 },
  ]), null);
});

test("computeAssetXirr: BUY rồi tăng giá -> annualized dương", () => {
  const assetTxns = [
    { id: "1", asset_id: "x", date: "2025-01-01", action: "BUY", quantity: 1000, price: 10_000, fee: 0, total_cash: 10_000_000 },
  ];
  const result = computeAssetXirr("x", assetTxns, 12_000, "2026-01-01");
  assert.ok(result && result.annualized !== null, "không tính được xirr");
  assert.ok(result.annualized > 0.15 && result.annualized < 0.25, `annualized = ${result.annualized}, kỳ vọng ~0.2`);
});
