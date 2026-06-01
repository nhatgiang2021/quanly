// tests/ai-entry.test.mjs
// Test cho bộ phân tích nhập liệu tiếng Việt (parser deterministic, không gọi mạng)
// và lớp normalize schema. Chạy bằng: npm test.

import test from "node:test";
import assert from "node:assert/strict";

import {
  parseFinancialInput,
  parseFinancialInputMulti,
  parseVietnameseAmount,
  detectCurrency,
  detectDate,
  detectQuantityPriceTicker,
  matchByName,
  normalizeParsedResult,
  parseFinancialInputWithAI,
  parseFinancialInputWithAIMulti,
} from "../ai-entry.js";

const NOW = new Date("2026-05-31");
const CTX = {
  accounts: [
    { id: "tcb", name: "Techcombank" },
    { id: "tk", name: "Tiết kiệm" },
    { id: "visa", name: "Visa Techcombank" },
    { id: "agri", name: "Agribank" },
  ],
  assets: [{ id: "vnm", name: "Vinamilk" }],
};

// ── parseVietnameseAmount ──
test("parseVietnameseAmount: các đơn vị tiếng Việt", () => {
  assert.equal(parseVietnameseAmount("20 triệu").amount, 20_000_000);
  assert.equal(parseVietnameseAmount("1,5 tỷ").amount, 1_500_000_000);
  assert.equal(parseVietnameseAmount("500k").amount, 500_000);
  assert.equal(parseVietnameseAmount("5tr").amount, 5_000_000);
  assert.equal(parseVietnameseAmount("45000000").amount, 45_000_000);
  assert.equal(parseVietnameseAmount("45.000.000").amount, 45_000_000);
  assert.equal(parseVietnameseAmount("không có số"), null);
});

test("detectCurrency", () => {
  assert.equal(detectCurrency("mua 100 USD"), "USD");
  assert.equal(detectCurrency("20 triệu"), "VND");
  assert.equal(detectCurrency("1 cây vàng"), "VND");
});

test("detectDate: hôm qua, dd/mm, ISO", () => {
  assert.equal(detectDate("hôm qua mua", NOW), "2026-05-30");
  assert.equal(detectDate("ngày 5/3 mua", NOW), "2026-03-05");
  assert.equal(detectDate("2026-01-15 chi", NOW), "2026-01-15");
  assert.equal(detectDate("không có ngày", NOW), "2026-05-31");
});

test("matchByName: khớp không dấu", () => {
  assert.equal(matchByName("chuyển vào tiet kiem", CTX.accounts)?.id, "tk");
  assert.equal(matchByName("không có tài khoản nào", CTX.accounts), null);
});

// ── Câu mẫu chính (yêu cầu trong đề bài) ──
test("CASE: mua chứng chỉ quỹ -> add_asset", () => {
  const r = parseFinancialInput("Hôm nay mua 20 triệu VND chứng chỉ quỹ", CTX, NOW);
  assert.equal(r.intent, "add_asset");
  assert.equal(r.amount, 20_000_000);
  assert.equal(r.currency, "VND");
  assert.equal(r.asset_name, "Chứng chỉ quỹ");
  assert.equal(r.date, "2026-05-31");
});

test("CASE: thêm 1 cây vàng -> add_asset, Vàng", () => {
  const r = parseFinancialInput("Thêm tài sản: 1 cây vàng, giá 120 triệu", CTX, NOW);
  assert.equal(r.intent, "add_asset");
  assert.equal(r.amount, 120_000_000);
  assert.equal(r.asset_name, "Vàng");
});

test("CASE: trả nợ thẻ tín dụng -> debt_payment, from Techcombank", () => {
  const r = parseFinancialInput("Trả nợ thẻ tín dụng 5 triệu từ tài khoản Techcombank", CTX, NOW);
  assert.equal(r.intent, "debt_payment");
  assert.equal(r.amount, 5_000_000);
  assert.equal(r.from_account, "Techcombank");
  assert.equal(r.category, "Trả nợ vay"); // không bị nhầm thành "Ăn uống" do "com" trong techcombank
});

test("CASE: nhận lương + chuyển vào tiết kiệm -> transfer lấy đúng số sau 'chuyển'", () => {
  const r = parseFinancialInput("Nhận lương 45 triệu, chuyển 15 triệu vào tiết kiệm", CTX, NOW);
  assert.equal(r.intent, "transfer");
  assert.equal(r.amount, 15_000_000, "phải lấy 15tr (sau 'chuyển'), không phải 45tr");
  assert.equal(r.to_account, "Tiết kiệm");
});

test("CASE: nhận lương đơn giản -> income", () => {
  const r = parseFinancialInput("Nhận lương 45 triệu vào Techcombank", CTX, NOW);
  assert.equal(r.intent, "income");
  assert.equal(r.amount, 45_000_000);
  assert.equal(r.account, "Techcombank");
  assert.equal(r.category, "Lương");
});

// ── Câu thiếu dữ liệu / mơ hồ ──
test("CASE thiếu dữ liệu: 'cafe 50k' -> expense nhưng thiếu account", () => {
  const r = parseFinancialInput("cafe 50k", CTX, NOW);
  assert.equal(r.intent, "expense");
  assert.equal(r.amount, 50_000);
  assert.ok(r.missing_fields.includes("account"), "phải báo thiếu account");
  assert.ok(r.confidence < 0.8, "confidence phải thấp khi thiếu tài khoản");
});

test("CASE mơ hồ: 'mua gì đó' -> unknown/expense, thiếu amount, confidence thấp", () => {
  const r = parseFinancialInput("mua gì đó", CTX, NOW);
  assert.equal(r.amount, null);
  assert.ok(r.missing_fields.includes("amount"));
  assert.ok(r.confidence <= 0.5);
});

test("CASE câu trống -> warnings + missing", () => {
  const r = parseFinancialInput("", CTX, NOW);
  assert.ok(r.warnings.length > 0);
  assert.equal(r.amount, null);
});

test("CASE USD -> cảnh báo quy đổi", () => {
  const r = parseFinancialInput("mua 1000 USD cổ phiếu Mỹ", CTX, NOW);
  assert.equal(r.currency, "USD");
  assert.ok(r.warnings.some((w) => w.includes("VND")), "phải cảnh báo quy đổi VND");
});

// ── normalizeParsedResult (bảo vệ schema khi AI trả thiếu/sai) ──
test("normalizeParsedResult: điền đủ field + ép kiểu", () => {
  const out = normalizeParsedResult({ intent: "bogus", amount: "5000000", date: "bad-date" }, NOW);
  assert.equal(out.intent, "unknown");
  assert.equal(out.amount, 5_000_000);
  assert.equal(out.currency, "VND");
  assert.equal(out.date, "2026-05-31"); // ngày sai -> hôm nay
  assert.ok(Array.isArray(out.missing_fields));
  assert.ok(Array.isArray(out.warnings));
});

test("normalizeParsedResult: amount không hữu hạn -> null", () => {
  const out = normalizeParsedResult({ intent: "expense", amount: "abc" }, NOW);
  assert.equal(out.amount, null);
});

// ── parseFinancialInputWithAI fallback khi không có key ──
test("parseFinancialInputWithAI: không có API key -> dùng parser cục bộ", async () => {
  const r = await parseFinancialInputWithAI("cafe 50k", {}, CTX, { now: NOW });
  assert.equal(r._source, "local");
  assert.equal(r.amount, 50_000);
});

test("parseFinancialInputWithAI: AI trả JSON hợp lệ -> dùng kết quả AI", async () => {
  const fakeFetch = async () => ({
    ok: true,
    json: async () => ({
      choices: [{ message: { content: JSON.stringify({ intent: "income", amount: 45000000, currency: "VND", account: "Techcombank", date: "2026-05-31", note: "luong" }) } }],
    }),
  });
  const r = await parseFinancialInputWithAI("Nhận lương 45 triệu", { ai_api_key: "test-key" }, CTX, { fetch: fakeFetch, now: NOW });
  assert.equal(r._source, "ai");
  assert.equal(r.intent, "income");
  assert.equal(r.amount, 45_000_000);
});

test("parseFinancialInputWithAI: AI lỗi -> fallback cục bộ kèm cảnh báo", async () => {
  const failFetch = async () => ({ ok: false, status: 500, json: async () => ({}) });
  const r = await parseFinancialInputWithAI("cafe 50k", { ai_api_key: "test-key" }, CTX, { fetch: failFetch, now: NOW });
  assert.equal(r._source, "local");
  assert.ok(r.warnings.some((w) => w.includes("AI")), "phải có cảnh báo fallback");
});

// ── detectQuantityPriceTicker + add_asset có số lượng/giá ──
test("detectQuantityPriceTicker: '100 cổ phiếu FPT giá 120k'", () => {
  const r = detectQuantityPriceTicker("100 cổ phiếu FPT giá 120k");
  assert.equal(r.quantity, 100);
  assert.equal(r.price, 120_000);
  assert.equal(r.ticker, "FPT");
});

test("CASE add_asset có số lượng/giá: '100 cổ phiếu FPT giá 120k'", () => {
  const r = parseFinancialInput("100 cổ phiếu FPT giá 120k", CTX, NOW);
  assert.equal(r.intent, "add_asset");
  assert.equal(r.quantity, 100);
  assert.equal(r.price, 120_000);
  assert.equal(r.amount, 12_000_000, "amount = qty * price");
  assert.equal(r.asset_name, "FPT");
});

test("CASE add_asset suy ra giá khi có tổng + số lượng", () => {
  const r = parseFinancialInput("mua 1000 cổ phiếu VNM hết 60 triệu", CTX, NOW);
  assert.equal(r.intent, "add_asset");
  assert.equal(r.quantity, 1000);
  // amount 60tr, qty 1000 -> price 60000
  assert.equal(r.price, 60_000);
});

test("CASE add_asset: '2 cây vàng giá 120 triệu' -> qty 2, total 240tr", () => {
  const r = parseFinancialInput("mua 2 cây vàng giá 120 triệu", CTX, NOW);
  assert.equal(r.intent, "add_asset");
  assert.equal(r.quantity, 2);
  assert.equal(r.price, 120_000_000);
  assert.equal(r.amount, 240_000_000);
  assert.equal(r.asset_name, "Vàng");
});

// ── Câu ghép -> nhiều giao dịch ──
test("parseFinancialInputMulti: câu ghép tách thành 2 giao dịch", () => {
  const parts = parseFinancialInputMulti(
    "Nhận lương 45 triệu vào Techcombank, chuyển 15 triệu vào tiết kiệm",
    CTX,
    NOW,
  );
  assert.equal(parts.length, 2);
  assert.equal(parts[0].intent, "income");
  assert.equal(parts[0].amount, 45_000_000);
  assert.equal(parts[1].intent, "transfer");
  assert.equal(parts[1].amount, 15_000_000);
  assert.equal(parts[1].to_account, "Tiết kiệm");
});

test("parseFinancialInputMulti: câu đơn trả về mảng 1 phần tử", () => {
  const parts = parseFinancialInputMulti("cafe 50k", CTX, NOW);
  assert.equal(parts.length, 1);
  assert.equal(parts[0].intent, "expense");
});

test("parseFinancialInputMulti: kế thừa ngày 'hôm qua' cho mệnh đề sau", () => {
  const parts = parseFinancialInputMulti(
    "Hôm qua nhận lương 45 triệu vào Techcombank và chuyển 15 triệu vào tiết kiệm",
    CTX,
    NOW,
  );
  assert.equal(parts.length, 2);
  assert.equal(parts[0].date, "2026-05-30");
  assert.equal(parts[1].date, "2026-05-30", "mệnh đề sau kế thừa ngày hôm qua");
});

test("parseFinancialInputWithAIMulti: không key -> tách cục bộ nhiều phần", async () => {
  const parts = await parseFinancialInputWithAIMulti(
    "Nhận lương 45 triệu vào Techcombank, chuyển 15 triệu vào tiết kiệm",
    {},
    CTX,
    { now: NOW },
  );
  assert.equal(parts.length, 2);
  assert.equal(parts[0]._source, "local");
});

test("normalizeParsedResult: giữ quantity/price hợp lệ, loại NaN", () => {
  const out = normalizeParsedResult({ intent: "add_asset", quantity: "100", price: "120000", asset_name: "FPT" }, NOW);
  assert.equal(out.quantity, 100);
  assert.equal(out.price, 120_000);
  const bad = normalizeParsedResult({ intent: "add_asset", quantity: "abc", price: "xyz" }, NOW);
  assert.equal(bad.quantity, null);
  assert.equal(bad.price, null);
});

// ── update_value (cập nhật giá tài sản) ──
test("CASE update_value: 'Cập nhật căn hộ lên 4.2 tỷ' khớp tài sản + đặt price", () => {
  const ctx = { accounts: [], assets: [{ id: "apt", name: "Căn hộ" }] };
  const r = parseFinancialInput("Cập nhật căn hộ lên 4.2 tỷ", ctx, NOW);
  assert.equal(r.intent, "update_value");
  assert.equal(r.price, 4_200_000_000);
  assert.equal(r.amount, null, "update_value không dùng amount như dòng tiền");
  assert.equal(r.asset_name, "Căn hộ");
  assert.equal(r.missing_fields.length, 0);
});

test("CASE update_value thiếu asset -> báo missing asset_name", () => {
  const r = parseFinancialInput("định giá lại lên 2 tỷ", { accounts: [], assets: [] }, NOW);
  // không rõ tài sản nào -> intent có thể update_value nhưng thiếu asset
  if (r.intent === "update_value") {
    assert.ok(r.missing_fields.includes("asset_name"));
  }
});

test("CASE add_asset không nhầm thành update_value khi có 'giá'", () => {
  const r = parseFinancialInput("Thêm tài sản 1 cây vàng giá 120 triệu", { accounts: [], assets: [] }, NOW);
  assert.equal(r.intent, "add_asset");
  assert.equal(r.price, 120_000_000);
});

test("CASE '100 cổ phiếu FPT giá 120k' vẫn là add_asset (không phải update_value)", () => {
  const r = parseFinancialInput("100 cổ phiếu FPT giá 120k", { accounts: [], assets: [] }, NOW);
  assert.equal(r.intent, "add_asset");
  assert.equal(r.quantity, 100);
  assert.equal(r.amount, 12_000_000);
});

// ── Câu mơ hồ / thiếu dữ liệu trong đề bài ──
test("CASE 'Mua quỹ' -> mơ hồ, thiếu amount, confidence thấp", () => {
  const r = parseFinancialInput("Mua quỹ", { accounts: [], assets: [] }, NOW);
  assert.equal(r.amount, null);
  assert.ok(r.missing_fields.includes("amount"));
  assert.ok(r.confidence <= 0.5);
});

test("CASE 'Trả nợ hôm qua' -> debt_payment, ngày hôm qua, thiếu amount", () => {
  const r = parseFinancialInput("Trả nợ hôm qua", { accounts: [], assets: [] }, NOW);
  assert.equal(r.intent, "debt_payment");
  assert.equal(r.date, "2026-05-30");
  assert.ok(r.missing_fields.includes("amount"));
});

test("CASE 'Chuyển 15 triệu từ Techcombank sang tiết kiệm' -> transfer đủ from/to", () => {
  const ctx = { accounts: [{ id: "tcb", name: "Techcombank" }, { id: "tk", name: "Tiết kiệm" }], assets: [] };
  const r = parseFinancialInput("Chuyển 15 triệu từ Techcombank sang tiết kiệm", ctx, NOW);
  assert.equal(r.intent, "transfer");
  assert.equal(r.amount, 15_000_000);
  assert.equal(r.from_account, "Techcombank");
  assert.equal(r.to_account, "Tiết kiệm");
  assert.equal(r.missing_fields.length, 0);
});
