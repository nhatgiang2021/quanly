// Module: page-portfolio | Responsibility: Investment portfolio — overview, transactions, assets table

import { ASSET_ACTION_LABELS } from "../computations.js";
import {
  escapeHtml, formatVNDShort, formatPct, sectionTitle, assetTypeLabel,
  ASSET_ACTION_ORDER, buildVirtualTradingAccountAssets, buildGroupedAssets,
  renderDonutChart, optionsHtml,
} from "./shared.js";

export function renderPortfolioPage(vm, uiState) {
  const subtab = uiState.portfolioSubtab || "overview";
  const bucketNameMap = Object.fromEntries((vm.derived.activeBuckets || []).map((bucket) => [bucket.id, bucket.name]));
  const groupBy = uiState.portfolioAssetGroupBy || "type";
  const sortBy = uiState.portfolioAssetSortBy || "value_desc";
  const tradeBucketId =
    (vm.derived.activeBuckets || []).find((bucket) => bucket.id === "alloc_trade")?.id ||
    (vm.derived.activeBuckets || []).find((bucket) => bucket.type !== "expense_budget")?.id ||
    "alloc_trade";
  const virtualAccountAssets = buildVirtualTradingAccountAssets(
    vm.derived.accounts || [],
    vm.derived.transactionViews || [],
    tradeBucketId,
  );
  const portfolioAssets = [...(vm.portfolioPage.assets || []), ...virtualAccountAssets];
  const totalPortfolioValue = portfolioAssets.reduce((sum, a) => sum + Number(a.currentValue || 0), 0) || 1;
  const groupedAssets = buildGroupedAssets(portfolioAssets, groupBy, sortBy, bucketNameMap);
  return `
    <section class="page">
      ${sectionTitle("Danh mục đầu tư", "Theo dõi giá trị, lãi/lỗ, giao dịch và tài sản theo từng nhóm")}
      <div class="page-actions" style="margin-bottom:0">
        <div style="display:flex; gap:var(--space-2)">
          <button class="btn ${subtab === "overview" ? "btn-primary" : "btn-ghost"}" data-action="set-portfolio-subtab" data-value="overview">Tổng quan</button>
          <button class="btn ${subtab === "transactions" ? "btn-primary" : "btn-ghost"}" data-action="set-portfolio-subtab" data-value="transactions">Giao dịch</button>
          <button class="btn ${subtab === "assets" ? "btn-primary" : "btn-ghost"}" data-action="set-portfolio-subtab" data-value="assets">Tài sản</button>
        </div>
        <div class="page-actions" style="margin-bottom:0">
          <button class="btn btn-ghost" data-action="open-ai-entry" title="Nhập nhanh bằng câu tự nhiên">✨ AI nhập</button>
          ${
            subtab === "transactions"
              ? `<button class="btn btn-primary" data-action="open-modal" data-modal="asset-transaction">+ Giao dịch tài sản</button>`
              : `<button class="btn btn-primary" data-action="open-modal" data-modal="asset">+ Tài sản</button>`
          }
        </div>
      </div>
      ${
        subtab === "overview"
          ? `
            <div class="kpi-grid">
              ${vm.portfolioPage.bucketCards
                .map(
                  (bucket) => `
                  <div class="kpi-card">
                    <span class="kpi-label">${escapeHtml(bucket.name)}</span>
                    <div class="kpi-value">${formatVNDShort(bucket.value)}</div>
                    <div style="display:flex; justify-content:space-between; width:100%; margin-bottom:var(--space-2)">
                      <span style="font-size:var(--text-xs); color:var(--color-text-muted)">Chiếm ${formatPct(bucket.pct)}</span>
                      <span class="${bucket.realizedPnL >= 0 ? 'positive' : 'negative'}">${bucket.realizedPnL >= 0 ? '+' : ''}${formatVNDShort(bucket.realizedPnL)} đã chốt</span>
                    </div>
                    <div style="width:100%; height:4px; background:var(--color-divider); border-radius:2px; overflow:hidden">
                      <div style="height:100%; width:${Math.max(0, Math.min(100, bucket.pct))}%; background:${bucket.color}"></div>
                    </div>
                  </div>
                `,
                )
                .join("")}
            </div>
            <div class="dual-grid">
              <article class="panel">
                <div class="panel-head">
                  <div>
                    <h3>Tỷ trọng phân bổ</h3>
                  </div>
                </div>
                ${renderDonutChart(
                vm.portfolioPage.bucketCards.map((bucket) => ({
                  label: bucket.name,
                  value: bucket.value,
                  color: bucket.color,
                })),
              )}</article>
              <article class="panel">
                <div class="panel-head">
                  <div>
                    <h3>Phân bổ thực tế vs mục tiêu</h3>
                    <p>Độ lệch vượt ngưỡng sẽ nổi trên dashboard</p>
                  </div>
                </div>
                <div style="display:flex; flex-direction:column; gap:var(--space-3)">
                  ${vm.portfolioPage.bucketCards
                    .map(
                      (bucket) => `
                      <div style="display:flex; flex-direction:column; gap:var(--space-1)">
                        <div style="display:flex; justify-content:space-between; align-items:center">
                          <strong>${escapeHtml(bucket.name)}</strong>
                          <span style="font-size:var(--text-xs); color:var(--color-text-muted)">
                            Thực tế ${formatPct(bucket.pct)} • Mục tiêu ${formatPct(bucket.target)}
                            <span class="${Math.abs(bucket.deviation) > vm.derived.settings.rebalance_threshold ? "text-warning" : ""} style="margin-left:8px">
                              ${escapeHtml(bucket.deviationLabel)}
                            </span>
                          </span>
                        </div>
                        <div style="width:100%; height:6px; background:var(--color-divider); border-radius:3px; overflow:hidden">
                          <div style="height:100%; width:${Math.max(0, Math.min(100, bucket.pct))}%; background:${bucket.color}"></div>
                        </div>
                      </div>
                    `,
                    )
                    .join("")}
                </div>
              </article>
            </div>
          `
          : subtab === "transactions"
            ? `
              <article class="panel" style="margin-bottom:var(--space-4)">
                <div class="filter-grid asset-filter-grid">
                  <label>
                    <span>Tài sản</span>
                    <select data-filter-group="asset" name="asset">
                      <option value="">Tất cả</option>
                      ${vm.portfolioPage.assets
                        .map(
                          (asset) => `<option value="${escapeHtml(asset.id)}" ${
                            vm.portfolioPage.assetTxnFilters.asset === asset.id ? "selected" : ""
                          }>${escapeHtml(asset.name)}</option>`,
                        )
                        .join("")}
                    </select>
                  </label>
                  <label>
                    <span>Hành động</span>
                    <select data-filter-group="asset" name="action">
                      <option value="">Tất cả</option>
                      ${ASSET_ACTION_ORDER
                        .map(
                          (action) => `<option value="${action}" ${
                            vm.portfolioPage.assetTxnFilters.action === action ? "selected" : ""
                          }>${escapeHtml(ASSET_ACTION_LABELS[action] || action)}</option>`,
                        )
                        .join("")}
                    </select>
                  </label>
                  <label><span>Từ ngày</span><input type="date" data-filter-group="asset" name="from" value="${escapeHtml(
                    vm.portfolioPage.assetTxnFilters.from || "",
                  )}" /></label>
                  <label><span>Đến ngày</span><input type="date" data-filter-group="asset" name="to" value="${escapeHtml(
                    vm.portfolioPage.assetTxnFilters.to || "",
                  )}" /></label>
                </div>
              </article>
              <article class="panel">
                <div class="table-wrap">
                  <table class="data-table">
                    <thead>
                      <tr><th>Ngày</th><th>Tài sản</th><th>Hành động</th><th class="number-cell">SL</th><th class="number-cell">Giá</th><th class="number-cell">Tiền</th><th></th></tr>
                    </thead>
                    <tbody>
                      ${
                        vm.portfolioPage.assetLedger.length
                          ? vm.portfolioPage.assetLedger
                              .map(
                                (row) => `
                                <tr>
                                  <td style="white-space:nowrap; color:var(--color-text-muted)">${escapeHtml(row.date.slice(5).replace("-", "/"))}</td>
                                  <td>${escapeHtml(row.assetName)}</td>
                                  <td><span class="pill">${escapeHtml(row.actionLabel || row.action)}</span></td>
                                  <td class="number-cell">${escapeHtml(row.quantity)}</td>
                                  <td class="number-cell">${formatVNDShort(row.price)}</td>
                                  <td class="number-cell">${formatVNDShort(row.total_cash)}</td>
                                  <td class="row-actions text-right">
                                    <button class="btn btn-ghost" style="height:32px; padding:0 var(--space-2)" data-action="edit-asset-transaction" data-id="${escapeHtml(
                                      row.id,
                                    )}">Sửa</button>
                                    <button class="btn btn-ghost danger" style="height:32px; padding:0 var(--space-2)" data-action="delete-asset-transaction" data-id="${escapeHtml(
                                      row.id,
                                    )}">Xóa</button>
                                  </td>
                                </tr>
                              `,
                              )
                              .join("")
                          : `<tr><td colspan="7"><div class="empty-state">Chưa có giao dịch tài sản.</div></td></tr>`
                      }
                    </tbody>
                  </table>
                </div>
              </article>
            `
            : `
              <article class="panel" style="margin-bottom:var(--space-4)">
                <div class="toolbar-filters" style="margin-bottom:0">
                  <label>
                    <span style="font-size:var(--text-xs); color:var(--color-text-muted)">Phân loại</span>
                    <select data-ui-state="portfolioAssetGroupBy">
                      <option value="type" ${groupBy === "type" ? "selected" : ""}>Theo loại tài sản</option>
                      <option value="bucket" ${groupBy === "bucket" ? "selected" : ""}>Theo hũ phân bổ</option>
                      <option value="none" ${groupBy === "none" ? "selected" : ""}>Không phân nhóm</option>
                    </select>
                  </label>
                  <label>
                    <span style="font-size:var(--text-xs); color:var(--color-text-muted)">Sắp xếp</span>
                    <select data-ui-state="portfolioAssetSortBy">
                      <option value="value_desc" ${sortBy === "value_desc" ? "selected" : ""}>Giá trị giảm dần</option>
                      <option value="value_asc" ${sortBy === "value_asc" ? "selected" : ""}>Giá trị tăng dần</option>
                      <option value="pnl_desc" ${sortBy === "pnl_desc" ? "selected" : ""}>Lãi/lỗ giảm dần</option>
                      <option value="pnl_asc" ${sortBy === "pnl_asc" ? "selected" : ""}>Lãi/lỗ tăng dần</option>
                      <option value="name_asc" ${sortBy === "name_asc" ? "selected" : ""}>Tên A-Z</option>
                      <option value="name_desc" ${sortBy === "name_desc" ? "selected" : ""}>Tên Z-A</option>
                    </select>
                  </label>
                </div>
              </article>
              <article class="panel">
                <div class="table-wrap">
                  <table class="data-table">
                    <thead>
                      <tr><th>Tài sản</th><th>Hũ phân bổ</th><th class="number-cell">SL</th><th class="number-cell">Giá hiện tại</th><th class="number-cell">Giá trị</th><th class="number-cell">Lãi/lỗ đã TH</th><th class="number-cell">Lãi/lỗ chưa TH</th><th class="number-cell" title="Tỷ suất sinh lời theo thời gian (money-weighted, năm hóa)">XIRR/năm</th><th>Ghi chú nhanh</th><th></th></tr>
                    </thead>
                    <tbody>
                      ${groupedAssets.length
                        ? groupedAssets
                        .map(
                          (group) => `
                          <tr style="background: var(--color-surface); border-bottom: 2px solid var(--color-divider);">
                            <td colspan="10" style="padding:var(--space-4)">
                              <div style="display:flex; justify-content:space-between; align-items:center">
                                <strong>${escapeHtml(group.label)}</strong>
                                <span style="font-size:var(--text-sm); color:var(--color-text-muted)">${escapeHtml(group.rows.length)} tài sản • <strong class="number" style="color:var(--color-text)">${formatVNDShort(group.totalValue)}</strong></span>
                              </div>
                            </td>
                          </tr>
                          ${group.rows
                            .map(
                              (asset) => `
                              <tr>
                                <td>
                                  <strong>${escapeHtml(asset.name)}</strong>
                                  <div style="font-size:var(--text-xs); color:var(--color-text-muted)">${escapeHtml(
                                    asset.isVirtualAccount
                                      ? `${assetTypeLabel(asset.asset_type)} • ${asset.accountTypeLabel || ""}`
                                      : asset.ticker || assetTypeLabel(asset.asset_type),
                                  )}</div>
                                </td>
                                <td>${escapeHtml(bucketNameMap[asset.bucket] || asset.bucket)}</td>
                                <td class="number-cell">${escapeHtml(asset.holdingQty)}</td>
                                <td class="number-cell">${asset.isVirtualAccount ? "—" : formatVNDShort(asset.current_price)}</td>
                                <td class="number-cell">
                                  <strong>${formatVNDShort(asset.currentValue)}</strong>
                                  <div style="width: 100%; margin-top: 4px; height: 4px; background: var(--color-divider); border-radius: 2px;">
                                    <div style="height: 100%; width: ${(asset.currentValue / totalPortfolioValue) * 100}%; background: var(--color-primary); border-radius: 2px;"></div>
                                  </div>
                                </td>
                                <td class="number-cell"><span class="${asset.realizedPnL >= 0 ? 'positive' : 'negative'}">${asset.realizedPnL >= 0 ? '+' : ''}${formatVNDShort(asset.realizedPnL)}</span></td>
                                <td class="number-cell" style="background-color: ${asset.unrealizedPnL >= 0 ? 'oklch(from var(--color-success) l c h / 0.1)' : 'oklch(from var(--color-danger) l c h / 0.1)'}">
                                  <span class="${asset.unrealizedPnL >= 0 ? 'text-success' : 'text-danger'}">${asset.unrealizedPnL >= 0 ? '+' : ''}${formatVNDShort(asset.unrealizedPnL)}</span>
                                </td>
                                <td class="number-cell">
                                  ${
                                    asset.isVirtualAccount || asset.xirrPct === null || asset.xirrPct === undefined
                                      ? `<span style="color:var(--color-text-muted)">—</span>`
                                      : `<span class="${asset.xirrPct >= 0 ? 'text-success' : 'text-danger'}">${asset.xirrPct >= 0 ? '+' : ''}${asset.xirrPct.toFixed(1)}%</span>`
                                  }
                                </td>
                                <td>
                                  <div style="font-size:var(--text-xs); color:var(--color-text-muted); max-width: 150px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                  ${
                                    asset.asset_type === "savings"
                                      ? `Đáo hạn ${escapeHtml(asset.maturity_date || "")} • còn ${
                                          asset.daysToMaturity ?? "?"
                                        } ngày`
                                      : asset.asset_type === "warrant"
                                        ? `Hết hạn ${escapeHtml(asset.expiry_date || "")} • còn ${asset.daysToExpiry} ngày`
                                        : escapeHtml(asset.notes || "")
                                  }
                                  </div>
                                </td>
                                <td class="row-actions">
                                  ${
                                    asset.isVirtualAccount
                                      ? `
                                        <button class="btn btn-ghost" style="height:32px; padding:0 var(--space-2)" data-action="open-history" data-account-id="${escapeHtml(
                                          asset.linkedAccountId,
                                        )}">Lịch sử</button>
                                        <button class="btn btn-ghost" style="height:32px; padding:0 var(--space-2)" data-action="edit-account" data-id="${escapeHtml(
                                          asset.linkedAccountId,
                                        )}">Sửa TK</button>
                                      `
                                      : `
                                        <button class="btn btn-ghost" style="height:32px; padding:0 var(--space-2)" data-action="open-price-update" data-asset-id="${escapeHtml(
                                          asset.id,
                                        )}">Giá</button>
                                        <button class="btn btn-ghost" style="height:32px; padding:0 var(--space-2)" data-action="edit-asset" data-id="${escapeHtml(
                                          asset.id,
                                        )}">Sửa</button>
                                        <button class="btn btn-ghost danger" style="height:32px; padding:0 var(--space-2)" data-action="delete-asset" data-id="${escapeHtml(
                                          asset.id,
                                        )}">Xóa</button>
                                      `
                                  }
                                </td>
                              </tr>
                            `,
                            )
                            .join("")}
                        `,
                        )
                        .join("")
                        : `<tr><td colspan="10"><div class="empty-state">Chưa có tài sản trong danh mục.</div></td></tr>`}
                    </tbody>
                  </table>
                </div>
              </article>
            `
      }
    </section>
  `;
}
