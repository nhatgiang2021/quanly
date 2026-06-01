// Module: page-transactions | Responsibility: Income/expense/transfer transactions list with filters

import { escapeHtml, formatVNDShort, formatPct, sectionTitle, optionsHtml } from "./shared.js";

export function renderTransactionsPage(vm) {
  return `
    <section class="page">
      ${sectionTitle("Thu chi", "Theo dõi giao dịch hằng ngày, chuyển khoản, giải ngân vay và mua bán tài sản")}
      <div class="page-actions">
        <button class="btn btn-ghost" data-action="open-ai-entry" title="Nhập nhanh bằng câu tự nhiên">✨ AI nhập</button>
        <button class="btn btn-primary" data-action="open-modal" data-modal="transaction">+ Giao dịch mới</button>
      </div>
      <article class="panel">
        <div class="filter-grid">
          <label>
            <span>Tháng</span>
            <select data-filter-group="transaction" name="month">
              <option value="">Tất cả</option>
              ${Array.from({ length: 12 }, (_, idx) => idx + 1)
                .map(
                  (month) => `<option value="${month}" ${
                    String(vm.transactionsPage.filters.month || "") === String(month) ? "selected" : ""
                  }>${month}</option>`,
                )
                .join("")}
            </select>
          </label>
          <label>
            <span>Năm</span>
            <select data-filter-group="transaction" name="year">
              <option value="">Tất cả</option>
              ${[vm.derived.currentYear, vm.derived.currentYear - 1, vm.derived.currentYear - 2]
                .map(
                  (year) => `<option value="${year}" ${
                    String(vm.transactionsPage.filters.year || "") === String(year) ? "selected" : ""
                  }>${year}</option>`,
                )
                .join("")}
            </select>
          </label>
          <label>
            <span>Loại</span>
            <select data-filter-group="transaction" name="type">
              <option value="">Tất cả</option>
              ${optionsHtml(vm.transactionsPage.options.types, vm.transactionsPage.filters.type)}
            </select>
          </label>
          <label>
            <span>Nguồn thu</span>
            <select data-filter-group="transaction" name="source">
              <option value="">Tất cả</option>
              ${vm.transactionsPage.options.sources
                .map(
                  (source) => `<option value="${escapeHtml(source)}" ${
                    vm.transactionsPage.filters.source === source ? "selected" : ""
                  }>${escapeHtml(source)}</option>`,
                )
                .join("")}
            </select>
          </label>
          <label>
            <span>Danh mục</span>
            <select data-filter-group="transaction" name="category">
              <option value="">Tất cả</option>
              ${vm.transactionsPage.options.categories
                .map(
                  (category) => `<option value="${escapeHtml(category)}" ${
                    vm.transactionsPage.filters.category === category ? "selected" : ""
                  }>${escapeHtml(category)}</option>`,
                )
                .join("")}
            </select>
          </label>
          <label>
            <span>Tài khoản</span>
            <select data-filter-group="transaction" name="account">
              <option value="">Tất cả</option>
              ${optionsHtml(
                vm.transactionsPage.options.accounts.map((account) => ({
                  value: account.id,
                  label: account.name,
                })),
                vm.transactionsPage.filters.account,
              )}
            </select>
          </label>
          <label class="search-field">
            <span>Tìm kiếm</span>
            <input
              type="search"
              data-filter-group="transaction"
              name="search"
              placeholder="Mô tả, danh mục..."
              value="${escapeHtml(vm.transactionsPage.filters.search || "")}"
            />
          </label>
        </div>
        <div class="chip-row">
          ${vm.transactionsPage.activeChips
            .map(
              (chip) => `
              <button class="chip" data-action="remove-transaction-chip" data-chip-key="${escapeHtml(chip.key)}">
                ${escapeHtml(chip.label)} ×
              </button>
            `,
            )
            .join("")}
        </div>
      </article>
      <div class="kpi-grid">
        <div class="kpi-card">
          <span class="kpi-label">Tổng thu</span>
          <div class="kpi-value text-success">${formatVNDShort(vm.transactionsPage.summary.totalIncome)}</div>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Tổng chi</span>
          <div class="kpi-value text-danger">${formatVNDShort(vm.transactionsPage.summary.totalExpense)}</div>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Cân đối</span>
          <div class="kpi-value ${vm.transactionsPage.summary.balance >= 0 ? 'positive' : 'negative'}">${formatVNDShort(vm.transactionsPage.summary.balance)}</div>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Tỷ lệ tiết kiệm</span>
          <div class="kpi-value">${formatPct(vm.transactionsPage.summary.savingsRate)}</div>
        </div>
      </div>
      <article class="panel" style="margin-top: var(--space-6);">
        <div class="table-wrap" style="max-height: 600px; overflow-y: auto;">
          <table class="data-table">
            <thead style="position: sticky; top: 0; z-index: 10;">
              <tr>
                <th>Ngày</th>
                <th>Mô tả</th>
                <th>Danh mục</th>
                <th>Tài khoản</th>
                <th class="number-cell">Số tiền</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${
                vm.transactionsPage.rows.length
                  ? vm.transactionsPage.rows
                      .map(
                        (row) => {
                          const safeDate = String(row.date || "");
                          const iconHtml = row.type === 'income' ? '<i data-lucide="arrow-down-left" style="color:var(--text-success); width:16px; height:16px"></i>' :
                                           row.type === 'expense' ? '<i data-lucide="arrow-up-right" style="color:var(--text-danger); width:16px; height:16px"></i>' :
                                           row.type === 'transfer' ? '<i data-lucide="arrow-right-left" style="color:var(--color-text-muted); width:16px; height:16px"></i>' :
                                           '<i data-lucide="circle-dollar-sign" style="width:16px; height:16px"></i>';
                          return `
                          <tr>
                            <td style="white-space:nowrap; color:var(--color-text-muted)">${escapeHtml(safeDate.slice(5).replace("-", "/"))}</td>
                            <td>
                              <div style="display:flex; align-items:center; gap:var(--space-2)">
                                ${iconHtml}
                                <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:250px; display:inline-block">${escapeHtml(row.description || "")}</span>
                              </div>
                            </td>
                            <td><span class="pill">${escapeHtml(row.displayCategory || row.category || row.typeLabel)}</span></td>
                            <td>${escapeHtml(row.accountName)}</td>
                            <td class="number-cell ${row.type === 'income' ? 'positive' : row.type === 'expense' ? 'negative' : 'neutral'}">${row.type === "transfer" ? formatVNDShort(row.amount) : formatVNDShort(row.signedAmount)}</td>
                            <td class="row-actions text-right">
                              ${
                                row.isLinkedAssetMirror
                                  ? `<span style="font-size:var(--text-xs); color:var(--color-text-muted)">Sửa ở Danh Mục ĐT</span>`
                                  : `<button class="btn btn-ghost" style="height:32px; padding:0 var(--space-2)" data-action="edit-transaction" data-id="${escapeHtml(
                                      row.id,
                                    )}">Sửa</button>`
                              }
                              <button
                                class="btn btn-ghost danger" style="height:32px; padding:0 var(--space-2)"
                                data-action="delete-transaction"
                                data-id="${escapeHtml(row.id)}"
                                data-date="${escapeHtml(safeDate)}"
                                data-type="${escapeHtml(row.type)}"
                                data-amount="${escapeHtml(String(row.amount || 0))}"
                                data-account-id="${escapeHtml(row.account_id || row.to_account_id || row.from_account_id || "")}"
                              >Xóa</button>
                            </td>
                          </tr>
                        `;
                        }
                      )
                      .join("")
                  : `<tr><td colspan="6"><div class="empty-state">Không có giao dịch phù hợp bộ lọc hiện tại.</div></td></tr>`
              }
            </tbody>
          </table>
        </div>
      </article>
    </section>
  `;
}
