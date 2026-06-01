// Module: modal-receivable | Responsibility: Receivable add/edit modal and receivable payment modal
// FIX 2: Dùng hidden input data-is-new thay vì data-show-if="id=" để kiểm soát field "Tài khoản tiền cho vay"

import { escapeHtml, formatVNDShort, optionsHtml } from "./shared.js";

export function renderReceivableModal(modal) {
  const record = modal.record || {};
  const isNew = !record.id;
  return `
    <div class="modal-card">
      <div class="modal-head"><h3>${isNew ? "Thêm khoản cho vay" : "Sửa khoản cho vay"}</h3><button class="icon-btn" data-action="close-modal">×</button></div>
      <form class="form-grid" data-form="receivable">
        <input type="hidden" name="id" value="${escapeHtml(record.id || "")}" />
        <!-- FIX 2: hidden input đánh dấu record mới, dùng để kiểm soát field visibility -->
        <input type="hidden" name="_is_new" value="${isNew ? "1" : "0"}" />
        <label><span>Tên khoản</span><input type="text" name="name" value="${escapeHtml(record.name || "")}" /></label>
        <label><span>Loại</span>
          <select name="type">
            ${["personal_loan", "business_loan", "deposit", "other"]
              .map(
                (type) =>
                  `<option value="${type}" ${record.type === type ? "selected" : ""}>${escapeHtml(
                    type === "personal_loan"
                      ? "Cho vay cá nhân"
                      : type === "business_loan"
                        ? "Cho vay kinh doanh"
                        : type === "deposit"
                          ? "Đặt cọc"
                          : "Khác",
                  )}</option>`,
              )
              .join("")}
          </select>
        </label>
        <label><span>Người vay/đối tác</span><input type="text" name="counterparty" value="${escapeHtml(
          record.counterparty || "",
        )}" /></label>
        <label><span>Số gốc ban đầu</span><input type="number" name="original_amount" value="${escapeHtml(
          record.original_amount || 0,
        )}" /></label>
        <label><span>Số dư còn lại</span><input type="number" name="remaining_amount" value="${escapeHtml(
          record.remaining_amount || 0,
        )}" ${modal.hasPayments ? "readonly" : ""} /></label>
        <label><span>Ngày bắt đầu</span><input type="date" name="start_date" value="${escapeHtml(
          record.start_date || "",
        )}" /></label>
        <label><span>Ngày dự kiến trả</span><input type="date" name="expected_return_date" value="${escapeHtml(
          record.expected_return_date || "",
        )}" /></label>
        <label><span>Khả năng thu hồi</span>
          <select name="likelihood">
            <option value="high" ${record.likelihood === "high" ? "selected" : ""}>Cao</option>
            <option value="medium" ${record.likelihood === "medium" ? "selected" : ""}>Trung bình</option>
            <option value="low" ${record.likelihood === "low" ? "selected" : ""}>Thấp</option>
          </select>
        </label>
        ${isNew ? `
        <label><span>Tài khoản tiền cho vay</span><select name="account_id"><option value="">Không tạo giao dịch</option>${optionsHtml(
          modal.accountOptions,
          record.account_id,
        )}</select></label>
        ` : ""}
        <label class="checkbox-line"><input type="checkbox" name="is_secured" ${
          record.is_secured ? "checked" : ""
        } /><span>Có tài sản bảo đảm</span></label>
        <label class="checkbox-line"><input type="checkbox" name="is_pledged" ${
          record.is_pledged ? "checked" : ""
        } /><span>Đang cầm cố</span></label>
        <label class="textarea-field form-span-2"><span>Ghi chú</span><textarea rows="3" name="notes">${escapeHtml(
          record.notes || "",
        )}</textarea></label>
        ${modal.hasPayments ? `<p class="muted-text form-span-2">Khoản vay đã có lịch sử thu nợ, số dư còn lại được tự động tính.</p>` : ""}
        <div class="form-actions form-span-2"><button class="btn btn-primary" type="submit">Lưu khoản cho vay</button></div>
      </form>
    </div>
  `;
}

export function renderReceivablePaymentModal(modal) {
  const receivable = modal.receivable || {};
  return `
    <div class="modal-card">
      <div class="modal-head"><h3>Ghi nhận thu nợ</h3><button class="icon-btn" data-action="close-modal">×</button></div>
      <form class="form-grid" data-form="receivable-payment">
        <input type="hidden" name="receivable_id" value="${escapeHtml(receivable.id || "")}" />
        <div class="split-stat emphasis"><span>Khoản cho vay</span><strong>${escapeHtml(receivable.name || "")}</strong></div>
        <div class="split-stat emphasis"><span>Số dư còn lại</span><strong>${formatVNDShort(modal.maxAmount || 0)}</strong></div>
        <label><span>Số tiền thu</span><input type="number" name="amount" max="${escapeHtml(
          modal.maxAmount || 0,
        )}" value="${escapeHtml(modal.maxAmount || 0)}" /></label>
        <label><span>Tài khoản nhận</span><select name="to_account_id">${optionsHtml(modal.accountOptions)}</select></label>
        <label><span>Ngày</span><input type="date" name="date" value="${escapeHtml(
          new Date().toISOString().slice(0, 10),
        )}" /></label>
        <label class="textarea-field"><span>Ghi chú</span><textarea rows="3" name="notes"></textarea></label>
        <div class="form-actions"><button class="btn btn-primary" type="submit">Lưu thu nợ</button></div>
      </form>
    </div>
  `;
}
