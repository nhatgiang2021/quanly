// Module: page-overview | Responsibility: Dashboard / overview page rendering

import { escapeHtml, formatVNDShort, formatPct, sectionTitle, assetTypeLabel, renderLineChart, renderDonutChart } from "./shared.js";

export function renderOverviewPage(vm) {
  const bucketNameMap = Object.fromEntries((vm.derived.activeBuckets || []).map((bucket) => [bucket.id, bucket.name]));
  const monthsEquivalent = Number(vm.dashboard.emergencyFund.monthsEquivalent || 0);
  const emergencyToneClass =
    monthsEquivalent >= 6 ? "text-success" : monthsEquivalent >= 3 ? "text-warning" : "text-danger";
  const irregular = vm.dashboard.volatility || {};
  const volatilityRatio =
    Number(irregular.avg || 0) > 0 ? (Number(irregular.volatility || 0) / Number(irregular.avg || 1)) * 100 : 0;
  const nw = vm.dashboard.kpis.find(k => k.label === "Tài sản ròng")?.value || 0;
  const ta = vm.dashboard.kpis.find(k => k.label === "Tổng tài sản")?.value || 0;
  const td = vm.dashboard.kpis.find(k => k.label === "Tổng nợ")?.value || 0;
  const ti = vm.dashboard.kpis.find(k => k.label === "Thu tháng")?.value || 0;
  const te = vm.dashboard.kpis.find(k => k.label === "Chi tháng")?.value || 0;
  const mom = vm.dashboard.netWorthMoM || 0;
  const momPct = nw - mom > 0 ? (mom / (nw - mom)) * 100 : 0;

  return `
    <section class="page">
      ${sectionTitle("Tổng quan", "Bức tranh tài chính cá nhân và gia đình ở thời điểm hiện tại")}

      <div class="kpi-grid">
        <div class="kpi-card" data-tone="primary">
          <span class="kpi-label">Tài sản ròng</span>
          <i data-lucide="landmark" class="kpi-icon"></i>
          <div class="kpi-value" data-countup="${nw}">${formatVNDShort(nw)}</div>
          <div class="kpi-delta ${mom >= 0 ? "positive" : "negative"}">${mom >= 0 ? "▲" : "▼"} ${formatVNDShort(Math.abs(mom))} (${momPct >= 0 ? "+" : ""}${momPct.toFixed(1)}%) so tháng trước</div>
        </div>
        <div class="kpi-card" data-tone="success">
          <span class="kpi-label">Tổng tài sản</span>
          <i data-lucide="trending-up" class="kpi-icon"></i>
          <div class="kpi-value" data-countup="${ta}">${formatVNDShort(ta)}</div>
          <div class="kpi-delta neutral">Tài sản đang nắm giữ</div>
        </div>
        <div class="kpi-card" data-tone="danger">
          <span class="kpi-label">Tổng nợ</span>
          <i data-lucide="trending-down" class="kpi-icon"></i>
          <div class="kpi-value text-danger" data-countup="${td}">${formatVNDShort(td)}</div>
          <div class="kpi-delta neutral">Nợ phải trả</div>
        </div>
        <div class="kpi-card" data-tone="${ti - te >= 0 ? "success" : "danger"}">
          <span class="kpi-label">Thu / Chi tháng</span>
          <i data-lucide="wallet" class="kpi-icon"></i>
          <div class="kpi-value"><span class="text-success">${formatVNDShort(ti)}</span> <span class="text-muted" style="font-weight:400; font-size:var(--text-base)">/</span> <span class="text-danger">${formatVNDShort(te)}</span></div>
          <div class="kpi-delta ${ti - te >= 0 ? "positive" : "negative"}">${ti - te >= 0 ? "🟢 Thặng dư" : "🔴 Thâm hụt"} ${formatVNDShort(Math.abs(ti - te))}</div>
        </div>
      </div>

      <article class="panel panel-wide" style="margin-bottom: var(--space-6);">
        <div class="panel-head">
          <div>
            <h3>Tài sản ròng 12 tháng</h3>
            <p>Dựng lại từ sổ giao dịch; tháng chưa có snapshot định giá theo giá hiện tại</p>
          </div>
        </div>
        ${renderLineChart(vm.dashboard.netWorthHistory, "var(--color-primary)")}
      </article>

      <div class="overview-layout">
        <div class="flex-col gap-4">
          <article class="panel">
            <div class="panel-head">
              <div>
                <h3>Giao dịch gần đây</h3>
                <p>8 giao dịch mới nhất</p>
              </div>
            </div>
            <div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr><th>Ngày</th><th>Loại</th><th>Mô tả</th><th>Tài khoản</th><th class="number-cell">Số tiền</th></tr>
                </thead>
                <tbody>
                  ${vm.dashboard.recentTransactions
                    .map(
                      (row) => `
                      <tr>
                        <td style="white-space:nowrap">${escapeHtml(row.date.slice(5).replace("-", "/"))}</td>
                        <td>
                          <span class="pill">${escapeHtml(row.typeLabel)}</span>
                        </td>
                        <td>${escapeHtml(row.description || row.category || "")}</td>
                        <td>${escapeHtml(row.accountName)}</td>
                        <td class="number-cell ${row.type === 'income' ? 'positive' : row.type === 'expense' ? 'negative' : 'neutral'}">${row.type === "transfer" ? formatVNDShort(row.amount) : formatVNDShort(row.signedAmount)}</td>
                      </tr>
                    `,
                    )
                    .join("")}
                </tbody>
              </table>
            </div>
          </article>
        </div>

        <div class="flex-col gap-4" style="display:flex; flex-direction:column; gap:var(--space-6)">
          <article class="panel">
            <div class="panel-head">
              <div>
                <h3>Phân bổ theo lớp tài sản</h3>
                <p>Tỷ trọng các lớp tài sản đang nắm giữ</p>
              </div>
            </div>
            ${renderCompositionBars(vm.dashboard.assetComposition)}
          </article>

          <article class="panel">
            <div class="panel-head">
              <div>
                <h3>Phân bổ danh mục</h3>
                <p>4 bucket đầu tư theo giá trị</p>
              </div>
            </div>
            ${renderDonutChart(
              vm.dashboard.portfolioBuckets.map((bucket) => ({
                label: bucket.name,
                value: bucket.value,
                color: bucket.color,
              })),
            )}
          </article>

          <article class="panel">
            <div class="panel-head">
              <div>
                <h3>Tài sản nổi bật</h3>
                <p>Top theo giá trị hiện tại</p>
              </div>
            </div>
            <div style="display:grid; gap:var(--space-3)">
              ${vm.dashboard.topAssets.slice(0, 4)
                .map(
                  (asset) => `
                  <div style="display:flex; justify-content:space-between; align-items:center; padding-bottom:var(--space-2); border-bottom:1px solid var(--color-divider)">
                    <div style="display:flex; flex-direction:column">
                      <strong style="font-size:var(--text-sm)">${escapeHtml(asset.name)}</strong>
                      <span style="font-size:var(--text-xs); color:var(--color-text-muted)">${escapeHtml(assetTypeLabel(asset.asset_type))}</span>
                    </div>
                    <div style="display:flex; flex-direction:column; align-items:flex-end">
                      <strong class="number">${formatVNDShort(asset.currentValue)}</strong>
                      <span style="font-size:var(--text-xs)" class="${asset.totalReturn >= 0 ? 'positive' : 'negative'}">${asset.totalReturn >= 0 ? '+' : ''}${formatVNDShort(asset.totalReturn)}</span>
                    </div>
                  </div>
                `,
                )
                .join("")}
            </div>
          </article>
        </div>
      </div>
    </section>
  `;
}

// Thanh phân bổ ngang cho cơ cấu tài sản ròng theo lớp tài sản.
function renderCompositionBars(composition) {
  const data = composition || { total: 0, segments: [] };
  const segments = data.segments || [];
  if (!segments.length || data.total <= 0) {
    return `<div class="empty-hint" style="padding:var(--space-4); color:var(--color-text-muted); font-size:var(--text-sm)">Chưa có tài sản để phân tích cơ cấu.</div>`;
  }
  const bar = segments
    .map(
      (segment) =>
        `<span title="${escapeHtml(segment.label)}: ${formatPct(segment.pct)}" style="width:${segment.pct.toFixed(2)}%; background:${segment.color};"></span>`,
    )
    .join("");
  const legend = segments
    .map(
      (segment) => `
        <div style="display:flex; justify-content:space-between; align-items:center; gap:var(--space-3); padding:var(--space-1) 0">
          <span style="display:flex; align-items:center; gap:var(--space-2); font-size:var(--text-sm)">
            <span style="width:10px; height:10px; border-radius:3px; background:${segment.color}; flex:none"></span>
            ${escapeHtml(segment.label)}
          </span>
          <span style="display:flex; gap:var(--space-3); align-items:baseline">
            <strong class="number" style="font-size:var(--text-sm)">${formatVNDShort(segment.value)}</strong>
            <span class="text-muted" style="font-size:var(--text-xs); min-width:42px; text-align:right">${formatPct(segment.pct)}</span>
          </span>
        </div>
      `,
    )
    .join("");
  return `
    <div style="display:flex; flex-direction:column; gap:var(--space-3)">
      <div style="display:flex; height:14px; border-radius:7px; overflow:hidden; background:var(--color-surface-2, rgba(255,255,255,0.04))">${bar}</div>
      <div>${legend}</div>
    </div>
  `;
}
