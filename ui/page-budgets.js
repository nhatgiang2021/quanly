// Module: page-budgets | Responsibility: Budget tracking — month, year matrix, compare views

import { escapeHtml, formatVNDShort, formatPct, sectionTitle } from "./shared.js";

export function renderBudgetMatrix(rows, activeBuckets) {
  return `
    <div class="table-wrap">
      <table class="data-table matrix-table">
        <thead>
          <tr>
            <th>Tháng</th>
            ${activeBuckets.map((bucket) => `<th>${escapeHtml(bucket.name)}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (row) => `
              <tr>
                <td>${escapeHtml(row.month)}</td>
                ${activeBuckets
                  .map((bucket) => {
                    const match = row.buckets.find((item) => item.allocationId === bucket.id);
                    if (!match) {
                      return "<td>—</td>";
                    }
                    const used = match.type === "expense_budget" ? match.spentAmount : match.investedAmount;
                    return `<td>${formatVNDShort(used)} / ${formatVNDShort(match.effectiveBudget)}</td>`;
                  })
                  .join("")}
              </tr>
            `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

export function renderBudgetCompare(rows) {
  return `
    <div class="compare-stack">
      ${rows
        .map(
          (row) => `
          <div class="compare-card">
            <div class="split-stat">
              <strong>${escapeHtml(row.name)}</strong>
              <span>${formatVNDShort(row.currentYear)} / ${formatVNDShort(row.previousYear)}</span>
            </div>
            <div class="compare-bars">
              <div class="compare-track">
                <span class="compare-fill current" style="width:${Math.min(
                  100,
                  row.currentYear > 0 ? (row.currentYear / Math.max(row.currentYear, row.previousYear, 1)) * 100 : 0,
                )}%; background:${row.color};"></span>
              </div>
              <div class="compare-track">
                <span class="compare-fill previous" style="width:${Math.min(
                  100,
                  row.previousYear > 0 ? (row.previousYear / Math.max(row.currentYear, row.previousYear, 1)) * 100 : 0,
                )}%;"></span>
              </div>
            </div>
          </div>
        `,
        )
        .join("")}
    </div>
  `;
}

export function renderBudgetsPage(vm, uiState) {
  const subtab = uiState.budgetSubtab || "month";
  const year = Number(vm.budgetsPage.year);
  const currentMonth = vm.budgetsPage.month;
  const [y, m] = currentMonth.split("-").map(Number);
  const prevMonth = m === 1 ? `${y-1}-12` : `${y}-${String(m-1).padStart(2,"0")}`;
  const nextMonth = m === 12 ? `${y+1}-01` : `${y}-${String(m+1).padStart(2,"0")}`;
  const monthLabel = `Tháng ${m}/${y}`;
  const expenseBuckets = vm.budgetsPage.monthData.expenseBuckets || [];
  const investmentBuckets = vm.budgetsPage.monthData.investmentBuckets || [];
  const allBuckets = [...expenseBuckets, ...investmentBuckets];
  const totalSpent = expenseBuckets.reduce((s, b) => s + (b.spentAmount || 0), 0);
  const totalInvested = investmentBuckets.reduce((s, b) => s + (b.investedAmount || 0), 0);
  const totalBudget = expenseBuckets.reduce((s, b) => s + Math.max(0, b.effectiveBudget || 0), 0);
  const totalAllocated = investmentBuckets.reduce((s, b) => s + Math.max(0, b.allocatedAmount || 0), 0);
  const overallPct = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const renderBucketCard = (bucket) => {
    const used = bucket.type === "expense_budget" ? bucket.spentAmount : bucket.investedAmount;
    const budget = bucket.type === "expense_budget" ? (bucket.effectiveBudget || 0) : (bucket.allocatedAmount || 0);
    const displayBudget = Math.max(0, budget);
    const pct = displayBudget > 0 ? (used / displayBudget) * 100 : (used > 0 ? 100 : 0);
    const statusColor = pct > 100 ? "var(--color-danger)" : pct >= 80 ? "var(--color-warning)" : "var(--color-success)";
    return `
      <div class="budget-card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--space-3)">
          <div style="display:flex; align-items:center; gap:var(--space-2)">
            <span style="width:12px; height:12px; border-radius:50%; background:${bucket.color}"></span>
            <strong style="font-size:var(--text-base)">${escapeHtml(bucket.name)}</strong>
          </div>
          <span class="pill ${pct > 100 ? "pill-danger" : pct >= 80 ? "pill-warning" : "pill-success"}">${escapeHtml(bucket.status)}</span>
        </div>
        <div style="display:flex; flex-direction:column; gap:var(--space-2)">
          <div style="display:flex; align-items:center; gap:var(--space-3)">
            <div style="flex:1; height:8px; background:var(--color-divider); border-radius:4px; overflow:hidden">
              <div style="height:100%; width:${Math.min(100, Math.abs(pct))}%; background:${statusColor}; border-radius:4px; transition:width 0.3s ease"></div>
            </div>
            <span style="color:${statusColor}; font-weight:600; font-size:var(--text-sm)">${formatPct(pct)}</span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:var(--text-sm)">
            <span>${formatVNDShort(used)} / <span style="color:var(--color-text-muted)">${formatVNDShort(displayBudget)}</span></span>
            ${bucket.rolloverIn !== 0 ? `<span style="font-size:var(--text-xs); background:var(--color-surface-hover); padding:2px 6px; border-radius:4px;" class="${bucket.rolloverIn > 0 ? "positive" : "negative"}">${bucket.rolloverIn > 0 ? "+" : ""}${formatVNDShort(bucket.rolloverIn)} cộng dồn</span>` : ""}
          </div>
        </div>
      </div>
    `;
  };

  return `
    <section class="page">
      ${sectionTitle("Ngân sách", "Theo dõi ngân sách cơ sở, cộng dồn và mức sử dụng theo năm")}

      <div class="budget-nav">
        <div class="subtabs">
          <button class="tab-btn ${subtab === "month" ? "is-active" : ""}" data-action="set-budget-subtab" data-value="month">Tháng</button>
          <button class="tab-btn ${subtab === "year" ? "is-active" : ""}" data-action="set-budget-subtab" data-value="year">Lũy kế năm</button>
          <button class="tab-btn ${subtab === "compare" ? "is-active" : ""}" data-action="set-budget-subtab" data-value="compare">So sánh</button>
        </div>
        ${subtab === "month" ? `
        <div class="budget-month-nav">
          <button class="btn btn-ghost" onclick="document.querySelector('[data-ui-state=selectedBudgetMonth]').value='${prevMonth}'; document.querySelector('[data-ui-state=selectedBudgetMonth]').dispatchEvent(new Event('change',{bubbles:true}))" title="Tháng trước">←</button>
          <span class="budget-month-label">${monthLabel}</span>
          <button class="btn btn-ghost" onclick="document.querySelector('[data-ui-state=selectedBudgetMonth]').value='${nextMonth}'; document.querySelector('[data-ui-state=selectedBudgetMonth]').dispatchEvent(new Event('change',{bubbles:true}))" title="Tháng sau">→</button>
          <select data-ui-state="budgetYear" class="budget-year-select">
            ${vm.budgetsPage.availableYears
              .map(
                (yr) => `<option value="${yr}" ${Number(vm.budgetsPage.year) === Number(yr) ? "selected" : ""}>${yr}</option>`,
              )
              .join("")}
          </select>
          <input type="month" data-ui-state="selectedBudgetMonth" value="${escapeHtml(currentMonth)}" style="display:none" />
        </div>
        ` : ""}
      </div>

      ${subtab === "month" ? `
        ${allBuckets.length ? `
        <div class="budget-summary">
          <div class="budget-summary-item">
            <span>Đã chi tiêu</span>
            <strong>${formatVNDShort(totalSpent)}</strong>
            <span class="budget-summary-pct">${totalBudget > 0 ? formatPct(overallPct) : "—"} ngân sách</span>
          </div>
          <div class="budget-summary-item">
            <span>Đã đầu tư</span>
            <strong>${formatVNDShort(totalInvested)}</strong>
            <span class="budget-summary-pct">${totalAllocated > 0 ? formatPct((totalInvested/totalAllocated)*100) : "—"} phân bổ</span>
          </div>
          <div class="budget-summary-item">
            <span>Nguồn tháng</span>
            <strong>${escapeHtml(vm.budgetsPage.monthData.budgetBase.source)}</strong>
            <span class="budget-summary-pct">${formatVNDShort(vm.budgetsPage.monthData.budgetBase.baseAmount)}</span>
          </div>
        </div>

        <article class="panel">
          <div class="panel-head">
            <div>
              <h3>Chi tiêu</h3>
              <p>5 hũ — ngân sách cơ sở + rollover</p>
            </div>
          </div>
          <div class="budget-card-grid">
            ${expenseBuckets.map(renderBucketCard).join("")}
          </div>
        </article>

        <article class="panel">
          <div class="panel-head">
            <div>
              <h3>Đầu tư</h3>
              <p>4 hũ — phân bổ, đã đầu tư, còn lại</p>
            </div>
          </div>
          <div class="budget-card-grid">
            ${investmentBuckets.map(renderBucketCard).join("")}
          </div>
        </article>
        ` : `<div class="empty-state">Chưa có dữ liệu ngân sách tháng này.</div>`}
      ` : subtab === "year"
        ? renderBudgetMatrix(vm.budgetsPage.matrixRows, vm.derived.activeBuckets)
        : renderBudgetCompare(vm.budgetsPage.compareRows)
      }
    </section>
  `;
}
