// Module: modals | Responsibility: Modal type dispatcher — routes modal.type to the correct renderer

import { renderTransactionModal } from "./modal-transaction.js";
import { renderAccountModal } from "./modal-account.js";
import { renderAssetModal, renderAssetTransactionModal } from "./modal-asset.js";
import { renderLiabilityModal, renderDebtPaymentModal } from "./modal-debt.js";
import { renderReceivableModal, renderReceivablePaymentModal } from "./modal-receivable.js";
import { renderGoalModal } from "./modal-goal.js";
import { renderAiEntryModal } from "./modal-ai-entry.js";
import { renderHelpModal } from "./modal-help.js";
import {
  renderPriceUpdateModal,
  renderDerivativeUpdateModal,
  renderWelcomeModal,
  renderResetConfirmModal,
  renderAccountHistoryModal,
  renderCounterpartyFlowModal,
  renderAllocationPreviewModal,
  renderReinvestSuggestionModal,
} from "./modal-misc.js";

export function renderModal(modal) {
  if (!modal) {
    return "";
  }

  switch (modal.type) {
    case "welcome":
      return renderWelcomeModal(modal);
    case "account-history":
      return renderAccountHistoryModal(modal);
    case "reset-confirm":
      return renderResetConfirmModal(modal);
    case "price-update":
      return renderPriceUpdateModal(modal);
    case "derivative-update":
      return renderDerivativeUpdateModal(modal);
    case "debt-payment":
      return renderDebtPaymentModal(modal);
    case "receivable":
      return renderReceivableModal(modal);
    case "receivable-payment":
      return renderReceivablePaymentModal(modal);
    case "transaction":
      return renderTransactionModal(modal);
    case "account":
      return renderAccountModal(modal);
    case "asset":
      return renderAssetModal(modal);
    case "asset-transaction":
      return renderAssetTransactionModal(modal);
    case "liability":
      return renderLiabilityModal(modal);
    case "counterparty-flow":
      return renderCounterpartyFlowModal(modal);
    case "goal":
      return renderGoalModal(modal);
    case "ai-entry":
      return renderAiEntryModal(modal);
    case "help":
      return renderHelpModal(modal);
    case "allocation-preview":
      return renderAllocationPreviewModal(modal);
    case "reinvest-suggestion":
      return renderReinvestSuggestionModal(modal);
    default:
      return "";
  }
}
