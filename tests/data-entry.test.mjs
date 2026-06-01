// tests/data-entry.test.mjs
// Wrapper headless cho bộ test nhập liệu (vốn viết để chạy trong browser console).
// Cung cấp shim localStorage + cờ chặn auto-run, import module test gốc, chạy và
// khẳng định 0 fail. Nhờ vậy `npm test` chạy được toàn bộ test mà không cần trình duyệt.
//
// Không sửa logic test gốc trong data-entry-tests.js — chỉ điều phối môi trường chạy.

import test from "node:test";
import assert from "node:assert/strict";

test("data-entry suite (headless): toàn bộ test nhập liệu pass", async () => {
  // localStorage shim tối thiểu cho state.js (cache đọc/ghi).
  if (typeof globalThis.localStorage === "undefined") {
    const store = new Map();
    globalThis.localStorage = {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => store.set(key, String(value)),
      removeItem: (key) => store.delete(key),
      clear: () => store.clear(),
    };
  }

  // Chặn auto-run khi import để wrapper tự điều khiển và bắt kết quả.
  globalThis.__SKIP_AUTORUN_WEALTH_TESTS__ = true;

  await import("./data-entry-tests.js");
  const runner = globalThis.runWealthDataEntryTests;
  assert.equal(typeof runner, "function", "Không tìm thấy runWealthDataEntryTests");

  const result = await runner();
  const failNames = (result.errors || []).map((item) => `${item.name}: ${item.error}`).join("\n");
  assert.equal(
    result.failed,
    0,
    `Có ${result.failed} test nhập liệu fail:\n${failNames}`,
  );
  assert.ok(result.passed > 0, "Không có test nào chạy");
});
