// Module: page-debts | Responsibility: Debts, receivables, counterparty ledgers, and goals

import { escapeHtml, formatVNDShort, formatPct, sectionTitle, renderProgressBar } from "./shared.js";

export function renderDebtCard(liability) {
  return `
    <article class="panel">
      <div class="panel-head">
        <div>
          <h3>${escapeHtml(liability.name)}</h3>
          <p>${escapeHtml(liability.type)}</p>
        </div>
        <button class="btn btn-ghost" data-action="record-debt-payment" data-liability-id="${escapeHtml(
          liability.id,
        )}">Ghi nhận trả nợ</button>
        <button class="btn btn-ghost" data-action="edit-liability" data-id="${escapeHtml(
          liability.id,
        )}">Sửa</button>
        <button class="btn btn-ghost danger" data-action="delete-liability" data-id="${escapeHtml(
          liability.id,
        )}">Xóa</button>
      </div>
      <div class="stat-stack">
        <div class="split-stat"><span>Đã trả</span><strong>${formatPct(liability.paidRatio)}</strong></div>
        ${renderProgressBar(liability.paidRatio, "#5e6ad2")}
        <div class="split-stat"><span>Dư nợ còn lại</span><strong>${formatVNDShort(liability.remaining_amount)}</strong></div>
        <div class="split-stat"><span>Gánh tháng</span><strong>${formatVNDShort(liability.monthly_payment)}</strong></div>
        <div class="split-stat"><span>Lãi tháng ước tính</span><strong>${formatVNDShort(liability.monthlyInterest)}</strong></div>
        <div class="split-stat"><span>Ước tính tất toán</span><strong>${
          liability.payoffMonths ? `${liability.payoffMonths} tháng` : "Không xác định"
        }</strong></div>
      </div>
      <div class="subpanel">
        <h4>Lịch sử thanh toán gần nhất</h4>
        <div class="mini-table">
          ${liability.paymentHistory
            .slice(0, 3)
            .map(
              (payment) => `
              <div class="mini-row">
                <span>${escapeHtml(payment.date)} • ${escapeHtml(payment.accountName)}</span>
                <strong>${formatVNDShort(payment.total_payment)}</strong>
              </div>
            `,
            )
            .join("")}
        </div>
      </div>
    </article>
  `;
}

export function renderReceivableCard(receivable) {
  const toneClass =
    receivable.likelihoodTone === "danger"
      ? "pill-danger"
      : receivable.likelihoodTone === "warning"
        ? "pill-warning"
        : "";
  return `
    <article class="panel">
      <div class="panel-head">
        <div>
          <h3>${escapeHtml(receivable.name)}</h3>
          <p>${escapeHtml(receivable.type || "Khoản cho vay")}</p>
        </div>
        <span class="pill ${toneClass}">${escapeHtml(receivable.likelihoodLabel || receivable.likelihood || "medium")}</span>
      </div>
      <div class="stat-stack">
        <div class="split-stat"><span>Người vay</span><strong>${escapeHtml(receivable.counterparty || "Chưa có")}</strong></div>
        <div class="split-stat"><span>Số gốc</span><strong>${formatVNDShort(receivable.original_amount)}</strong></div>
        <div class="split-stat"><span>Còn lại</span><strong>${formatVNDShort(receivable.remaining_amount)}</strong></div>
        <div class="split-stat"><span>Giá trị chiết khấu (${Math.round((receivable.discountFactor || 0) * 100)}%)</span><strong>${formatVNDShort(
          receivable.discountedValue,
        )}</strong></div>
        <div class="split-stat"><span>Dự kiến thu</span><strong>${escapeHtml(receivable.expected_return_date || "Chưa xác định")}</strong></div>
        <div class="split-stat"><span>Đã thu hồi</span><strong>${formatVNDShort(receivable.totalPaid || 0)}</strong></div>
        ${renderProgressBar(receivable.progressPct, "#27a644")}
        ${receivable.isFullyCollected ? `<span class="pill">Đã thu hồi xong</span>` : ""}
      </div>
      <div class="subpanel">
        <h4>Lịch sử thu nợ gần nhất</h4>
        <div class="mini-table">
          ${
            receivable.payments?.length
              ? receivable.payments
                  .slice(0, 3)
                  .map(
                    (payment) => `
                    <div class="mini-row">
                      <span>${escapeHtml(payment.date)} • ${escapeHtml(payment.accountName)}</span>
                      <strong>${formatVNDShort(payment.amount)}</strong>
                    </div>
                  `,
                  )
                  .join("")
              : `<div class="mini-row"><span>Chưa có lịch sử thu nợ.</span><strong>—</strong></div>`
          }
        </div>
      </div>
      <div class="row-actions">
        <button class="btn btn-ghost" data-action="record-receivable-payment" data-receivable-id="${escapeHtml(
          receivable.id,
        )}">Thu nợ</button>
        <button class="btn btn-ghost" data-action="edit-receivable" data-id="${escapeHtml(receivable.id)}">Sửa</button>
        <button class="btn btn-ghost danger" data-action="delete-receivable" data-id="${escapeHtml(
          receivable.id,
        )}">Xóa</button>
      </div>
    </article>
  `;
}

export function renderCounterpartyLedgerCard(ledger) {
  const netClass = ledger.netPosition >= 0 ? "text-success" : "text-danger";
  return `
    <article class="panel">
      <div class="panel-head">
        <div>
          <h3>${escapeHtml(ledger.counterparty)}</h3>
          <p>${ledger.liabilities.length} khoản nợ • ${ledger.receivables.length} khoản cho vay</p>
        </div>
        <button class="btn btn-ghost" data-action="open-counterparty-flow" data-counterparty="${escapeHtml(
          ledger.counterparty,
        )}">+ Dòng tiền</button>
      </div>
      <div class="stat-stack">
        <div class="split-stat"><span>Còn phải thu</span><strong>${formatVNDShort(ledger.receivableRemaining)}</strong></div>
        <div class="split-stat"><span>Còn phải trả</span><strong>${formatVNDShort(ledger.liabilityRemaining)}</strong></div>
        <div class="split-stat"><span>Vị thế ròng</span><strong class="${netClass}">${formatVNDShort(ledger.netPosition)}</strong></div>
        <div class="split-stat"><span>Tiền vào</span><strong>${formatVNDShort(ledger.flowIn)}</strong></div>
        <div class="split-stat"><span>Tiền ra</span><strong>${formatVNDShort(ledger.flowOut)}</strong></div>
      </div>
      <div class="subpanel">
        <h4>Lịch sử dòng tiền gần nhất</h4>
        <div class="mini-table">
          ${
            ledger.flowHistory?.length
              ? ledger.flowHistory
                  .map(
                    (flow) => `
                    <div class="mini-row">
                      <span>${escapeHtml(flow.date)} • ${escapeHtml(flow.label)} • ${escapeHtml(flow.accountName || "Chưa gán")}</span>
                      <strong class="${flow.direction === "in" ? "text-success" : "text-danger"}">${
                        flow.direction === "in" ? "+" : "-"
                      }${formatVNDShort(flow.amount)}</strong>
                    </div>
                  `,
                  )
                  .join("")
              : `<div class="mini-row"><span>Chưa có dòng tiền.</span><strong>—</strong></div>`
          }
        </div>
      </div>
    </article>
  `;
}

export function renderGoalCard(goal) {
  return `
    <article class="panel">
      <div class="panel-head">
        <div>
          <h3>${escapeHtml(goal.name)}</h3>
          <p>${escapeHtml(goal.type)}</p>
        </div>
        <div class="row-actions">
          <button class="btn btn-ghost" data-action="edit-goal" data-id="${escapeHtml(goal.id)}">Sửa</button>
          <button class="btn btn-ghost danger" data-action="delete-goal" data-id="${escapeHtml(goal.id)}">Xóa</button>
        </div>
      </div>
      <div class="stat-stack">
        <div class="split-stat"><span>Tiến độ</span><strong>${formatPct(goal.progressPct)}</strong></div>
        ${renderProgressBar(goal.progressPct, "#27a644")}
        <div class="split-stat"><span>Đã phân bổ</span><strong>${formatVNDShort(goal.totalAllocated)}</strong></div>
        <div class="split-stat"><span>Mục tiêu</span><strong>${formatVNDShort(goal.targetAmount)}</strong></div>
        <div class="split-stat"><span>Cần mỗi tháng</span><strong>${formatVNDShort(goal.monthlyRequired)}</strong></div>
        <div class="split-stat"><span>Dự báo đạt</span><strong>${escapeHtml(goal.forecastDate || "Chưa có")}</strong></div>
        ${goal.overdue ? `<span class="pill pill-danger">Đã quá hạn</span>` : ""}
      </div>
      <div class="subpanel">
        <h4>Breakdown theo nguồn</h4>
        ${goal.breakdown
          .map(
            (item) => `
            <div class="mini-row">
              <span>${escapeHtml(item.label)}</span>
              <strong>${formatVNDShort(item.usedValue)}</strong>
            </div>
          `,
          )
          .join("")}
      </div>
    </article>
  `;
}

export function renderDebtsGoalsPage(vm) {
  return `
    <section class="page">
      ${sectionTitle("Nợ & mục tiêu", "Quản lý công nợ theo đối tượng, dòng tiền ra/vào và mục tiêu tài chính")}
      <div class="dual-grid">
        <div class="stacked-groups">
          <div class="page-actions">
            <button class="btn btn-primary" data-action="open-modal" data-modal="liability">+ Khoản nợ</button>
            <button class="btn btn-ghost" data-action="open-modal" data-modal="receivable">+ Khoản cho vay</button>
            <button class="btn btn-ghost" data-action="open-modal" data-modal="counterparty-flow">+ Dòng tiền đối tượng</button>
          </div>
          ${
            vm.debtsGoalsPage.counterpartyLedgers?.length
              ? vm.debtsGoalsPage.counterpartyLedgers.map(renderCounterpartyLedgerCard).join("")
              : `<article class="panel"><div class="empty-state">Chưa có sổ công nợ theo đối tượng. Hãy thêm khoản nợ/cho vay hoặc ghi dòng tiền đối tượng.</div></article>`
          }
          ${vm.debtsGoalsPage.liabilities.map(renderDebtCard).join("")}
          ${vm.debtsGoalsPage.receivables.map(renderReceivableCard).join("")}
        </div>
        <div class="stacked-groups">
          <div class="page-actions">
            <button class="btn btn-primary" data-action="open-modal" data-modal="goal">+ Mục tiêu</button>
          </div>
          ${
            vm.debtsGoalsPage.warnings.length
              ? `
                <div class="banner banner-warning">
                  <strong>Cảnh báo đếm trùng</strong>
                  <span>${escapeHtml(
                    vm.debtsGoalsPage.warnings
                      .map((warning) => `${warning.sourceType}:${warning.sourceId} → ${warning.goalNames.join(", ")}`)
                      .join(" • "),
                  )}</span>
                </div>
              `
              : ""
          }
          ${vm.debtsGoalsPage.goals.map(renderGoalCard).join("")}
        </div>
      </div>
    </section>
  `;
}
