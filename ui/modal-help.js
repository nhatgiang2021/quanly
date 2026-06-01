// Module: modal-help | Trách nhiệm: panel "Hỏi cách dùng app".
// Trả lời dựa trên kho tri thức bám theo docs/user-guide.md, chạy cục bộ (không gửi dữ liệu).

import { escapeHtml } from "./shared.js";

export function renderHelpModal(modal) {
  const samples = modal.sampleQuestions || [];
  const result = modal.result || null;
  const question = modal.question || "";

  return `
    <div class="modal-card modal-wide">
      <div class="modal-head">
        <h3>Hỏi cách dùng app</h3>
        <button class="icon-btn" data-action="close-modal">×</button>
      </div>
      <form class="form-grid" data-form="help-ask">
        <div class="form-span-2">
          <p style="color:var(--color-text-muted); font-size:var(--text-sm); margin-bottom:var(--space-2)">
            Hỏi bằng tiếng Việt về cách dùng app. Câu trả lời dựa trên hướng dẫn sử dụng và chạy ngay
            trên máy bạn (không gửi dữ liệu đi đâu).
          </p>
        </div>
        <label class="form-span-2">
          <span>Câu hỏi</span>
          <input type="text" name="help_q" value="${escapeHtml(question)}" placeholder="Ví dụ: Làm sao dùng AI nhập liệu?" />
        </label>
        <div class="form-span-2" style="display:flex; flex-wrap:wrap; gap:var(--space-2)">
          ${samples
            .map(
              (q) =>
                `<button type="button" class="btn btn-ghost" style="font-size:var(--text-xs); height:auto; padding:4px 10px" data-action="help-sample" data-text="${escapeHtml(q)}">${escapeHtml(q)}</button>`,
            )
            .join("")}
        </div>
        <div class="form-actions form-span-2">
          <button class="btn btn-primary" type="submit">Hỏi</button>
        </div>
      </form>

      ${
        result
          ? `<div class="form-span-2" style="margin-top:var(--space-2); border-top:1px solid var(--color-divider); padding-top:var(--space-4)">
              ${
                result.matched
                  ? `<div style="font-size:var(--text-xs); color:var(--color-text-muted); margin-bottom:var(--space-1)">Theo hướng dẫn • ${escapeHtml(result.section || "")}</div>
                     <div class="insight-content" style="font-size:var(--text-sm); line-height:1.6">${escapeHtml(result.answer)}</div>`
                  : `<div class="insight-content" style="font-size:var(--text-sm); color:var(--color-text-muted)">${escapeHtml(result.answer)}</div>`
              }
              ${
                (result.related || []).length
                  ? `<div style="margin-top:var(--space-3)">
                      <div style="font-size:var(--text-xs); color:var(--color-text-muted); margin-bottom:var(--space-1)">Câu hỏi liên quan:</div>
                      <div style="display:flex; flex-wrap:wrap; gap:var(--space-2)">
                        ${result.related
                          .map(
                            (r) =>
                              `<button type="button" class="btn btn-ghost" style="font-size:var(--text-xs); height:auto; padding:4px 10px" data-action="help-sample" data-text="${escapeHtml(r.title)}">${escapeHtml(r.title)}</button>`,
                          )
                          .join("")}
                      </div>
                    </div>`
                  : ""
              }
            </div>`
          : ""
      }
    </div>
  `;
}
