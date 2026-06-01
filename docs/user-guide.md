# Hướng dẫn sử dụng app quản lý tài sản

> Dành cho người dùng mới, không cần biết kỹ thuật. App chạy hoàn toàn trên trình
> duyệt của bạn; dữ liệu lưu cục bộ (localStorage), không tự gửi đi đâu.

## 1. App này dùng để làm gì

App giúp bạn theo dõi toàn cảnh tài chính cá nhân/gia đình ở một nơi:

- **Tài sản**: cổ phiếu, ETF, trái phiếu, vàng, crypto, bất động sản, sổ tiết kiệm...
- **Nợ**: vay mua nhà, vay mua xe, dư nợ thẻ tín dụng...
- **Dòng tiền (cashflow)**: thu nhập và chi tiêu hằng tháng.
- **Phân bổ tài sản (allocation)**: tỷ trọng các lớp tài sản và các "hũ" đầu tư.
- **Tài sản ròng (net worth)**: tổng tài sản trừ tổng nợ, theo dõi thay đổi theo thời gian.

Mục tiêu: bạn luôn biết mình đang có bao nhiêu, nợ bao nhiêu, tiền đi đâu, và danh
mục đang phân bổ thế nào.

## 2. Các khái niệm chính

- **Tài sản (asset)**: thứ có giá trị bạn đang nắm giữ. Mỗi tài sản có loại
  (cổ phiếu, ETF, trái phiếu, vàng, crypto, bất động sản, tiết kiệm, tương đương tiền, khác),
  giá hiện tại, và thuộc một "hũ" phân bổ.
- **Nợ (liability)**: khoản phải trả, có tổng vay, dư nợ còn lại, lãi suất, gánh tháng.
- **Tài khoản (account)**: nơi giữ tiền — ngân hàng, ví điện tử, tiền mặt, tiền chờ đầu tư,
  tài khoản đầu tư/phái sinh, thẻ tín dụng. Số dư tài khoản được tính tự động từ giao dịch.
- **Giao dịch (transaction)**: một lần tiền vào/ra. Các loại: thu nhập, chi tiêu,
  chuyển khoản, giải ngân vay, cho vay, thu hồi nợ, điều chỉnh số dư.
- **Danh mục (category)**: nhãn phân loại giao dịch (Ăn uống, Lương, Trả nợ vay...),
  giúp lập ngân sách và báo cáo.
- **Tiền tệ (currency)**: app hiện tính theo **VND**. Nếu nhập số tiền ngoại tệ,
  hãy quy đổi về VND trước khi lưu.
- **Tài sản ròng (net worth)**: tổng tài sản − tổng nợ. App vẽ đường net worth 12 tháng.
- **Phân bổ tài sản (allocation)**: tỷ trọng theo lớp tài sản (tiền mặt, cổ phiếu, BĐS,
  tiết kiệm, vàng, crypto, phải thu) và theo các "hũ" đầu tư (Tăng trưởng, Dòng tiền,
  Lướt sóng, Bảo đảm).

## 3. Quy trình sử dụng hằng ngày

1. **Nhập giao dịch mới**: bấm "+ Giao dịch" (góc trên phải) hoặc "✨ AI nhập" để gõ câu
   tự nhiên. Ghi lại thu nhập, chi tiêu, chuyển khoản ngay khi phát sinh.
2. **Cập nhật giá trị tài sản**: vào trang "Danh Mục ĐT" → tab "Tài sản" → nút "Giá" để
   cập nhật giá hiện tại của cổ phiếu/vàng/crypto. App nhắc khi giá quá cũ (trên 45 ngày).
3. **Kiểm tra dashboard**: mở trang "Tổng Quan" xem net worth, thu/chi tháng, phân bổ.
4. **Review định kỳ** (hằng tuần/tháng): xem trang "Báo Cáo" và "Ngân Sách" để soát thu chi,
   tái cân bằng danh mục, kiểm tra nợ và mục tiêu.

## 4. Cách nhập liệu thủ công

**Khi nào dùng**: khi bạn muốn kiểm soát chính xác từng trường, hoặc khi giao dịch phức tạp
(mua/bán tài sản, trả nợ có gốc/lãi, chuyển khoản tác động hũ đầu tư).

**Các field bắt buộc (tùy loại):**
- **Giao dịch thu/chi**: ngày, số tiền (> 0), tài khoản, danh mục.
- **Chuyển khoản**: ngày, số tiền, tài khoản nguồn và tài khoản đích (không được trùng nhau).
- **Tài sản**: tên, loại tài sản, hũ phân bổ, giá hiện tại (≥ 0).
- **Giao dịch tài sản** (mua/bán): ngày, tài sản, hành động (BUY/SELL/...), số lượng, giá, tài khoản tiền.
- **Khoản nợ**: tên, tổng vay (> 0), dư nợ còn lại (không lớn hơn tổng vay), lãi suất, gánh tháng.
- **Mục tiêu**: tên, số tiền mục tiêu (> 0), hạn chót (ngày trong tương lai), mức ưu tiên.

**Lỗi thường gặp:**
- Số tiền bằng 0 hoặc âm với thu/chi → app báo "phải lớn hơn 0".
- Ngày sai định dạng → app báo "không đúng định dạng YYYY-MM-DD".
- Chuyển khoản trùng tài khoản nguồn/đích → app chặn.
- Dư nợ còn lại lớn hơn tổng vay → app chặn.
- Quên chọn tài khoản → app báo thiếu tài khoản.

## 5. Cách nhập liệu bằng AI

Bấm nút **"✨ AI nhập"** (trên topbar, trang Thu Chi, hoặc trang Danh Mục ĐT). Gõ một hoặc
nhiều câu tiếng Việt mô tả giao dịch, app sẽ phân tích thành biểu mẫu để bạn kiểm tra.

**Cách viết câu nhập liệu**: nêu rõ số tiền, loại thao tác, và tài khoản nếu có.

**Ví dụ tốt:**
- "Nhận lương 45 triệu vào Techcombank"
- "Trả nợ thẻ tín dụng 5 triệu từ Techcombank"
- "100 cổ phiếu FPT giá 120k" (app hiểu số lượng 100, giá 120.000, tổng 12 triệu)
- "Nhận lương 45 triệu vào Techcombank, chuyển 15 triệu vào tiết kiệm" (câu ghép → 2 giao dịch)

**Ví dụ mơ hồ (app sẽ để confidence thấp và báo thiếu field):**
- "mua gì đó" → thiếu số tiền, không rõ loại.
- "cafe 50k" → rõ số tiền nhưng thiếu tài khoản, bạn cần chọn tài khoản trong preview.

**Cách kiểm tra preview trước khi lưu:**
- Mỗi giao dịch hiện thành một thẻ với loại thao tác, số tiền, tiền tệ, ngày, tài khoản, danh mục.
- Field chưa chắc bị **tô đỏ**; có thanh **độ tin cậy (confidence)** và cảnh báo nếu cần.
- Sửa trực tiếp trên thẻ, rồi bấm **"Xác nhận & lưu"**. Câu ghép lưu nhiều mục cùng lúc.
- Với "Thêm tài sản", sau khi xác nhận app mở **biểu mẫu tài sản** điền sẵn để bạn bổ sung
  số lượng/giá và hũ phân bổ rồi lưu.

**Khi nào không nên dùng AI:**
- Giao dịch tài sản phức tạp (bán một phần, cổ tức, tách cổ phiếu) → nên nhập thủ công.
- Khi số tiền/tài khoản phải chính xác tuyệt đối → nhập thủ công cho chắc.
- Khi câu có ngoại tệ → quy đổi về VND trước.

## 6. Cách đọc dashboard (trang Tổng Quan)

- **Tài sản ròng (net worth)**: thẻ KPI lớn nhất + đường 12 tháng. Đường này được **dựng lại
  từ sổ giao dịch**; tháng chưa có snapshot được định giá theo giá hiện tại, nên có ghi chú rõ.
- **Tổng tài sản / Tổng nợ**: hai thẻ KPI riêng.
- **Thu / Chi tháng**: thu nhập và chi tiêu trong tháng hiện tại, kèm thặng dư/thâm hụt.
- **Phân bổ theo lớp tài sản**: thanh ngang tỷ trọng tiền mặt, cổ phiếu, BĐS, tiết kiệm,
  vàng, crypto, phải thu. Đây là góc nhìn phân bổ gộp (không trừ nợ).
- **Phân bổ danh mục**: biểu đồ tròn 4 hũ đầu tư theo giá trị.
- **Giao dịch gần đây** và **Tài sản nổi bật**: danh sách nhanh.
- **Hiệu suất (performance)**: trong trang "Danh Mục ĐT" → tab "Tài sản" có cột **XIRR/năm**
  (tỷ suất sinh lời theo thời gian), cùng lãi/lỗ đã thực hiện và chưa thực hiện.

## 7. Kiểm soát an toàn dữ liệu

- **AI không tự lưu**: mọi kết quả AI phân tích chỉ là *preview*. Dữ liệu chỉ được ghi khi
  bạn bấm "Xác nhận & lưu".
- **Cần kiểm tra trước khi lưu**: số tiền, ngày, tài khoản nguồn/đích, danh mục, và tiền tệ
  (phải là VND).
- **Khi AI hiểu sai**: sửa trực tiếp trên thẻ preview (đổi loại thao tác, số tiền, tài khoản...),
  hoặc bấm "← Sửa câu" để nhập lại, hoặc đóng modal và nhập thủ công.
- **Riêng tư**: nếu chưa cấu hình API key, phần AID dùng bộ phân tích *cục bộ* (không gửi dữ liệu
  ra ngoài). Phần "Hỏi cách dùng app" luôn chạy cục bộ dựa trên chính hướng dẫn này.
- **Sao lưu**: vào Cài Đặt → "Xuất JSON" để lưu bản backup; "Import JSON" để khôi phục.
- **Nhật ký thay đổi**: Cài Đặt có mục ghi lại các thao tác sửa/xóa dữ liệu tài chính.

## 8. FAQ

1. **App lưu dữ liệu ở đâu?** Trong trình duyệt của bạn (localStorage). Nên xuất JSON định kỳ để sao lưu.
2. **Có cần internet không?** Không, trừ khi bạn dùng AI thật (DeepSeek hoặc endpoint AI tương thích). Phần help và parser cục bộ chạy offline.
3. **App hỗ trợ ngoại tệ không?** Hiện chỉ tính theo VND. Hãy quy đổi trước khi nhập.
4. **Net worth là gì?** Tổng tài sản trừ tổng nợ.
5. **Làm sao nhập tài sản mới?** Trang "Danh Mục ĐT" → "+ Tài sản", hoặc dùng "✨ AI nhập".
6. **Làm sao ghi mua/bán cổ phiếu?** Trang "Danh Mục ĐT" → tab "Giao dịch" → "+ Giao dịch tài sản".
7. **Cho vay/thu hồi nợ có tính là thu chi không?** Không. Chúng làm đổi số dư tài khoản nhưng
   không tính vào thu nhập/chi tiêu.
8. **Trả nợ thẻ tín dụng nhập thế nào?** Dùng "✨ AI nhập" ("Trả nợ thẻ 5 triệu từ Techcombank")
   hoặc nhập giao dịch chi tiêu liên kết khoản nợ.
9. **Tại sao đường net worth 12 tháng nhìn "dựng lại"?** Vì app tái dựng từ sổ giao dịch; tháng
   chưa có snapshot được định giá theo giá hiện tại.
10. **XIRR là gì?** Tỷ suất sinh lời theo thời gian (money-weighted, năm hóa) của từng tài sản.
11. **Làm sao sao lưu/khôi phục dữ liệu?** Cài Đặt → "Xuất JSON" / "Import JSON".
12. **Xóa nhầm giao dịch thì sao?** Kiểm tra "Nhật ký thay đổi" trong Cài Đặt; khôi phục từ
    bản JSON đã xuất nếu cần. App không có nút hoàn tác tức thời.
13. **AI có tự ý lưu không?** Không bao giờ — luôn cần bạn xác nhận.
14. **Hũ đầu tư là gì?** Cách chia danh mục đầu tư theo mục đích: Tăng trưởng vốn, Dòng tiền,
    Lướt sóng, Bảo đảm.

## 9. Troubleshooting

- **Không lưu được dữ liệu**: kiểm tra báo lỗi đỏ — thường do số tiền ≤ 0, ngày sai định dạng,
  thiếu tài khoản, hoặc chuyển khoản trùng nguồn/đích.
- **AI parse sai**: sửa trực tiếp trên thẻ preview hoặc bấm "← Sửa câu". Câu càng rõ
  (số tiền + loại + tài khoản) thì confidence càng cao.
- **Thiếu currency/account/category**: field thiếu bị tô đỏ trong preview; chọn/điền rồi lưu.
  Tiền tệ phải là VND.
- **Dashboard không cập nhật**: dashboard tính lại sau mỗi lần lưu. Nếu mở nhiều tab, hãy tải lại trang.
- **Dữ liệu trùng hoặc sai**: xóa giao dịch sai trong trang Thu Chi; với mua/bán tài sản, sửa/xóa
  trong "Danh Mục ĐT" → tab "Giao dịch". Import file JSON có liên kết hỏng sẽ hiện cảnh báo "liên kết mồ côi".
