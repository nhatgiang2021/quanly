import { BUCKET_PRESETS } from "./computations.js";

const MILLION = 1_000_000;

function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36).slice(-4)}`;
}

function toLocalDate(dateInput) {
  const date = new Date(dateInput);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftMonths(baseDate, offset) {
  const date = new Date(baseDate);
  date.setDate(1);
  date.setMonth(date.getMonth() + offset);
  return date;
}

function setDay(dateInput, day) {
  const date = new Date(dateInput);
  date.setDate(day);
  return date;
}

function createAnnualBudget(year, targetAnnualIncome, createdAt) {
  return {
    id: `budget-${year}`,
    year,
    target_annual_income: targetAnnualIncome,
    actual_annual_income: 0,
    is_setup: true,
    setup_date: createdAt,
    created_at: createdAt,
    buckets: BUCKET_PRESETS.map((bucket) => ({
      allocationId: bucket.id,
      monthlyData: [],
    })),
  };
}

export function createSampleData() {
  const today = new Date();
  const createdAt = toLocalDate(shiftMonths(today, -13));
  const currentYear = today.getFullYear();
  const prevYear = currentYear - 1;

  const accountIds = {
    agribank: "acc-agribank",
    techcombank: "acc-techcombank",
    ssi: "acc-ssi-waiting",
    momo: "acc-momo",
    cash: "acc-cash",
    visa: "acc-visa-techcombank",
    derivative: "acc-vndirect-derivative",
  };

  const assetIds = {
    vnm: "asset-vnm",
    vn30: "asset-vn30",
    fpt: "asset-fpt",
    realEstate: "asset-vhm-realestate",
    btc: "asset-bitcoin",
    hpg: "asset-hpg-closed",
    warrant: "asset-cw-mwg-bsc",
    gold: "asset-sjc",
    vcbSaving: "asset-vcb-6m",
    agriSaving: "asset-agribank-12m",
  };

  const liabilityIds = {
    mortgage: "liability-home-mortgage",
    car: "liability-car-loan",
  };

  const cash_accounts = [
    {
      id: accountIds.agribank,
      name: "Agribank",
      type: "bank",
      is_active: true,
      credit_limit: 0,
      statement_date: null,
      due_date: null,
      grace_period_days: 0,
      interest_rate_cc: 0,
      bank_name: "Agribank",
      broker: "",
      tracking_mode: "auto",
      last_updated: toLocalDate(today),
      notes: "Tài khoản chính cho khoản thu cho thuê và tiết kiệm.",
      created_at: createdAt,
    },
    {
      id: accountIds.techcombank,
      name: "Techcombank",
      type: "bank",
      is_active: true,
      credit_limit: 0,
      statement_date: null,
      due_date: null,
      grace_period_days: 0,
      interest_rate_cc: 0,
      bank_name: "Techcombank",
      broker: "",
      tracking_mode: "auto",
      last_updated: toLocalDate(today),
      notes: "Dòng tiền vận hành hằng tháng.",
      created_at: createdAt,
    },
    {
      id: accountIds.ssi,
      name: "SSI tiền chờ",
      type: "securities_cash",
      is_active: true,
      credit_limit: 0,
      statement_date: null,
      due_date: null,
      grace_period_days: 0,
      interest_rate_cc: 0,
      bank_name: "SSI",
      broker: "SSI",
      tracking_mode: "manual",
      last_updated: toLocalDate(shiftMonths(today, -2)),
      notes: "Tiền chờ giải ngân đầu tư cổ phiếu và ETF.",
      created_at: createdAt,
    },
    {
      id: accountIds.momo,
      name: "MoMo",
      type: "ewallet",
      is_active: true,
      credit_limit: 0,
      statement_date: null,
      due_date: null,
      grace_period_days: 0,
      interest_rate_cc: 0,
      bank_name: "MoMo",
      broker: "",
      tracking_mode: "auto",
      last_updated: toLocalDate(today),
      notes: "Thanh toán thường nhật.",
      created_at: createdAt,
    },
    {
      id: accountIds.cash,
      name: "Tiền mặt",
      type: "cash",
      is_active: true,
      credit_limit: 0,
      statement_date: null,
      due_date: null,
      grace_period_days: 0,
      interest_rate_cc: 0,
      bank_name: "",
      broker: "",
      tracking_mode: "manual",
      last_updated: toLocalDate(today),
      notes: "Quỹ tiền mặt gia đình.",
      created_at: createdAt,
    },
    {
      id: accountIds.visa,
      name: "Visa Techcombank",
      type: "credit_card",
      is_active: true,
      credit_limit: 80 * MILLION,
      statement_date: toLocalDate(setDay(today, 24)),
      due_date: toLocalDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 4)),
      grace_period_days: 20,
      interest_rate_cc: 29.5,
      bank_name: "Techcombank",
      broker: "",
      tracking_mode: "auto",
      last_updated: toLocalDate(today),
      notes: "Ưu tiên chi tiêu du lịch và online.",
      created_at: createdAt,
    },
    {
      id: accountIds.derivative,
      name: "VNDirect Phái sinh",
      type: "investment",
      is_active: true,
      credit_limit: 0,
      statement_date: null,
      due_date: null,
      grace_period_days: 0,
      interest_rate_cc: 0,
      bank_name: "",
      broker: "VNDirect",
      tracking_mode: "manual",
      last_updated: toLocalDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 43)),
      notes: "Theo dõi thủ công tài khoản ký quỹ phái sinh.",
      created_at: createdAt,
    },
  ];

  const transactions = [];

  const pushTransaction = (record) => {
    transactions.push({
      id: record.id || uid("txn"),
      created_at: record.created_at || record.date,
      notes: "",
      ...record,
    });
  };

  pushTransaction({
    id: "txn-opening-agribank",
    date: createdAt,
    type: "opening_balance",
    account_id: accountIds.agribank,
    amount: 1_600 * MILLION,
    category: "Vốn có sẵn",
    description: "Số dư nền tài khoản Agribank",
  });
  pushTransaction({
    id: "txn-opening-techcombank",
    date: createdAt,
    type: "opening_balance",
    account_id: accountIds.techcombank,
    amount: 1_150 * MILLION,
    category: "Vốn có sẵn",
    description: "Số dư nền tài khoản Techcombank",
  });
  pushTransaction({
    id: "txn-opening-ssi",
    date: createdAt,
    type: "opening_balance",
    account_id: accountIds.ssi,
    amount: 220 * MILLION,
    category: "Vốn có sẵn",
    description: "Tiền chờ đầu tư",
  });
  pushTransaction({
    id: "txn-opening-momo",
    date: createdAt,
    type: "opening_balance",
    account_id: accountIds.momo,
    amount: 8 * MILLION,
    category: "Vốn có sẵn",
    description: "Ví điện tử ban đầu",
  });
  pushTransaction({
    id: "txn-opening-cash",
    date: createdAt,
    type: "opening_balance",
    account_id: accountIds.cash,
    amount: 25 * MILLION,
    category: "Vốn có sẵn",
    description: "Tiền mặt ban đầu",
  });
  pushTransaction({
    id: "txn-opening-derivative",
    date: createdAt,
    type: "opening_balance",
    account_id: accountIds.derivative,
    amount: 75 * MILLION,
    category: "Vốn có sẵn",
    description: "Ký quỹ ban đầu",
  });

  const freelanceSeries = [48, 0, 56, 32, 45, 0, 62, 38, 52, 28, 0, 47, 59, 41];
  const passiveSeries = [2.1, 2.4, 2.3, 2.2, 2.8, 2.5, 2.7, 2.4, 2.9, 2.5, 2.6, 2.8, 3.0, 2.7];
  const rentSeries = Array(14).fill(8);

  freelanceSeries.forEach((amount, index) => {
    const monthDate = shiftMonths(today, index - 13);
    const monthIndex = index + 1;
    const monthLabel = `${monthDate.getMonth() + 1}/${monthDate.getFullYear()}`;

    if (amount > 0) {
      pushTransaction({
        date: toLocalDate(setDay(monthDate, 5)),
        type: "income",
        account_id: accountIds.techcombank,
        amount: amount * MILLION,
        category: "Freelance",
        description: `Dự án freelance tháng ${monthLabel}`,
        income_source: "Freelance",
        income_frequency: "irregular",
        trigger_allocation: true,
      });
    }

    pushTransaction({
      date: toLocalDate(setDay(monthDate, 11)),
      type: "income",
      account_id: accountIds.ssi,
      amount: Math.round(passiveSeries[index] * MILLION),
      category: "Đầu tư thụ động",
      description: `Coupon và cổ tức nền tháng ${monthLabel}`,
      income_source: "Đầu tư thụ động",
      income_frequency: "monthly",
      trigger_allocation: false,
    });

    pushTransaction({
      date: toLocalDate(setDay(monthDate, 19)),
      type: "income",
      account_id: accountIds.agribank,
      amount: rentSeries[index] * MILLION,
      category: "Cho thuê",
      description: `Thu tiền thuê căn hộ tháng ${monthLabel}`,
      income_source: "Cho thuê",
      income_frequency: "monthly",
      trigger_allocation: true,
    });

    const essentialBase = 14_000_000 + (index % 4) * 1_350_000;
    pushTransaction({
      date: toLocalDate(setDay(monthDate, 7)),
      type: "expense",
      account_id: accountIds.techcombank,
      amount: essentialBase,
      category: "Sinh hoạt gia đình",
      description: `Chi tiêu gia đình tháng ${monthLabel}`,
    });
    pushTransaction({
      date: toLocalDate(setDay(monthDate, 10)),
      type: "expense",
      account_id: accountIds.momo,
      amount: 1_850_000 + (index % 3) * 250_000,
      category: "Ăn uống",
      description: `Ăn uống tuần đầu tháng ${monthLabel}`,
    });
    pushTransaction({
      date: toLocalDate(setDay(monthDate, 14)),
      type: "expense",
      account_id: accountIds.visa,
      amount: 3_600_000 + (index % 4) * 420_000,
      category: "Mua sắm",
      description: `Chi thẻ tín dụng tháng ${monthLabel}`,
    });
    pushTransaction({
      date: toLocalDate(setDay(monthDate, 18)),
      type: "expense",
      account_id: accountIds.techcombank,
      amount: 2_100_000 + (index % 4) * 320_000,
      category: "Di chuyển",
      description: `Đi lại và xăng xe tháng ${monthLabel}`,
    });

    if (monthIndex % 2 === 0) {
      pushTransaction({
        date: toLocalDate(setDay(monthDate, 22)),
        type: "expense",
        account_id: accountIds.techcombank,
        amount: 3_200_000,
        category: "Học phí",
        description: `Học phí ngắn hạn tháng ${monthLabel}`,
      });
    }

    if (monthIndex % 3 === 0) {
      pushTransaction({
        date: toLocalDate(setDay(monthDate, 24)),
        type: "expense",
        account_id: accountIds.agribank,
        amount: 1_800_000,
        category: "Bảo hiểm",
        description: `Bảo hiểm định kỳ tháng ${monthLabel}`,
      });
    }

    pushTransaction({
      date: toLocalDate(setDay(monthDate, 2)),
      type: "transfer",
      from_account_id: accountIds.techcombank,
      to_account_id: accountIds.momo,
      amount: 2_500_000,
      category: "Nạp ví",
      description: `Nạp MoMo tháng ${monthLabel}`,
    });

    if (monthIndex % 2 === 1) {
      pushTransaction({
        date: toLocalDate(setDay(monthDate, 3)),
        type: "transfer",
        from_account_id: accountIds.techcombank,
        to_account_id: accountIds.cash,
        amount: 1_200_000,
        category: "Rút tiền mặt",
        description: `Rút tiền mặt tháng ${monthLabel}`,
      });
    }

    pushTransaction({
      date: toLocalDate(setDay(monthDate, 26)),
      type: "transfer",
      from_account_id: accountIds.techcombank,
      to_account_id: accountIds.visa,
      amount: 2_600_000 + (index % 3) * 250_000,
      category: "Thanh toán thẻ",
      description: `Thanh toán thẻ Visa tháng ${monthLabel}`,
    });
  });

  pushTransaction({
    id: "txn-loan-car",
    date: toLocalDate(setDay(shiftMonths(today, -11), 8)),
    type: "loan_disbursement",
    account_id: accountIds.techcombank,
    amount: 320 * MILLION,
    category: "Giải ngân ô tô",
    description: "Giải ngân khoản vay ô tô",
    liability_id: liabilityIds.car,
    trigger_allocation: false,
  });

  const assets = [
    {
      id: assetIds.vnm,
      name: "Vinamilk",
      ticker: "VNM",
      asset_type: "stock",
      bucket: "alloc_growth",
      exchange: "HOSE",
      current_price: 74_500,
      last_price_update: toLocalDate(today),
      interest_rate: 0,
      term_months: 0,
      start_date: toLocalDate(setDay(shiftMonths(today, -11), 16)),
      maturity_date: null,
      interest_type: "",
      auto_rollover: false,
      is_pledged: false,
      bank_name: "",
      underlying_asset: "",
      exercise_price: 0,
      expiry_date: "",
      conversion_ratio: 0,
      issuer: "",
      notes: "Cổ phiếu phòng thủ trả cổ tức.",
      created_at: createdAt,
    },
    {
      id: assetIds.vn30,
      name: "VN30 ETF",
      ticker: "E1VFVN30",
      asset_type: "etf",
      bucket: "alloc_growth",
      exchange: "HOSE",
      current_price: 17_200,
      last_price_update: toLocalDate(today),
      interest_rate: 0,
      term_months: 0,
      start_date: toLocalDate(setDay(shiftMonths(today, -10), 9)),
      maturity_date: null,
      interest_type: "",
      auto_rollover: false,
      is_pledged: false,
      bank_name: "",
      underlying_asset: "",
      exercise_price: 0,
      expiry_date: "",
      conversion_ratio: 0,
      issuer: "",
      notes: "ETF cốt lõi cho tăng trưởng dài hạn.",
      created_at: createdAt,
    },
    {
      id: assetIds.fpt,
      name: "FPT",
      ticker: "FPT",
      asset_type: "stock",
      bucket: "alloc_cf",
      exchange: "HOSE",
      current_price: 122_000,
      last_price_update: toLocalDate(today),
      interest_rate: 0,
      term_months: 0,
      start_date: toLocalDate(setDay(shiftMonths(today, -12), 12)),
      maturity_date: null,
      interest_type: "",
      auto_rollover: false,
      is_pledged: false,
      bank_name: "",
      underlying_asset: "",
      exercise_price: 0,
      expiry_date: "",
      conversion_ratio: 0,
      issuer: "",
      notes: "Cổ phiếu công nghệ tăng trưởng kèm cổ tức.",
      created_at: createdAt,
    },
    {
      id: assetIds.realEstate,
      name: "Vinhomes Ocean Park",
      ticker: "BĐS-VHM",
      asset_type: "real_estate",
      bucket: "alloc_cf",
      exchange: "Riêng",
      current_price: 2_850 * MILLION,
      last_price_update: toLocalDate(today),
      interest_rate: 0,
      term_months: 0,
      start_date: toLocalDate(setDay(shiftMonths(today, -13), 5)),
      maturity_date: null,
      interest_type: "",
      auto_rollover: false,
      is_pledged: false,
      bank_name: "",
      underlying_asset: "",
      exercise_price: 0,
      expiry_date: "",
      conversion_ratio: 0,
      issuer: "",
      notes: "Tài sản cho thuê mang dòng tiền ổn định.",
      created_at: createdAt,
    },
    {
      id: assetIds.btc,
      name: "Bitcoin",
      ticker: "BTC",
      asset_type: "crypto",
      bucket: "alloc_growth",
      exchange: "Binance",
      current_price: 1_920 * MILLION,
      last_price_update: toLocalDate(today),
      interest_rate: 0,
      term_months: 0,
      start_date: toLocalDate(setDay(shiftMonths(today, -8), 17)),
      maturity_date: null,
      interest_type: "",
      auto_rollover: false,
      is_pledged: false,
      bank_name: "",
      underlying_asset: "",
      exercise_price: 0,
      expiry_date: "",
      conversion_ratio: 0,
      issuer: "",
      notes: "Vị thế nhỏ cho tăng trưởng cao.",
      created_at: createdAt,
    },
    {
      id: assetIds.hpg,
      name: "Hòa Phát",
      ticker: "HPG",
      asset_type: "stock",
      bucket: "alloc_trade",
      exchange: "HOSE",
      current_price: 30_000,
      last_price_update: toLocalDate(today),
      interest_rate: 0,
      term_months: 0,
      start_date: toLocalDate(setDay(shiftMonths(today, -9), 3)),
      maturity_date: null,
      interest_type: "",
      auto_rollover: false,
      is_pledged: false,
      bank_name: "",
      underlying_asset: "",
      exercise_price: 0,
      expiry_date: "",
      conversion_ratio: 0,
      issuer: "",
      notes: "Một giao dịch đã đóng.",
      created_at: createdAt,
    },
    {
      id: assetIds.warrant,
      name: "CW MWG BSC",
      ticker: "CMWG2404",
      asset_type: "warrant",
      bucket: "alloc_trade",
      exchange: "HOSE",
      current_price: 1_850,
      last_price_update: toLocalDate(today),
      interest_rate: 0,
      term_months: 0,
      start_date: toLocalDate(setDay(shiftMonths(today, -1), 7)),
      maturity_date: "",
      interest_type: "",
      auto_rollover: false,
      is_pledged: false,
      bank_name: "",
      underlying_asset: "MWG",
      exercise_price: 58_000,
      expiry_date: toLocalDate(new Date(today.getFullYear(), today.getMonth() + 3, 14)),
      conversion_ratio: 5,
      issuer: "BSC",
      notes: "Chứng quyền còn 3 tháng tới đáo hạn.",
      created_at: createdAt,
    },
    {
      id: assetIds.gold,
      name: "SJC vàng miếng",
      ticker: "SJC",
      asset_type: "gold",
      bucket: "alloc_safe",
      exchange: "SJC",
      current_price: 7_850_000,
      last_price_update: toLocalDate(today),
      interest_rate: 0,
      term_months: 0,
      start_date: toLocalDate(setDay(shiftMonths(today, -4), 6)),
      maturity_date: null,
      interest_type: "",
      auto_rollover: false,
      is_pledged: false,
      bank_name: "",
      underlying_asset: "",
      exercise_price: 0,
      expiry_date: "",
      conversion_ratio: 0,
      issuer: "",
      notes: "Tài sản phòng thủ.",
      created_at: createdAt,
    },
    {
      id: assetIds.vcbSaving,
      name: "TK VCB 6T",
      ticker: "VCB-6T",
      asset_type: "savings",
      bucket: "alloc_safe",
      exchange: "VCB",
      current_price: 303_400_000,
      last_price_update: toLocalDate(today),
      interest_rate: 5.8,
      term_months: 6,
      start_date: toLocalDate(setDay(shiftMonths(today, -5), 20)),
      maturity_date: toLocalDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 15)),
      interest_type: "simple",
      auto_rollover: true,
      is_pledged: false,
      bank_name: "Vietcombank",
      underlying_asset: "",
      exercise_price: 0,
      expiry_date: "",
      conversion_ratio: 0,
      issuer: "",
      notes: "Sắp đáo hạn trong 15 ngày.",
      created_at: createdAt,
    },
    {
      id: assetIds.agriSaving,
      name: "TK Agribank 12T",
      ticker: "AGRI-12T",
      asset_type: "savings",
      bucket: "alloc_safe",
      exchange: "Agribank",
      current_price: 462_000_000,
      last_price_update: toLocalDate(today),
      interest_rate: 6.4,
      term_months: 12,
      start_date: toLocalDate(setDay(shiftMonths(today, -9), 11)),
      maturity_date: toLocalDate(new Date(today.getFullYear(), today.getMonth() + 5, today.getDate())),
      interest_type: "simple",
      auto_rollover: true,
      is_pledged: false,
      bank_name: "Agribank",
      underlying_asset: "",
      exercise_price: 0,
      expiry_date: "",
      conversion_ratio: 0,
      issuer: "",
      notes: "Tiền gửi dài hơn 30 ngày nên cần haircut khi tính quỹ khẩn cấp.",
      created_at: createdAt,
    },
  ];

  const asset_transactions = [];

  const pushAssetTxn = (record) => {
    asset_transactions.push({
      id: record.id || uid("asset-txn"),
      created_at: record.created_at || record.date,
      notes: "",
      ...record,
    });
  };

  const mirrorAssetCash = (record) => {
    if (record.action === "BUY") {
      pushTransaction({
        id: `${record.id}-cash`,
        date: record.date,
        type: "asset_purchase",
        account_id: record.account_id,
        amount: record.total_cash,
        category: "Đầu tư tài sản",
        description: `Mua ${record.asset_label}`,
        asset_id: record.asset_id,
        trigger_allocation: false,
      });
    }
    if (record.action === "SELL") {
      pushTransaction({
        id: `${record.id}-cash`,
        date: record.date,
        type: "asset_sale",
        to_account_id: record.account_id,
        amount: record.total_cash,
        category: "Thoái vốn",
        description: `Bán ${record.asset_label}`,
        asset_id: record.asset_id,
        trigger_allocation: false,
      });
    }
    if (record.action === "DIVIDEND" || record.action === "INTEREST") {
      pushTransaction({
        id: `${record.id}-cash`,
        date: record.date,
        type: "income",
        account_id: record.account_id,
        amount: record.total_cash,
        category: record.action === "DIVIDEND" ? "Cổ tức" : "Lãi tiết kiệm",
        description: `${record.action === "DIVIDEND" ? "Nhận cổ tức" : "Nhận lãi"} ${record.asset_label}`,
        asset_id: record.asset_id,
        income_source: record.action === "DIVIDEND" ? "Cổ tức" : "Lãi tiết kiệm",
        income_frequency: "irregular",
        trigger_allocation: false,
      });
    }
  };

  const assetLedgerRows = [
    {
      id: "asset-txn-vnm-buy-1",
      date: toLocalDate(setDay(shiftMonths(today, -11), 16)),
      asset_id: assetIds.vnm,
      asset_label: "VNM",
      action: "BUY",
      quantity: 1_200,
      price: 68_000,
      fee: 200_000,
      total_cash: 81_800_000,
      account_id: accountIds.ssi,
      notes: "Giải ngân nhịp 1",
    },
    {
      id: "asset-txn-vnm-buy-2",
      date: toLocalDate(setDay(shiftMonths(today, -7), 14)),
      asset_id: assetIds.vnm,
      asset_label: "VNM",
      action: "BUY",
      quantity: 800,
      price: 71_000,
      fee: 150_000,
      total_cash: 56_950_000,
      account_id: accountIds.ssi,
      notes: "Bổ sung khi điều chỉnh",
    },
    {
      id: "asset-txn-vnm-dividend",
      date: toLocalDate(setDay(shiftMonths(today, -1), 20)),
      asset_id: assetIds.vnm,
      asset_label: "VNM",
      action: "DIVIDEND",
      quantity: 1,
      price: 0,
      fee: 0,
      total_cash: 1_900_000,
      account_id: accountIds.ssi,
      notes: "Cổ tức tiền mặt",
    },
    {
      id: "asset-txn-vn30-buy",
      date: toLocalDate(setDay(shiftMonths(today, -10), 9)),
      asset_id: assetIds.vn30,
      asset_label: "VN30 ETF",
      action: "BUY",
      quantity: 5_000,
      price: 15_200,
      fee: 80_000,
      total_cash: 76_080_000,
      account_id: accountIds.ssi,
      notes: "Giữ lõi danh mục",
    },
    {
      id: "asset-txn-fpt-buy-1",
      date: toLocalDate(setDay(shiftMonths(today, -12), 12)),
      asset_id: assetIds.fpt,
      asset_label: "FPT",
      action: "BUY",
      quantity: 600,
      price: 95_000,
      fee: 120_000,
      total_cash: 57_120_000,
      account_id: accountIds.ssi,
      notes: "Mua theo nhịp nền",
    },
    {
      id: "asset-txn-fpt-buy-2",
      date: toLocalDate(setDay(shiftMonths(today, -6), 8)),
      asset_id: assetIds.fpt,
      asset_label: "FPT",
      action: "BUY",
      quantity: 500,
      price: 102_000,
      fee: 120_000,
      total_cash: 51_120_000,
      account_id: accountIds.ssi,
      notes: "DCA khi tích lũy",
    },
    {
      id: "asset-txn-fpt-sell",
      date: toLocalDate(setDay(shiftMonths(today, -1), 6)),
      asset_id: assetIds.fpt,
      asset_label: "FPT",
      action: "SELL",
      quantity: 400,
      price: 121_000,
      fee: 100_000,
      total_cash: 48_300_000,
      account_id: accountIds.ssi,
      notes: "Chốt lời một phần",
    },
    {
      id: "asset-txn-fpt-dividend",
      date: toLocalDate(setDay(shiftMonths(today, -2), 16)),
      asset_id: assetIds.fpt,
      asset_label: "FPT",
      action: "DIVIDEND",
      quantity: 1,
      price: 0,
      fee: 0,
      total_cash: 1_100_000,
      account_id: accountIds.ssi,
      notes: "Cổ tức giữa năm",
    },
    {
      id: "asset-txn-realestate-buy",
      date: toLocalDate(setDay(shiftMonths(today, -13), 5)),
      asset_id: assetIds.realEstate,
      asset_label: "Vinhomes Ocean Park",
      action: "BUY",
      quantity: 1,
      price: 2_450 * MILLION,
      fee: 0,
      total_cash: 2_450 * MILLION,
      account_id: accountIds.techcombank,
      notes: "Mua căn hộ cho thuê",
    },
    {
      id: "asset-txn-btc-buy",
      date: toLocalDate(setDay(shiftMonths(today, -8), 17)),
      asset_id: assetIds.btc,
      asset_label: "Bitcoin",
      action: "BUY",
      quantity: 0.35,
      price: 1_540 * MILLION,
      fee: 3 * MILLION,
      total_cash: 542 * MILLION,
      account_id: accountIds.techcombank,
      notes: "Vị thế tăng trưởng cao",
    },
    {
      id: "asset-txn-hpg-buy",
      date: toLocalDate(setDay(shiftMonths(today, -9), 3)),
      asset_id: assetIds.hpg,
      asset_label: "HPG",
      action: "BUY",
      quantity: 2_000,
      price: 25_000,
      fee: 100_000,
      total_cash: 50_100_000,
      account_id: accountIds.ssi,
      notes: "Trade ngắn hạn",
    },
    {
      id: "asset-txn-hpg-sell",
      date: toLocalDate(setDay(shiftMonths(today, -5), 27)),
      asset_id: assetIds.hpg,
      asset_label: "HPG",
      action: "SELL",
      quantity: 2_000,
      price: 30_000,
      fee: 100_000,
      total_cash: 59_900_000,
      account_id: accountIds.ssi,
      notes: "Đóng vị thế",
    },
    {
      id: "asset-txn-cw-buy",
      date: toLocalDate(setDay(shiftMonths(today, -1), 7)),
      asset_id: assetIds.warrant,
      asset_label: "CW MWG BSC",
      action: "BUY",
      quantity: 20_000,
      price: 2_100,
      fee: 80_000,
      total_cash: 42_080_000,
      account_id: accountIds.ssi,
      notes: "Vị thế trading theo sóng",
    },
    {
      id: "asset-txn-gold-buy",
      date: toLocalDate(setDay(shiftMonths(today, -4), 6)),
      asset_id: assetIds.gold,
      asset_label: "SJC",
      action: "BUY",
      quantity: 10,
      price: 7_200_000,
      fee: 0,
      total_cash: 72_000_000,
      account_id: accountIds.techcombank,
      notes: "Tăng tỷ trọng phòng thủ",
    },
    {
      id: "asset-txn-vcb-buy",
      date: toLocalDate(setDay(shiftMonths(today, -5), 20)),
      asset_id: assetIds.vcbSaving,
      asset_label: "TK VCB 6T",
      action: "BUY",
      quantity: 1,
      price: 300 * MILLION,
      fee: 0,
      total_cash: 300 * MILLION,
      account_id: accountIds.techcombank,
      notes: "Gửi 6 tháng",
    },
    {
      id: "asset-txn-vcb-interest",
      date: toLocalDate(setDay(shiftMonths(today, -1), 24)),
      asset_id: assetIds.vcbSaving,
      asset_label: "TK VCB 6T",
      action: "INTEREST",
      quantity: 1,
      price: 0,
      fee: 0,
      total_cash: 2_900_000,
      account_id: accountIds.techcombank,
      notes: "Lãi cộng dồn kỳ gần nhất",
    },
    {
      id: "asset-txn-agri-buy",
      date: toLocalDate(setDay(shiftMonths(today, -9), 11)),
      asset_id: assetIds.agriSaving,
      asset_label: "TK Agribank 12T",
      action: "BUY",
      quantity: 1,
      price: 450 * MILLION,
      fee: 0,
      total_cash: 450 * MILLION,
      account_id: accountIds.agribank,
      notes: "Gửi 12 tháng",
    },
    {
      id: "asset-txn-agri-interest",
      date: toLocalDate(setDay(shiftMonths(today, -2), 24)),
      asset_id: assetIds.agriSaving,
      asset_label: "TK Agribank 12T",
      action: "INTEREST",
      quantity: 1,
      price: 0,
      fee: 0,
      total_cash: 12_000_000,
      account_id: accountIds.agribank,
      notes: "Lãi tạm tính 9 tháng",
    },
  ];

  assetLedgerRows.forEach((row) => {
    pushAssetTxn(row);
    mirrorAssetCash(row);
  });

  const liabilities = [
    {
      id: liabilityIds.mortgage,
      name: "Vay mua nhà",
      type: "mortgage",
      total_amount: 1_800 * MILLION,
      remaining_amount: 1_420 * MILLION,
      interest_rate: 7.9,
      monthly_payment: 18_000_000,
      start_date: `${prevYear - 1}-03-15`,
      end_date: `${currentYear + 11}-03-15`,
      notes: "Khoản vay thế chấp lãi suất thả nổi.",
      created_at: createdAt,
    },
    {
      id: liabilityIds.car,
      name: "Vay ô tô",
      type: "car_loan",
      total_amount: 500 * MILLION,
      remaining_amount: 275 * MILLION,
      interest_rate: 9.4,
      monthly_payment: 11_200_000,
      start_date: `${prevYear}-05-10`,
      end_date: `${currentYear + 2}-05-10`,
      notes: "Khoản vay phương tiện cá nhân.",
      created_at: createdAt,
    },
  ];

  const debt_payments = [];
  const paymentMonths = [shiftMonths(today, -2), shiftMonths(today, -1), today];
  const interestSteps = [9_350_000, 9_210_000, 9_040_000];
  const principalSteps = [8_650_000, 8_790_000, 8_960_000];

  paymentMonths.forEach((paymentDate, index) => {
    const totalPayment = interestSteps[index] + principalSteps[index];
    debt_payments.push({
      id: `debt-payment-${index + 1}`,
      date: toLocalDate(setDay(paymentDate, 25)),
      liability_id: liabilityIds.mortgage,
      from_account_id: accountIds.techcombank,
      total_payment: totalPayment,
      principal_amount: principalSteps[index],
      interest_amount: interestSteps[index],
      notes: "Thanh toán thế chấp định kỳ",
      created_at: toLocalDate(setDay(paymentDate, 25)),
    });
    pushTransaction({
      id: `txn-debt-${index + 1}`,
      date: toLocalDate(setDay(paymentDate, 25)),
      type: "expense",
      account_id: accountIds.techcombank,
      amount: totalPayment,
      category: "Trả nợ vay",
      description: `Thanh toán vay mua nhà kỳ ${index + 1}`,
      liability_id: liabilityIds.mortgage,
    });
  });

  const receivables = [
    {
      id: "recv-friend-loan",
      name: "Khoản cho vay Minh Anh",
      type: "personal_loan",
      counterparty: "Nguyễn Minh Anh",
      original_amount: 120 * MILLION,
      remaining_amount: 80 * MILLION,
      start_date: toLocalDate(setDay(shiftMonths(today, -7), 12)),
      expected_return_date: toLocalDate(setDay(shiftMonths(today, 4), 20)),
      is_secured: false,
      likelihood: "medium",
      is_pledged: false,
      notes: "Khoản cho vay cá nhân cần chiết khấu 70%.",
      created_at: createdAt,
    },
  ];

  pushTransaction({
    id: "txn-recv-loan-out",
    date: toLocalDate(setDay(shiftMonths(today, -7), 12)),
    type: "expense",
    account_id: accountIds.techcombank,
    amount: 120 * MILLION,
    category: "Cho vay",
    description: "Cho vay: Khoản cho vay Minh Anh",
    receivable_id: "recv-friend-loan",
    trigger_allocation: false,
  });

  const receivable_payments = [
    {
      id: "recv-payment-1",
      receivable_id: "recv-friend-loan",
      date: toLocalDate(setDay(shiftMonths(today, -3), 15)),
      amount: 20 * MILLION,
      to_account_id: accountIds.techcombank,
      notes: "Trả lần 1",
      created_at: createdAt,
    },
    {
      id: "recv-payment-2",
      receivable_id: "recv-friend-loan",
      date: toLocalDate(setDay(shiftMonths(today, -1), 10)),
      amount: 20 * MILLION,
      to_account_id: accountIds.techcombank,
      notes: "Trả lần 2",
      created_at: createdAt,
    },
  ];

  pushTransaction({
    id: "txn-recv-collect-1",
    date: receivable_payments[0].date,
    type: "income",
    account_id: accountIds.techcombank,
    amount: receivable_payments[0].amount,
    category: "Thu hồi nợ",
    description: "Thu nợ Khoản cho vay Minh Anh",
    receivable_id: "recv-friend-loan",
    trigger_allocation: false,
  });
  pushTransaction({
    id: "txn-recv-collect-2",
    date: receivable_payments[1].date,
    type: "income",
    account_id: accountIds.techcombank,
    amount: receivable_payments[1].amount,
    category: "Thu hồi nợ",
    description: "Thu nợ Khoản cho vay Minh Anh",
    receivable_id: "recv-friend-loan",
    trigger_allocation: false,
  });

  const allocation_rules = [
    {
      id: "alloc-default",
      is_active: true,
      created_at: createdAt,
      buckets: BUCKET_PRESETS.map((bucket) => ({ ...bucket })),
    },
  ];

  const annual_budgets = [
    createAnnualBudget(prevYear, 690 * MILLION, `${prevYear}-01-03`),
    createAnnualBudget(currentYear, 760 * MILLION, `${currentYear}-01-03`),
  ];

  const goals = [
    {
      id: "goal-apartment-2027",
      name: "Mua căn hộ 2027",
      type: "asset_purchase",
      target_amount: 3_500 * MILLION,
      deadline: `${currentYear + 1}-12-31`,
      priority: "high",
      linked_sources: [
        {
          id: "goal-source-tech-full",
          type: "account",
          source_id: accountIds.techcombank,
          label: "Techcombank",
          include_full_balance: true,
          share_percentage: 100,
          current_value: 0,
          monthly_contribution: 10 * MILLION,
        },
        {
          id: "goal-source-btc",
          type: "asset",
          source_id: assetIds.btc,
          label: "Bitcoin",
          include_full_balance: false,
          share_percentage: 40,
          current_value: 0,
          monthly_contribution: 5 * MILLION,
        },
      ],
      notes: "Mục tiêu mua căn hộ thứ hai cuối 2027.",
      created_at: createdAt,
    },
    {
      id: "goal-emergency",
      name: "Quỹ khẩn cấp",
      type: "emergency_fund",
      target_amount: 360 * MILLION,
      deadline: `${currentYear}-12-31`,
      priority: "high",
      linked_sources: [
        {
          id: "goal-source-tech-dup",
          type: "account",
          source_id: accountIds.techcombank,
          label: "Techcombank",
          include_full_balance: true,
          share_percentage: 100,
          current_value: 0,
          monthly_contribution: 0,
        },
        {
          id: "goal-source-vcb-safe",
          type: "asset",
          source_id: assetIds.vcbSaving,
          label: "TK VCB 6T",
          include_full_balance: true,
          share_percentage: 100,
          current_value: 0,
          monthly_contribution: 0,
        },
      ],
      notes: "Mục tiêu bao phủ 6 tháng chi phí thiết yếu.",
      created_at: createdAt,
    },
  ];

  const recurring_templates = [
    {
      id: "recurring-salary",
      name: "Lương",
      type: "income",
      amount: 25 * MILLION,
      category: "Lương",
      frequency: "monthly",
      default_account_id: accountIds.techcombank,
      notes: "Mẫu thu nhập cố định nếu cần nhập nhanh.",
      created_at: createdAt,
    },
    {
      id: "recurring-rent",
      name: "Tiền nhà",
      type: "income",
      amount: 8 * MILLION,
      category: "Cho thuê",
      frequency: "monthly",
      default_account_id: accountIds.agribank,
      notes: "Thu tiền thuê căn hộ.",
      created_at: createdAt,
    },
    {
      id: "recurring-tuition",
      name: "Học phí",
      type: "expense",
      amount: 3_200_000,
      category: "Học phí",
      frequency: "bimonthly",
      default_account_id: accountIds.techcombank,
      notes: "Khóa học ngắn hạn định kỳ.",
      created_at: createdAt,
    },
    {
      id: "recurring-insurance",
      name: "Bảo hiểm",
      type: "expense",
      amount: 1_800_000,
      category: "Bảo hiểm",
      frequency: "quarterly",
      default_account_id: accountIds.agribank,
      notes: "Bảo hiểm sức khỏe gia đình.",
      created_at: createdAt,
    },
  ];

  const reinvest_rules = [
    {
      id: "reinvest-dividend-growth",
      name: "Tái đầu tư cổ tức tăng trưởng",
      source: "Cổ tức",
      target_bucket: "alloc_growth",
      min_amount: 5 * MILLION,
      created_at: createdAt,
    },
  ];

  const netWorthValues = [4_120, 4_180, 4_260, 4_310, 4_430, 4_520, 4_610, 4_560, 4_730, 4_810, 4_920];
  const net_worth_history = netWorthValues.map((value, index) => {
    const monthDate = shiftMonths(today, index - 11);
    return {
      id: `nw-${index + 1}`,
      month: toLocalDate(setDay(monthDate, 1)).slice(0, 7),
      snapshot_date: toLocalDate(setDay(monthDate, 28)),
      net_worth: value * MILLION,
      created_at: toLocalDate(setDay(monthDate, 28)),
    };
  });

  const user_settings = {
    income_mode: "irregular",
    rolling_window: 6,
    min_allocation_trigger: 10 * MILLION,
    passive_income_default: 12 * MILLION,
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
    income_categories: ["Freelance", "Đầu tư thụ động", "Cho thuê", "Cổ tức", "Lãi tiết kiệm", "Lương"],
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
    created_at: createdAt,
  };

  return {
    cash_accounts,
    transactions,
    assets,
    asset_transactions,
    liabilities,
    debt_payments,
    receivables,
    receivable_payments,
    allocation_rules,
    annual_budgets,
    goals,
    recurring_templates,
    reinvest_rules,
    net_worth_history,
    user_settings,
  };
}
