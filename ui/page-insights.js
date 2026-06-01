// Module: page-insights | Responsibility: AI insights panels and chat

import { escapeHtml, sectionTitle } from "./shared.js";

export function renderInsightsPage(vm) {
  const chatMessages = vm.insightsPage.chat?.messages || [];
  const chatLoading = vm.insightsPage.chat?.loading || false;
  return `
    <section class="page">
      ${sectionTitle("AI Insights", "Cố vấn tài chính cá nhân dựa trên dữ liệu thật của bạn (cấu hình DeepSeek API key trong Cài đặt).")}
      <div class="insight-grid">
        ${vm.insightsPage.panels
          .map(
            (panel) => `
            <article class="panel insight-card ${panel.loading ? "is-loading" : ""}">
              <div class="panel-head">
                <div>
                  <h3>${escapeHtml(panel.title)}</h3>
                  <p>${panel.loading ? "Đang xử lý bởi AI..." : "Tư vấn tài chính thông minh"}</p>
                </div>
              </div>
              <div class="insight-body">
                ${
                  panel.loading
                    ? `<div class="loading-state"><div class="spinner"></div><p>AI đang phân tích dữ liệu...</p></div>`
                    : panel.result
                      ? `<div class="insight-content">${escapeHtml(panel.result).replace(/\n/g, "<br>")}</div>`
                      : `<div class="empty-state compact">Chưa sinh insight. Bấm nút để AI bắt đầu phân tích bằng DeepSeek.</div>`
                }
              </div>
              <button class="btn btn-primary" data-action="generate-insight" data-panel-id="${escapeHtml(panel.id)}" ${
                panel.loading ? "disabled" : ""
              }>${panel.result ? "Phân tích lại" : "Tạo insight"}</button>
            </article>
          `,
          )
          .join("")}
      </div>
      <article class="panel ai-chat-panel">
        <div class="panel-head">
          <div>
            <h3>Chat với AI</h3>
            <p>Hỏi trực tiếp về danh mục tài sản, thu chi, ngân sách và cách dùng ứng dụng.</p>
          </div>
          <button class="btn btn-ghost" data-action="clear-ai-chat" ${chatLoading ? "disabled" : ""}>Xóa hội thoại</button>
        </div>
        <div class="ai-chat-log" id="ai-chat-log">
          ${
            chatMessages.length
              ? chatMessages
                  .map(
                    (message) => `
                    <div class="ai-chat-row ${escapeHtml(message.role === "user" ? "user" : "assistant")}">
                      <div class="ai-chat-bubble ${escapeHtml(message.role === "user" ? "user" : "assistant")}">
                        ${escapeHtml(message.text).replace(/\n/g, "<br>")}
                      </div>
                    </div>
                  `,
                  )
                  .join("")
              : `<div class="empty-state compact">Chưa có hội thoại. Hãy hỏi AI về tài chính cá nhân của bạn.</div>`
          }
          ${chatLoading ? `<div class="loading-state"><div class="spinner"></div><p>AI đang trả lời...</p></div>` : ""}
        </div>
        <form class="ai-chat-form" data-form="ai-chat">
          <input type="text" name="message" maxlength="1200" placeholder="Ví dụ: Gợi ý tối ưu danh mục của tôi trong 3 tháng tới..." ${
            chatLoading ? "disabled" : ""
          } />
          <button class="btn btn-primary" type="submit" ${chatLoading ? "disabled" : ""}>Gửi</button>
        </form>
      </article>
    </section>
  `;
}
