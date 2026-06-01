// Module: ai-entry | Trách nhiệm: phân tích câu nhập liệu tiếng Việt thành dữ liệu
// tài chính có cấu trúc (schema chặt). KHÔNG tự lưu — chỉ trả về kết quả để UI preview.
//
// Hai lớp:
//   1) parseFinancialInput(text, context)        -> parser DETERMINISTIC, không cần mạng.
//   2) parseFinancialInputWithAI(text, cfg, ctx)  -> gọi DeepSeek/OpenAI-compatible API nếu
//      người dùng đã cấu hình API key; thất bại sẽ fallback sang parser deterministic.
//
// Schema kết quả (luôn trả về đủ field, kể cả null):
// {
//   intent: "add_asset" | "add_transaction" | "transfer" | "debt_payment"
//         | "income" | "expense" | "update_value" | "unknown",
//   amount: number | null,
//   currency: string,            // mặc định "VND"
//   asset_name: string | null,
//   account: string | null,
//   from_account: string | null,
//   to_account: string | null,
//   date: "YYYY-MM-DD",
//   category: string | null,
//   note: string,
//   confidence: number,          // 0..1
//   missing_fields: string[],
//   warnings: string[],
//   _source: "local" | "ai",
// }

const VALID_INTENTS = [
  "add_asset",
  "add_transaction",
  "transfer",
  "debt_payment",
  "income",
  "expense",
  "update_value",
  "unknown",
];

const DEFAULT_AI_BASE_URL = "https://api.deepseek.com/v1";
const DEFAULT_AI_MODEL = "deepseek-v4-flash";

function todayIso(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

function emptyResult(now = new Date()) {
  return {
    intent: "unknown",
    amount: null,
    currency: "VND",
    asset_name: null,
    quantity: null,
    price: null,
    account: null,
    from_account: null,
    to_account: null,
    date: todayIso(now),
    category: null,
    note: "",
    confidence: 0,
    missing_fields: [],
    warnings: [],
    _source: "local",
  };
}

// ── Parse số tiền tiếng Việt: "20 triệu", "1,5 tỷ", "5tr", "120 triệu", "500k", "45000000" ──
// Trả về { amount, matchedText } hoặc null.
export function parseVietnameseAmount(text) {
  const lower = String(text || "").toLowerCase();

  // Chuẩn hóa: bỏ dấu phân tách hàng nghìn kiểu "20.000.000" và "20,000,000"
  // nhưng GIỮ dấu thập phân "1,5" / "1.5". Xử lý theo cụm có đơn vị trước.
  const unitPatterns = [
    { re: /(\d+(?:[.,]\d+)?)\s*(tỷ|ty|tỉ)(?![a-zà-ỹ])/i, mult: 1e9 },
    { re: /(\d+(?:[.,]\d+)?)\s*(triệu|trieu|tr)(?![a-zà-ỹ])/i, mult: 1e6 },
    { re: /(\d+(?:[.,]\d+)?)\s*(nghìn|nghin|ngàn|ngan|k)(?![a-zà-ỹ])/i, mult: 1e3 },
  ];
  for (const { re, mult } of unitPatterns) {
    const m = lower.match(re);
    if (m) {
      const numeric = Number(m[1].replace(",", "."));
      if (Number.isFinite(numeric)) {
        return { amount: Math.round(numeric * mult), matchedText: m[0] };
      }
    }
  }

  // Số nguyên lớn có/không dấu phân tách: "45000000", "45.000.000", "45,000,000"
  const grouped = lower.match(/\b\d{1,3}(?:[.,]\d{3})+\b/);
  if (grouped) {
    const numeric = Number(grouped[0].replace(/[.,]/g, ""));
    if (Number.isFinite(numeric)) {
      return { amount: numeric, matchedText: grouped[0] };
    }
  }
  const plain = lower.match(/\b\d{4,}\b/); // >= 1000 mới coi là số tiền
  if (plain) {
    const numeric = Number(plain[0]);
    if (Number.isFinite(numeric)) {
      return { amount: numeric, matchedText: plain[0] };
    }
  }
  return null;
}

// ── Phát hiện tiền tệ ──
export function detectCurrency(text) {
  const lower = String(text || "").toLowerCase();
  if (/\b(usd|đô la|dollar|\$)\b/.test(lower)) return "USD";
  if (/\b(eur|euro|€)\b/.test(lower)) return "EUR";
  if (/\b(vàng|chỉ vàng|cây vàng|lượng vàng)\b/.test(lower)) return "VND"; // vàng vẫn định giá VND
  return "VND";
}

// ── Phát hiện ngày: "hôm nay", "hôm qua", "ngày 5/3", "05/03/2026", "2026-03-05" ──
export function detectDate(text, now = new Date()) {
  const lower = String(text || "").toLowerCase();
  if (/\bhôm qua\b/.test(lower)) {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    return todayIso(d);
  }
  // ISO
  const iso = lower.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) {
    return `${iso[1]}-${iso[2]}-${iso[3]}`;
  }
  // d/m hoặc d/m/yyyy
  const dmy = lower.match(/\b(\d{1,2})[/](\d{1,2})(?:[/](\d{2,4}))?\b/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    let year = dmy[3] ? Number(dmy[3]) : now.getFullYear();
    if (year < 100) year += 2000;
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }
  return todayIso(now);
}

// ── Khớp tên tài khoản/tài sản với danh sách thực (fuzzy nhẹ, không dấu) ──
function stripDiacritics(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function matchByName(text, candidates) {
  // candidates: [{ id, name }]; trả về { id, name } khớp tốt nhất hoặc null.
  const haystack = stripDiacritics(text);
  let best = null;
  for (const cand of candidates || []) {
    const needle = stripDiacritics(cand.name);
    if (!needle) continue;
    if (haystack.includes(needle)) {
      if (!best || needle.length > stripDiacritics(best.name).length) {
        best = cand;
      }
    }
  }
  return best;
}

// ── Phát hiện intent từ từ khóa ──
function detectIntent(text) {
  const lower = stripDiacritics(text);
  // Ưu tiên cụ thể trước
  if (/(tra no|tra the|thanh toan the|tra goc|tra lai)/.test(lower)) return "debt_payment";
  // Mua/thêm tài sản (có động từ rõ ràng) ưu tiên trước update_value.
  if (/(mua|them tai san|so huu|tau)/.test(lower) && /(vang|chung chi quy|co phieu|etf|bitcoin|btc|trai phieu|bat dong san|nha|dat|tiet kiem)/.test(lower))
    return "add_asset";
  // "100 cổ phiếu FPT", "2 cây vàng", "1000 ccq" — số lượng + đơn vị tài sản (kể cả không có động từ).
  // Đặt trước update_value để "100 cp FPT giá 120k" không bị hiểu nhầm là cập nhật giá.
  if (/\d+\s*(co phieu|cp|ccq|chung chi quy|cay|chi|luong)\b/.test(lower)) return "add_asset";
  // Cập nhật/định giá lại tài sản: "cập nhật căn hộ lên 4.2 tỷ", "định giá lại nhà".
  if (/(cap nhat gia|dinh gia lai|gia hien tai|cap nhat.*(len|gia|thanh)|.*(len|gia) \d)/.test(lower) && /(can ho|nha|dat|chung cu|vang|co phieu|etf|quy|bitcoin|btc|crypto|bat dong san)/.test(lower))
    return "update_value";
  if (/^cap nhat /.test(lower)) return "update_value";
  if (/(chuyen|chuyen khoan|chuyen vao|nap vao|chuyen tien)/.test(lower)) return "transfer";
  if (/(luong|thu nhap|nhan tien|duoc tra|tien thuong|co tuc|lai)/.test(lower)) return "income";
  if (/(chi|mua|tra tien|thanh toan|an uong|cafe|xang|hoa don)/.test(lower)) return "expense";
  return "unknown";
}

// ── Phát hiện category gợi ý ──
function detectCategory(text, intent) {
  const lower = stripDiacritics(text);
  // Dùng \b để tránh khớp nhầm chuỗi con (vd "com" trong "techcombank").
  const expenseMap = [
    [/\b(an uong|nha hang|com tam|pho|cafe|ca phe)\b/, "Ăn uống"],
    [/\b(xang|di lai|grab|taxi)\b/, "Di chuyển"],
    [/\b(dien nuoc|internet|hoa don)\b/, "Điện nước"],
    [/\b(hoc phi)\b/, "Học phí"],
    [/\b(bao hiem)\b/, "Bảo hiểm"],
    [/\b(tra no|tra goc|tra the)\b/, "Trả nợ vay"],
  ];
  const incomeMap = [
    [/\b(luong)\b/, "Lương"],
    [/\b(co tuc)\b/, "Cổ tức"],
    [/\b(lai tiet kiem|lai ngan hang)\b/, "Lãi tiết kiệm"],
    [/\b(freelance|du an)\b/, "Freelance"],
    [/\b(cho thue|tien thue)\b/, "Cho thuê"],
  ];
  if (intent === "income") {
    for (const [re, cat] of incomeMap) if (re.test(lower)) return cat;
    return null;
  }
  if (intent === "debt_payment") {
    return "Trả nợ vay";
  }
  if (intent === "expense") {
    for (const [re, cat] of expenseMap) if (re.test(lower)) return cat;
    return null;
  }
  // intent khác (transfer/asset/...): chỉ gợi ý nếu khớp rõ income
  for (const [re, cat] of incomeMap) if (re.test(lower)) return cat;
  return null;
}

// ── Phát hiện loại tài sản từ câu ──
function detectAssetName(text) {
  const lower = stripDiacritics(text);
  if (/(cay vang|chi vang|luong vang|vang mieng|sjc|vang)/.test(lower)) return "Vàng";
  if (/(chung chi quy|ccq)/.test(lower)) return "Chứng chỉ quỹ";
  if (/(etf|e1vfvn30|vn30)/.test(lower)) return "ETF";
  if (/(bitcoin|btc|eth|crypto|tien so)/.test(lower)) return "Crypto";
  if (/(trai phieu)/.test(lower)) return "Trái phiếu";
  if (/(bat dong san|nha|dat|can ho|chung cu)/.test(lower)) return "Bất động sản";
  if (/(tiet kiem|so tiet kiem)/.test(lower)) return "Tiết kiệm";
  return null;
}

// ── Phát hiện số lượng + giá cho câu mua tài sản: "100 cổ phiếu FPT giá 120k",
//    "mua 1000 VNM giá 50000", "2 cây vàng giá 120 triệu" ──
// Trả về { quantity, price, ticker } (mỗi field có thể null).
export function detectQuantityPriceTicker(text) {
  const result = { quantity: null, price: null, ticker: null };
  const raw = String(text || "");
  const lower = stripDiacritics(raw);

  // Giá: ưu tiên cụm sau từ "giá" / "@" ; nếu không có thì để parser amount xử lý riêng.
  const priceMatch = raw.match(/(?:giá|gia|@)\s*([\d.,]+\s*(?:tỷ|ty|tỉ|triệu|trieu|tr|nghìn|nghin|ngàn|ngan|k)?)/i);
  if (priceMatch) {
    const p = parseVietnameseAmount(priceMatch[1]);
    if (p) result.price = p.amount;
  }

  // Số lượng: số đứng trước đơn vị tài sản (cổ phiếu/cp/ccq/cây/chỉ/lượng/đơn vị) hoặc trước mã.
  const qtyUnit = lower.match(/(\d+(?:[.,]\d+)?)\s*(co phieu|cp|ccq|chung chi quy|cay|chi|luong|don vi|co|cf)\b/);
  if (qtyUnit) {
    const n = Number(qtyUnit[1].replace(",", "."));
    if (Number.isFinite(n)) result.quantity = n;
  }

  // Mã chứng khoán: cụm IN HOA 2-5 ký tự (FPT, VNM, HPG, E1VFVN30...) trong câu gốc.
  // Bỏ qua mã tiền tệ và một số từ viết hoa không phải mã.
  const EXCLUDE_TICKERS = new Set(["VND", "USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "CNY", "ETF", "CCQ", "BĐS", "BDS"]);
  const tickerMatches = raw.match(/\b[A-Z]{2,5}\d{0,4}\b/g) || [];
  for (const cand of tickerMatches) {
    if (!EXCLUDE_TICKERS.has(cand)) {
      result.ticker = cand;
      break;
    }
  }

  return result;
}

export function parseFinancialInput(text, context = {}, now = new Date()) {
  const result = emptyResult(now);
  result.note = String(text || "").trim();
  const raw = String(text || "").trim();
  if (!raw) {
    result.warnings.push("Câu nhập trống.");
    result.missing_fields = ["intent", "amount"];
    return result;
  }

  const accounts = context.accounts || [];
  const intent = detectIntent(raw);
  result.intent = intent;

  // Amount
  const amountMatch = parseVietnameseAmount(raw);
  if (amountMatch) {
    result.amount = amountMatch.amount;
  }

  // Với transfer trong câu ghép ("nhận lương 45tr, chuyển 15tr vào tiết kiệm"),
  // ưu tiên số tiền NẰM SAU từ khóa chuyển để không lấy nhầm số của vế thu nhập.
  if (intent === "transfer") {
    const lowerRaw = stripDiacritics(raw);
    const kwMatch = lowerRaw.match(/\b(chuyen|nap)\b/);
    if (kwMatch && kwMatch.index !== undefined) {
      const tail = raw.slice(kwMatch.index);
      const tailAmount = parseVietnameseAmount(tail);
      if (tailAmount) {
        result.amount = tailAmount.amount;
      }
    }
  }

  // Currency
  result.currency = detectCurrency(raw);

  // Date
  result.date = detectDate(raw, now);

  // Category
  result.category = detectCategory(raw, intent);

  // Asset
  if (intent === "add_asset" || intent === "update_value") {
    result.asset_name =
      matchByName(raw, context.assets || [])?.name || detectAssetName(raw) || null;
    const qpt = detectQuantityPriceTicker(raw);
    result.quantity = qpt.quantity;
    // Nếu nêu rõ giá (sau "giá"), dùng làm price; amount tổng vẫn giữ nếu có.
    if (qpt.price !== null) {
      result.price = qpt.price;
    }
    // Mã chứng khoán rõ ràng -> dùng làm tên tài sản nếu chưa khớp được tên cụ thể.
    if (qpt.ticker && (!result.asset_name || ["ETF", "Chứng chỉ quỹ"].includes(result.asset_name))) {
      result.asset_name = qpt.ticker;
    }

    if (intent === "update_value") {
      // Cập nhật giá: số tiền trong câu chính là GIÁ MỚI của tài sản, không phải "amount giao dịch".
      if (result.price === null && result.amount !== null) {
        result.price = result.amount;
      }
      // amount không có ý nghĩa với update_value -> để null để không nhầm là dòng tiền.
      result.amount = null;
    } else {
      // add_asset: suy luận amount/price/qty cho nhau.
      if (result.quantity !== null && result.price !== null) {
        result.amount = Math.round(result.quantity * result.price);
      } else if (result.amount === null && result.price !== null) {
        result.amount = result.price;
      } else if (result.price === null && result.amount !== null && result.quantity) {
        result.price = Math.round(result.amount / result.quantity);
      }
    }
  }

  // Accounts: tìm tất cả tài khoản được nhắc tới
  const mentioned = (accounts || []).filter((acc) => stripDiacritics(raw).includes(stripDiacritics(acc.name)));
  if (intent === "transfer") {
    // "chuyển X vào Y" — tài khoản đầu là nguồn, sau "vào/đến/sang" là đích
    const lower = stripDiacritics(raw);
    const splitIdx = lower.search(/\b(vao|den|sang|toi)\b/);
    if (mentioned.length >= 2 && splitIdx >= 0) {
      result.from_account = mentioned[0].name;
      result.to_account = mentioned[1].name;
    } else if (mentioned.length === 1) {
      // chỉ rõ một đầu — đoán theo từ khóa
      if (/\b(vao|den|sang|toi)\b/.test(lower)) {
        result.to_account = mentioned[0].name;
      } else {
        result.from_account = mentioned[0].name;
      }
    }
  } else if (intent === "debt_payment") {
    result.from_account = mentioned[0]?.name || null;
  } else if (intent === "income") {
    result.account = mentioned[0]?.name || null;
  } else if (intent === "expense" || intent === "add_asset") {
    result.account = mentioned[0]?.name || null;
  } else {
    result.account = mentioned[0]?.name || null;
  }

  // ── Tính confidence + missing/warnings ──
  computeConfidenceAndGaps(result);
  return result;
}

// Tách câu ghép thành nhiều mệnh đề và parse từng phần thành nhiều giao dịch.
// Ví dụ: "Nhận lương 45 triệu vào Techcombank, chuyển 15 triệu vào tiết kiệm"
//   -> [ income 45tr, transfer 15tr ].
// Quy tắc tách: theo dấu phẩy/chấm phẩy hoặc liên từ "và / rồi / sau đó / xong".
// Chỉ giữ mệnh đề có chứa số tiền (để bỏ qua phần dẫn nhập không có giao dịch).
// Luôn trả về mảng (ít nhất 1 phần tử). Mệnh đề sau kế thừa ngày của câu gốc.
export function parseFinancialInputMulti(text, context = {}, now = new Date()) {
  const raw = String(text || "").trim();
  if (!raw) {
    return [parseFinancialInput(raw, context, now)];
  }

  // Tách theo dấu phẩy, chấm phẩy, hoặc liên từ. Giữ nguyên dấu để mỗi mệnh đề độc lập.
  const clauses = raw
    .split(/\s*[,;]\s*|\s+(?:và|rồi|sau đó|sau do|xong)\s+/i)
    .map((c) => c.trim())
    .filter(Boolean);

  // Chỉ những mệnh đề có số tiền mới coi là một giao dịch riêng.
  const withAmount = clauses.filter((c) => parseVietnameseAmount(c) !== null);

  // Nếu chỉ có 0-1 mệnh đề có tiền -> coi như câu đơn (giữ ngữ cảnh đầy đủ câu gốc).
  if (withAmount.length <= 1) {
    return [parseFinancialInput(raw, context, now)];
  }

  // Ngày của cả câu (mệnh đề đầu thường chứa "hôm nay/hôm qua/ngày...").
  const baseDate = detectDate(raw, now);
  return withAmount.map((clause) => {
    const parsed = parseFinancialInput(clause, context, now);
    // Mệnh đề con có thể không nhắc ngày -> kế thừa ngày câu gốc.
    if (parsed.date === todayIso(now) && baseDate !== todayIso(now)) {
      parsed.date = baseDate;
      computeConfidenceAndGaps(parsed);
    }
    return parsed;
  });
}

// Tính confidence dựa trên độ đầy đủ field theo intent, đồng thời điền missing_fields/warnings.
export function computeConfidenceAndGaps(result) {
  const missing = [];
  const warnings = [];
  let score = 0;
  let total = 0;

  const need = (field, present, label) => {
    total += 1;
    if (present) score += 1;
    else missing.push(label || field);
  };

  if (result.intent === "unknown") {
    warnings.push("Không xác định được loại thao tác. Vui lòng chọn lại trong preview.");
  }

  // amount cần cho mọi intent trừ update_value (chỉ cần price mới)
  if (result.intent !== "update_value") {
    need("amount", result.amount !== null && result.amount > 0, "amount");
  }
  if (result.amount !== null && result.amount <= 0) {
    warnings.push("Số tiền phải lớn hơn 0.");
  }

  if (result.intent === "transfer") {
    need("from_account", Boolean(result.from_account), "from_account");
    need("to_account", Boolean(result.to_account), "to_account");
    if (result.from_account && result.to_account && result.from_account === result.to_account) {
      warnings.push("Tài khoản nguồn và đích đang trùng nhau.");
    }
  } else if (result.intent === "debt_payment") {
    need("from_account", Boolean(result.from_account), "from_account");
  } else if (result.intent === "add_asset") {
    need("asset_name", Boolean(result.asset_name), "asset_name");
  } else if (result.intent === "update_value") {
    need("asset_name", Boolean(result.asset_name), "asset_name");
    need("price", result.price !== null && result.price > 0, "price");
  } else if (result.intent === "income" || result.intent === "expense") {
    need("account", Boolean(result.account), "account");
  }

  if (!result.currency) {
    missing.push("currency");
  }
  if (result.currency && result.currency !== "VND") {
    warnings.push(`Tiền tệ ${result.currency}: app hiện tính theo VND, hãy kiểm tra quy đổi trước khi lưu.`);
  }

  // Date hợp lệ?
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(result.date))) {
    missing.push("date");
    warnings.push("Ngày không hợp lệ.");
  }

  result.missing_fields = missing;
  result.warnings = warnings;
  // confidence: tỉ lệ field bắt buộc có + phạt nếu intent unknown
  let confidence = total > 0 ? score / total : 0.5;
  if (result.intent === "unknown") confidence = Math.min(confidence, 0.3);
  if (result.amount === null && result.intent !== "update_value") confidence = Math.min(confidence, 0.4);
  result.confidence = Math.round(confidence * 100) / 100;
  return result;
}

// Chuẩn hóa/đảm bảo schema của output AI (phòng khi model trả thiếu field hoặc sai kiểu).
export function normalizeParsedResult(obj, now = new Date()) {
  const base = emptyResult(now);
  const out = { ...base, ...(obj && typeof obj === "object" ? obj : {}) };
  if (!VALID_INTENTS.includes(out.intent)) out.intent = "unknown";
  out.amount = out.amount === null || out.amount === undefined ? null : Number(out.amount);
  if (out.amount !== null && !Number.isFinite(out.amount)) out.amount = null;
  out.quantity = out.quantity === null || out.quantity === undefined ? null : Number(out.quantity);
  if (out.quantity !== null && !Number.isFinite(out.quantity)) out.quantity = null;
  out.price = out.price === null || out.price === undefined ? null : Number(out.price);
  if (out.price !== null && !Number.isFinite(out.price)) out.price = null;
  out.currency = String(out.currency || "VND").toUpperCase();
  out.asset_name = out.asset_name ? String(out.asset_name) : null;
  out.account = out.account ? String(out.account) : null;
  out.from_account = out.from_account ? String(out.from_account) : null;
  out.to_account = out.to_account ? String(out.to_account) : null;
  out.date = /^\d{4}-\d{2}-\d{2}$/.test(String(out.date)) ? out.date : todayIso(now);
  out.category = out.category ? String(out.category) : null;
  out.note = String(out.note || "");
  out.missing_fields = Array.isArray(out.missing_fields) ? out.missing_fields.map(String) : [];
  out.warnings = Array.isArray(out.warnings) ? out.warnings.map(String) : [];
  // Luôn tính lại confidence/gaps theo dữ liệu thực tế để nhất quán giữa local & AI.
  computeConfidenceAndGaps(out);
  return out;
}

// System prompt yêu cầu AI trả về JSON đúng schema. Tách riêng để test/đọc dễ.
export const AI_ENTRY_SYSTEM_PROMPT = `
Bạn là bộ phân tích câu nhập liệu tài chính tiếng Việt. Nhiệm vụ: chuyển câu của người dùng
thành MỘT object JSON theo schema sau và CHỈ trả về JSON, không giải thích:

{
  "intent": "add_asset|add_transaction|transfer|debt_payment|income|expense|update_value|unknown",
  "amount": number | null,
  "currency": "VND|USD|EUR|...",
  "asset_name": string | null,
  "quantity": number | null,
  "price": number | null,
  "account": string | null,
  "from_account": string | null,
  "to_account": string | null,
  "date": "YYYY-MM-DD",
  "category": string | null,
  "note": string,
  "confidence": number,
  "missing_fields": string[],
  "warnings": string[]
}

Quy tắc:
- Số tiền tiếng Việt: "20 triệu" = 20000000, "1,5 tỷ" = 1500000000, "500k" = 500000.
- Với mua tài sản dạng "100 cổ phiếu FPT giá 120k": quantity=100, price=120000, amount=quantity*price.
- Nếu không có ngày, dùng ngày hôm nay.
- Đơn vị mặc định là VND.
- KHÔNG bịa số liệu. Field nào không chắc thì để null và thêm vào missing_fields.
- confidence trong khoảng 0..1.
`.trim();

// Gọi AI provider nếu có API key; fallback parser deterministic khi lỗi.
// cfg: { ai_api_key, ai_base_url, ai_model }. context: { accounts, assets }.
export async function parseFinancialInputWithAI(text, cfg = {}, context = {}, deps = {}) {
  const fetchImpl = deps.fetch || (typeof fetch !== "undefined" ? fetch : null);
  const now = deps.now || new Date();
  const apiKey = String(cfg.ai_api_key || "").trim();

  if (!apiKey || !fetchImpl) {
    const local = parseFinancialInput(text, context, now);
    local._source = "local";
    return local;
  }

  try {
    const baseUrl = (cfg.ai_base_url || DEFAULT_AI_BASE_URL).replace(/\/$/, "");
    const accountsHint = (context.accounts || []).map((a) => a.name).join(", ");
    const assetsHint = (context.assets || []).map((a) => a.name).join(", ");
    const userPrompt = `Câu nhập: "${text}"
Ngày hôm nay: ${todayIso(now)}
Danh sách tài khoản hiện có: ${accountsHint || "(trống)"}
Danh sách tài sản hiện có: ${assetsHint || "(trống)"}
Trả về đúng JSON schema đã mô tả.`;

    const response = await fetchImpl(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.ai_model || DEFAULT_AI_MODEL,
        messages: [
          { role: "system", content: AI_ENTRY_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      throw new Error(`AI HTTP ${response.status}`);
    }
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || "";
    const jsonText = extractJson(content);
    const parsed = JSON.parse(jsonText);
    const normalized = normalizeParsedResult(parsed, now);
    normalized._source = "ai";
    if (!normalized.note) normalized.note = String(text || "").trim();
    return normalized;
  } catch (error) {
    // Fallback an toàn: dùng parser local, kèm cảnh báo.
    const local = parseFinancialInput(text, context, now);
    local._source = "local";
    local.warnings = [...local.warnings, `Không gọi được AI (${error.message}); đã dùng bộ phân tích cục bộ.`];
    return local;
  }
}

// Trích JSON object đầu tiên từ chuỗi (model đôi khi bọc trong ```json ... ```).
function extractJson(content) {
  const fenced = String(content).match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const brace = String(content).match(/\{[\s\S]*\}/);
  if (brace) return brace[0];
  return String(content).trim();
}

// Phiên bản đa giao dịch: tách câu ghép rồi parse từng mệnh đề (qua AI nếu có key).
// Trả về mảng kết quả (ít nhất 1). Dùng cho UI khi người dùng nhập câu ghép.
export async function parseFinancialInputWithAIMulti(text, cfg = {}, context = {}, deps = {}) {
  const now = deps.now || new Date();
  const raw = String(text || "").trim();

  // Dùng cùng logic tách của parser cục bộ để xác định có phải câu ghép không.
  const localParts = parseFinancialInputMulti(raw, context, now);
  if (localParts.length <= 1) {
    const single = await parseFinancialInputWithAI(raw, cfg, context, deps);
    return [single];
  }

  // Câu ghép: tách lại thành mệnh đề có tiền, parse từng phần qua AI/local.
  const clauses = raw
    .split(/\s*[,;]\s*|\s+(?:và|rồi|sau đó|sau do|xong)\s+/i)
    .map((c) => c.trim())
    .filter((c) => c && parseVietnameseAmount(c) !== null);
  const baseDate = detectDate(raw, now);

  const results = [];
  for (const clause of clauses) {
    const parsed = await parseFinancialInputWithAI(clause, cfg, context, deps);
    if (parsed.date === todayIso(now) && baseDate !== todayIso(now)) {
      parsed.date = baseDate;
      computeConfidenceAndGaps(parsed);
    }
    results.push(parsed);
  }
  return results.length ? results : [await parseFinancialInputWithAI(raw, cfg, context, deps)];
}
