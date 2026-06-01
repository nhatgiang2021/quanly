// Module: modal-transaction | Responsibility: Transaction add/edit modal form

import { escapeHtml, formatVNDShort, optionsHtml } from "./shared.js";

export function renderTransactionModal(modal) {
  const record = modal.record || {};
  const today = new Date().toISOString().slice(0, 10);
  const incomeCategorySuggestions = [...new Set(modal.incomeCategories || [])];
  const expenseCategorySuggestions = [...new Set(modal.expenseCategories || [])];
  const allCategorySuggestions = [...new Set([...expenseCategorySuggestions, ...incomeCategorySuggestions])];
  return `
    <div class="modal-card modal-wide">
      <div class="modal-head"><h3>${record.id ? "Sửa giao dịch" : "Thêm giao dịch"}</h3><button class="icon-btn" data-action="close-modal">×</button></div>
      <form class="form-grid" data-form="transaction">
        <input type="hidden" name="id" value="${escapeHtml(record.id || "")}" />
        <label><span>Ngày</span><input type="date" name="date" value="${escapeHtml(record.date || today)}" required /></label>
        <label><span>Loại</span>
          <select name="type">
            <option value="income" ${record.type === "income" ? "selected" : ""}>Thu nhập</option>
            <option value="expense" ${record.type === "expense" ? "selected" : ""}>Chi tiêu</option>
            <option value="transfer" ${record.type === "transfer" ? "selected" : ""}>Chuyển khoản</option>
            <option value="loan_disbursement" ${record.type === "loan_disbursement" ? "selected" : ""}>Giải ngân vay</option>
            <option value="lending" ${record.type === "lending" ? "selected" : ""}>Cho vay</option>
            <option value="collection" ${record.type === "collection" ? "selected" : ""}>Thu hồi nợ</option>
            <option value="balance_adjustment" ${record.type === "balance_adjustment" ? "selected" : ""}>Điều chỉnh số dư</option>
          </select>
        </label>
        <label><span>Số tiền</span><input type="number" name="amount" value="${escapeHtml(record.amount || 0)}" /></label>
        <label data-show-if="type=income">
          <span>Nguồn thu</span>
          <select name="income_source">
            <option value="">Chọn nguồn</option>
            ${modal.incomeCategories
              .map(
                (category) => `<option value="${escapeHtml(category)}" ${
                  record.income_source === category ? "selected" : ""
                }>${escapeHtml(category)}</option>`,
              )
              .join("")}
          </select>
        </label>
        <label>
          <span>Danh mục</span>
          <input type="text" name="category" list="${record.type === "income" ? "transaction-category-income" : record.type === "expense" ? "transaction-category-expense" : "transaction-category-all"}" value="${escapeHtml(
            record.category || "",
          )}" />
          <datalist id="transaction-category-income">
            ${incomeCategorySuggestions.map((category) => `<option value="${escapeHtml(category)}"></option>`).join("")}
          </datalist>
          <datalist id="transaction-category-expense">
            ${expenseCategorySuggestions.map((category) => `<option value="${escapeHtml(category)}"></option>`).join("")}
          </datalist>
          <datalist id="transaction-category-all">
            ${allCategorySuggestions.map((category) => `<option value="${escapeHtml(category)}"></option>`).join("")}
          </datalist>
        </label>
        <label class="form-span-2">
          <span>Mô tả</span>
          <input type="text" name="description" value="${escapeHtml(record.description || "")}" />
        </label>
        <label data-show-if="type=income|expense|loan_disbursement|asset_purchase|balance_adjustment">
          <span>Tài khoản</span>
          <select name="account_id">
            <option value="">Chọn tài khoản</option>
            ${optionsHtml(modal.accountOptions, record.account_id)}
          </select>
        </label>
        <label data-show-if="type=transfer">
          <span>Từ tài khoản</span>
          <select name="from_account_id">
            <option value="">Chọn tài khoản</option>
            ${optionsHtml(modal.accountOptions, record.from_account_id)}
          </select>
        </label>
        <label data-show-if="type=transfer|asset_sale">
          <span>Đến tài khoản</span>
          <select name="to_account_id">
            <option value="">Chọn tài khoản</option>
            ${optionsHtml(modal.accountOptions, record.to_account_id)}
          </select>
        </label>
        <label class="checkbox-line form-span-2" data-show-if="type=transfer">
          <input type="checkbox" name="affect_bucket" ${record.affect_bucket ? "checked" : ""} />
          <span>Chuyển khoản này làm thay đổi ngân sách hũ đầu tư</span>
        </label>
        <label data-show-if="affect_bucket=true">
          <span>Hũ đầu tư liên kết</span>
          <select name="bucket_id">
            <option value="">Chọn hũ đầu tư</option>
            ${optionsHtml(modal.investmentBucketOptions, record.bucket_id)}
          </select>
        </label>
        <label data-show-if="affect_bucket=true">
          <span>Chiều tác động</span>
          <select name="bucket_impact">
            <option value="allocate" ${record.bucket_impact !== "withdraw" ? "selected" : ""}>Tăng vốn hũ (allocate)</option>
            <option value="withdraw" ${record.bucket_impact === "withdraw" ? "selected" : ""}>Rút vốn hũ (withdraw)</option>
          </select>
        </label>
        <label data-show-if="type=loan_disbursement">
          <span>Khoản nợ liên kết</span>
          <select name="liability_id">
            <option value="">Không liên kết</option>
            ${optionsHtml(modal.liabilityOptions, record.liability_id)}
          </select>
        </label>
        <label data-show-if="type=asset_purchase|asset_sale">
          <span>Tài sản liên kết</span>
          <select name="asset_id">
            <option value="">Không liên kết</option>
            ${optionsHtml(modal.assetOptions, record.asset_id)}
          </select>
        </label>
        <label class="checkbox-line" data-show-if="type=income">
          <input type="checkbox" name="trigger_allocation" ${record.trigger_allocation !== false ? "checked" : ""} />
          <span>Cho phép gợi ý phân bổ sau khi lưu</span>
        </label>
        <label class="textarea-field form-span-2"><span>Ghi chú</span><textarea name="notes" rows="4">${escapeHtml(
          record.notes || "",
        )}</textarea></label>
        <div class="form-actions form-span-2"><button class="btn btn-primary" type="submit">Lưu giao dịch</button></div>
      </form>
    </div>
  `;
}

export const renderTransactionForm = renderTransactionModal;
