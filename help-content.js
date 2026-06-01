// Module: help-content | Trách nhiệm: kho tri thức "Hỏi cách dùng app" + tìm kiếm rule-based.
// Nội dung BÁM SÁT docs/user-guide.md. Chạy hoàn toàn cục bộ (không gửi dữ liệu ra ngoài).
// Nếu câu hỏi ngoài phạm vi guide -> trả về thông báo chuẩn, KHÔNG bịa tính năng.

export const OUT_OF_SCOPE_MESSAGE =
  "Mình chưa thấy nội dung này trong hướng dẫn hiện tại.";

// Mỗi chủ đề: id, section (tham chiếu guide), tiêu đề, keywords (không dấu), câu trả lời ngắn.
export const HELP_TOPICS = [
  {
    id: "what-is-app",
    section: "1. App này dùng để làm gì",
    title: "App này dùng để làm gì",
    keywords: ["app de lam gi", "ung dung de lam gi", "muc dich", "dung de lam gi", "app nay la gi"],
    answer:
      "App giúp theo dõi toàn cảnh tài chính cá nhân: tài sản (cổ phiếu, vàng, BĐS, tiết kiệm...), " +
      "nợ, dòng tiền thu/chi, phân bổ tài sản và tài sản ròng (net worth) theo thời gian. Dữ liệu lưu " +
      "ngay trên trình duyệt của bạn.",
  },
  {
    id: "net-worth",
    section: "2. Các khái niệm chính",
    title: "Net worth (tài sản ròng) là gì",
    keywords: ["net worth", "tai san rong", "gia tri rong", "net worth nghia la gi"],
    answer:
      "Tài sản ròng (net worth) = tổng tài sản − tổng nợ. Trang Tổng Quan hiển thị net worth hiện tại " +
      "và đường biến động 12 tháng (được dựng lại từ sổ giao dịch).",
  },
  {
    id: "allocation",
    section: "2. Các khái niệm chính + 6. Đọc dashboard",
    title: "Phân bổ tài sản (allocation)",
    keywords: ["phan bo tai san", "allocation", "ty trong", "co cau tai san", "phan bo theo lop"],
    answer:
      "Phân bổ tài sản là tỷ trọng theo lớp tài sản (tiền mặt, cổ phiếu, BĐS, tiết kiệm, vàng, crypto, " +
      "phải thu) và theo 4 hũ đầu tư (Tăng trưởng, Dòng tiền, Lướt sóng, Bảo đảm). Xem ở trang Tổng Quan " +
      "(thanh 'Phân bổ theo lớp tài sản' và biểu đồ tròn 'Phân bổ danh mục').",
  },
  {
    id: "account-vs-asset",
    section: "2. Các khái niệm chính",
    title: "Tài khoản, tài sản, nợ, giao dịch khác nhau thế nào",
    keywords: ["tai khoan", "tai san", "no", "giao dich", "khac nhau", "khai niem", "account", "asset", "liability", "transaction"],
    answer:
      "Tài khoản = nơi giữ tiền (ngân hàng, ví, tiền mặt, thẻ tín dụng); số dư tính tự động từ giao dịch. " +
      "Tài sản = thứ có giá trị bạn nắm giữ (cổ phiếu, vàng, BĐS...). Nợ = khoản phải trả. " +
      "Giao dịch = một lần tiền vào/ra (thu, chi, chuyển khoản, cho vay, thu hồi nợ...).",
  },
  {
    id: "currency",
    section: "2 + 7. Tiền tệ",
    title: "App hỗ trợ ngoại tệ không",
    keywords: ["currency", "tien te", "ngoai te", "usd", "do la", "doi tien", "quy doi"],
    answer:
      "App hiện chỉ tính theo VND. Nếu nhập số tiền ngoại tệ, hãy quy đổi về VND trước khi lưu. " +
      "Khi nhập bằng AI mà câu có ngoại tệ, app sẽ cảnh báo và chặn lưu cho tới khi bạn đổi về VND.",
  },
  {
    id: "add-asset",
    section: "4 + 5. Nhập tài sản",
    title: "Làm sao nhập tài sản mới",
    keywords: ["nhap tai san", "them tai san", "tao tai san", "add asset", "nhap tai san moi", "lam sao nhap tai san"],
    answer:
      "Cách 1: vào trang 'Danh Mục ĐT' → nút '+ Tài sản', điền tên, loại tài sản, hũ phân bổ, giá hiện tại. " +
      "Cách 2: bấm '✨ AI nhập' và gõ ví dụ '100 cổ phiếu FPT giá 120k' → kiểm tra preview → xác nhận; " +
      "app sẽ mở biểu mẫu tài sản điền sẵn để bạn bổ sung số lượng/hũ rồi lưu.",
  },
  {
    id: "add-transaction",
    section: "3 + 4. Nhập giao dịch",
    title: "Làm sao nhập giao dịch mới",
    keywords: ["nhap giao dich", "them giao dich", "ghi thu chi", "nhap thu chi", "add transaction", "lam sao nhap giao dich"],
    answer:
      "Bấm '+ Giao dịch' ở góc trên phải hoặc nút '+ Giao dịch mới' trong trang Thu Chi. Chọn loại " +
      "(thu/chi/chuyển khoản...), nhập ngày, số tiền, tài khoản và danh mục, rồi Lưu. Hoặc dùng '✨ AI nhập' " +
      "để gõ câu tự nhiên.",
  },
  {
    id: "buy-sell-stock",
    section: "4. Giao dịch tài sản",
    title: "Làm sao ghi mua/bán cổ phiếu",
    keywords: ["mua co phieu", "ban co phieu", "giao dich tai san", "mua ban", "buy sell", "co tuc", "tach co phieu"],
    answer:
      "Vào 'Danh Mục ĐT' → tab 'Giao dịch' → '+ Giao dịch tài sản'. Chọn tài sản, hành động " +
      "(BUY/SELL/DIVIDEND/...), số lượng, giá, phí, tài khoản tiền. Giao dịch tài sản phức tạp nên nhập " +
      "thủ công thay vì dùng AI.",
  },
  {
    id: "ai-entry",
    section: "5. Nhập liệu bằng AI",
    title: "Làm sao dùng AI nhập liệu",
    keywords: ["ai nhap lieu", "dung ai", "nhap bang ai", "cau tu nhien", "ai nhap", "lam sao dung ai nhap lieu", "ai parse"],
    answer:
      "Bấm '✨ AI nhập' (trên topbar, trang Thu Chi hoặc Danh Mục ĐT). Gõ câu tiếng Việt như " +
      "'Nhận lương 45 triệu vào Techcombank' hoặc câu ghép 'nhận lương 45 triệu, chuyển 15 triệu vào tiết kiệm'. " +
      "App phân tích thành thẻ preview để bạn kiểm tra và sửa, rồi bấm 'Xác nhận & lưu'. AI không tự lưu.",
  },
  {
    id: "ai-good-examples",
    section: "5. Nhập liệu bằng AI",
    title: "Ví dụ câu nhập liệu AI tốt",
    keywords: ["vi du ai", "cau mau", "vi du tot", "vi du cau nhap", "cau nhap mau"],
    answer:
      "Ví dụ tốt: 'Nhận lương 45 triệu vào Techcombank'; 'Trả nợ thẻ tín dụng 5 triệu từ Techcombank'; " +
      "'100 cổ phiếu FPT giá 120k'; câu ghép 'nhận lương 45 triệu, chuyển 15 triệu vào tiết kiệm'. " +
      "Nêu rõ số tiền + loại thao tác + tài khoản để độ tin cậy cao.",
  },
  {
    id: "check-before-save",
    section: "7. An toàn dữ liệu",
    title: "Tôi cần kiểm tra gì trước khi lưu",
    keywords: ["kiem tra truoc khi luu", "truoc khi luu", "can kiem tra gi", "xac nhan", "kiem tra preview"],
    answer:
      "Trước khi lưu hãy kiểm tra: số tiền (> 0), ngày, tài khoản nguồn/đích, danh mục, và tiền tệ phải là VND. " +
      "Trong preview AI, field chưa chắc bị tô đỏ và có thanh độ tin cậy. Dữ liệu chỉ ghi khi bạn bấm 'Xác nhận & lưu'.",
  },
  {
    id: "ai-no-autosave",
    section: "7. An toàn dữ liệu",
    title: "AI có tự lưu dữ liệu không",
    keywords: ["ai tu luu", "ai co luu khong", "tu dong luu", "auto save", "ai co tu luu"],
    answer:
      "Không. AI chỉ tạo bản preview; dữ liệu tài chính chỉ được ghi khi bạn xác nhận. Nếu AI hiểu sai, " +
      "bạn sửa trực tiếp trên thẻ preview, bấm '← Sửa câu', hoặc đóng và nhập thủ công.",
  },
  {
    id: "read-dashboard",
    section: "6. Đọc dashboard",
    title: "Dashboard này đọc thế nào",
    keywords: ["doc dashboard", "dashboard the nao", "tong quan", "doc bang dieu khien", "xem dashboard", "dashboard nay doc the nao"],
    answer:
      "Trang Tổng Quan có: thẻ Tài sản ròng + đường 12 tháng; Tổng tài sản; Tổng nợ; Thu/Chi tháng " +
      "(kèm thặng dư/thâm hụt); thanh 'Phân bổ theo lớp tài sản'; biểu đồ tròn 'Phân bổ danh mục'; " +
      "Giao dịch gần đây và Tài sản nổi bật.",
  },
  {
    id: "performance-xirr",
    section: "6. Đọc dashboard (performance)",
    title: "Xem hiệu suất / XIRR ở đâu",
    keywords: ["hieu suat", "performance", "xirr", "loi nhuan", "lai lo", "ty suat sinh loi"],
    answer:
      "Vào 'Danh Mục ĐT' → tab 'Tài sản'. Cột 'XIRR/năm' là tỷ suất sinh lời theo thời gian (money-weighted, " +
      "năm hóa) của từng tài sản, cùng cột lãi/lỗ đã thực hiện và chưa thực hiện.",
  },
  {
    id: "daily-flow",
    section: "3. Quy trình hằng ngày",
    title: "Quy trình dùng hằng ngày",
    keywords: ["quy trinh", "hang ngay", "dung hang ngay", "thuong xuyen", "review dinh ky"],
    answer:
      "Hằng ngày: ghi giao dịch ngay khi phát sinh (+ Giao dịch hoặc ✨ AI nhập). Định kỳ: cập nhật giá tài sản " +
      "(Danh Mục ĐT → tab Tài sản → nút Giá), xem dashboard Tổng Quan, và review trang Báo Cáo / Ngân Sách.",
  },
  {
    id: "backup",
    section: "7. An toàn dữ liệu",
    title: "Sao lưu / khôi phục dữ liệu",
    keywords: ["sao luu", "backup", "xuat json", "import json", "khoi phuc", "luu du lieu o dau"],
    answer:
      "Vào Cài Đặt → 'Xuất JSON' để tải bản sao lưu, hoặc 'Import JSON' để khôi phục. Dữ liệu lưu trong " +
      "trình duyệt (localStorage) nên hãy xuất JSON định kỳ. Cài Đặt cũng có 'Nhật ký thay đổi' ghi lại sửa/xóa.",
  },
  {
    id: "lending",
    section: "8. FAQ",
    title: "Cho vay / thu hồi nợ có tính là thu chi không",
    keywords: ["cho vay", "thu hoi no", "lending", "collection", "co tinh thu chi"],
    answer:
      "Không. Cho vay và thu hồi nợ làm thay đổi số dư tài khoản nhưng không tính vào thu nhập/chi tiêu " +
      "sinh hoạt.",
  },
  {
    id: "debt-payment",
    section: "8. FAQ",
    title: "Trả nợ thẻ tín dụng nhập thế nào",
    keywords: ["tra no the", "tra no the tin dung", "thanh toan the", "tra no", "debt payment"],
    answer:
      "Dùng '✨ AI nhập' với câu như 'Trả nợ thẻ tín dụng 5 triệu từ Techcombank', hoặc nhập một giao dịch " +
      "chi tiêu và liên kết khoản nợ tương ứng. Kiểm tra preview rồi xác nhận.",
  },
  {
    id: "troubleshoot-save",
    section: "9. Troubleshooting",
    title: "Không lưu được dữ liệu",
    keywords: ["khong luu duoc", "loi luu", "khong save", "bao loi do", "luu that bai"],
    answer:
      "Xem báo lỗi đỏ. Thường gặp: số tiền ≤ 0 với thu/chi, ngày sai định dạng (cần YYYY-MM-DD), thiếu tài khoản, " +
      "hoặc chuyển khoản trùng tài khoản nguồn/đích. Sửa field bị báo rồi lưu lại.",
  },
  {
    id: "troubleshoot-dashboard",
    section: "9. Troubleshooting",
    title: "Dashboard không cập nhật",
    keywords: ["dashboard khong cap nhat", "khong cap nhat", "so lieu cu", "chua thay doi"],
    answer:
      "Dashboard tính lại sau mỗi lần lưu. Nếu mở nhiều tab cùng lúc, hãy tải lại trang để đồng bộ dữ liệu mới nhất.",
  },
  {
    id: "duplicate-data",
    section: "9. Troubleshooting",
    title: "Dữ liệu trùng hoặc sai / xóa nhầm",
    keywords: ["du lieu trung", "du lieu sai", "xoa nham", "trung lap", "sua xoa", "lien ket mo coi"],
    answer:
      "Xóa giao dịch sai trong trang Thu Chi; với mua/bán tài sản, sửa/xóa trong 'Danh Mục ĐT' → tab 'Giao dịch'. " +
      "Xem 'Nhật ký thay đổi' trong Cài Đặt, hoặc khôi phục từ bản JSON đã xuất. Import file lỗi sẽ báo 'liên kết mồ côi'.",
  },
];

// Gợi ý câu hỏi mẫu hiển thị trong panel.
export const HELP_SAMPLE_QUESTIONS = [
  "Làm sao nhập tài sản mới?",
  "Làm sao dùng AI nhập liệu?",
  "Tôi cần kiểm tra gì trước khi lưu?",
  "Net worth nghĩa là gì?",
  "Dashboard này đọc thế nào?",
];

function stripDiacritics(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d");
}

// Cho điểm mức khớp giữa câu hỏi và một topic.
// Tách riêng điểm keyword (mạnh, đặc trưng) và điểm title (yếu) để áp ngưỡng chặt.
function scoreTopic(normQuestion, topic) {
  let keywordScore = 0;
  let titleScore = 0;
  for (const kw of topic.keywords) {
    const nk = stripDiacritics(kw);
    if (!nk) continue;
    if (normQuestion.includes(nk)) {
      keywordScore += Math.min(5, nk.split(/\s+/).length + 2);
    }
  }
  // Bỏ qua các từ quá phổ biến để tránh khớp nhầm (app, lam, sao, the nao...).
  const STOPWORDS = new Set([
    "app", "lam", "sao", "the", "nao", "gi", "cua", "toi", "minh", "co", "khong",
    "cho", "trong", "voi", "nhu", "duoc", "can", "thi", "la", "va", "hay", "mot",
  ]);
  const titleWords = stripDiacritics(topic.title).split(/\s+/).filter((w) => w.length >= 3 && !STOPWORDS.has(w));
  const qWords = new Set(normQuestion.split(/\s+/).filter((w) => w.length >= 3 && !STOPWORDS.has(w)));
  for (const w of titleWords) {
    if (qWords.has(w)) titleScore += 1;
  }
  return { keywordScore, titleScore, total: keywordScore + titleScore };
}

/**
 * Tìm câu trả lời cho câu hỏi của người dùng dựa trên kho tri thức (bám guide).
 * Trả về:
 *   { matched: true, topic, answer, related: [{id,title}] }  khi tìm thấy
 *   { matched: false, answer: OUT_OF_SCOPE_MESSAGE, related: [...] }  khi ngoài phạm vi
 */
export function searchHelp(question, topics = HELP_TOPICS) {
  const normQuestion = stripDiacritics(question);
  if (!normQuestion.trim()) {
    return {
      matched: false,
      answer: "Bạn hãy nhập một câu hỏi về cách dùng app (ví dụ: 'Làm sao nhập tài sản mới?').",
      related: HELP_SAMPLE_QUESTIONS.map((q) => ({ title: q })),
    };
  }

  const ranked = topics
    .map((topic) => ({ topic, ...scoreTopic(normQuestion, topic) }))
    .filter((x) => x.total > 0)
    .sort((a, b) => b.total - a.total);

  // Ngưỡng: phải có ít nhất 1 cụm keyword khớp (keywordScore > 0) HOẶC khớp >= 2 từ tiêu đề.
  // Tránh khớp nhầm câu ngoài phạm vi chỉ vì trùng một từ chung.
  const accepted = ranked.filter((x) => x.keywordScore > 0 || x.titleScore >= 2);

  if (!accepted.length) {
    return {
      matched: false,
      answer: OUT_OF_SCOPE_MESSAGE,
      related: HELP_TOPICS.slice(0, 5).map((t) => ({ id: t.id, title: t.title })),
    };
  }

  const best = accepted[0].topic;
  const related = accepted.slice(1, 4).map((x) => ({ id: x.topic.id, title: x.topic.title }));
  return {
    matched: true,
    topic: best,
    answer: best.answer,
    section: best.section,
    related,
  };
}
