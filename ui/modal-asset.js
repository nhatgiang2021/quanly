// Module: modal-asset | Responsibility: Asset add/edit modal and asset transaction modal

import { escapeHtml, optionsHtml, ASSET_ACTION_ORDER } from "./shared.js";
import { ASSET_ACTION_LABELS } from "../computations.js";

export function renderAssetModal(modal) {
  const record = modal.record || {};
  return `
    <div class="modal-card modal-wide">
      <div class="modal-head"><h3>${record.id ? "Sửa tài sản" : "Thêm tài sản"}</h3><button class="icon-btn" data-action="close-modal">×</button></div>
      <form class="form-grid" data-form="asset">
        <input type="hidden" name="id" value="${escapeHtml(record.id || "")}" />
        <label><span>Tên</span><input type="text" name="name" value="${escapeHtml(record.name || "")}" /></label>
        <label><span>Ticker</span><input type="text" name="ticker" value="${escapeHtml(record.ticker || "")}" /></label>
        <label><span>Loại tài sản</span>
          <select name="asset_type">
            ${(() => {
              const ASSET_TYPE_OPTIONS = [
                ["stock", "Cổ phiếu"],
                ["etf", "Quỹ ETF"],
                ["bond", "Trái phiếu"],
                ["real_estate", "Bất động sản"],
                ["crypto", "Tiền số"],
                ["warrant", "Chứng quyền"],
                ["gold", "Vàng"],
                ["savings", "Tiết kiệm"],
                ["cash_equiv", "Tương đương tiền"],
                ["other", "Khác"],
              ];
              return ASSET_TYPE_OPTIONS.map(
                ([type, label]) =>
                  `<option value="${type}" ${record.asset_type === type ? "selected" : ""}>${escapeHtml(
                    label,
                  )}</option>`,
              ).join("");
            })()}
          </select>
        </label>
        <label><span>Hũ phân bổ</span><select name="bucket">${optionsHtml(modal.bucketOptions, record.bucket)}</select></label>
        <label><span>Sàn / nơi giữ</span><input type="text" name="exchange" value="${escapeHtml(
          record.exchange || "",
        )}" /></label>
        <label><span>Giá hiện tại</span><input type="number" name="current_price" value="${escapeHtml(
          record.current_price || 0,
        )}" /></label>
        <label><span>Lãi suất</span><input type="number" step="0.1" name="interest_rate" value="${escapeHtml(
          record.interest_rate || 0,
        )}" /></label>
        <label><span>Kỳ hạn tháng</span><input type="number" name="term_months" value="${escapeHtml(
          record.term_months || 0,
        )}" /></label>
        <label><span>Ngày bắt đầu</span><input type="date" name="start_date" value="${escapeHtml(
          record.start_date || "",
        )}" /></label>
        <label data-show-if="asset_type=savings"><span>Ngày đáo hạn</span><input type="date" name="maturity_date" value="${escapeHtml(
          record.maturity_date || "",
        )}" /></label>
        <label data-show-if="asset_type=savings"><span>Kiểu lãi</span><input type="text" name="interest_type" value="${escapeHtml(
          record.interest_type || "",
        )}" /></label>
        <label data-show-if="asset_type=warrant"><span>Ngày hết hạn</span><input type="date" name="expiry_date" value="${escapeHtml(
          record.expiry_date || "",
        )}" /></label>
        <label data-show-if="asset_type=warrant"><span>Tài sản cơ sở</span><input type="text" name="underlying_asset" value="${escapeHtml(
          record.underlying_asset || "",
        )}" /></label>
        <label data-show-if="asset_type=warrant"><span>Giá thực hiện</span><input type="number" name="exercise_price" value="${escapeHtml(
          record.exercise_price || 0,
        )}" /></label>
        <label data-show-if="asset_type=warrant"><span>Tỷ lệ chuyển đổi</span><input type="number" name="conversion_ratio" value="${escapeHtml(
          record.conversion_ratio || 0,
        )}" /></label>
        <label data-show-if="asset_type=warrant"><span>Tổ chức phát hành</span><input type="text" name="issuer" value="${escapeHtml(
          record.issuer || "",
        )}" /></label>
        <label class="checkbox-line"><input type="checkbox" name="auto_rollover" ${
          record.auto_rollover ? "checked" : ""
        } /><span>Tự động tái tục</span></label>
        <label class="checkbox-line"><input type="checkbox" name="is_pledged" ${
          record.is_pledged ? "checked" : ""
        } /><span>Đang cầm cố</span></label>
        <label class="textarea-field form-span-2"><span>Ghi chú</span><textarea rows="4" name="notes">${escapeHtml(
          record.notes || "",
        )}</textarea></label>
        <div class="form-actions form-span-2"><button class="btn btn-primary" type="submit">Lưu tài sản</button></div>
      </form>
    </div>
  `;
}

export function renderAssetTransactionModal(modal) {
  const record = modal.record || {};
  return `
    <div class="modal-card modal-wide">
      <div class="modal-head"><h3>${record.id ? "Sửa giao dịch tài sản" : "Thêm giao dịch tài sản"}</h3><button class="icon-btn" data-action="close-modal">×</button></div>
      <form class="form-grid" data-form="asset-transaction">
        <input type="hidden" name="id" value="${escapeHtml(record.id || "")}" />
        <label><span>Ngày</span><input type="date" name="date" value="${escapeHtml(record.date || "")}" /></label>
        <label><span>Tài sản</span><select name="asset_id">${optionsHtml(modal.assetOptions, record.asset_id)}</select></label>
        <label><span>Hành động</span>
          <select name="action">
            ${ASSET_ACTION_ORDER
              .map(
                (action) =>
                  `<option value="${action}" ${record.action === action ? "selected" : ""}>${escapeHtml(
                    ASSET_ACTION_LABELS[action] || action,
                  )}</option>`,
              )
              .join("")}
          </select>
        </label>
        <label data-show-if="action=BUY|SELL|DIVIDEND|INTEREST|REALLOCATE"><span>Tài khoản cash</span><select name="account_id">${optionsHtml(
          modal.accountOptions,
          record.account_id,
        )}</select></label>
        <div class="form-hint form-span-2" data-show-if="action=OPENING">
          Dùng để khai báo tài sản đã sở hữu trước khi bắt đầu dùng app. Không trừ tiền tài khoản, không ảnh hưởng ngân sách.
        </div>
        <label><span>Số lượng</span><input type="number" step="0.0001" name="quantity" value="${escapeHtml(
          record.quantity || 0,
        )}" /></label>
        <label><span>Giá</span><input type="number" step="0.01" name="price" value="${escapeHtml(
          record.price || 0,
        )}" /></label>
        <label><span>Phí</span><input type="number" name="fee" value="${escapeHtml(record.fee || 0)}" /></label>
        <label><span>Tổng tiền cash</span><input type="number" name="total_cash" value="${escapeHtml(
          record.total_cash || 0,
        )}" /></label>
        <label class="textarea-field form-span-2"><span>Ghi chú</span><textarea rows="4" name="notes">${escapeHtml(
          record.notes || "",
        )}</textarea></label>
        <div class="form-actions form-span-2"><button class="btn btn-primary" type="submit">Lưu giao dịch</button></div>
      </form>
    </div>
  `;
}
