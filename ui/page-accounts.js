// Module: page-accounts | Responsibility: Account listing grouped by type

import { escapeHtml, formatVNDShort, sectionTitle } from "./shared.js";

export function renderAccountsPage(vm) {
  return `
    <section class="page">
      ${sectionTitle("Tài khoản", "Nhóm theo ngân hàng, ví điện tử, tiền mặt, đầu tư và thẻ tín dụng")}
      <div class="page-actions">
        <button class="btn btn-primary" data-action="open-modal" data-modal="account">+ Tài khoản</button>
      </div>
      <div class="stacked-groups">
        ${vm.accountsPage.groups
          .map(
            (group) => `
            <article class="panel">
              <div class="panel-head">
                <div>
                  <h3>${escapeHtml(group.label)}</h3>
                  <p>${group.items.length} tài khoản</p>
                </div>
              </div>
              <div class="account-grid">
                ${group.items
                  .map(
                    (account) => `
                    <div class="account-card">
                      <div class="account-main">
                        <div>
                          <strong>${escapeHtml(account.name)}</strong>
                          <span>${escapeHtml(account.bank_name || account.broker || account.label)}</span>
                        </div>
                        <strong class="account-balance ${account.balance < 0 ? "text-danger" : ""}">${formatVNDShort(
                          account.balance,
                        )}</strong>
                      </div>
                      <div class="account-meta">
                        ${
                          account.type === "credit_card"
                            ? `
                              <span>Dư nợ / hạn mức: ${formatVNDShort(Math.abs(Math.min(account.balance, 0)))} / ${formatVNDShort(
                                account.credit_limit,
                              )}</span>
                              <span>Đến hạn: ${escapeHtml(account.due_date || "-")}</span>
                            `
                            : `<span>Cập nhật ${account.last_updated || "-"}</span>`
                        }
                        ${
                          account.tracking_mode === "manual"
                            ? `<span class="pill ${account.stalenessDays > 35 ? "pill-warning" : ""}">Quá ${account.stalenessDays} ngày chưa cập nhật</span>`
                            : ""
                        }
                      </div>
                      <div class="row-actions">
                        <button class="btn btn-ghost" data-action="open-history" data-account-id="${escapeHtml(
                          account.id,
                        )}">Lịch sử</button>
                        ${
                          account.tracking_mode === "manual" &&
                          ["investment", "derivative", "securities_cash"].includes(account.type)
                            ? `<button class="btn btn-ghost" data-action="open-derivative-update" data-account-id="${escapeHtml(
                                account.id,
                              )}">Cập nhật số dư</button>`
                            : ""
                        }
                        <button class="btn btn-ghost" data-action="edit-account" data-id="${escapeHtml(
                          account.id,
                        )}">Sửa</button>
                        <button
                          class="btn btn-ghost danger"
                          data-action="delete-account"
                          data-id="${escapeHtml(account.id)}"
                          data-name="${escapeHtml(account.name)}"
                        >Xóa</button>
                      </div>
                    </div>
                  `,
                  )
                  .join("")}
              </div>
            </article>
          `,
          )
          .join("")}
      </div>
    </section>
  `;
}
