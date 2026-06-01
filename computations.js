export const BUCKET_PRESETS = [
  {
    id: "exp_fixed",
    name: "Chi tiêu cố định",
    percentage: 15,
    color: "#888780",
    icon: "🏠",
    type: "expense_budget",
    rolloverType: "accumulate",
    targetBucketId: "",
    defaultCategories: ["Tiền nhà", "Điện nước", "Bảo hiểm", "Internet", "Trả góp", "Học phí"],
    linked_bucket: null,
  },
  {
    id: "exp_food",
    name: "Ăn uống & sinh hoạt",
    percentage: 20,
    color: "#5fa030",
    icon: "🍜",
    type: "expense_budget",
    rolloverType: "accumulate",
    targetBucketId: "",
    defaultCategories: ["Ăn uống", "Siêu thị", "Chợ", "Cafe", "Đi lại", "Xăng xe"],
    linked_bucket: null,
  },
  {
    id: "exp_health",
    name: "Sức khỏe & baby",
    percentage: 8,
    color: "#D4537E",
    icon: "💊",
    type: "expense_budget",
    rolloverType: "accumulate",
    targetBucketId: "",
    defaultCategories: ["Khám bệnh", "Thuốc", "Gym", "Sữa", "Tã", "Đồ dùng trẻ em"],
    linked_bucket: null,
  },
  {
    id: "exp_enjoy",
    name: "Hưởng thụ",
    percentage: 7,
    color: "#ca8a1a",
    icon: "🎉",
    type: "expense_budget",
    rolloverType: "accumulate",
    targetBucketId: "",
    defaultCategories: ["Giải trí", "Du lịch", "Mua sắm", "Quần áo", "Nhà hàng", "Spa"],
    linked_bucket: null,
  },
  {
    id: "exp_give",
    name: "Cho đi",
    percentage: 5,
    color: "#E8795A",
    icon: "🤝",
    type: "expense_budget",
    rolloverType: "accumulate",
    targetBucketId: "",
    defaultCategories: ["Từ thiện", "Biếu tặng", "Hỗ trợ gia đình", "Đóng góp"],
    linked_bucket: null,
  },
  {
    id: "alloc_growth",
    name: "Tăng trưởng vốn",
    percentage: 20,
    color: "#5e6ad2",
    icon: "📈",
    type: "investment_bucket",
    rolloverType: "accumulate",
    targetBucketId: "",
    defaultCategories: [],
    linked_bucket: "Tăng trưởng vốn",
  },
  {
    id: "alloc_cf",
    name: "Dòng tiền",
    percentage: 10,
    color: "#27a644",
    icon: "💰",
    type: "investment_bucket",
    rolloverType: "accumulate",
    targetBucketId: "",
    defaultCategories: [],
    linked_bucket: "Dòng tiền",
  },
  {
    id: "alloc_trade",
    name: "Lướt sóng",
    percentage: 5,
    color: "#F59E0B",
    icon: "🌊",
    type: "investment_bucket",
    rolloverType: "accumulate",
    targetBucketId: "",
    defaultCategories: [],
    linked_bucket: "Lướt sóng",
  },
  {
    id: "alloc_safe",
    name: "Bảo đảm",
    percentage: 10,
    color: "#8b7cf0",
    icon: "🛡️",
    type: "saving_goal",
    rolloverType: "accumulate",
    targetBucketId: "",
    defaultCategories: [],
    linked_bucket: "Bảo đảm",
  },
];

export const INVESTMENT_BUCKET_IDS = ["alloc_growth", "alloc_cf", "alloc_trade", "alloc_safe"];

export const ACCOUNT_TYPE_LABELS = {
  bank: "Ngân hàng",
  ewallet: "Ví điện tử",
  cash: "Tiền mặt",
  securities_cash: "Tiền chờ đầu tư",
  investment: "Tài khoản lướt sóng",
  derivative: "Tài khoản phái sinh",
  credit_card: "Thẻ tín dụng",
};

export const TRANSACTION_TYPE_LABELS = {
  income: "Thu nhập",
  expense: "Chi tiêu",
  transfer: "Chuyển khoản",
  loan_disbursement: "Giải ngân vay",
  lending: "Cho vay",
  collection: "Thu hồi nợ",
  asset_purchase: "Mua tài sản",
  asset_sale: "Bán tài sản",
  opening_balance: "Số dư đầu kỳ",
  balance_adjustment: "Điều chỉnh số dư",
};

export const ASSET_ACTION_LABELS = {
  BUY: "Mua",
  SELL: "Bán",
  OPENING: "Tài sản ban đầu",
  DIVIDEND: "Cổ tức",
  INTEREST: "Lãi",
  SPLIT: "Tách CP",
  FEE: "Phí",
  REALLOCATE: "Tái phân bổ",
};

const ONE_DAY = 24 * 60 * 60 * 1000;

function safeNumber(value) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : 0;
}

function roundInt(value) {
  return Math.round(safeNumber(value));
}

function toDateOnly(dateInput) {
  const base = dateInput ? new Date(dateInput) : new Date();
  return new Date(base.getFullYear(), base.getMonth(), base.getDate());
}

function monthParts(month) {
  const [year, monthIndex] = String(month).split("-").map(Number);
  return {
    year,
    monthIndex: (monthIndex || 1) - 1,
  };
}

export function toMonthKey(dateInput) {
  const date = toDateOnly(dateInput);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function formatVND(amount) {
  const value = roundInt(amount);
  const sign = value < 0 ? "-" : "";
  const absValue = Math.abs(value);
  return `${sign}${new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0,
  }).format(absValue)} ₫`;
}

export function daysBetween(startDate, endDate) {
  const start = toDateOnly(startDate);
  const end = toDateOnly(endDate);
  return Math.round((end.getTime() - start.getTime()) / ONE_DAY);
}

export function getDaysUntil(date) {
  return daysBetween(new Date(), date);
}

export function getLastNMonths(n) {
  const months = [];
  const cursor = toDateOnly(new Date());
  cursor.setDate(1);
  for (let index = n - 1; index >= 0; index -= 1) {
    const monthDate = new Date(cursor.getFullYear(), cursor.getMonth() - index, 1);
    months.push(toMonthKey(monthDate));
  }
  return months;
}

export function getPrevMonth(month) {
  const { year, monthIndex } = monthParts(month);
  const prev = new Date(year, monthIndex - 1, 1);
  return toMonthKey(prev);
}

export function average(arr) {
  const values = Array.isArray(arr) ? arr.map(safeNumber) : [];
  if (!values.length) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function median(arr) {
  const values = Array.isArray(arr)
    ? arr.map(safeNumber).sort((left, right) => left - right)
    : [];
  if (!values.length) {
    return 0;
  }
  const midpoint = Math.floor(values.length / 2);
  return values.length % 2 === 0
    ? (values[midpoint - 1] + values[midpoint]) / 2
    : values[midpoint];
}

export function stdDev(arr) {
  const values = Array.isArray(arr) ? arr.map(safeNumber) : [];
  if (values.length < 2) {
    return 0;
  }
  const mean = average(values);
  const variance = average(values.map((value) => (value - mean) ** 2));
  return Math.sqrt(variance);
}

export function getAccountImpact(transaction, accountId) {
  const amount = safeNumber(transaction.amount);
  switch (transaction.type) {
    case "income":
      return transaction.account_id === accountId ? amount : 0;
    case "expense":
      return transaction.account_id === accountId ? -amount : 0;
    case "transfer":
      if (transaction.from_account_id === accountId) {
        return -amount;
      }
      if (transaction.to_account_id === accountId) {
        return amount;
      }
      return 0;
    case "loan_disbursement":
      return transaction.account_id === accountId ? amount : 0;
    case "lending":
      // Cho vay: trừ tiền tài khoản, không tính là chi tiêu
      return transaction.account_id === accountId ? -amount : 0;
    case "collection":
      // Thu hồi nợ: cộng tiền tài khoản, không tính là thu nhập
      return transaction.account_id === accountId ? amount : 0;
    case "asset_purchase":
      return transaction.account_id === accountId || transaction.from_account_id === accountId
        ? -amount
        : 0;
    case "asset_sale":
      return transaction.account_id === accountId || transaction.to_account_id === accountId
        ? amount
        : 0;
    case "opening_balance":
      return transaction.account_id === accountId ? amount : 0;
    case "balance_adjustment":
      // Cho phép âm/dương để phản ánh đối soát thực tế (ví dụ tài khoản phái sinh).
      return transaction.account_id === accountId ? amount : 0;
    default:
      return transaction.account_id === accountId ? amount : 0;
  }
}

export function getAccountBalance(accountId, transactions) {
  return roundInt(
    (transactions || []).reduce((sum, transaction) => {
      return sum + getAccountImpact(transaction, accountId);
    }, 0),
  );
}

// Tính số dư TẤT CẢ tài khoản trong MỘT lần quét giao dịch (thay vì quét lại theo từng account).
// Dùng cho buildDerived để tránh O(accounts × transactions) lặp nhiều lần khi dữ liệu lớn.
// Kết quả tương đương gọi getAccountBalance cho từng account.
export function computeAllAccountBalances(accounts, transactions) {
  const balances = {};
  (accounts || []).forEach((account) => {
    balances[account.id] = 0;
  });
  (transactions || []).forEach((transaction) => {
    const amount = safeNumber(transaction.amount);
    switch (transaction.type) {
      case "transfer": {
        // Khớp đúng getAccountImpact (gọi riêng từng account):
        // - Transfer giữa 2 account khác nhau: trừ from, cộng to.
        // - Self-transfer (from === to): getAccountImpact trả -amount (nhánh from return trước),
        //   nên chỉ trừ một lần, KHÔNG cộng lại.
        const from = transaction.from_account_id;
        const to = transaction.to_account_id;
        if (from === to) {
          if (from in balances) balances[from] -= amount;
        } else {
          if (from in balances) balances[from] -= amount;
          if (to in balances) balances[to] += amount;
        }
        break;
      }
      case "expense":
      case "lending":
        if (transaction.account_id in balances) balances[transaction.account_id] -= amount;
        break;
      case "asset_purchase":
        if (transaction.account_id in balances) balances[transaction.account_id] -= amount;
        else if (transaction.from_account_id in balances) balances[transaction.from_account_id] -= amount;
        break;
      case "asset_sale":
        if (transaction.account_id in balances) balances[transaction.account_id] += amount;
        else if (transaction.to_account_id in balances) balances[transaction.to_account_id] += amount;
        break;
      default:
        // income, loan_disbursement, collection, opening_balance, balance_adjustment, ...
        if (transaction.account_id in balances) balances[transaction.account_id] += amount;
        break;
    }
  });
  Object.keys(balances).forEach((id) => {
    balances[id] = roundInt(balances[id]);
  });
  return balances;
}

export function computeAssetPosition(assetId, assetTxns, currentPrice) {
  let holdingQty = 0;
  let totalCost = 0;
  let realizedPnL = 0;
  let totalDividends = 0;
  let totalFees = 0;
  let totalInvested = 0;
  let totalReturned = 0;

  const rows = (assetTxns || [])
    .filter((transaction) => transaction.asset_id === assetId)
    .slice()
    .sort((left, right) => {
      if (left.date === right.date) {
        return String(left.id).localeCompare(String(right.id));
      }
      return left.date.localeCompare(right.date);
    });

  rows.forEach((transaction) => {
    const action = String(transaction.action || "").toUpperCase();
    const quantity = safeNumber(transaction.quantity);
    const price = safeNumber(transaction.price);
    const fee = safeNumber(transaction.fee);
    const totalCash =
      safeNumber(transaction.total_cash) || roundInt(quantity * price + (action === "BUY" || action === "REALLOCATE" ? fee : 0));

    if (action === "BUY" || action === "REALLOCATE") {
      const grossCost = roundInt(quantity * price + fee);
      holdingQty += quantity;
      totalCost += grossCost;
      totalInvested += grossCost;
      totalFees += fee;
      return;
    }

    if (action === "OPENING") {
      const openingCost = roundInt(quantity * price);
      holdingQty += quantity;
      totalCost += openingCost;
      return;
    }

    if (action === "SELL") {
      const soldQty = Math.min(quantity, holdingQty);
      if (soldQty <= 0) {
        return;
      }
      const avgCost = holdingQty > 0 ? totalCost / holdingQty : 0;
      const costBasis = avgCost * soldQty;
      const effectiveFee = quantity > 0 ? fee * (soldQty / quantity) : fee;
      const proceeds = soldQty * price - effectiveFee;
      holdingQty -= soldQty;
      totalCost -= costBasis;
      realizedPnL += proceeds - costBasis;
      totalReturned += proceeds;
      totalFees += effectiveFee;
      if (Math.abs(holdingQty) < 1e-9) {
        holdingQty = 0;
        totalCost = 0;
      }
      return;
    }

    if (action === "DIVIDEND" || action === "INTEREST") {
      const cashAmount = safeNumber(transaction.total_cash) || roundInt(quantity * price);
      totalDividends += cashAmount;
      totalReturned += cashAmount;
      return;
    }

    if (action === "FEE") {
      const expense = safeNumber(transaction.total_cash) || fee || roundInt(quantity * price);
      realizedPnL -= expense;
      totalFees += expense;
      return;
    }

    if (action === "SPLIT") {
      const multiplier = quantity > 0 ? quantity : 1;
      holdingQty *= multiplier;
    }
  });

  // Giá tài sản không thể âm; kẹp về 0 để không tạo currentValue âm
  // (giá âm thường là lỗi nhập liệu hoặc dữ liệu import hỏng).
  const normalizedPrice = Math.max(0, safeNumber(currentPrice));
  const currentValue = roundInt(holdingQty * normalizedPrice);
  const averageCost = holdingQty > 0 ? totalCost / holdingQty : 0;
  const unrealizedPnL = roundInt(currentValue - totalCost);

  return {
    assetId,
    holdingQty,
    averageCost,
    totalCost: roundInt(totalCost),
    currentValue,
    realizedPnL: roundInt(realizedPnL),
    unrealizedPnL,
    totalDividends: roundInt(totalDividends),
    totalFees: roundInt(totalFees),
    totalInvested: roundInt(totalInvested),
    totalReturned: roundInt(totalReturned),
  };
}

export function calcSavingsInterest(principal, rate, startDate, maturityDate, type) {
  const principalValue = safeNumber(principal);
  const rateValue = safeNumber(rate) / 100;
  const totalDays = Math.max(0, daysBetween(startDate, maturityDate));
  if (!principalValue || !rateValue || !totalDays) {
    return 0;
  }
  if (String(type || "").toLowerCase().includes("compound")) {
    const months = Math.max(1, totalDays / 30);
    return roundInt(principalValue * ((1 + rateValue / 12) ** months - 1));
  }
  return roundInt(principalValue * rateValue * (totalDays / 365));
}

export function computeRollingBase(transactions, windowMonths) {
  const months = getLastNMonths(windowMonths || 6);
  const monthlyIncome = months.map((month) => {
    return roundInt(
      (transactions || []).reduce((sum, transaction) => {
        if (transaction.type !== "income") {
          return sum;
        }
        if (transaction.trigger_allocation === false) {
          return sum;
        }
        if (transaction.receivable_id) {
          return sum;
        }
        return toMonthKey(transaction.date) === month ? sum + safeNumber(transaction.amount) : sum;
      }, 0),
    );
  });

  const nonZero = monthlyIncome.filter((value) => value > 0);
  const avg = average(monthlyIncome);
  const avgNonZero = nonZero.length ? average(nonZero) : 0;
  const medianValue = median(monthlyIncome);

  return {
    months,
    monthlyIncome,
    avg: roundInt(avg),
    avgNonZero: roundInt(avgNonZero),
    median: roundInt(medianValue),
    conservative: roundInt(medianValue * 0.8),
    volatility: roundInt(stdDev(monthlyIncome)),
  };
}

export function getMonthBudgetBase(month, transactions, settings = {}) {
  const monthIncome = roundInt(
    (transactions || []).reduce((sum, transaction) => {
      if (transaction.type !== "income" || transaction.trigger_allocation === false || transaction.receivable_id) {
        return sum;
      }
      return toMonthKey(transaction.date) === month ? sum + safeNumber(transaction.amount) : sum;
    }, 0),
  );

  const rolling = computeRollingBase(transactions || [], settings.rolling_window || 6);
  const passiveFloor = safeNumber(settings.passive_income_default);
  const irregular = settings.income_mode === "irregular";
  let baseAmount = monthIncome;
  let source = "Thu nhập thực tế";
  const hasAnyEligibleIncome = (transactions || []).some(
    (transaction) =>
      transaction.type === "income" &&
      transaction.trigger_allocation !== false &&
      safeNumber(transaction.amount) > 0 &&
      toMonthKey(transaction.date) === month,
  );

  if (!hasAnyEligibleIncome && monthIncome <= 0) {
    return {
      month,
      monthlyIncome: 0,
      rolling,
      baseAmount: 0,
      source: "Không có thu nhập",
    };
  }

  if (irregular) {
    if (monthIncome > 0) {
      // In irregular mode with income, use actual income but label correctly
      baseAmount = monthIncome;
      source = "Thu nhập thực tế";
    } else {
      baseAmount = Math.max(passiveFloor, rolling.conservative);
      source = baseAmount === passiveFloor ? "Mức sàn thụ động" : "Trung vị bảo thủ";
    }
  } else if (monthIncome <= 0) {
    baseAmount = rolling.avgNonZero || rolling.avg || passiveFloor;
    source = baseAmount === passiveFloor ? "Mức sàn thụ động" : "Trung bình gần đây";
  }

  return {
    month,
    monthlyIncome: monthIncome,
    rolling,
    baseAmount: roundInt(baseAmount),
    source,
  };
}

export function computeMonthlyBucket(
  allocationId,
  month,
  transactions,
  annualBudgets,
  allocationRules,
  categoryMap,
  assets = [],
) {
  const year = Number(String(month).slice(0, 4));
  const activeRule =
    (allocationRules || []).find((rule) => rule.is_active) ||
    (allocationRules || [])[0] || { buckets: BUCKET_PRESETS };
  const bucket = (activeRule.buckets || []).find((item) => item.id === allocationId) || {};
  const annual = (annualBudgets || []).find((item) => Number(item.year) === year);
  const bucketRow = (annual?.buckets || []).find((item) => item.allocationId === allocationId);
  const monthRow = (bucketRow?.monthlyData || []).find((item) => item.month === month);
  const assetBucketMap = Object.fromEntries((assets || []).map((asset) => [asset.id, asset.bucket]));
  const spentAmount = roundInt(
    (transactions || []).reduce((sum, transaction) => {
      if (toMonthKey(transaction.date) !== month) {
        return sum;
      }
      if (transaction.type === "expense" && !transaction.receivable_id) {
        return categoryMap?.[transaction.category] === allocationId ? sum + safeNumber(transaction.amount) : sum;
      }
      return sum;
    }, 0),
  );
  let hasTransferTagged = false;
  const investedFromTransfer = roundInt(
    (transactions || []).reduce((sum, transaction) => {
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
    (transactions || []).reduce((sum, transaction) => {
      if (toMonthKey(transaction.date) !== month || transaction.type !== "asset_purchase") {
        return sum;
      }
      return assetBucketMap[transaction.asset_id] === allocationId ? sum + safeNumber(transaction.amount) : sum;
    }, 0),
  );
  const investedAmount = hasTransferTagged ? investedFromTransfer : investedFromAssetPurchase;

  const fallbackBase = roundInt(
    ((safeNumber(annual?.target_annual_income) / 12) * safeNumber(bucket.percentage)) / 100,
  );
  const baseAmount = safeNumber(monthRow?.baseAmount) || fallbackBase;
  const rolloverIn = safeNumber(monthRow?.rolloverIn);
  const effectiveBudget = safeNumber(monthRow?.effectiveBudget) || baseAmount + rolloverIn;
  const usedAmount = bucket.type === "expense_budget" ? spentAmount : investedAmount;
  const rawRolloverOut = roundInt(effectiveBudget - usedAmount);
  const rolloverType = bucket.rolloverType || bucket.rollover_type || "accumulate";
  const targetBucketId = bucket.targetBucketId || bucket.target_bucket_id || "";
  const rolloverOut =
    rolloverType === "reset" || rolloverType === "transfer_to" ? 0 : roundInt(rawRolloverOut);
  const utilizationBase = bucket.type ? usedAmount : spentAmount;
  const utilization = effectiveBudget > 0 ? (utilizationBase / effectiveBudget) * 100 : 0;

  return {
    allocationId,
    month,
    name: bucket.name || allocationId,
    color: bucket.color || "#8a8f98",
    type: bucket.type || "",
    rolloverType,
    targetBucketId,
    baseAmount: roundInt(baseAmount),
    rolloverIn: roundInt(rolloverIn),
    effectiveBudget: roundInt(effectiveBudget),
    allocatedAmount: roundInt(effectiveBudget),
    spentAmount,
    investedAmount,
    pendingAmount: roundInt(effectiveBudget - investedAmount),
    rawRolloverOut,
    rolloverOut,
    utilization,
    status:
      utilization >= 100 ? "Vượt ngân sách" : utilization >= 85 ? "Cảnh báo" : utilization >= 60 ? "Theo dõi" : "Ổn định",
  };
}

export function computeNetWorth(accounts, transactions, assets, assetTxns, liabilities, receivables) {
  const accountBalances = (accounts || []).map((account) => ({
    ...account,
    balance: getAccountBalance(account.id, transactions || []),
  }));

  const cash = roundInt(
    accountBalances.reduce((sum, account) => {
      if (["bank", "ewallet", "cash", "securities_cash", "investment", "derivative"].includes(account.type)) {
        return sum + account.balance;
      }
      return sum;
    }, 0),
  );

  const portfolio = roundInt(
    (assets || []).reduce((sum, asset) => {
      const position = computeAssetPosition(asset.id, assetTxns || [], asset.current_price);
      return sum + position.currentValue;
    }, 0),
  );

  const discountedReceivables = roundInt(
    (receivables || []).reduce((sum, item) => {
      if (item.is_pledged) {
        return sum;
      }
      const ratio = item.likelihood === "high" ? 1 : item.likelihood === "medium" ? 0.7 : 0.3;
      return sum + safeNumber(item.remaining_amount) * ratio;
    }, 0),
  );

  const debts = roundInt(
    (liabilities || []).reduce((sum, liability) => sum + safeNumber(liability.remaining_amount), 0),
  );

  const ccDebt = roundInt(
    accountBalances.reduce((sum, account) => {
      if (account.type === "credit_card" && account.balance < 0) {
        return sum + Math.abs(account.balance);
      }
      return sum;
    }, 0),
  );

  return {
    cash,
    portfolio,
    receivables: discountedReceivables,
    debts,
    ccDebt,
    totalAssets: roundInt(cash + portfolio + discountedReceivables),
    totalLiabilities: roundInt(debts + ccDebt),
    netWorth: roundInt(cash + portfolio + discountedReceivables - debts - ccDebt),
  };
}

// Phân bổ giá trị tài sản đang nắm giữ theo lớp tài sản (allocation view).
// Thuần derived từ dữ liệu hiện có, không thay đổi schema.
// Chỉ gộp các khoản có giá trị dương (chuẩn của biểu đồ phân bổ, tổng tỷ trọng = 100%):
// Tiền mặt & TK (số dư dương ròng), Cổ phiếu/ETF/TP, Bất động sản, Tiết kiệm,
// Vàng, Tiền số, Phải thu (đã chiết khấu theo khả năng thu hồi).
// Lưu ý: đây là góc nhìn phân bổ tài sản gộp, không phải bảng cân đối net worth
// (không trừ nợ, bỏ qua tiền mặt âm do thấu chi) — nên tổng có thể khác totalAssets.
export function computeAssetComposition(accounts, transactions, assets, assetTxns, receivables) {
  const liquidTypes = ["bank", "ewallet", "cash", "securities_cash", "investment", "derivative"];
  const cash = roundInt(
    (accounts || []).reduce((sum, account) => {
      if (!liquidTypes.includes(account.type)) {
        return sum;
      }
      return sum + getAccountBalance(account.id, transactions || []);
    }, 0),
  );

  const groups = {
    real_estate: 0,
    savings: 0,
    equity: 0, // stock, etf, bond, warrant
    crypto: 0,
    gold: 0,
    other: 0,
  };

  (assets || []).forEach((asset) => {
    const value = computeAssetPosition(asset.id, assetTxns || [], asset.current_price).currentValue;
    if (value <= 0) {
      return;
    }
    const type = String(asset.asset_type || "other").toLowerCase();
    if (type === "real_estate" || type === "realestate") {
      groups.real_estate += value;
    } else if (type === "savings" || type === "cash_equiv") {
      groups.savings += value;
    } else if (type === "crypto") {
      groups.crypto += value;
    } else if (type === "gold") {
      groups.gold += value;
    } else if (["stock", "etf", "bond", "warrant"].includes(type)) {
      groups.equity += value;
    } else {
      groups.other += value;
    }
  });

  const discountedReceivables = roundInt(
    (receivables || []).reduce((sum, item) => {
      if (item.is_pledged) {
        return sum;
      }
      const ratio = item.likelihood === "high" ? 1 : item.likelihood === "medium" ? 0.7 : 0.3;
      return sum + safeNumber(item.remaining_amount) * ratio;
    }, 0),
  );

  const segments = [
    { key: "cash", label: "Tiền mặt & tài khoản", value: cash, color: "#5e6ad2" },
    { key: "equity", label: "Cổ phiếu / ETF / TP", value: roundInt(groups.equity), color: "#27a644" },
    { key: "real_estate", label: "Bất động sản", value: roundInt(groups.real_estate), color: "#ca8a1a" },
    { key: "savings", label: "Tiết kiệm", value: roundInt(groups.savings), color: "#8b7cf0" },
    { key: "gold", label: "Vàng", value: roundInt(groups.gold), color: "#d4a017" },
    { key: "crypto", label: "Tiền số", value: roundInt(groups.crypto), color: "#e8795a" },
    { key: "receivables", label: "Phải thu (chiết khấu)", value: discountedReceivables, color: "#3aa6a6" },
    { key: "other", label: "Khác", value: roundInt(groups.other), color: "#8a8f98" },
  ].filter((segment) => segment.value > 0);

  const total = roundInt(segments.reduce((sum, segment) => sum + segment.value, 0));
  return {
    total,
    segments: segments
      .map((segment) => ({
        ...segment,
        pct: total > 0 ? (segment.value / total) * 100 : 0,
      }))
      .sort((left, right) => right.value - left.value),
  };
}

export function computeEmergencyFund(accounts, transactions, assets, assetTxns) {
  const accountBalances = (accounts || []).map((account) => ({
    ...account,
    balance: getAccountBalance(account.id, transactions || []),
  }));

  const layer1 = roundInt(
    accountBalances.reduce((sum, account) => {
      if (!["bank", "ewallet", "cash", "securities_cash"].includes(account.type)) {
        return sum;
      }
      return sum + Math.max(0, account.balance);
    }, 0),
  );

  const layer2 = roundInt(
    (assets || []).reduce((sum, asset) => {
      if (asset.asset_type !== "savings" || asset.is_pledged) {
        return sum;
      }
      const position = computeAssetPosition(asset.id, assetTxns || [], asset.current_price);
      const principal = position.currentValue || position.totalCost;
      const projectedInterest = calcSavingsInterest(
        principal,
        asset.interest_rate,
        asset.start_date,
        asset.maturity_date,
        asset.interest_type,
      );
      const daysToMaturity = getDaysUntil(asset.maturity_date);
      const grossValue = principal + projectedInterest;
      return sum + (daysToMaturity > 30 ? grossValue * 0.9 : grossValue);
    }, 0),
  );

  return {
    layer1,
    layer2,
    total: roundInt(layer1 + layer2),
  };
}

export function calcMonthlyInterest(liability) {
  return roundInt((safeNumber(liability?.remaining_amount) * safeNumber(liability?.interest_rate)) / 100 / 12);
}

export function computeGoalProgress(goal, accounts, transactions, assets, assetTxns) {
  const accountBalances = Object.fromEntries(
    (accounts || []).map((account) => [account.id, Math.max(0, getAccountBalance(account.id, transactions || []))]),
  );
  const assetValues = Object.fromEntries(
    (assets || []).map((asset) => {
      const position = computeAssetPosition(asset.id, assetTxns || [], asset.current_price);
      return [asset.id, Math.max(0, position.currentValue)];
    }),
  );

  const breakdown = (goal?.linked_sources || []).map((source) => {
    const sourceType = source.type || source.source_type;
    const sourceId = source.source_id || source.id;
    const share = safeNumber(source.share_percentage || source.weight || 0);
    let baseValue = 0;

    if (sourceType === "account") {
      baseValue = accountBalances[sourceId] || 0;
    } else if (sourceType === "asset") {
      baseValue = assetValues[sourceId] || 0;
    } else if (sourceType === "bucket") {
      baseValue = safeNumber(source.current_value);
    }

    const usedValue = source.include_full_balance
      ? baseValue
      : share > 0
        ? roundInt((baseValue * share) / 100)
        : safeNumber(source.current_value);

    return {
      label: source.label || source.name || sourceId,
      sourceType,
      sourceId,
      includeFullBalance: Boolean(source.include_full_balance),
      baseValue: roundInt(baseValue),
      usedValue: roundInt(usedValue),
      monthlyContribution: roundInt(source.monthly_contribution),
    };
  });

  const totalAllocated = roundInt(breakdown.reduce((sum, item) => sum + item.usedValue, 0));
  const targetAmount = safeNumber(goal?.target_amount);
  const remaining = Math.max(0, targetAmount - totalAllocated);
  const progressPct = targetAmount > 0 ? Math.min(100, (totalAllocated / targetAmount) * 100) : 0;
  const monthlyContribution = roundInt(
    breakdown.reduce((sum, item) => sum + safeNumber(item.monthlyContribution), 0),
  );
  const daysToDeadline = goal?.deadline ? getDaysUntil(goal.deadline) : 0;
  const monthsToDeadline = goal?.deadline ? Math.max(1, Math.ceil(daysToDeadline / 30)) : 0;
  const monthlyRequired = goal?.deadline ? roundInt(remaining / monthsToDeadline) : 0;

  let forecastDate = "";
  if (monthlyContribution > 0 && remaining > 0) {
    const monthsNeeded = Math.ceil(remaining / monthlyContribution);
    const forecast = new Date();
    forecast.setMonth(forecast.getMonth() + monthsNeeded);
    forecastDate = toMonthKey(forecast);
  }

  return {
    id: goal.id,
    name: goal.name,
    type: goal.type,
    targetAmount: roundInt(targetAmount),
    totalAllocated,
    remaining,
    progressPct,
    deadline: goal.deadline,
    overdue: Boolean(goal.deadline) && daysToDeadline < 0 && remaining > 0,
    monthlyRequired,
    monthlyContribution,
    forecastDate,
    breakdown,
  };
}

export function detectDoubleCountingGoals(goals) {
  const seen = new Map();

  (goals || []).forEach((goal) => {
    (goal.linked_sources || []).forEach((source) => {
      if (!source.include_full_balance) {
        return;
      }
      const sourceType = source.type || source.source_type;
      const sourceId = source.source_id || source.id;
      const key = `${sourceType}:${sourceId}`;
      const goalNames = seen.get(key) || [];
      goalNames.push(goal.name);
      seen.set(key, goalNames);
    });
  });

  return Array.from(seen.entries())
    .filter(([, goalNames]) => goalNames.length > 1)
    .map(([key, goalNames]) => {
      const [sourceType, sourceId] = key.split(":");
      return {
        key,
        sourceType,
        sourceId,
        goalNames,
      };
    });
}

// Tái dựng đường net worth theo từng tháng từ chính sổ giao dịch hiện có.
// Mục đích: dashboard "Tài sản ròng 12 tháng" và chỉ số so-với-tháng-trước
// không còn phẳng khi người dùng chưa có snapshot lịch sử.
//
// Cách dựng (faithful tới dữ liệu đã ghi, KHÔNG bịa số):
// - Tiền mặt & số dư tài khoản: replay đúng các giao dịch có ngày <= cuối tháng.
// - Nợ / phải thu: lấy dư hiện tại CỘNG LẠI các khoản thanh toán đã ghi SAU mốc tháng
//   (đảo ngược lịch sử thanh toán theo đúng debt_payments/receivable_payments), chỉ
//   tính khi đã phát sinh (>= start_date của khoản).
// - Danh mục đầu tư: replay số lượng nắm giữ tới cuối tháng, định giá theo GIÁ HIỆN TẠI.
//   Đây là điểm xấp xỉ duy nhất (không có dữ liệu giá lịch sử) và được nêu rõ trên UI.
//
// Snapshot thật trong net_worth_history luôn được ưu tiên; hàm này chỉ lấp khoảng trống.
export function computeNetWorthHistory(data, months, persistedHistory = []) {
  const monthList = Array.isArray(months) ? months : [];
  const transactions = (data && data.transactions) || [];
  const assets = (data && data.assets) || [];
  const assetTxns = (data && data.asset_transactions) || [];
  const accounts = (data && data.cash_accounts) || [];
  const liabilities = (data && data.liabilities) || [];
  const receivables = (data && data.receivables) || [];
  const debtPayments = (data && data.debt_payments) || [];
  const receivablePayments = (data && data.receivable_payments) || [];

  const persistedMap = new Map(
    (persistedHistory || [])
      .filter((entry) => entry && entry.month)
      .map((entry) => [entry.month, safeNumber(entry.net_worth ?? entry.value)]),
  );

  // "YYYY-MM" -> ngày cuối tháng dạng "YYYY-MM-DD" để so sánh chuỗi an toàn.
  const monthEnd = (monthKey) => {
    const [year, month] = String(monthKey).split("-").map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    return `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  };

  const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
  // Chuẩn hóa ngày để so sánh chuỗi ISO an toàn.
  // Ngày sai định dạng/để trống được coi là "phát sinh sớm" ("0000-00-00") thay vì bị
  // loại khỏi mọi tháng — nhờ đó đường tái dựng khớp với KPI live (vốn vẫn cộng giao dịch đó).
  const normalizeForCompare = (value) => {
    const str = String(value || "").slice(0, 10);
    return ISO_DATE.test(str) ? str : "0000-00-00";
  };

  // Số dư tài khoản tính tới hết ngày `asOf` (so sánh theo chuỗi ISO).
  const accountBalanceAsOf = (accountId, asOf) =>
    roundInt(
      transactions.reduce((sum, txn) => {
        if (normalizeForCompare(txn.date) > asOf) {
          return sum;
        }
        return sum + getAccountImpact(txn, accountId);
      }, 0),
    );

  return monthList.map((monthKey) => {
    if (persistedMap.has(monthKey)) {
      return { month: monthKey, value: roundInt(persistedMap.get(monthKey)), net_worth: roundInt(persistedMap.get(monthKey)), reconstructed: false };
    }

    const asOf = monthEnd(monthKey);
    const accountBalances = accounts.map((account) => ({
      type: account.type,
      balance: accountBalanceAsOf(account.id, asOf),
    }));

    const cash = roundInt(
      accountBalances.reduce((sum, account) => {
        if (["bank", "ewallet", "cash", "securities_cash", "investment", "derivative"].includes(account.type)) {
          return sum + account.balance;
        }
        return sum;
      }, 0),
    );
    const ccDebt = roundInt(
      accountBalances.reduce((sum, account) => {
        if (account.type === "credit_card" && account.balance < 0) {
          return sum + Math.abs(account.balance);
        }
        return sum;
      }, 0),
    );

    // Danh mục: replay giao dịch tài sản tới asOf, định giá theo giá hiện tại.
    const portfolio = roundInt(
      assets.reduce((sum, asset) => {
        const rowsUpToDate = assetTxns.filter(
          (txn) => txn.asset_id === asset.id && normalizeForCompare(txn.date) <= asOf,
        );
        return sum + computeAssetPosition(asset.id, rowsUpToDate, asset.current_price).currentValue;
      }, 0),
    );

    // Nợ tại thời điểm = dư hiện tại + các khoản gốc đã trả SAU mốc (đảo ngược lịch sử).
    // Mốc phát sinh: start_date nếu có, nếu không dùng created_at (tránh tính ngược vô tận quá khứ).
    const debts = roundInt(
      liabilities.reduce((sum, liability) => {
        const inception = liability.start_date || liability.created_at;
        if (inception && normalizeForCompare(inception) > asOf) {
          return sum; // khoản vay chưa phát sinh tại mốc này
        }
        const repaidAfter = debtPayments.reduce((acc, payment) => {
          if (payment.liability_id !== liability.id) {
            return acc;
          }
          return normalizeForCompare(payment.date) > asOf
            ? acc + safeNumber(payment.principal_amount)
            : acc;
        }, 0);
        return sum + safeNumber(liability.remaining_amount) + roundInt(repaidAfter);
      }, 0),
    );

    // Phải thu (đã chiết khấu) = dư hiện tại + khoản thu được SAU mốc, chiết khấu theo khả năng.
    // Mốc phát sinh: start_date nếu có, nếu không dùng created_at.
    const discountedReceivables = roundInt(
      receivables.reduce((sum, item) => {
        if (item.is_pledged) {
          return sum;
        }
        const inception = item.start_date || item.created_at;
        if (inception && normalizeForCompare(inception) > asOf) {
          return sum;
        }
        const collectedAfter = receivablePayments.reduce((acc, payment) => {
          if (payment.receivable_id !== item.id) {
            return acc;
          }
          return normalizeForCompare(payment.date) > asOf ? acc + safeNumber(payment.amount) : acc;
        }, 0);
        const remainingThen = safeNumber(item.remaining_amount) + roundInt(collectedAfter);
        const ratio = item.likelihood === "high" ? 1 : item.likelihood === "medium" ? 0.7 : 0.3;
        return sum + remainingThen * ratio;
      }, 0),
    );

    const value = roundInt(cash + portfolio + discountedReceivables - debts - ccDebt);
    return { month: monthKey, value, net_worth: value, reconstructed: true };
  });
}

// XIRR — tỷ suất sinh lời nội tại có tính thời gian (money-weighted, annualized).
// Đầu vào: mảng dòng tiền { date, amount } với quy ước: amount < 0 là tiền BỎ RA (mua/phí),
// amount > 0 là tiền THU VỀ (bán/cổ tức/giá trị hiện tại còn nắm giữ).
// Trả về tỷ lệ năm dạng số thập phân (0.12 = 12%/năm) hoặc null nếu không hội tụ/thiếu dữ liệu.
//
// Dùng Newton-Raphson, fallback sang bisection để ổn định. Không phụ thuộc dữ liệu giá lịch sử.
export function xirr(cashflows, options = {}) {
  const flows = (cashflows || [])
    .map((flow) => ({ date: toDateOnly(flow.date), amount: safeNumber(flow.amount) }))
    .filter((flow) => !Number.isNaN(flow.date.getTime()))
    .sort((left, right) => left.date.getTime() - right.date.getTime());

  if (flows.length < 2) {
    return null;
  }
  const hasNegative = flows.some((flow) => flow.amount < 0);
  const hasPositive = flows.some((flow) => flow.amount > 0);
  if (!hasNegative || !hasPositive) {
    return null; // cần ít nhất 1 dòng ra và 1 dòng vào
  }

  const t0 = flows[0].date.getTime();
  const yearFrac = (date) => (date.getTime() - t0) / (365 * ONE_DAY);

  const npv = (rate) =>
    flows.reduce((sum, flow) => {
      const base = 1 + rate;
      // tránh lũy thừa số âm
      if (base <= 0) {
        return sum + flow.amount * 1e9 * (yearFrac(flow.date) || 1);
      }
      return sum + flow.amount / base ** yearFrac(flow.date);
    }, 0);

  // Newton-Raphson
  let rate = safeNumber(options.guess) || 0.1;
  // Giới hạn hợp lý: tỷ suất năm trong [-99.99%, +100000%]. Ngoài khoảng này coi như
  // không có nghiệm hữu ích (dòng tiền bệnh lý/nhiều nghiệm) -> trả null.
  const RATE_CAP = 1000; // 1000 = +100000%/năm
  const sane = (value) => (value !== null && Number.isFinite(value) && value > -1 && value <= RATE_CAP ? value : null);
  for (let i = 0; i < 50; i += 1) {
    const base = 1 + rate;
    if (base <= 0) {
      break;
    }
    const f = npv(rate);
    // đạo hàm số
    const dRate = 1e-6;
    const df = (npv(rate + dRate) - f) / dRate;
    if (!Number.isFinite(df) || df === 0) {
      break;
    }
    const next = rate - f / df;
    if (!Number.isFinite(next)) {
      break;
    }
    if (Math.abs(next - rate) < 1e-7) {
      return Math.abs(npv(next)) < 1 ? sane(next) : sane(bisectIrr(npv));
    }
    rate = next;
  }
  return sane(bisectIrr(npv));
}

// Bisection an toàn trên khoảng [-0.9999, 10] (tức -99.99%/năm tới +1000%/năm).
function bisectIrr(npv) {
  let low = -0.9999;
  let high = 10;
  let fLow = npv(low);
  let fHigh = npv(high);
  if (!Number.isFinite(fLow) || !Number.isFinite(fHigh) || fLow * fHigh > 0) {
    return null; // không đổi dấu trong khoảng -> không tìm được nghiệm
  }
  for (let i = 0; i < 200; i += 1) {
    const mid = (low + high) / 2;
    const fMid = npv(mid);
    if (Math.abs(fMid) < 1 || (high - low) / 2 < 1e-7) {
      return mid;
    }
    if (fLow * fMid < 0) {
      high = mid;
      fHigh = fMid;
    } else {
      low = mid;
      fLow = fMid;
    }
  }
  return (low + high) / 2;
}

// XIRR cho một tài sản: dựng dòng tiền từ asset_transactions + giá trị hiện tại còn nắm giữ.
// BUY/REALLOCATE/FEE = tiền ra (âm); SELL/DIVIDEND/INTEREST = tiền vào (dương);
// cộng giá trị thị trường hiện tại của phần còn nắm giữ tại ngày hôm nay (dương).
// Trả về { annualized, totalInvested, totalReturned } hoặc null nếu không tính được.
export function computeAssetXirr(assetId, assetTxns, currentPrice, asOfDate) {
  const rows = (assetTxns || [])
    .filter((txn) => txn.asset_id === assetId)
    .slice()
    .sort((left, right) => String(left.date).localeCompare(String(right.date)));
  if (!rows.length) {
    return null;
  }

  const flows = [];
  rows.forEach((txn) => {
    const action = String(txn.action || "").toUpperCase();
    const quantity = safeNumber(txn.quantity);
    const price = safeNumber(txn.price);
    const fee = safeNumber(txn.fee);
    const totalCash = safeNumber(txn.total_cash);
    if (action === "BUY" || action === "REALLOCATE") {
      flows.push({ date: txn.date, amount: -(totalCash || roundInt(quantity * price + fee)) });
    } else if (action === "OPENING") {
      // Vốn gốc ban đầu coi như tiền ra tại ngày khai báo (định giá theo giá khai báo).
      flows.push({ date: txn.date, amount: -roundInt(quantity * price) });
    } else if (action === "SELL") {
      flows.push({ date: txn.date, amount: totalCash || roundInt(quantity * price - fee) });
    } else if (action === "DIVIDEND" || action === "INTEREST") {
      flows.push({ date: txn.date, amount: totalCash || roundInt(quantity * price) });
    } else if (action === "FEE") {
      flows.push({ date: txn.date, amount: -(totalCash || fee) });
    }
  });

  const position = computeAssetPosition(assetId, assetTxns, currentPrice);
  if (position.currentValue > 0) {
    flows.push({ date: asOfDate || todayIso(), amount: position.currentValue });
  }

  const annualized = xirr(flows);
  return {
    annualized,
    annualizedPct: annualized === null ? null : annualized * 100,
    totalInvested: position.totalInvested,
    totalReturned: position.totalReturned + position.currentValue,
  };
}
