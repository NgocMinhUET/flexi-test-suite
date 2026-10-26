# Kế hoạch: Thi Shell/Linux trên nền tảng

## Mục tiêu
Thêm loại câu hỏi "Shell/Linux" vào bài thi lập trình hiện có. Câu hỏi hỗ trợ 4 dạng bài: viết script Bash, xử lý văn bản (grep/awk/sed/pipe), thao tác file/thư mục, và terminal tương tác. Chấm tự động và dùng dịch vụ chạy mã hiện có, không cần máy chủ riêng.

## Cách một câu hỏi Shell hoạt động
Giáo viên soạn mỗi câu gồm 4 phần:
1. **Đề bài**: nội dung yêu cầu.
2. **Môi trường ban đầu**: các file và thư mục có sẵn, ví dụ `data/log.txt` hoặc `users.csv`. Có thể dán nội dung hoặc viết một đoạn lệnh khởi tạo.
3. **Chế độ làm bài**: "Viết script" hoặc "Terminal tương tác".
4. **Các bài kiểm tra chấm điểm**, mỗi bài có trọng số riêng:
   - So sánh kết quả in ra với đáp án.
   - Kiểm tra trạng thái sau khi chạy: file/thư mục có tồn tại không, nội dung đúng không, quyền (chmod) đúng không.
   - Lệnh kiểm tra tùy chỉnh: đạt nếu chạy thành công.

```text
Môi trường ban đầu  ->  Bài làm của sinh viên  ->  Lệnh kiểm tra  ->  Điểm
  (tạo file)             (script / lệnh đã gõ)     (đạt/không)
```

## Phía sinh viên khi thi
- **Chế độ Viết script**: ô soạn mã cho Bash có tô màu cú pháp. Có nút "Chạy thử" để xem kết quả trên các bài kiểm tra công khai. Bài kiểm tra ẩn chỉ dùng khi chấm.
- **Chế độ Terminal tương tác**: màn hình giống terminal, gõ lệnh và thấy kết quả. Hệ thống ghi lại toàn bộ lệnh đã gõ, có nút "Đặt lại môi trường". Khi nộp bài, chuỗi lệnh được chạy lại trên môi trường sạch rồi chấm như một script.
  - Giới hạn: không có trình soạn thảo toàn màn hình như vim/nano hay chương trình chạy liên tục. Muốn ghi file thì dùng `echo`, `cat <<EOF` hoặc `printf`. Đề bài sẽ ghi rõ giới hạn này.
- Bài làm tự lưu nháp như các câu hỏi khác.

## Phía giáo viên
- Trình soạn câu hỏi có thêm loại "Shell/Linux". Gồm các ô: môi trường ban đầu, chế độ làm bài, danh sách bài kiểm tra (thêm, xóa, đổi trọng số, đặt ẩn hoặc hiện).
- Nút "Chạy thử với lời giải mẫu" để giáo viên kiểm tra đề trước khi giao.
- Nhập câu hỏi từ Excel: thêm sheet `Shell_Tests`.
- Trang kết quả: xem từng bài kiểm tra đạt hay trượt, kết quả in ra, và các lệnh sinh viên đã gõ (với chế độ terminal).

## Lưu ý về quy mô 50–150 sinh viên
Dịch vụ chạy mã miễn phí hiện tại có giới hạn số lần chạy. Giải pháp dự kiến:
- Gộp mọi bài kiểm tra của một câu vào **một lần chạy** khi chấm.
- Giới hạn tần suất "Chạy thử" cho mỗi sinh viên. Gợi ý: tối đa 1 lần mỗi 3 giây trong chế độ terminal, 1 lần mỗi 10 giây trong chế độ script.
- Khi nộp bài, chấm qua hàng đợi đã có, tự thử lại nếu bị giới hạn. Sinh viên không mất bài.
- Khuyến nghị: nếu thi thật trên 100 người cùng lúc, nên làm một buổi thử tải trước. Về lâu dài, có thể chuyển sang máy chủ chạy mã riêng của khoa mà không phải sửa đề.

## Thứ tự triển khai
1. Loại câu hỏi Shell và trình soạn cho giáo viên, kèm chạy thử lời giải mẫu.
2. Chế độ Viết script khi thi, gồm chạy thử và chấm tự động.
3. Chế độ Terminal tương tác: ghi lại lệnh, chạy lại khi chấm.
4. Hiển thị kết quả chi tiết, nhập từ Excel, và một đề mẫu Linux cơ bản để thử.

## Chi tiết kỹ thuật
- Thêm giá trị `SHELL` vào danh sách loại câu hỏi. Thêm loại `shell` phía giao diện. `answer_data` gồm `{ mode: 'script'|'terminal', setupFiles: [{path, content, mode}], setupScript, tests: [{id, kind: 'stdout'|'file_exists'|'file_content'|'permission'|'custom', target, expected, weight, isHidden}], sampleSolution, timeLimit }`.
- Hàm `execute-code` thêm ngôn ngữ `bash`. Mỗi lần chạy gửi một script gói gồm: bước khởi tạo môi trường, bài làm của sinh viên với giới hạn thời gian (`timeout`), rồi từng bài kiểm tra, mỗi bài in một dòng đánh dấu `__T:<id>:PASS|FAIL`. Hệ thống đọc các dòng này để tính điểm.
- Chế độ terminal: mỗi lệnh gõ vào gửi lịch sử lệnh từ trước tới nay và chạy lại trên môi trường mới (giới hạn khoảng 200 lệnh), rồi trả về phần kết quả của lệnh cuối. Chấm bằng cách chạy lại toàn bộ lịch sử.
- Chấm phía máy chủ trong `grade-exam-background` cho loại `shell`, để đáp án ẩn không gửi xuống trình duyệt.
- Giới hạn tần suất chạy thử phía máy chủ theo từng người dùng.
