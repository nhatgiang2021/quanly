// Module: page-reports | Responsibility: 6 report types with tables and charts

import { escapeHtml, formatMaybeCurrency, sectionTitle, renderLineChart, renderDonutChart, renderMiniBars } from "./shared.js";

export function renderGenericTable(rows) {
  if (!rows.length) {
    return `<div class="empty-state">Chưa có dữ liệu cho báo cáo này.</div>`;
  }
  const headers = Object.keys(rows[0]);
  return `
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>${headers.map((header) => `<th>${escapeHtml(header.replaceAll("_", " "))}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (row) => `
              <tr>
                ${headers.map((header) => `<td>${formatMaybeCurrency(row[header])}</td>`).join("")}
              </tr>
            `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

export function renderReportsPage(vm) {
  return `
    <section class="page">
      ${sectionTitle("Báo cáo", "6 loại báo cáo có bảng dữ liệu và nút xuất CSV")}
      <div class="toolbar">
        <div class="toolbar-filters wide">
          <label>
            <span>Loại báo cáo</span>
            <select data-ui-state="reportType">
              <option value="income-expense" ${vm.reportsPage.reportType === "income-expense" ? "selected" : ""}>Thu chi theo tháng</option>
              <option value="expense-breakdown" ${vm.reportsPage.reportType === "expense-breakdown" ? "selected" : ""}>Danh mục chi tiêu</option>
              <option value="allocation" ${vm.reportsPage.reportType === "allocation" ? "selected" : ""}>Phân bổ danh mục</option>
              <option value="performance" ${vm.reportsPage.reportType === "performance" ? "selected" : ""}>Hiệu suất đầu tư</option>
              <option value="net-worth" ${vm.reportsPage.reportType === "net-worth" ? "selected" : ""}>Tài sản ròng</option>
              <option value="year-summary" ${vm.reportsPage.reportType === "year-summary" ? "selected" : ""}>Tổng kết năm</option>
              <option value="liquidity" ${vm.reportsPage.reportType === "liquidity" ? "selected" : ""}>Phân tích thanh khoản</option>
            </select>
          </label>
          <label>
            <span>Năm</span>
            <input type="number" min="${vm.derived.currentYear - 3}" max="${vm.derived.currentYear + 1}" data-ui-state="reportYear" value="${vm.reportsPage.reportYear}" />
          </label>
        </div>
        <button class="btn btn-primary" data-action="export-report">Xuất CSV</button>
      </div>
      <article class="panel">
        <div class="panel-head">
          <div>
            <h3>${escapeHtml(vm.reportsPage.report.title)}</h3>
            <p>Bảng dữ liệu và biểu đồ tóm tắt</p>
          </div>
        </div>
        <div style="padding-bottom: var(--space-4);">
          ${
            vm.reportsPage.reportType === "net-worth" 
              ? renderLineChart(vm.reportsPage.report.chartRows, "var(--color-primary)") 
              : vm.reportsPage.reportType === "allocation" || vm.reportsPage.reportType === "expense-breakdown"
                ? renderDonutChart(vm.reportsPage.report.chartRows)
                : renderMiniBars(vm.reportsPage.report.chartRows)
          }
        </div>
      </article>
      <article class="panel">${renderGenericTable(vm.reportsPage.report.rows)}</article>
    </section>
  `;
}
