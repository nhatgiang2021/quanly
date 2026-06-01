// Module: ui/index.js | Responsibility: Entry point — imports all renders and exports renderApp

import { renderSidebar, renderBottomNav, renderTopbar, renderToasts } from './layout.js';
import { renderBanners } from './shared.js';
import { renderPage } from './page-renderer.js';
import { renderModal } from './modals.js';

export function renderApp(vm, uiState) {
  return `
    <div class="app-shell">
      ${renderSidebar(vm, uiState)}
      <div class="main-shell">
        ${renderTopbar(vm, uiState)}
        ${renderBanners(vm.runtime.banners)}
        <main class="content-shell">
          ${renderPage(vm, uiState)}
        </main>
      </div>
      ${renderBottomNav(vm, uiState)}
      ${renderToasts(vm.runtime.toasts)}
      ${
        vm.modal
          ? `<div class="modal-overlay"><div class="modal-scroll">${renderModal(vm.modal)}</div></div>`
          : ""
      }
    </div>
  `;
}
