// Module: modal-debt | Responsibility: Liability (debt) add/edit modal and debt payment modal

import { escapeHtml, formatVNDShort, optionsHtml } from "./shared.js";

export function renderLiabilityModal(modal) {
  const record = modal.record || {};
  return `
    <div class="modal-card">
      <div class="modal-head"><h3>${record.id ? "Sửa khoản nợ" : "Thêm khoản nợ"}</h3><button class="icon-btn" data-action="close-modal">×</button></div>
      <form class="form-grid" data-form="liability">
        <input type="hidden" name="id" value="${escapeHtml(record.id || "")}" />
        <label><span>Tên</span><input type="text" name="name" value="${escapeHtml(record.name || "")}" /></label>
        <label><span>Đối tượng</span><input type="text" name="counterparty" value="${escapeHtml(
          record.counterparty || "",
        )}" placeholder="Ví dụ: Nguyễn Văn A" /></label>
        <label><span>Loại</span><input type="text" name="type" value="${escapeHtml(record.type || "")}" /></label>
        <label><span>Tổng vay</span><input type="number" name="total_amount" value="${escapeHtml(
          record.total_amount || 0,
        )}" /></label>
        <label><span>Dư nợ còn lại</span><input type="number" name="remaining_amount" value="${escapeHtml(
          record.remaining_amount || 0,
        )}" /></label>
        <label><span>Lãi suất</span><input type="number" step="0.1" name="interest_rate" value="${escapeHtml(
          record.interest_rate || 0,
        )}" /></label>
        <label><span>Gánh tháng</span><input type="number" name="monthly_payment" value="${escapeHtml(
          record.monthly_payment || 0,
        )}" /></label>
        <label><span>Bắt đầu</span><input type="date" name="start_date" value="${escapeHtml(
          record.start_date || "",
        )}" /></label>
        <label><span>Kết thúc</span><input type="date" name="end_date" value="${escapeHtml(
          record.end_date || "",
        )}" /></label>
        <label class="textarea-field form-span-2"><span>Ghi chú</span><textarea rows="4" name="notes">${escapeHtml(
          record.notes || "",
        )}</textarea></label>
        <div class="form-actions form-span-2"><button class="btn btn-primary" type="submit">Lưu khoản nợ</button></div>
      </form>
    </div>
  `;
}

export function renderDebtPaymentModal(modal) {
  return `
    <div class="modal-card">
      <div class="modal-head"><h3>Ghi nhận trả nợ ${escapeHtml(modal.liability?.name || "")}</h3><button class="icon-btn" data-action="close-modal">×</button></div>
      <form class="form-grid" data-form="debt-payment">
        <input type="hidden" name="liability_id" value="${escapeHtml(modal.liability?.id || "")}" />
        <div class="split-stat emphasis"><span>Lãi tháng tự tính</span><strong>${formatVNDShort(
          modal.defaultInterest,
        )}</strong></div>
        <label><span>Gốc trả thêm</span><input type="number" name="principal_amount" value="0" /></label>
        <label><span>Tài khoản nguồn</span><select name="from_account_id">${optionsHtml(modal.accountOptions)}</select></label>
        <label><span>Ngày</span><input type="date" name="date" value="${escapeHtml(
          new Date().toISOString().slice(0, 10),
        )}" /></label>
        <label class="textarea-field"><span>Ghi chú</span><textarea rows="3" name="notes"></textarea></label>
        <div class="form-actions"><button class="btn btn-primary" type="submit">Lưu thanh toán</button></div>
      </form>
    </div>
  `;
}
