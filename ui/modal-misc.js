// Module: modal-misc | Responsibility: Misc small modals — price update, derivative update, welcome, reset confirm, account history, counterparty flow

import { escapeHtml, formatVNDShort, optionsHtml } from "./shared.js";

export function renderPriceUpdateModal(modal) {
  return `
    <div class="modal-card">
      <div class="modal-head"><h3>Cập nhật giá ${escapeHtml(modal.asset.name)}</h3><button class="icon-btn" data-action="close-modal">×</button></div>
      <form class="form-grid" data-form="price-update">
        <input type="hidden" name="asset_id" value="${escapeHtml(modal.asset.id)}" />
        <label><span>Giá hiện tại</span><input type="number" name="current_price" value="${escapeHtml(
          modal.asset.current_price,
        )}" /></label>
        <div class="form-actions"><button class="btn btn-primary" type="submit">Lưu giá</button></div>
      </form>
    </div>
  `;
}

export function renderDerivativeUpdateModal(modal) {
  return `
    <div class="modal-card">
      <div class="modal-head"><h3>Cập nhật số dư ${escapeHtml(modal.account.name)}</h3><button class="icon-btn" data-action="close-modal">×</button></div>
      <form class="form-grid" data-form="derivative-update">
        <input type="hidden" name="account_id" value="${escapeHtml(modal.account.id)}" />
        <div class="split-stat emphasis">
          <span>Số dư đang tính</span>
          <strong>${formatVNDShort(modal.account.balance)}</strong>
        </div>
        <label><span>Số dư thực tế</span><input type="number" name="actual_balance" value="${escapeHtml(
          modal.account.balance,
        )}" /></label>
        <label><span>Phân loại chênh lệch</span>
          <select name="classification">
            <option value="lãi">Lãi</option>
            <option value="lỗ">Lỗ</option>
            <option value="phí">Phí</option>
            <option value="thủ công">Thủ công</option>
          </select>
        </label>
        <label><span>Ngày</span><input type="date" name="date" value="${escapeHtml(new Date().toISOString().slice(0, 10))}" /></label>
        <label class="textarea-field"><span>Ghi chú</span><textarea rows="3" name="notes"></textarea></label>
        <div class="form-actions"><button class="btn btn-primary" type="submit">Ghi nhận</button></div>
      </form>
    </div>
  `;
}

export function renderWelcomeModal(modal) {
  return `
    <div class="modal-card modal-center">
      <div class="modal-head"><h3>Chào mừng đến với NK</h3></div>
      <p>Bạn có muốn nạp dữ liệu mẫu để trải nghiệm ứng dụng không?</p>
      <div class="row-actions">
        <button class="btn btn-primary" data-action="seed-sample">Nạp dữ liệu mẫu</button>
        <button class="btn btn-ghost" data-action="start-empty">Bắt đầu trống</button>
      </div>
    </div>
  `;
}

export function renderResetConfirmModal() {
  return `
    <div class="modal-card modal-center">
      <div class="modal-head">
        <h3>Xác nhận reset dữ liệu</h3>
        <button class="icon-btn" data-action="close-modal">×</button>
      </div>
      <form class="form-grid" data-form="reset-data">
        <label><span>Nhập từ khóa xác nhận</span><input type="text" name="confirm_text" placeholder="XÓA" /></label>
        <div class="form-actions"><button class="btn btn-danger" type="submit">Xóa toàn bộ</button></div>
      </form>
    </div>
  `;
}

export function renderAccountHistoryModal(modal) {
  return `
    <div class="modal-card">
      <div class="modal-head">
        <h3>Lịch sử ${escapeHtml(modal.account?.name || "")}</h3>
        <button class="icon-btn" data-action="close-modal">×</button>
      </div>
      <!-- FIX 7: Hiển thị thông báo truncation khi > 30 giao dịch -->
      ${modal.truncated ? `<p class="muted-text" style="padding: var(--space-2) var(--space-4); margin: 0;">Chỉ hiển thị 30 giao dịch gần nhất trên tổng ${modal.totalCount}.</p>` : ""}
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>Ngày</th><th>Loại</th><th>Mô tả</th><th>Số tiền</th></tr></thead>
          <tbody>
            ${modal.rows
              .map(
                (row) => `
                <tr><td>${escapeHtml(row.date)}</td><td>${escapeHtml(row.typeLabel)}</td><td>${escapeHtml(
                  row.description || row.category || "",
                )}</td><td>${row.type === "transfer" ? formatVNDShort(row.amount) : formatVNDShort(row.signedAmount)}</td></tr>
              `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

export function renderCounterpartyFlowModal(modal) {
  return `
    <div class="modal-card">
      <div class="modal-head"><h3>Ghi nhận dòng tiền theo đối tượng</h3><button class="icon-btn" data-action="close-modal">×</button></div>
      <form class="form-grid" data-form="counterparty-flow">
        <label><span>Đối tượng</span>
          <input list="counterparty-list" name="counterparty" value="${escapeHtml(modal.counterparty || "")}" placeholder="Nhập tên đối tượng" />
          <datalist id="counterparty-list">
            ${(modal.counterpartyOptions || [])
              .map((item) => `<option value="${escapeHtml(item.value)}">${escapeHtml(item.label)}</option>`)
              .join("")}
          </datalist>
        </label>
        <label><span>Loại công nợ</span>
          <select name="side">
            <option value="liability" ${modal.defaultSide !== "receivable" ? "selected" : ""}>Khoản nợ phải trả</option>
            <option value="receivable" ${modal.defaultSide === "receivable" ? "selected" : ""}>Khoản cho vay phải thu</option>
          </select>
        </label>
        <label><span>Chiều biến động</span>
          <select name="direction">
            <option value="increase">Tăng dư nợ/phải thu</option>
            <option value="decrease">Giảm dư nợ/phải thu</option>
          </select>
        </label>
        <label><span>Số tiền</span><input type="number" name="amount" value="0" /></label>
        <label><span>Tài khoản tiền</span><select name="account_id">${optionsHtml(modal.accountOptions || [])}</select></label>
        <label><span>Ngày</span><input type="date" name="date" value="${escapeHtml(new Date().toISOString().slice(0, 10))}" /></label>
        <label><span>Chọn khoản nợ (nếu có)</span>
          <select name="liability_id">
            <option value="">Tự tạo/không chọn</option>
            ${optionsHtml(modal.liabilityOptions || [])}
          </select>
        </label>
        <label><span>Chọn khoản cho vay (nếu có)</span>
          <select name="receivable_id">
            <option value="">Tự tạo/không chọn</option>
            ${optionsHtml(modal.receivableOptions || [])}
          </select>
        </label>
        <label class="textarea-field form-span-2"><span>Ghi chú</span><textarea rows="3" name="notes"></textarea></label>
        <div class="form-hint form-span-2">
          Gợi ý: Tăng khoản nợ = nhận tiền vay thêm; Giảm khoản nợ = trả nợ gốc. Tăng khoản cho vay = cho vay thêm; Giảm khoản cho vay = thu nợ.
        </div>
        <div class="form-actions form-span-2"><button class="btn btn-primary" type="submit">Lưu dòng tiền</button></div>
      </form>
    </div>
  `;
}

export function renderAllocationPreviewModal(modal) {
  return `
    <div class="modal-card modal-center">
      <div class="modal-head">
        <h3>Gợi ý phân bổ thu nhập</h3>
        <button class="icon-btn" data-action="close-modal">×</button>
      </div>
      <p>Khoản thu này đủ ngưỡng phân bổ. Gợi ý chia ${formatVNDShort(modal.amount)} như sau:</p>
      <div class="mini-table">
        ${modal.suggestions
          .map(
            (bucket) => `
            <div class="mini-row">
              <span>${escapeHtml(bucket.name)} (${bucket.percentage}%)</span>
              <strong>${formatVNDShort(bucket.amount)}</strong>
            </div>
          `,
          )
          .join("")}
      </div>
    </div>
  `;
}

export function renderReinvestSuggestionModal(modal) {
  return `
    <div class="modal-card modal-center">
      <div class="modal-head">
        <h3>Gợi ý sau khi bán tài sản</h3>
        <button class="icon-btn" data-action="close-modal">×</button>
      </div>
      <p>Bạn vừa thu về ${formatVNDShort(modal.amount)} từ ${escapeHtml(
        modal.assetName,
      )}. Có thể cân nhắc giữ tiền mặt chờ cơ hội hoặc tái đầu tư theo bucket còn thiếu.</p>
    </div>
  `;
}
