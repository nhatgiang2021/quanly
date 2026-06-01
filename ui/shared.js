// Module: shared | Responsibility: Helper/utility functions used across all UI modules

import { ASSET_ACTION_LABELS } from "../computations.js";

export function formatVNDShort(val) {
  const num = Number(val) || 0;
  const absNum = Math.abs(num);
  const sign = num < 0 ? "-" : "";
  if (absNum >= 1e9) {
    return `${sign}${(absNum / 1e9).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} tỷ`;
  }
  if (absNum >= 1e6) {
    const millions = Math.floor(absNum / 1e6);
    const thousands = Math.round((absNum % 1e6) / 1000);
    if (thousands === 0) return `${sign}${millions.toLocaleString("vi-VN")} tr`;
    return `${sign}${millions.toLocaleString("vi-VN")}tr${thousands}`;
  }
  return `${sign}${absNum.toLocaleString("vi-VN")} ₫`;
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatMaybeCurrency(value) {
  return typeof value === "number" ? formatVNDShort(value) : escapeHtml(value);
}

export function formatPct(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

export function assetTypeLabel(assetType) {
  const key = String(assetType || "").toLowerCase();
  const labels = {
    stock: "Cổ phiếu",
    etf: "Quỹ ETF",
    bond: "Trái phiếu",
    gold: "Vàng",
    real_estate: "Bất động sản",
    realestate: "Bất động sản",
    crypto: "Tiền số",
    savings: "Tiết kiệm",
    cash_equiv: "Tiền tương đương tiền",
    warrant: "Chứng quyền",
    trading_account: "Tài khoản lướt sóng",
    other: "Khác",
  };
  return labels[key] || assetType || "Khác";
}

export function rolloverTypeLabel(type) {
  const key = String(type || "").toLowerCase();
  if (key === "reset") {
    return "Không cộng dồn";
  }
  if (key === "transfer_to") {
    return "Chuyển sang hũ khác";
  }
  return "Cộng dồn";
}

export function optionsHtml(options, selectedValue = "") {
  return (options || [])
    .map(
      (option) =>
        `<option value="${escapeHtml(option.value)}" ${
          String(option.value) === String(selectedValue) ? "selected" : ""
        }>${escapeHtml(option.label)}</option>`,
    )
    .join("");
}

export function sectionTitle(title, subtitle = "") {
  return `
    <div class="section-head">
      <div>
        <h2>${escapeHtml(title)}</h2>
        ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}
      </div>
    </div>
  `;
}

export function renderProgressBar(value, color = "#5e6ad2") {
  const safeValue = Math.max(0, Math.min(100, Number(value || 0)));
  return `
    <div class="progress-track">
      <span class="progress-fill" style="width:${safeValue}%; background:${color};"></span>
    </div>
  `;
}

export const ASSET_ACTION_ORDER = ["BUY", "SELL", "OPENING", "DIVIDEND", "INTEREST", "FEE", "SPLIT", "REALLOCATE"];
export const ASSET_TYPE_GROUP_ORDER = [
  "stock",
  "etf",
  "bond",
  "gold",
  "real_estate",
  "realestate",
  "crypto",
  "savings",
  "cash_equiv",
  "warrant",
  "other",
];

export function getPnlAccentClass(value, ratio = 0) {
  const amount = Number(value || 0);
  const pct = Math.abs(Number(ratio || 0));
  if (amount > 0) {
    return pct >= 12 ? "pnl-chip positive strong" : "pnl-chip positive";
  }
  if (amount < 0) {
    return pct >= 12 ? "pnl-chip negative strong" : "pnl-chip negative";
  }
  return "pnl-chip neutral";
}

export function groupAssetsByType(assets = []) {
  const buckets = new Map();
  assets.forEach((asset) => {
    const typeKey = String(asset.asset_type || "other").toLowerCase();
    if (!buckets.has(typeKey)) {
      buckets.set(typeKey, []);
    }
    buckets.get(typeKey).push(asset);
  });
  const orderMap = Object.fromEntries(ASSET_TYPE_GROUP_ORDER.map((type, index) => [type, index]));
  return Array.from(buckets.entries())
    .map(([type, rows]) => ({
      type,
      label: assetTypeLabel(type),
      rows: rows.slice().sort((left, right) => Number(right.currentValue || 0) - Number(left.currentValue || 0)),
      totalValue: rows.reduce((sum, row) => sum + Number(row.currentValue || 0), 0),
    }))
    .sort((left, right) => {
      const leftOrder = orderMap[left.type] ?? 99;
      const rightOrder = orderMap[right.type] ?? 99;
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }
      return right.totalValue - left.totalValue;
    });
}

export function sortAssets(rows = [], sortBy = "value_desc") {
  const list = rows.slice();
  const comparators = {
    value_desc: (left, right) => Number(right.currentValue || 0) - Number(left.currentValue || 0),
    value_asc: (left, right) => Number(left.currentValue || 0) - Number(right.currentValue || 0),
    pnl_desc: (left, right) => Number(right.unrealizedPnL || 0) - Number(left.unrealizedPnL || 0),
    pnl_asc: (left, right) => Number(left.unrealizedPnL || 0) - Number(right.unrealizedPnL || 0),
    name_asc: (left, right) => String(left.name || "").localeCompare(String(right.name || ""), "vi"),
    name_desc: (left, right) => String(right.name || "").localeCompare(String(left.name || ""), "vi"),
  };
  const compare = comparators[sortBy] || comparators.value_desc;
  return list.sort(compare);
}

export function groupAssetsByBucket(assets = [], bucketNameMap = {}) {
  const groups = new Map();
  assets.forEach((asset) => {
    const key = String(asset.bucket || "unknown");
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(asset);
  });
  return Array.from(groups.entries())
    .map(([bucketId, rows]) => ({
      type: bucketId,
      label: bucketNameMap[bucketId] || bucketId,
      rows,
      totalValue: rows.reduce((sum, row) => sum + Number(row.currentValue || 0), 0),
    }))
    .sort((left, right) => right.totalValue - left.totalValue);
}

export function buildGroupedAssets(assets = [], groupBy = "type", sortBy = "value_desc", bucketNameMap = {}) {
  const sorted = sortAssets(assets, sortBy);
  if (groupBy === "none") {
    return [
      {
        type: "all",
        label: "Tất cả tài sản",
        rows: sorted,
        totalValue: sorted.reduce((sum, row) => sum + Number(row.currentValue || 0), 0),
      },
    ];
  }
  const groupedBase = groupBy === "bucket" ? groupAssetsByBucket(sorted, bucketNameMap) : groupAssetsByType(sorted);
  return groupedBase.map((group) => ({
    ...group,
    rows: sortAssets(group.rows, sortBy),
  }));
}

export function getAccountTotalDeposited(accountId, transactionRows = [], accountTypeById = {}) {
  const investmentTypes = new Set(["investment", "derivative", "securities_cash"]);
  return Number(
    (transactionRows || []).reduce((sum, row) => {
      if (row.type === "opening_balance" && row.account_id === accountId) {
        return sum + Number(row.amount || 0);
      }
      if (row.type === "transfer" && row.to_account_id === accountId) {
        const sourceType = accountTypeById[row.from_account_id];
        if (investmentTypes.has(sourceType)) {
          return sum;
        }
        return sum + Number(row.amount || 0);
      }
      return sum;
    }, 0),
  );
}

export function buildVirtualTradingAccountAssets(accounts = [], transactionRows = [], tradeBucketId = "alloc_trade") {
  const accountTypeById = Object.fromEntries((accounts || []).map((account) => [account.id, account.type]));
  return (accounts || [])
    .filter((account) => ["investment", "derivative", "securities_cash"].includes(account.type))
    .map((account) => {
      const currentValue = Number(account.balance || 0);
      const totalDeposited = getAccountTotalDeposited(account.id, transactionRows, accountTypeById);
      const realizedPnL = Number(currentValue - totalDeposited);
      const realizedReturnPct = totalDeposited > 0 ? (realizedPnL / totalDeposited) * 100 : 0;
      return {
        id: `virtual-account-${account.id}`,
        name: account.name || "Tài khoản đầu tư",
        ticker: "TK",
        asset_type: "trading_account",
        bucket: tradeBucketId,
        holdingQty: 1,
        current_price: currentValue,
        currentValue,
        unrealizedPnL: 0,
        realizedPnL,
        realizedReturnPct,
        totalDeposited,
        returnPct: realizedReturnPct,
        notes: `Tổng nộp: ${formatVNDShort(totalDeposited)}${
          account.last_updated ? ` • Cập nhật: ${account.last_updated}` : ""
        }`,
        isVirtualAccount: true,
        linkedAccountId: account.id,
        accountTypeLabel: account.label || "",
      };
    });
}

export function renderKpiCard(item) {
  return `
    <article class="metric-card metric-${escapeHtml(item.tone || "neutral")}">
      <span class="metric-label">${escapeHtml(item.label)}</span>
      <strong>${formatVNDShort(item.value)}</strong>
    </article>
  `;
}

export function renderLineChart(rows, color = "var(--color-primary)") {
  const data = rows || [];
  if (!data.length) {
    return `<div class="empty-chart">Chưa có dữ liệu</div>`;
  }
  const width = 720;
  const height = 280;
  const padLeft = 64;
  const padRight = 24;
  const padTop = 24;
  const padBottom = 32;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;
  const gradientId = `lineArea-${renderLineChart._uid = (renderLineChart._uid || 0) + 1}`;
  const glowId = `${gradientId}-glow`;
  const values = data.map((item) => Number(item.value || item.net_worth || 0));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padY = (max - min) * 0.12 || 1;
  const yMin = Math.max(0, min - padY);
  const yMax = max + padY;
  const spread = Math.max(1, yMax - yMin);
  const stepX = data.length > 1 ? chartW / (data.length - 1) : 0;

  const pts = data.map((_, i) => ({
    x: padLeft + i * stepX,
    y: padTop + chartH - ((values[i] - yMin) / spread) * chartH,
  }));

  // Smooth cubic bezier path
  function lineCommand(point) {
    return `L ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
  }
  function controlPoint(current, previous, next, reverse) {
    const p = previous || current;
    const n = next || current;
    const smoothing = 0.18;
    const o = {
      x: p.x - n.x,
      y: p.y - n.y,
    };
    const angle = Math.atan2(o.y, o.x) + (reverse ? Math.PI : 0);
    const length = Math.sqrt(o.x * o.x + o.y * o.y) * smoothing;
    return {
      x: current.x + Math.cos(angle) * length,
      y: current.y + Math.sin(angle) * length,
    };
  }
  function bezierCommand(point, i, a) {
    const cps = controlPoint(a[i - 1], a[i - 2], point);
    const cpe = controlPoint(point, a[i - 1], a[i + 1], true);
    return `C ${cps.x.toFixed(1)},${cps.y.toFixed(1)} ${cpe.x.toFixed(1)},${cpe.y.toFixed(1)} ${point.x.toFixed(1)},${point.y.toFixed(1)}`;
  }
  const d = pts.reduce((acc, point, i, a) => {
    if (i === 0) return `M ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
    return `${acc} ${bezierCommand(point, i, a)}`;
  }, "");

  // Area path
  const areaD = `${d} L ${pts[pts.length - 1].x.toFixed(1)} ${padTop + chartH} L ${pts[0].x.toFixed(1)} ${padTop + chartH} Z`;

  // Grid lines & Y labels
  const gridCount = 5;
  let gridLines = "";
  let yLabels = "";
  for (let i = 0; i <= gridCount; i++) {
    const y = padTop + (chartH * i) / gridCount;
    const val = yMax - (spread * i) / gridCount;
    gridLines += `<line x1="${padLeft}" y1="${y.toFixed(1)}" x2="${width - padRight}" y2="${y.toFixed(1)}" stroke="rgba(255,255,255,0.04)" stroke-dasharray="4 4" />`;
    yLabels += `<text x="${padLeft - 10}" y="${(y + 4).toFixed(1)}" text-anchor="end" fill="rgba(255,255,255,0.25)" font-size="10" font-family="var(--font-mono)">${formatVNDShort(val)}</text>`;
  }

  // X labels
  const xLabels = pts
    .map((p, i) => {
      const label = escapeHtml((data[i].month || data[i].label || "").slice(-2));
      return `<text x="${p.x.toFixed(1)}" y="${height - 8}" text-anchor="middle" fill="rgba(255,255,255,0.25)" font-size="10" font-family="var(--font-body)">${label}</text>`;
    })
    .join("");

  // Points with halo
  const pointsSvg = pts
    .map((p, i) => {
      return `
        <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="8" fill="${color}" opacity="0.15" />
        <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="5" fill="${color}" opacity="0.4" />
        <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="#0b0f19" stroke="${color}" stroke-width="2" />
      `;
    })
    .join("");

  // Tooltip group (invisible rects for hover area)
  const tooltipRects = pts
    .map((p, i) => {
      return `<rect x="${(p.x - stepX / 2).toFixed(1)}" y="${padTop}" width="${(stepX).toFixed(1)}" height="${chartH}" fill="transparent" data-value="${formatVNDShort(values[i])}" data-month="${escapeHtml(data[i].month || data[i].label || "")}" />`;
    })
    .join("");

  return `
    <div class="chart-container" style="position:relative;">
      <svg viewBox="0 0 ${width} ${height}" class="chart-svg" style="width:100%; height:auto;">
        <defs>
          <linearGradient id="${gradientId}" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stop-color="${color}" stop-opacity="0.45"></stop>
            <stop offset="60%" stop-color="${color}" stop-opacity="0.08"></stop>
            <stop offset="100%" stop-color="${color}" stop-opacity="0"></stop>
          </linearGradient>
          <filter id="${glowId}" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="${glowId}-strong" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        ${gridLines}
        ${yLabels}
        ${xLabels}
        <path d="${areaD}" fill="url(#${gradientId})" opacity="0.9" />
        <path d="${d}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" filter="url(#${glowId})" />
        <path d="${d}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" filter="url(#${glowId}-strong)" opacity="0.6" />
        ${pointsSvg}
        ${tooltipRects}
      </svg>
      <div class="chart-tooltip" style="position:absolute; display:none; background:rgba(11,15,25,0.95); backdrop-filter:blur(12px); border:1px solid rgba(255,255,255,0.1); border-radius:8px; padding:8px 12px; pointer-events:none; font-size:12px; font-family:var(--font-mono); color:var(--color-text); box-shadow:0 8px 24px rgba(0,0,0,0.5); z-index:20;">
        <div class="chart-tooltip-month" style="color:var(--color-text-muted); font-size:10px; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:2px;"></div>
        <div class="chart-tooltip-value" style="font-weight:700; color:var(--color-primary);"></div>
      </div>
    </div>
  `;
}

function polarToCartesian(cx, cy, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

function describeArc(cx, cy, radius, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return [
    "M",
    start.x,
    start.y,
    "A",
    radius,
    radius,
    0,
    largeArcFlag,
    0,
    end.x,
    end.y,
  ].join(" ");
}

export function renderDonutChart(segments) {
  const items = (segments || []).filter((item) => Number(item.value) > 0);
  if (!items.length) {
    return `<div class="empty-chart">Chưa có phân bổ</div>`;
  }
  const total = items.reduce((sum, item) => sum + Number(item.value || 0), 0);
  let angle = 0;
  const arcs = items
    .map((segment) => {
      const start = angle;
      const slice = (Number(segment.value || 0) / total) * 360;
      angle += slice;
      return `<path d="${describeArc(90, 90, 64, start, angle)}" stroke="${
        segment.color || "#5e6ad2"
      }" stroke-width="20" fill="none" stroke-linecap="round" filter="url(#donutGlow)"></path>`;
    })
    .join("");

  return `
    <div class="donut-wrap">
      <svg viewBox="0 0 180 180" class="donut-chart">
        <defs>
          <filter id="donutGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        <circle cx="90" cy="90" r="64" stroke="rgba(138,143,152,0.12)" stroke-width="20" fill="none"></circle>
        ${arcs}
        <text x="90" y="86" text-anchor="middle" class="donut-total">${formatVNDShort(total)}</text>
        <text x="90" y="108" text-anchor="middle" class="donut-sub">Tổng danh mục</text>
      </svg>
      <div class="legend-list">
        ${items
          .map(
            (segment) => `
            <div class="legend-item">
              <span class="legend-dot" style="background:${segment.color};"></span>
              <span>${escapeHtml(segment.label || segment.name)}</span>
              <strong>${formatVNDShort(segment.value)}</strong>
            </div>
          `,
          )
          .join("")}
      </div>
    </div>
  `;
}

export function renderMiniBars(rows) {
  const items = rows || [];
  if (!items.length) {
    return `<div class="empty-chart">Chưa có dữ liệu</div>`;
  }
  const max = Math.max(...items.map((item) => Math.abs(Number(item.value || item.currentYear || 0))), 1);
  return `
    <div class="bar-group">
      ${items
        .map((item) => {
          const value = Number(item.value || item.currentYear || 0);
          return `
            <div class="bar-row">
              <span>${escapeHtml(item.label || item.name || item.month || "")}</span>
              <div class="bar-track">
                <span class="bar-fill" style="width:${(Math.abs(value) / max) * 100}%; background:${
                  item.color || "#5e6ad2"
                };"></span>
              </div>
              <strong>${formatVNDShort(value)}</strong>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

export function renderBanners(banners) {
  if (!banners?.length) {
    return "";
  }
  return `
    <div class="banner-stack">
      ${banners
        .map(
          (banner) => `
          <div class="banner banner-${escapeHtml(banner.level || "info")}">
            <div>
              <strong>${escapeHtml(banner.title)}</strong>
              <span>${escapeHtml(banner.message)}</span>
            </div>
            <button class="icon-btn" data-action="dismiss-banner" data-banner-key="${escapeHtml(
              banner.key || "",
            )}">×</button>
          </div>
        `,
        )
        .join("")}
    </div>
  `;
}
