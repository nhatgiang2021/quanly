// Module: modal-goal | Responsibility: Goal add/edit modal and goal source row HTML builder

import { escapeHtml, optionsHtml } from "./shared.js";

export function renderGoalModal(modal) {
  const record = modal.record || {};
  return `
    <div class="modal-card modal-wide">
      <div class="modal-head"><h3>${record.id ? "Sửa mục tiêu" : "Thêm mục tiêu"}</h3><button class="icon-btn" data-action="close-modal">×</button></div>
      <form class="form-grid" data-form="goal">
        <input type="hidden" name="id" value="${escapeHtml(record.id || "")}" />
        <label><span>Tên</span><input type="text" name="name" value="${escapeHtml(record.name || "")}" /></label>
        <label><span>Loại</span><input type="text" name="type" value="${escapeHtml(record.type || "")}" /></label>
        <label><span>Mục tiêu</span><input type="number" name="target_amount" value="${escapeHtml(
          record.target_amount || 0,
        )}" /></label>
        <label><span>Deadline</span><input type="date" name="deadline" value="${escapeHtml(
          record.deadline || "",
        )}" /></label>
        <label><span>Ưu tiên</span>
          <select name="priority">
            ${["high", "medium", "low"]
              .map(
                (priority) => `<option value="${priority}" ${
                  record.priority === priority ? "selected" : ""
                }>${priority}</option>`,
              )
              .join("")}
          </select>
        </label>
        <label class="textarea-field form-span-2"><span>Ghi chú</span><textarea rows="3" name="notes">${escapeHtml(
          record.notes || "",
        )}</textarea></label>
        <div class="source-builder form-span-2">
          <div class="split-stat">
            <strong>Nguồn liên kết</strong>
            <button class="btn btn-ghost" type="button" data-action="add-goal-source">+ Thêm nguồn</button>
          </div>
          <div id="goal-source-list">
            ${
              (record.linked_sources || []).length
                ? (record.linked_sources || [])
                    .map((source) => createGoalSourceRowHtml(modal.sourceOptions, source))
                    .join("")
                : createGoalSourceRowHtml(modal.sourceOptions, {})
            }
          </div>
        </div>
        <div class="form-actions form-span-2"><button class="btn btn-primary" type="submit">Lưu mục tiêu</button></div>
      </form>
    </div>
  `;
}

export function createGoalSourceRowHtml(options, source = {}) {
  const type = source.type || source.source_type || "account";
  return `
    <div class="goal-source-row" data-goal-source-row>
      <label><span>Loại</span>
        <select name="source_type" data-goal-source-type>
          <option value="account" ${type === "account" ? "selected" : ""}>Tài khoản</option>
          <option value="asset" ${type === "asset" ? "selected" : ""}>Tài sản</option>
          <option value="bucket" ${type === "bucket" ? "selected" : ""}>Hũ phân bổ</option>
        </select>
      </label>
      <label data-source-select="account"><span>Tài khoản</span>
        <select name="account_source_id"><option value="">Chọn tài khoản</option>${optionsHtml(
          options.accounts,
          type === "account" ? source.source_id : "",
        )}</select>
      </label>
      <label data-source-select="asset"><span>Tài sản</span>
        <select name="asset_source_id"><option value="">Chọn tài sản</option>${optionsHtml(
          options.assets,
          type === "asset" ? source.source_id : "",
        )}</select>
      </label>
      <label data-source-select="bucket"><span>Hũ phân bổ</span>
        <select name="bucket_source_id"><option value="">Chọn hũ</option>${optionsHtml(
          options.buckets,
          type === "bucket" ? source.source_id : "",
        )}</select>
      </label>
      <label><span>Nhãn</span><input type="text" name="source_label" value="${escapeHtml(
        source.label || "",
      )}" /></label>
      <label class="checkbox-line"><input type="checkbox" name="include_full_balance" ${
        source.include_full_balance ? "checked" : ""
      } /><span>Dùng toàn bộ số dư</span></label>
      <label><span>% dùng</span><input type="number" name="share_percentage" value="${escapeHtml(
        source.share_percentage || 0,
      )}" /></label>
      <label><span>Giá trị thủ công</span><input type="number" name="current_value" value="${escapeHtml(
        source.current_value || 0,
      )}" /></label>
      <label><span>Đóng góp / tháng</span><input type="number" name="monthly_contribution" value="${escapeHtml(
        source.monthly_contribution || 0,
      )}" /></label>
      <button class="btn btn-ghost danger align-end" type="button" data-action="remove-goal-source-row">Xóa</button>
    </div>
  `;
}
