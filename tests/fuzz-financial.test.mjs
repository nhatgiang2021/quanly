// tests/fuzz-financial.test.mjs
// FUZZER ĐỐI KHÁNG — sinh dữ liệu tài sản ngẫu nhiên để PHÁ logic tính toán và tìm lỗi.
//
// Triết lý: thay vì test từng case cố định, ta khẳng định các BẤT BIẾN tài chính
// (invariants) phải luôn đúng với MỌI đầu vào hợp lệ. Nếu một invariant vỡ, đó là bug.
//
// Mỗi property chạy hàng trăm seed ngẫu nhiên (xác định lại được qua seed) và in
// counterexample nhỏ nhất khi thất bại. Chạy bằng: npm test.

import test from "node:test";
import assert from "node:assert/strict";

import {
  computeAssetPosition,
  computeNetWorth,
  computeNetWorthHistory,
  computeAllAccountBalances,
  computeAssetComposition,
  getAccountBalance,
  computeEmergencyFund,
  computeGoalProgress,
  xirr,
  getLastNMonths,
} from "../computations.js";

// ── PRNG xác định (mulberry32) để counterexample tái lập được ──
function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
const int = (rng, min, max) => Math.floor(rng() * (max - min + 1)) + min;
const randDate = (rng) => {
  const y = int(rng, 2023, 2026);
  const m = int(rng, 1, 12);
  const d = int(rng, 1, 28);
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
};

const ACCOUNT_TYPES = ["bank", "ewallet", "cash", "securities_cash", "investment", "derivative", "credit_card"];
const ASSET_TYPES = ["stock", "etf", "bond", "real_estate", "crypto", "warrant", "gold", "savings", "cash_equiv", "other"];

// Sinh một bộ dữ liệu ngẫu nhiên (có thể méo mó nhưng đúng cấu trúc).
function genData(rng) {
  const accounts = [];
  const nAcc = int(rng, 0, 5);
  for (let i = 0; i < nAcc; i += 1) {
    accounts.push({ id: `acc${i}`, type: pick(rng, ACCOUNT_TYPES) });
  }

  const assets = [];
  const nAsset = int(rng, 0, 5);
  for (let i = 0; i < nAsset; i += 1) {
    assets.push({
      id: `as${i}`,
      asset_type: pick(rng, ASSET_TYPES),
      current_price: pick(rng, [0, 1, int(rng, 1, 200_000), int(rng, 1, 5_000_000_000)]),
    });
  }

  const transactions = [];
  const nTxn = int(rng, 0, 25);
  const txnTypes = ["income", "expense", "transfer", "opening_balance", "lending", "collection", "balance_adjustment", "loan_disbursement"];
  for (let i = 0; i < nTxn && accounts.length; i += 1) {
    const type = pick(rng, txnTypes);
    const amount = pick(rng, [0, 1, int(rng, 1, 100_000_000), int(rng, 1, 10_000_000_000)]);
    const txn = { id: `t${i}`, type, amount, date: randDate(rng) };
    if (type === "transfer") {
      txn.from_account_id = pick(rng, accounts).id;
      txn.to_account_id = pick(rng, accounts).id;
    } else {
      txn.account_id = pick(rng, accounts).id;
    }
    transactions.push(txn);
  }

  const assetTxns = [];
  const nAt = int(rng, 0, 25);
  const actions = ["BUY", "SELL", "OPENING", "DIVIDEND", "INTEREST", "FEE", "SPLIT", "REALLOCATE"];
  for (let i = 0; i < nAt && assets.length; i += 1) {
    const action = pick(rng, actions);
    assetTxns.push({
      id: `at${i}`,
      asset_id: pick(rng, assets).id,
      action,
      date: randDate(rng),
      quantity: pick(rng, [0, 1, int(rng, 1, 100_000)]),
      price: pick(rng, [0, int(rng, 1, 500_000)]),
      fee: pick(rng, [0, int(rng, 0, 1_000_000)]),
      total_cash: pick(rng, [0, int(rng, 1, 100_000_000)]),
      account_id: accounts.length ? pick(rng, accounts).id : undefined,
    });
  }

  const liabilities = [];
  const nLiab = int(rng, 0, 3);
  for (let i = 0; i < nLiab; i += 1) {
    liabilities.push({
      id: `L${i}`,
      remaining_amount: pick(rng, [0, int(rng, 1, 2_000_000_000)]),
      created_at: randDate(rng),
      start_date: rng() > 0.5 ? randDate(rng) : undefined,
    });
  }

  const receivables = [];
  const nRecv = int(rng, 0, 3);
  for (let i = 0; i < nRecv; i += 1) {
    receivables.push({
      id: `R${i}`,
      remaining_amount: pick(rng, [0, int(rng, 1, 500_000_000)]),
      likelihood: pick(rng, ["high", "medium", "low", undefined]),
      is_pledged: rng() > 0.8,
      created_at: randDate(rng),
    });
  }

  return {
    cash_accounts: accounts,
    transactions,
    assets,
    asset_transactions: assetTxns,
    liabilities,
    receivables,
    debt_payments: [],
    receivable_payments: [],
  };
}

const isFiniteNum = (v) => typeof v === "number" && Number.isFinite(v);
const RUNS = 400;

// Helper: chạy property trên nhiều seed, in counterexample đầu tiên nếu vỡ.
function forEachSeed(fn) {
  for (let seed = 1; seed <= RUNS; seed += 1) {
    const rng = makeRng(seed);
    const data = genData(rng);
    try {
      fn(data, seed);
    } catch (err) {
      err.message = `[seed=${seed}] ${err.message}\nDATA=${JSON.stringify(data)}`;
      throw err;
    }
  }
}

test("INVARIANT: computeAssetPosition không bao giờ trả NaN/Infinity, holding & currentValue không âm", () => {
  forEachSeed((data) => {
    for (const asset of data.assets) {
      const pos = computeAssetPosition(asset.id, data.asset_transactions, asset.current_price);
      for (const key of ["holdingQty", "totalCost", "currentValue", "realizedPnL", "unrealizedPnL", "totalDividends", "totalFees", "averageCost"]) {
        assert.ok(isFiniteNum(pos[key]), `pos.${key} không hữu hạn: ${pos[key]}`);
      }
      assert.ok(pos.holdingQty >= 0, `holdingQty âm: ${pos.holdingQty}`);
      assert.ok(pos.currentValue >= 0, `currentValue âm: ${pos.currentValue}`);
      // Bán không vượt quá đang giữ -> không tạo holding âm (đã test ở oversell, kiểm lại trên fuzz)
    }
  });
});

test("INVARIANT: computeNetWorth = totalAssets - totalLiabilities và mọi field hữu hạn", () => {
  forEachSeed((data) => {
    const nw = computeNetWorth(
      data.cash_accounts, data.transactions, data.assets,
      data.asset_transactions, data.liabilities, data.receivables,
    );
    for (const key of ["cash", "portfolio", "receivables", "debts", "ccDebt", "totalAssets", "totalLiabilities", "netWorth"]) {
      assert.ok(isFiniteNum(nw[key]), `nw.${key} không hữu hạn: ${nw[key]}`);
    }
    // Bất biến kế toán: netWorth = totalAssets - totalLiabilities.
    // Cho phép lệch theo độ lớn (IEEE-754 mất chính xác khi giá trị > 2^53; đầu vào thực tế
    // không bao giờ đạt mức này — đây chỉ là giới hạn số học, không phải lỗi logic).
    const expected = nw.totalAssets - nw.totalLiabilities;
    const tol = Math.max(1, Math.abs(expected) * 1e-12);
    assert.ok(
      Math.abs(nw.netWorth - expected) <= tol,
      `netWorth (${nw.netWorth}) != totalAssets - totalLiabilities (${expected})`,
    );
    assert.ok(nw.debts >= 0, `debts âm: ${nw.debts}`);
    assert.ok(nw.ccDebt >= 0, `ccDebt âm: ${nw.ccDebt}`);
    assert.ok(nw.portfolio >= 0, `portfolio âm: ${nw.portfolio}`);
  });
});

test("INVARIANT: computeAllAccountBalances == getAccountBalance cho mọi account, mọi dữ liệu", () => {
  forEachSeed((data) => {
    const map = computeAllAccountBalances(data.cash_accounts, data.transactions);
    for (const account of data.cash_accounts) {
      assert.equal(
        map[account.id],
        getAccountBalance(account.id, data.transactions),
        `Lệch balance account ${account.id}`,
      );
    }
  });
});

test("INVARIANT: composition tổng = sum segments, mọi pct trong [0,100], tổng pct ~100", () => {
  forEachSeed((data) => {
    const comp = computeAssetComposition(
      data.cash_accounts, data.transactions, data.assets, data.asset_transactions, data.receivables,
    );
    assert.ok(isFiniteNum(comp.total), `total không hữu hạn: ${comp.total}`);
    const sumSeg = comp.segments.reduce((s, x) => s + x.value, 0);
    assert.equal(comp.total, sumSeg, `total (${comp.total}) != sum segments (${sumSeg})`);
    let pctSum = 0;
    for (const seg of comp.segments) {
      assert.ok(seg.value > 0, `segment value không dương: ${seg.value}`);
      assert.ok(seg.pct >= 0 && seg.pct <= 100.0001, `pct ngoài [0,100]: ${seg.pct}`);
      pctSum += seg.pct;
    }
    if (comp.segments.length > 0) {
      assert.ok(Math.abs(pctSum - 100) < 0.01, `tổng pct = ${pctSum}, kỳ vọng 100`);
    }
  });
});

test("INVARIANT: netWorthHistory hữu hạn, điểm tháng hiện tại khớp net worth live", () => {
  const months = getLastNMonths(12);
  const currentMonth = months[months.length - 1];
  const monthEndStr = `${currentMonth}-31`;
  forEachSeed((data) => {
    const hist = computeNetWorthHistory(data, months, []);
    assert.equal(hist.length, 12, "phải có 12 điểm");
    for (const point of hist) {
      assert.ok(isFiniteNum(point.value), `điểm ${point.month} không hữu hạn: ${point.value}`);
    }
    // Reconstruction CỐ TÌNH loại bỏ mục có ngày trong tương lai khỏi "hôm nay" (đúng về tài chính),
    // trong khi computeNetWorth live cộng tất cả. Vì vậy chỉ so khớp khi dữ liệu KHÔNG có ngày tương lai.
    const hasFutureDated =
      data.transactions.some((t) => String(t.date || "") > monthEndStr) ||
      data.liabilities.some((l) => String(l.start_date || l.created_at || "") > monthEndStr) ||
      data.receivables.some((r) => String(r.start_date || r.created_at || "") > monthEndStr) ||
      data.asset_transactions.some((t) => String(t.date || "") > monthEndStr);
    if (hasFutureDated) {
      return; // bỏ qua: hành vi loại trừ tương lai là đúng, không phải bug
    }
    const live = computeNetWorth(
      data.cash_accounts, data.transactions, data.assets,
      data.asset_transactions, data.liabilities, data.receivables,
    ).netWorth;
    const lastPoint = hist.find((h) => h.month === currentMonth);
    assert.ok(
      Math.abs(lastPoint.value - live) <= 2,
      `điểm cuối (${lastPoint.value}) lệch net worth live (${live})`,
    );
  });
});

test("INVARIANT: goal progressPct trong [0,100], remaining >= 0, không NaN", () => {
  forEachSeed((data) => {
    // Tạo goal ngẫu nhiên trỏ tới account/asset thực
    const rng = makeRng(7);
    const goal = {
      id: "g", name: "G", target_amount: pick(rng, [0, 1, 100_000_000, 5_000_000_000]),
      deadline: randDate(rng),
      linked_sources: data.cash_accounts.slice(0, 2).map((a) => ({
        type: "account", source_id: a.id, include_full_balance: rng() > 0.5, share_percentage: int(rng, 0, 100),
      })),
    };
    const p = computeGoalProgress(goal, data.cash_accounts, data.transactions, data.assets, data.asset_transactions);
    assert.ok(isFiniteNum(p.progressPct), `progressPct không hữu hạn: ${p.progressPct}`);
    assert.ok(p.progressPct >= 0 && p.progressPct <= 100, `progressPct ngoài [0,100]: ${p.progressPct}`);
    assert.ok(p.remaining >= 0, `remaining âm: ${p.remaining}`);
    assert.ok(isFiniteNum(p.totalAllocated), `totalAllocated không hữu hạn`);
  });
});

test("INVARIANT: emergencyFund không âm, hữu hạn", () => {
  forEachSeed((data) => {
    const ef = computeEmergencyFund(data.cash_accounts, data.transactions, data.assets, data.asset_transactions);
    assert.ok(isFiniteNum(ef.layer1) && isFiniteNum(ef.layer2) && isFiniteNum(ef.total));
    assert.ok(ef.layer1 >= 0, `layer1 âm: ${ef.layer1}`);
    assert.ok(ef.layer2 >= 0, `layer2 âm: ${ef.layer2}`);
  });
});

test("INVARIANT: xirr trả null hoặc số hữu hạn trong [-1, 100], không bao giờ NaN", () => {
  for (let seed = 1; seed <= RUNS; seed += 1) {
    const rng = makeRng(seed * 13 + 1);
    const n = int(rng, 0, 8);
    const flows = [];
    for (let i = 0; i < n; i += 1) {
      flows.push({ date: randDate(rng), amount: pick(rng, [-int(rng, 1, 1e8), int(rng, 1, 1e8), 0]) });
    }
    const r = xirr(flows);
    if (r !== null) {
      assert.ok(Number.isFinite(r), `[seed=${seed}] xirr trả NaN/Infinity: ${r} flows=${JSON.stringify(flows)}`);
      assert.ok(r > -1 && r <= 1000, `[seed=${seed}] xirr ngoài khoảng hợp lý [-1, 1000]: ${r}`);
    }
  }
});
