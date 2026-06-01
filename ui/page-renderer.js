// Module: page-renderer.js | Responsibility: Routes activeTab to the right page render function

import { renderOverviewPage } from './page-overview.js';
import { renderTransactionsPage } from './page-transactions.js';
import { renderPortfolioPage } from './page-portfolio.js';
import { renderBudgetsPage } from './page-budgets.js';
import { renderAccountsPage } from './page-accounts.js';
import { renderDebtsGoalsPage } from './page-debts.js';
import { renderReportsPage } from './page-reports.js';
import { renderInsightsPage } from './page-insights.js';
import { renderSettingsPage } from './page-settings.js';

export function renderPage(vm, uiState) {
  switch (uiState.activeTab) {
    case "overview":      return renderOverviewPage(vm);
    case "transactions":  return renderTransactionsPage(vm);
    case "portfolio":     return renderPortfolioPage(vm, uiState);
    case "budgets":      return renderBudgetsPage(vm, uiState);
    case "accounts":      return renderAccountsPage(vm);
    case "debts-goals":   return renderDebtsGoalsPage(vm);
    case "reports":       return renderReportsPage(vm);
    case "insights":      return renderInsightsPage(vm);
    case "settings":      return renderSettingsPage(vm);
    default:              return renderOverviewPage(vm);
  }
}
