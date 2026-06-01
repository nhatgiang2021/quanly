// tests/help-content.test.mjs
// Test cho tìm kiếm rule-based của panel "Hỏi cách dùng app".
// Đảm bảo: câu trong phạm vi guide -> trả lời đúng chủ đề; ngoài phạm vi -> thông báo chuẩn.

import test from "node:test";
import assert from "node:assert/strict";

import { searchHelp, OUT_OF_SCOPE_MESSAGE, HELP_SAMPLE_QUESTIONS, HELP_TOPICS } from "../help-content.js";

// 5 câu hỏi mẫu bắt buộc -> phải match đúng chủ đề kỳ vọng.
const expected = [
  ["Làm sao nhập tài sản mới?", "add-asset"],
  ["Làm sao dùng AI nhập liệu?", "ai-entry"],
  ["Tôi cần kiểm tra gì trước khi lưu?", "check-before-save"],
  ["Net worth nghĩa là gì?", "net-worth"],
  ["Dashboard này đọc thế nào?", "read-dashboard"],
];

for (const [q, topicId] of expected) {
  test(`searchHelp khớp đúng chủ đề: "${q}"`, () => {
    const r = searchHelp(q);
    assert.equal(r.matched, true, `phải match: ${q}`);
    assert.equal(r.topic.id, topicId, `chủ đề kỳ vọng ${topicId}, nhận ${r.topic.id}`);
    assert.ok(r.answer && r.answer.length > 0);
    assert.ok(r.section, "phải kèm tham chiếu section của guide");
  });
}

test("searchHelp: câu ngoài phạm vi -> thông báo chuẩn", () => {
  for (const q of ["App có chơi game không?", "thời tiết hôm nay thế nào", "công thức nấu phở"]) {
    const r = searchHelp(q);
    assert.equal(r.matched, false, `không được match: ${q}`);
    assert.equal(r.answer, OUT_OF_SCOPE_MESSAGE);
  }
});

test("searchHelp: câu rỗng -> nhắc nhập câu hỏi", () => {
  const r = searchHelp("");
  assert.equal(r.matched, false);
  assert.ok(r.answer.includes("nhập một câu hỏi"));
});

test("searchHelp: các biến thể câu hỏi vẫn khớp", () => {
  assert.equal(searchHelp("ai tu luu khong").matched, true);
  assert.equal(searchHelp("app ho tro ngoai te khong").topic.id, "currency");
  assert.equal(searchHelp("tra no the tin dung nhap the nao").topic.id, "debt-payment");
  assert.equal(searchHelp("xem hieu suat xirr o dau").topic.id, "performance-xirr");
});

test("Mỗi topic có đủ field bắt buộc + answer không rỗng", () => {
  for (const t of HELP_TOPICS) {
    assert.ok(t.id && t.title && t.section, `topic thiếu field: ${JSON.stringify(t)}`);
    assert.ok(Array.isArray(t.keywords) && t.keywords.length > 0, `topic thiếu keywords: ${t.id}`);
    assert.ok(t.answer && t.answer.length > 20, `answer quá ngắn: ${t.id}`);
  }
});

test("Có đủ 5 câu hỏi mẫu yêu cầu", () => {
  assert.equal(HELP_SAMPLE_QUESTIONS.length, 5);
  for (const q of HELP_SAMPLE_QUESTIONS) {
    assert.equal(searchHelp(q).matched, true, `câu mẫu phải match: ${q}`);
  }
});
