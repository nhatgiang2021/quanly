// Module: page-settings | Responsibility: Settings — backup, general config, allocation, categories, recurring templates

import { escapeHtml, formatVNDShort, sectionTitle, optionsHtml } from "./shared.js";

export function renderSettingsPage(vm) {
  return `
    <section class="page">
      ${sectionTitle("Cài đặt", "Backup JSON, chỉnh rule phân bổ, danh mục, recurring template và reset dữ liệu")}
      <div class="settings-grid">
        <article class="panel">
          <div class="panel-head">
            <div>
              <h3>Sao lưu & khôi phục</h3>
              <p>Xuất đầy đủ dữ liệu hoặc import file JSON chuẩn ${escapeHtml(vm.version)}</p>
            </div>
          </div>
          <div class="row-actions">
            <button class="btn btn-primary" data-action="export-json">Xuất JSON</button>
            <button class="btn btn-ghost" data-action="trigger-import">Import JSON</button>
            <input id="import-json-input" class="hidden-input" type="file" accept="application/json" />
          </div>
        </article>

        <article class="panel">
          <div class="panel-head"><div><h3>Thiết lập chung</h3></div></div>
          <form class="form-grid" data-form="settings-general">
            <label><span>Chế độ thu nhập</span>
              <select name="income_mode">
                <option value="irregular" ${vm.settingsPage.general.income_mode === "irregular" ? "selected" : ""}>Không đều</option>
                <option value="regular" ${vm.settingsPage.general.income_mode === "regular" ? "selected" : ""}>Đều</option>
              </select>
            </label>
            <label><span>Rolling window</span><input type="number" name="rolling_window" min="3" max="18" value="${escapeHtml(
              vm.settingsPage.general.rolling_window,
            )}" /></label>
            <label><span>Ngưỡng trigger phân bổ</span><input type="number" name="min_allocation_trigger" value="${escapeHtml(
              vm.settingsPage.general.min_allocation_trigger,
            )}" /></label>
            <label><span>Mức thụ động mặc định</span><input type="number" name="passive_income_default" value="${escapeHtml(
              vm.settingsPage.general.passive_income_default,
            )}" /></label>
            <label><span>Ngưỡng tái cân bằng (%)</span><input type="number" name="rebalance_threshold" value="${escapeHtml(
              vm.settingsPage.general.rebalance_threshold,
            )}" /></label>

            <div class="form-span-2 section-divider"></div>
            <div class="form-span-2"><h4>Cấu hình AI (DeepSeek V4)</h4></div>
            <label class="form-span-2"><span>DeepSeek API Key</span>
              <input type="password" name="ai_api_key" placeholder="Nhập DeepSeek API key..." value="${escapeHtml(
                vm.settingsPage.general.ai_api_key || "",
              )}" />
            </label>
            <label class="form-span-2"><span>Endpoint</span>
              <input type="text" name="ai_base_url" value="${escapeHtml(
                vm.settingsPage.general.ai_base_url || "https://api.deepseek.com/v1",
              )}" />
            </label>
            <label class="form-span-2"><span>Model</span>
              <select name="ai_model">
                <option value="deepseek-v4-flash" ${
                  !vm.settingsPage.general.ai_model || vm.settingsPage.general.ai_model === "deepseek-v4-flash"
                    ? "selected"
                    : ""
                }>DeepSeek V4 Flash</option>
                <option value="deepseek-chat" ${
                  vm.settingsPage.general.ai_model === "deepseek-chat" ? "selected" : ""
                }>DeepSeek Chat</option>
                <option value="google/gemini-1.5-flash" ${
                  vm.settingsPage.general.ai_model === "google/gemini-1.5-flash" ? "selected" : ""
                }>Gemini 1.5 Flash (custom endpoint)</option>
              </select>
            </label>
            <label class="form-span-2"><span>Phong cách tư vấn AI</span>
              <select name="ai_prompt_style">
                <option value="conservative" ${
                  vm.settingsPage.general.ai_prompt_style === "conservative" ? "selected" : ""
                }>Bảo thủ (ưu tiên an toàn)</option>
                <option value="balanced" ${
                  !vm.settingsPage.general.ai_prompt_style || vm.settingsPage.general.ai_prompt_style === "balanced"
                    ? "selected"
                    : ""
                }>Cân bằng (khuyến nghị mặc định)</option>
                <option value="growth" ${
                  vm.settingsPage.general.ai_prompt_style === "growth" ? "selected" : ""
                }>Tăng trưởng (chấp nhận biến động hơn)</option>
              </select>
            </label>

            <div class="form-actions"><button class="btn btn-primary" type="submit">Lưu cài đặt</button></div>
          </form>
        </article>

        <article class="panel">
          <div class="panel-head"><div><h3>Rule phân bổ</h3></div></div>
          <form class="form-grid" data-form="allocation-settings">
            <div class="form-span-2 split-stat allocation-total-line">
              <span>Tổng tỷ lệ hiện tại</span>
              <strong id="allocation-total-indicator" class="${
                vm.settingsPage.allocationTotal === 100 ? "text-success" : "text-danger"
              }">${escapeHtml(vm.settingsPage.allocationTotal)}%</strong>
            </div>
            <div class="form-span-2 row-actions">
              <button class="btn btn-ghost" type="button" data-action="auto-adjust-allocation">Tự động điều chỉnh</button>
            </div>
            ${vm.settingsPage.activeBuckets
              .map(
                (bucket) => `
                <div class="panel nested-panel form-span-2">
                  <div class="panel-head">
                    <div>
                      <h3>${escapeHtml(bucket.name)}</h3>
                      <p>${escapeHtml(bucket.type || "")}</p>
                    </div>
                  </div>
                  <div class="form-grid">
                    <label>
                      <span>Tỷ lệ (%)</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        data-allocation-percentage
                        name="bucket_percentage_${escapeHtml(bucket.id)}"
                        value="${escapeHtml(bucket.percentage)}"
                      />
                    </label>
                    ${
                      bucket.type === "expense_budget"
                        ? `<label>
                            <span>Rollover</span>
                            <select name="bucket_rollover_${escapeHtml(bucket.id)}">
                              <option value="accumulate" ${
                                (bucket.rolloverType || "accumulate") === "accumulate" ? "selected" : ""
                              }>accumulate</option>
                              <option value="reset" ${
                                (bucket.rolloverType || "accumulate") === "reset" ? "selected" : ""
                              }>reset</option>
                              <option value="transfer_to" ${
                                (bucket.rolloverType || "accumulate") === "transfer_to" ? "selected" : ""
                              }>transfer_to</option>
                            </select>
                          </label>
                          <label data-rollover-target="${escapeHtml(bucket.id)}">
                            <span>Target bucket (khi transfer_to)</span>
                            <select name="bucket_target_${escapeHtml(bucket.id)}">
                              <option value="">Không chọn</option>
                              ${vm.settingsPage.expenseBuckets
                                .map(
                                  (expenseBucket) => `<option value="${escapeHtml(expenseBucket.id)}" ${
                                    String(bucket.targetBucketId || "") === String(expenseBucket.id) ? "selected" : ""
                                  }>${escapeHtml(expenseBucket.name)}</option>`,
                                )
                                .join("")}
                            </select>
                          </label>
                          <label class="form-span-2">
                            <span>Default categories</span>
                            <input
                              type="text"
                              name="bucket_categories_${escapeHtml(bucket.id)}"
                              value="${escapeHtml((bucket.defaultCategories || []).join(", "))}"
                              placeholder="Ngăn cách bằng dấu phẩy"
                            />
                          </label>`
                        : `<div class="split-stat">
                            <span>Theo dõi đầu tư</span>
                            <strong>${escapeHtml(bucket.linked_bucket || bucket.name)}</strong>
                          </div>`
                    }
                  </div>
                </div>
              `,
              )
              .join("")}
            <div class="form-actions"><button class="btn btn-primary" type="submit">Lưu phân bổ</button></div>
          </form>
        </article>

        <article class="panel">
          <div class="panel-head"><div><h3>Target bucket đầu tư</h3></div></div>
          <form class="stack-form" data-form="bucket-targets">
            ${vm.settingsPage.investmentBuckets
              .map(
                (bucket) => `
                <label class="slider-field">
                  <div class="split-stat">
                    <span>${escapeHtml(bucket.name)}</span>
                    <strong>${escapeHtml(vm.settingsPage.general.bucket_targets[bucket.id] || 0)}%</strong>
                  </div>
                  <input type="range" min="0" max="100" step="1" name="target_${escapeHtml(
                    bucket.id,
                  )}" value="${escapeHtml(vm.settingsPage.general.bucket_targets[bucket.id] || 0)}" />
                </label>
              `,
              )
              .join("")}
            <div class="form-actions"><button class="btn btn-primary" type="submit">Lưu target</button></div>
          </form>
        </article>

        <article class="panel panel-span-2">
          <div class="panel-head"><div><h3>Map danh mục chi → bucket</h3></div></div>
          <form class="table-form" data-form="category-map">
            <div class="table-wrap">
              <table class="data-table">
                <thead><tr><th>Danh mục</th><th>Bucket</th></tr></thead>
                <tbody>
                  ${vm.settingsPage.categories.expense
                    .map(
                      (category) => `
                      <tr>
                        <td>${escapeHtml(category)}</td>
                        <td>
                          <select name="map_${escapeHtml(category)}">
                            ${vm.settingsPage.expenseBuckets
                              .map(
                                (bucket) => `<option value="${escapeHtml(bucket.id)}" ${
                                  vm.settingsPage.categoryMap[category] === bucket.id ? "selected" : ""
                                }>${escapeHtml(bucket.name)}</option>`,
                              )
                              .join("")}
                          </select>
                        </td>
                      </tr>
                    `,
                    )
                    .join("")}
                </tbody>
              </table>
            </div>
            <div class="form-actions"><button class="btn btn-primary" type="submit">Lưu map</button></div>
          </form>
        </article>

        <article class="panel">
          <div class="panel-head"><div><h3>Quản lý danh mục</h3></div></div>
          <form class="form-grid" data-form="categories">
            <label class="textarea-field">
              <span>Danh mục thu nhập</span>
              <textarea name="income_categories" rows="6">${escapeHtml(
                vm.settingsPage.categories.income.join("\n"),
              )}</textarea>
            </label>
            <label class="textarea-field">
              <span>Danh mục chi tiêu</span>
              <textarea name="expense_categories" rows="6">${escapeHtml(
                vm.settingsPage.categories.expense.join("\n"),
              )}</textarea>
            </label>
            <div class="form-actions"><button class="btn btn-primary" type="submit">Lưu danh mục</button></div>
          </form>
        </article>

        <article class="panel">
          <div class="panel-head">
            <div><h3>Tài khoản tiền mặt</h3><p>Quản lý nhanh danh sách tài khoản</p></div>
            <button class="btn btn-ghost" data-action="open-modal" data-modal="account">+ Thêm</button>
          </div>
          <div class="mini-table">
            ${vm.settingsPage.accounts
              .map(
                (account) => `
                <div class="mini-row">
                  <span>${escapeHtml(account.name)} • ${escapeHtml(account.label)}</span>
                  <div class="row-actions">
                    <button class="btn btn-ghost" data-action="edit-account" data-id="${escapeHtml(
                      account.id,
                    )}">Sửa</button>
                    <button
                      class="btn btn-ghost danger"
                      data-action="delete-account"
                      data-id="${escapeHtml(account.id)}"
                      data-name="${escapeHtml(account.name)}"
                    >Xóa</button>
                  </div>
                </div>
              `,
              )
              .join("")}
          </div>
        </article>

        <article class="panel panel-span-2">
          <div class="panel-head"><div><h3>Recurring templates</h3><p>CRUD mẫu giao dịch định kỳ</p></div></div>
          <form class="form-grid recurring-form" data-form="recurring-template">
            <input type="hidden" name="id" value="" />
            <label><span>Tên</span><input type="text" name="name" placeholder="Ví dụ: Bảo hiểm" /></label>
            <label><span>Loại</span>
              <select name="type">
                <option value="income">Thu</option>
                <option value="expense">Chi</option>
              </select>
            </label>
            <label><span>Số tiền</span><input type="number" name="amount" value="0" /></label>
            <label><span>Danh mục</span><input type="text" name="category" /></label>
            <label><span>Tần suất</span><input type="text" name="frequency" placeholder="hang_thang" /></label>
            <label><span>Tài khoản mặc định</span>
              <select name="default_account_id">
                ${optionsHtml(
                  vm.settingsPage.accounts.map((account) => ({ value: account.id, label: account.name })),
                )}
              </select>
            </label>
            <label class="textarea-field"><span>Ghi chú</span><textarea rows="3" name="notes"></textarea></label>
            <div class="form-actions"><button class="btn btn-primary" type="submit">Lưu template</button></div>
          </form>
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>Tên</th><th>Loại</th><th>Số tiền</th><th>Tần suất</th><th></th></tr></thead>
              <tbody>
                ${
                  vm.settingsPage.recurringTemplates.length
                    ? vm.settingsPage.recurringTemplates
                        .map(
                          (row) => `
                          <tr>
                            <td>${escapeHtml(row.name)}</td>
                            <td>${escapeHtml(row.type === "income" ? "Thu" : row.type === "expense" ? "Chi" : row.type)}</td>
                            <td>${formatVNDShort(row.amount)}</td>
                            <td>${escapeHtml(row.frequency || "")}</td>
                            <td class="row-actions">
                              <button
                                class="btn btn-ghost"
                                data-action="fill-recurring"
                                data-id="${escapeHtml(row.id)}"
                                data-name="${escapeHtml(row.name)}"
                                data-type="${escapeHtml(row.type)}"
                                data-amount="${escapeHtml(row.amount)}"
                                data-category="${escapeHtml(row.category || "")}"
                                data-frequency="${escapeHtml(row.frequency || "")}"
                                data-account="${escapeHtml(row.default_account_id || "")}"
                                data-notes="${escapeHtml(row.notes || "")}"
                              >Sửa</button>
                              <button class="btn btn-ghost danger" data-action="delete-recurring" data-id="${escapeHtml(
                                row.id,
                              )}">Xóa</button>
                            </td>
                          </tr>
                        `,
                        )
                        .join("")
                    : `<tr><td colspan="5"><div class="empty-state">Chưa có recurring template.</div></td></tr>`
                }
              </tbody>
            </table>
          </div>
        </article>

        <article class="panel panel-span-2">
          <div class="panel-head">
            <div>
              <h3>Nhật ký thay đổi</h3>
              <p>50 thao tác sửa/xóa dữ liệu tài chính gần nhất (mới nhất ở trên)</p>
            </div>
          </div>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr><th>Thời điểm</th><th>Thao tác</th><th>Đối tượng</th><th>Chi tiết</th></tr>
              </thead>
              <tbody>
                ${
                  (vm.settingsPage.auditLog || []).length
                    ? vm.settingsPage.auditLog
                        .map((entry) => {
                          const when = (() => {
                            const d = new Date(entry.at);
                            return Number.isNaN(d.getTime())
                              ? escapeHtml(entry.at || "")
                              : `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
                          })();
                          const actionLabel =
                            entry.action === "delete" ? "Xóa" : entry.action === "update" ? "Sửa" : entry.action === "create" ? "Tạo" : entry.action;
                          const entityLabel = {
                            transaction: "Giao dịch",
                            account: "Tài khoản",
                            asset: "Tài sản",
                            asset_transaction: "GD tài sản",
                            liability: "Khoản nợ",
                            receivable: "Khoản cho vay",
                            goal: "Mục tiêu",
                          }[entry.entity] || entry.entity;
                          const detail = entry.snapshot
                            ? escapeHtml(
                                JSON.stringify(entry.snapshot)
                                  .replace(/[{}"]/g, "")
                                  .slice(0, 80),
                              )
                            : "";
                          return `
                            <tr>
                              <td style="white-space:nowrap; color:var(--color-text-muted)">${when}</td>
                              <td><span class="pill">${escapeHtml(actionLabel)}</span></td>
                              <td>${escapeHtml(entityLabel)}</td>
                              <td style="font-size:var(--text-xs); color:var(--color-text-muted); max-width:280px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">${detail}</td>
                            </tr>
                          `;
                        })
                        .join("")
                    : `<tr><td colspan="4"><div class="empty-state">Chưa có thay đổi nào được ghi nhận.</div></td></tr>`
                }
              </tbody>
            </table>
          </div>
        </article>

        <article class="panel danger-zone">
          <div class="panel-head"><div><h3>Reset toàn bộ dữ liệu</h3><p>Yêu cầu xác nhận bằng từ khóa "XÓA"</p></div></div>
          <button class="btn btn-danger" data-action="open-modal" data-modal="reset-confirm">Reset dữ liệu</button>
        </article>
      </div>
    </section>
  `;
}
