// Module: modal-ai-entry | Trách nhiệm: modal nhập liệu bằng ngôn ngữ tự nhiên.
// Bước 1: ô nhập câu + nút phân tích. Bước 2: preview có thể sửa + xác nhận lưu.
// Hỗ trợ câu ghép -> nhiều giao dịch (mỗi giao dịch một thẻ trong cùng form).
// AI/parser KHÔNG tự lưu — chỉ tạo preview; người dùng phải bấm "Xác nhận & lưu".

import { escapeHtml, optionsHtml } from "./shared.js";

const INTENT_LABELS = {
  income: "Thu nhập",
  expense: "Chi tiêu",
  transfer: "Chuyển khoản",
  debt_payment: "Trả nợ",
  add_asset: "Thêm tài sản",
  update_value: "Cập nhật giá",
  add_transaction: "Giao dịch",
  unknown: "Chưa xác định",
};

const INTENT_OPTIONS = ["income", "expense", "transfer", "debt_payment", "add_asset", "update_value", "unknown"];

function confidenceBadge(confidence) {
  const pct = Math.round((Number(confidence) || 0) * 100);
  const tone = pct >= 80 ? "text-success" : pct >= 50 ? "text-warning" : "text-danger";
  const label = pct >= 80 ? "Khá chắc" : pct >= 50 ? "Tạm ổn" : "Không chắc";
  return `<span class="${tone}" style="font-size:var(--text-xs)">${label} • ${pct}%</span>`;
}

function fieldClass(name, missing) {
  return (missing || []).includes(name) ? "input-error" : "";
}

export function renderAiEntryModal(modal) {
  const parsedList = modal.parsedList;
  const examples = [
    "Hôm nay mua 20 triệu chứng chỉ quỹ",
    "100 cổ phiếu FPT giá 120k",
    "Trả nợ thẻ tín dụng 5 triệu từ Techcombank",
    "Nhận lương 45 triệu vào Techcombank, chuyển 15 triệu vào tiết kiệm",
  ];

  if (!parsedList || !parsedList.length) {
    // Bước 1: nhập câu
    return `
      <div class="modal-card modal-wide">
        <div class="modal-head">
          <h3>Nhập liệu bằng AI</h3>
          <button class="icon-btn" data-action="close-modal">×</button>
        </div>
        <form class="form-grid" data-form="ai-entry-parse">
          <div class="form-span-2">
            <p style="color:var(--color-text-muted); font-size:var(--text-sm); margin-bottom:var(--space-2)">
              Gõ một hoặc nhiều câu mô tả giao dịch/tài sản bằng tiếng Việt. AI phân tích thành biểu mẫu
              để bạn kiểm tra trước khi lưu.${modal.hasAiKey ? "" : " (Chưa cấu hình API key — đang dùng bộ phân tích cục bộ.)"}
            </p>
          </div>
          <label class="textarea-field form-span-2">
            <span>Câu nhập</span>
            <textarea name="ai_text" rows="3" placeholder="Ví dụ: Nhận lương 45 triệu vào Techcombank, chuyển 15 triệu vào tiết kiệm">${escapeHtml(modal.inputText || "")}</textarea>
          </label>
          <div class="form-span-2" style="display:flex; flex-wrap:wrap; gap:var(--space-2)">
            ${examples
              .map(
                (ex) =>
                  `<button type="button" class="btn btn-ghost" style="font-size:var(--text-xs); height:auto; padding:4px 10px" data-action="ai-entry-example" data-text="${escapeHtml(ex)}">${escapeHtml(ex)}</button>`,
              )
              .join("")}
          </div>
          ${modal.error ? `<div class="form-span-2 field-error">${escapeHtml(modal.error)}</div>` : ""}
          <div class="form-actions form-span-2">
            <button class="btn btn-primary" type="submit" ${modal.loading ? "disabled" : ""}>
              ${modal.loading ? "Đang phân tích..." : "Phân tích"}
            </button>
          </div>
        </form>
      </div>
    `;
  }

  // Bước 2: preview (một hoặc nhiều giao dịch)
  const multi = parsedList.length > 1;
  const cards = parsedList.map((parsed, index) => renderPreviewCard(parsed, index, modal, multi)).join("");

  return `
    <div class="modal-card modal-wide">
      <div class="modal-head">
        <h3>Kiểm tra & xác nhận${multi ? ` (${parsedList.length} giao dịch)` : ""}</h3>
        <button class="icon-btn" data-action="close-modal">×</button>
      </div>
      <form class="form-grid" data-form="ai-entry-confirm">
        <input type="hidden" name="item_count" value="${parsedList.length}" />
        <div class="form-span-2" style="display:flex; justify-content:space-between; align-items:center; gap:var(--space-3)">
          <span style="font-size:var(--text-sm); color:var(--color-text-muted)">
            Nguồn phân tích: ${parsedList[0]?._source === "ai" ? "AI" : "Cục bộ"}${multi ? " • câu ghép được tách tự động" : ""}
          </span>
          <button type="button" class="btn btn-ghost" style="height:32px" data-action="ai-entry-back">← Sửa câu</button>
        </div>
        ${cards}
        <div class="form-span-2" style="font-size:var(--text-xs); color:var(--color-text-muted)">
          Dữ liệu chỉ được ghi khi bạn bấm xác nhận. Kiểm tra kỹ số tiền và tài khoản.
        </div>
        <div class="form-actions form-span-2">
          <button type="button" class="btn btn-ghost" data-action="ai-entry-back">Quay lại</button>
          <button class="btn btn-primary" type="submit">Xác nhận & lưu${multi ? ` ${parsedList.length} mục` : ""}</button>
        </div>
      </form>
    </div>
  `;
}

// Một thẻ preview cho một giao dịch. Field name có hậu tố _<index> để gom nhiều mục trong 1 form.
function renderPreviewCard(parsed, index, modal, multi) {
  const i = index;
  const missing = parsed.missing_fields || [];
  const warnings = parsed.warnings || [];
  const isTransfer = parsed.intent === "transfer";
  const isAsset = parsed.intent === "add_asset" || parsed.intent === "update_value";
  const isDebt = parsed.intent === "debt_payment";
  const needsSingleAccount = parsed.intent === "income" || parsed.intent === "expense";

  return `
    <div class="form-span-2" data-ai-item="${i}" style="${multi ? "border:1px solid var(--color-divider); border-radius:10px; padding:var(--space-4); margin-bottom:var(--space-2)" : ""}">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--space-3)">
        <strong style="font-size:var(--text-sm)">${multi ? `Giao dịch ${i + 1}` : "Chi tiết"}</strong>
        ${confidenceBadge(parsed.confidence)}
      </div>

      ${
        warnings.length
          ? `<div style="background:oklch(from var(--color-warning, #f5a623) l c h / 0.12); border:1px solid var(--color-warning, #f5a623); border-radius:8px; padding:var(--space-2) var(--space-3); font-size:var(--text-xs); margin-bottom:var(--space-3)">
              ⚠ ${warnings.map((w) => escapeHtml(w)).join(" • ")}
            </div>`
          : ""
      }

      <div class="form-grid">
        <label>
          <span>Loại thao tác</span>
          <select name="intent_${i}">
            ${INTENT_OPTIONS.map(
              (it) => `<option value="${it}" ${parsed.intent === it ? "selected" : ""}>${escapeHtml(INTENT_LABELS[it] || it)}</option>`,
            ).join("")}
          </select>
        </label>
        <label>
          <span>Số tiền</span>
          <input type="number" name="amount_${i}" class="${fieldClass("amount", missing)}" value="${escapeHtml(parsed.amount ?? "")}" />
        </label>
        <label>
          <span>Tiền tệ</span>
          <input type="text" name="currency_${i}" value="${escapeHtml(parsed.currency || "VND")}" />
        </label>
        <label>
          <span>Ngày</span>
          <input type="date" name="date_${i}" class="${fieldClass("date", missing)}" value="${escapeHtml(parsed.date || "")}" />
        </label>

        ${
          isAsset
            ? `<label>
                <span>Tên / mã tài sản</span>
                <input type="text" name="asset_name_${i}" class="${fieldClass("asset_name", missing)}" value="${escapeHtml(parsed.asset_name || "")}" />
              </label>
              <label>
                <span>Số lượng</span>
                <input type="number" step="0.0001" name="quantity_${i}" value="${escapeHtml(parsed.quantity ?? "")}" />
              </label>
              <label>
                <span>Giá đơn vị</span>
                <input type="number" name="price_${i}" value="${escapeHtml(parsed.price ?? "")}" />
              </label>`
            : ""
        }

        ${
          isTransfer
            ? `<label>
                <span>Từ tài khoản</span>
                <select name="from_account_id_${i}" class="${fieldClass("from_account", missing)}">
                  <option value="">Chọn tài khoản</option>
                  ${optionsHtml(modal.accountOptions, matchAccountId(modal.accountOptions, parsed.from_account))}
                </select>
              </label>
              <label>
                <span>Đến tài khoản</span>
                <select name="to_account_id_${i}" class="${fieldClass("to_account", missing)}">
                  <option value="">Chọn tài khoản</option>
                  ${optionsHtml(modal.accountOptions, matchAccountId(modal.accountOptions, parsed.to_account))}
                </select>
              </label>`
            : ""
        }

        ${
          isDebt
            ? `<label>
                <span>Tài khoản nguồn</span>
                <select name="from_account_id_${i}" class="${fieldClass("from_account", missing)}">
                  <option value="">Chọn tài khoản</option>
                  ${optionsHtml(modal.accountOptions, matchAccountId(modal.accountOptions, parsed.from_account))}
                </select>
              </label>
              <label>
                <span>Khoản nợ liên kết</span>
                <select name="liability_id_${i}">
                  <option value="">Chọn khoản nợ</option>
                  ${optionsHtml(modal.liabilityOptions, "")}
                </select>
              </label>`
            : ""
        }

        ${
          needsSingleAccount
            ? `<label>
                <span>Tài khoản</span>
                <select name="account_id_${i}" class="${fieldClass("account", missing)}">
                  <option value="">Chọn tài khoản</option>
                  ${optionsHtml(modal.accountOptions, matchAccountId(modal.accountOptions, parsed.account))}
                </select>
              </label>`
            : ""
        }

        <label class="form-span-2">
          <span>Danh mục</span>
          <input type="text" name="category_${i}" value="${escapeHtml(parsed.category || "")}" />
        </label>
        <label class="form-span-2">
          <span>Ghi chú</span>
          <input type="text" name="note_${i}" value="${escapeHtml(parsed.note || "")}" />
        </label>
      </div>
    </div>
  `;
}

// Khớp tên (chuỗi) sang account id để select chọn sẵn.
function matchAccountId(accountOptions, name) {
  if (!name) return "";
  const strip = (v) =>
    String(v || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  const target = strip(name);
  const found = (accountOptions || []).find((o) => strip(o.label) === target || strip(o.label).includes(target));
  return found ? found.value : "";
}
