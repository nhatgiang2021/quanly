// Module: layout | Responsibility: App shell sections — sidebar, bottom nav, topbar, toasts
// FIX 1: Removed localStorage from renderSidebar — sidebarCollapsed comes from uiState only
// FIX 6: Removed document.documentElement from renderTopbar — theme comes from uiState only

import { escapeHtml, formatVNDShort } from "./shared.js";

export function renderSidebar(vm, uiState) {
  // FIX 1: sidebarCollapsed từ uiState, không đọc localStorage
  const collapsed = Boolean(uiState.sidebarCollapsed);
  const NAV_ICONS = {
    overview: "layout-dashboard", transactions: "arrow-right-left",
    portfolio: "pie-chart", budgets: "wallet",
    accounts: "building-2", "debts-goals": "target",
    reports: "chart-column-decreasing", insights: "bot",
    settings: "settings",
  };
  return `
    <aside class="sidebar ${collapsed ? "sidebar--collapsed" : ""}">
      <button class="sidebar-toggle" data-action="toggle-sidebar" title="${collapsed ? "Mở rộng" : "Thu gọn"}">
        ${collapsed ? "»" : "«"}
      </button>
      <div class="brand-block">
        <img src="./assets/brand-mark.svg" alt="NK" class="brand-mark" />
        <div>
          <strong>NK</strong>
          <span>Quản lý tài sản</span>
        </div>
      </div>
      <nav class="nav-list">
        ${vm.navigation
          .map(
            (item) => `
            <button class="nav-link ${uiState.activeTab === item.id ? "is-active" : ""}" data-action="navigate" data-tab="${escapeHtml(
              item.id,
            )}">
              <i data-lucide="${NAV_ICONS[item.id] || "circle"}"></i>
              <span>${escapeHtml(item.label)}</span>
            </button>
          `,
          )
          .join("")}
      </nav>
      <div class="sidebar-foot">
        <div class="sidebar-stat nw-highlight">
          <span>Tài sản ròng</span>
          <strong>${formatVNDShort(vm.derived.netWorth.netWorth)}</strong>
        </div>
        <div class="sidebar-stat">
          <span>Cash + EF</span>
          <strong class="number">${formatVNDShort(vm.derived.emergencyFund.total)}</strong>
        </div>
      </div>
    </aside>
  `;
}

export function renderBottomNav(vm, uiState) {
  return `
    <nav class="bottom-nav">
      ${vm.navigation
        .map(
          (item) => `
          <button class="bottom-link ${uiState.activeTab === item.id ? "is-active" : ""}" data-action="navigate" data-tab="${escapeHtml(
            item.id,
          )}">
            ${escapeHtml(item.label)}
          </button>
        `,
        )
        .join("")}
    </nav>
  `;
}

export function renderTopbar(vm, uiState) {
  const currentTitle = vm.navigation.find((item) => item.id === uiState.activeTab)?.label || "Tổng Quan";
  // FIX 6: theme từ uiState, không đọc document.documentElement
  const isDark = uiState.theme !== "light";
  return `
    <header class="topbar">
      <div>
        <p class="eyebrow">Phiên bản HTML cá nhân</p>
        <h1>${escapeHtml(currentTitle)}</h1>
      </div>
      <div class="row-actions">
        <button class="theme-btn" data-action="toggle-theme" title="${isDark ? "Sáng" : "Tối"}">
          <i data-lucide="${isDark ? "sun" : "moon"}"></i>
        </button>
        <button class="btn btn-ghost" data-action="open-help" title="Hỏi cách dùng app">? Hướng dẫn</button>
        <button class="btn btn-ghost" data-action="export-json">Xuất JSON</button>
        <button class="btn btn-ghost" data-action="open-ai-entry" title="Nhập liệu bằng câu tự nhiên">✨ AI nhập</button>
        <button class="btn btn-primary" data-action="open-modal" data-modal="transaction">+ Giao dịch</button>
      </div>
    </header>
  `;
}

export function renderToasts(toasts) {
  return `
    <div class="toast-stack">
      ${toasts
        .map(
          (toast) => `
          <div class="toast toast-${escapeHtml(toast.level)}">
            <div>
              <strong>${escapeHtml(toast.title)}</strong>
              <p>${escapeHtml(toast.message)}</p>
            </div>
            <button class="icon-btn" data-action="dismiss-toast" data-toast-id="${escapeHtml(toast.id)}">×</button>
          </div>
        `,
        )
        .join("")}
    </div>
  `;
}
