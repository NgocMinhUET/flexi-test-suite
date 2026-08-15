# Rà soát & hoàn thiện nền tảng thi trực tuyến

Kết quả rà soát toàn nền tảng (luồng thi/chấm điểm, cuộc thi/đăng ký/thanh toán, ngân hàng câu hỏi/sinh đề). Dưới đây là các lỗi logic đã xác minh trong mã nguồn và cách sửa. Ưu tiên sửa nhóm ảnh hưởng trực tiếp tới điểm số và tiền bạc.

## Nhóm 1 — Chấm điểm (nghiêm trọng, ảnh hưởng công bằng)

1. **Hai bộ chấm điểm cho kết quả khác nhau.** Chấm tại trình duyệt (TakeExam) và chấm nền (edge function) áp dụng quy tắc khác nhau: câu Đúng/Sai bị chấm 0 điểm ở đường chấm tại trình duyệt, câu trả lời ngắn so khớp khoảng trắng khác nhau. Điểm của thí sinh phụ thuộc vào đường chấm nào chạy.
   → Thống nhất về **một** bộ quy tắc chấm dùng chung; luôn ưu tiên chấm nền cho bài thi chính thức.
2. **Câu chưa trả lời bị đếm sai** khi đáp án là mảng rỗng (câu nhiều lựa chọn) → tính là "làm sai" thay vì "bỏ trống".
3. **Nộp bài trùng.** Kiểm tra "đã nộp" chỉ chạy lúc mở trang; mở 2 tab có thể ghi đè kết quả hợp lệ. → Kiểm tra lại ngay trước khi ghi kết quả và chặn nếu đã có bài nộp.
4. **Tạo trùng phiên chấm.** Kiểm tra job đang chạy rồi mới tạo job mới, không nguyên tử → 2 job chấm song song cùng ghi đè kết quả. → Khóa nút nộp ngay lập tức + kiểm tra lại trước khi tạo job.
5. **Hết giờ có thể kích hoạt 2 lần** (khi trạng thái nộp bị đặt lại sau lỗi) → nộp bài 2 lần. → Chốt cờ "đã hết giờ" một chiều.
6. **Khôi phục bài làm dở có thể mất đáp án** nếu khóa câu hỏi là chuỗi/UUID (đáp án bị bỏ qua, chỉ ghi cảnh báo console). → Chuẩn hóa khóa đáp án về chuỗi, không loại bỏ khóa không phải số.
7. **Điểm chữ và phần trăm hiển thị lệch nhau** do làm tròn ở trang kết quả nhưng không tính lại xếp loại.

## Nhóm 2 — Cuộc thi, đăng ký & thanh toán

8. **Vượt giới hạn số lượng đăng ký (`max_registrations`).** Đếm rồi mới ghi, không nguyên tử → 2 người đăng ký cùng lúc đều lọt. Cùng lỗi này với "đã đăng ký" → có thể tạo 2 đơn cho một người.
   → Xử lý bằng một hàm phía cơ sở dữ liệu có khóa hàng, cộng ràng buộc duy nhất (contest_id, user_id).
9. **Đơn bị từ chối vẫn chiếm chỗ** trong giới hạn số lượng (đếm cả trạng thái thất bại).
10. **Từ chối sau khi đã duyệt không thu hồi quyền thi**: thí sinh vẫn còn trong danh sách dự thi và giữ đề đã gán.
11. **Phân đề không cân bằng khi duyệt đồng thời**: nhiều lượt duyệt cùng lúc đọc số liệu cũ và dồn thí sinh vào một mã đề. → Chuyển phần chọn đề ít người nhất xuống hàm cơ sở dữ liệu có khóa.
12. **Phân đề không kiểm tra đề còn hợp lệ** (đề đã xóa/gỡ xuất bản vẫn được gán).
13. **Báo cáo doanh thu**: hai trang tự tính riêng, dễ lệch; hoàn tiền chỉ đổi trạng thái mà không trừ doanh thu. → Gom về một hàm tính doanh thu dùng chung.

## Nhóm 3 — Sinh đề & ngân hàng câu hỏi

14. **Ràng buộc độ khó bị bỏ qua hoàn toàn** khi sinh đề: giao diện cho chọn khoảng độ khó nhưng bộ sinh không lọc theo độ khó.
15. **Xáo trộn đáp án không áp dụng cho câu nhiều lựa chọn** (chỉ áp dụng cho câu một lựa chọn).
16. **Đề chia phần âm thầm mất câu hỏi**: loại câu không được gán vào phần nào sẽ bị loại khỏi đề, tổng số câu/điểm không khớp ma trận. → Chặn sinh đề và báo lỗi rõ ràng.
17. **Đề sinh cho cuộc thi được xuất bản ngay** (`is_published: true`) trước khi được duyệt.
18. **Import Excel: dòng lỗi vẫn được đưa vào danh sách nhập.** Các lỗi như thiếu đáp án đúng, mã phân loại sai, thiếu test case chỉ được ghi nhận nhưng dòng đó vẫn được nhập.
19. **Không phát hiện mã câu hỏi trùng** trong cùng file và với dữ liệu sẵn có → lỗi khó hiểu khi nhập (mã phải duy nhất theo môn).

## Cần kiểm tra thêm trước khi sửa

- Quyền truy cập ở tầng cơ sở dữ liệu cho bảng đăng ký/hồ sơ (tránh trường hợp thí sinh thường đọc được dữ liệu thanh toán của người khác) — sẽ kiểm tra chính sách thực tế rồi vá nếu hở.
- Cảnh báo từ trình kiểm tra cơ sở dữ liệu: một số hàm nội bộ đang cho phép gọi khi chưa đăng nhập — sẽ thu hồi quyền gọi công khai.

## Thứ tự thực hiện

1. Nhóm 1 (chấm điểm, nộp bài) — sửa mã giao diện + hàm chấm nền.
2. Nhóm 2 — thêm ràng buộc và hàm cơ sở dữ liệu cho đăng ký/duyệt/phân đề (cần duyệt migration), rồi cập nhật mã gọi.
3. Nhóm 3 — sinh đề và import.
4. Rà quyền truy cập dữ liệu, chạy lại trình kiểm tra.
5. Kiểm thử lại các luồng chính bằng trình duyệt tự động (đăng ký → duyệt → phân đề → thi → nộp → xem điểm).

## Chi tiết kỹ thuật

- Tách logic chấm thành module dùng chung (`src/utils/grading.ts` cho client, bản sao đồng bộ trong `supabase/functions/grade-exam-background`), phủ đủ mọi `question_type`, chuẩn hóa so khớp chuỗi.
- Chuẩn hóa khóa đáp án về `string` trong `TakeExam`, `useExamAutoSave`, draft khôi phục.
- Migration bổ sung: `UNIQUE (contest_id, user_id)` trên `contest_registrations`; hàm `SECURITY DEFINER` `register_for_contest(invite_code)` và `approve_registration(reg_id)` dùng `SELECT ... FOR UPDATE` để kiểm tra sức chứa và phân đề cân bằng nguyên tử; `reject_registration` gỡ `contest_participants`.
- Bộ đếm sức chứa chỉ tính trạng thái `pending/paid/free`.
- `useExamGeneration`: thêm lọc `difficulty` theo `min/maxDifficulty`, mở rộng xáo trộn cho `MCQ_MULTI`, ném lỗi khi có câu không thuộc phần nào, `is_published: false` cho đề cuộc thi.
- `questionExcelParser`: `return` sau mỗi lỗi xác thực, thêm kiểm tra trùng `code` trong file và đối chiếu `(code, subject_id)` hiện có.
- Thu hồi `EXECUTE ... FROM anon` cho các hàm `SECURITY DEFINER` nội bộ.
