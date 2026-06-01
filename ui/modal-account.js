// Module: modal-account | Responsibility: Account add/edit modal form

import { escapeHtml } from "./shared.js";

export function renderAccountModal(modal) {
  const record = modal.record || {};
  return `
    <div class="modal-card">
      <div class="modal-head"><h3>${record.id ? "Sửa tài khoản" : "Thêm tài khoản"}</h3><button class="icon-btn" data-action="close-modal">×</button></div>
      <form class="form-grid" data-form="account">
        <input type="hidden" name="id" value="${escapeHtml(record.id || "")}" />
        <label><span>Tên</span><input type="text" name="name" value="${escapeHtml(record.name || "")}" /></label>
        <label><span>Loại</span>
          <select name="type">
            <option value="bank" ${record.type === "bank" ? "selected" : ""}>Ngân hàng</option>
            <option value="ewallet" ${record.type === "ewallet" ? "selected" : ""}>Ví điện tử</option>
            <option value="cash" ${record.type === "cash" ? "selected" : ""}>Tiền mặt</option>
            <option value="securities_cash" ${record.type === "securities_cash" ? "selected" : ""}>Tiền chờ chứng khoán</option>
            <option value="investment" ${record.type === "investment" ? "selected" : ""}>Tài khoản lướt sóng</option>
            <option value="derivative" ${record.type === "derivative" ? "selected" : ""}>Tài khoản phái sinh</option>
            <option value="credit_card" ${record.type === "credit_card" ? "selected" : ""}>Thẻ tín dụng</option>
          </select>
        </label>
        <label><span>Ngân hàng</span><input type="text" name="bank_name" value="${escapeHtml(record.bank_name || "")}" /></label>
        <label><span>Công ty CK/Broker</span><input type="text" name="broker" value="${escapeHtml(
          record.broker || "",
        )}" /></label>
        <label><span>Chế độ theo dõi</span>
          <select name="tracking_mode">
            <option value="auto" ${record.tracking_mode === "auto" ? "selected" : ""}>Tự động</option>
            <option value="manual" ${record.tracking_mode === "manual" ? "selected" : ""}>Thủ công</option>
          </select>
        </label>
        <label><span>Cập nhật cuối</span><input type="date" name="last_updated" value="${escapeHtml(
          record.last_updated || "",
        )}" /></label>
        <label data-show-if="type=bank|ewallet|cash|securities_cash|investment|derivative"><span>Số dư ban đầu</span><input type="number" name="opening_balance" value="${escapeHtml(
          record.opening_balance || 0,
        )}" /></label>
        <label data-show-if="type=bank|ewallet|cash|securities_cash|investment|derivative"><span>Ngày số dư ban đầu</span><input type="date" name="opening_date" value="${escapeHtml(
          record.opening_date || record.last_updated || "",
        )}" /></label>
        <label data-show-if="type=credit_card"><span>Hạn mức</span><input type="number" name="credit_limit" value="${escapeHtml(
          record.credit_limit || 0,
        )}" /></label>
        <label data-show-if="type=credit_card"><span>Ngày sao kê</span><input type="date" name="statement_date" value="${escapeHtml(
          record.statement_date || "",
        )}" /></label>
        <label data-show-if="type=credit_card"><span>Ngày đến hạn</span><input type="date" name="due_date" value="${escapeHtml(
          record.due_date || "",
        )}" /></label>
        <label class="textarea-field form-span-2"><span>Ghi chú</span><textarea name="notes" rows="4">${escapeHtml(
          record.notes || "",
        )}</textarea></label>
        <div class="form-actions form-span-2"><button class="btn btn-primary" type="submit">Lưu tài khoản</button></div>
      </form>
    </div>
  `;
}
