
# Kế hoạch hoàn thiện Module Thi Ngoại ngữ

## Tổng quan tiến độ

```text
+------------------+------------------+------------------+------------------+
|   ĐÃ HOÀN THÀNH  |  CẦN LÀM TIẾP   |   ƯU TIÊN CAO   |   ƯU TIÊN THẤP  |
+------------------+------------------+------------------+------------------+
| - Database (8    | - Question       | 1. Question      | 8. Import Excel |
|   bảng lang_*)   |   Editor (10     |    Editor        | 9. Thống kê     |
| - Types/Hooks    |   loại)          | 2. Exam          |    chi tiết     |
| - Dashboard      | - Exam Mgmt      |    Management    | 10. Export PDF  |
| - Subject Mgmt   | - Take Exam      | 3. Take Exam     |                 |
| - Question Bank  | - My Exams       | 4. Taxonomy      |                 |
|   (view only)    | - Results        |                  |                 |
+------------------+------------------+------------------+------------------+
```

## Giai đoạn 1: Question Editor (Ưu tiên cao nhất)

### Mục tiêu
Tạo trang `/language/questions/new` và `/language/questions/:id/edit` hỗ trợ 10 loại câu hỏi ngoại ngữ.

### Files cần tạo

**1. `src/pages/language/LanguageQuestionEditor.tsx`**
- Wizard form với các bước:
  1. Chọn kỹ năng (Listening/Reading/Writing/Speaking)
  2. Chọn loại câu hỏi tương ứng
  3. Nhập nội dung + câu trả lời
  4. Cấu hình (điểm, thời gian, độ khó)

**2. Các component con cho từng loại câu hỏi:**

| Kỹ năng | Component | Chức năng |
|---------|-----------|-----------|
| **Listening** | `ListeningMCQEditor.tsx` | Trắc nghiệm + upload audio |
| | `ListeningFillEditor.tsx` | Điền từ vào chỗ trống + audio |
| **Reading** | `ReadingMCQEditor.tsx` | Trắc nghiệm đọc hiểu |
| | `ReadingOrderEditor.tsx` | Sắp xếp câu/đoạn văn |
| | `ReadingMatchEditor.tsx` | Ghép cặp (matching) |
| **Writing** | `WritingSentenceEditor.tsx` | Sắp xếp từ thành câu |
| | `WritingEssayEditor.tsx` | Viết luận + rubric |
| **Speaking** | `SpeakingReadEditor.tsx` | Đọc to + sample answer |
| | `SpeakingDescribeEditor.tsx` | Mô tả hình ảnh |
| | `SpeakingAnswerEditor.tsx` | Trả lời câu hỏi |

**3. Component tiện ích:**
- `AudioUploader.tsx` - Upload audio lên bucket `language-audio`
- `ImageUploader.tsx` - Upload hình ảnh (đã có sẵn có thể tái sử dụng)

### Routes cần thêm vào App.tsx
```text
/language/questions/new
/language/questions/:id/edit
```

---

## Giai đoạn 2: Quản lý Đề thi (Exam Management)

### Files cần tạo

**1. `src/pages/language/LanguageExamManagement.tsx`**
- Danh sách đề thi ngoại ngữ
- Filter theo môn học, trạng thái, cấp độ
- CRUD đề thi

**2. `src/pages/language/LanguageExamEditor.tsx`**
- Tạo/sửa đề thi
- Chọn câu hỏi từ ngân hàng
- Cấu hình sections (Listening → Reading → Writing → Speaking)
- Thiết lập thời gian cho từng section

**3. `src/hooks/useLangExams.ts`**
- CRUD operations cho bảng `lang_exams`
- Gán đề thi cho học sinh (`lang_exam_assignments`)

### Routes cần thêm
```text
/language/exams
/language/exams/new
/language/exams/:id/edit
```

---

## Giai đoạn 3: Làm bài thi (Take Exam)

### Files cần tạo

**1. `src/pages/language/TakeLanguageExam.tsx`**
- Giao diện làm bài với timer
- Navigation giữa các câu hỏi
- Auto-save draft

**2. Display components cho từng loại câu hỏi:**

| Component | Chức năng |
|-----------|-----------|
| `LangListeningDisplay.tsx` | AudioPlayer với giới hạn lần nghe |
| `LangReadingMatchDisplay.tsx` | Drag-and-drop ghép cặp |
| `LangReadingOrderDisplay.tsx` | Drag-and-drop sắp xếp |
| `LangWritingSentenceDisplay.tsx` | Word chips để sắp xếp từ |
| `LangWritingEssayDisplay.tsx` | Text editor với word count |
| `LangSpeakingDisplay.tsx` | Voice recorder + timer |

**3. `src/components/language/VoiceRecorder.tsx`**
- Sử dụng RecordRTC (đã cài sẵn)
- Upload lên bucket `student-recordings`

### Routes cần thêm
```text
/language/exam/:id
/language/my-exams
```

---

## Giai đoạn 4: Kết quả & Phân loại

### Files cần tạo

**1. `src/pages/language/LanguageExamResult.tsx`**
- Hiển thị kết quả chi tiết
- Phân tích theo kỹ năng (Listening, Reading, Writing, Speaking)
- Feedback cho từng câu

**2. `src/pages/language/LanguageTaxonomyManagement.tsx`**
- Quản lý phân loại (Chương/Bài/Mục) cho từng môn
- Tree view với drag-and-drop reorder

### Routes cần thêm
```text
/language/exam/:id/result
/language/subjects/:id/taxonomy
```

---

## Chi tiết kỹ thuật

### Cấu trúc thư mục đề xuất

```text
src/
├── pages/language/
│   ├── LanguageDashboard.tsx        ✅ Done
│   ├── LanguageSubjects.tsx         ✅ Done
│   ├── LanguageQuestionBank.tsx     ✅ Done
│   ├── LanguageQuestionEditor.tsx   ⏳ Phase 1
│   ├── LanguageExamManagement.tsx   ⏳ Phase 2
│   ├── LanguageExamEditor.tsx       ⏳ Phase 2
│   ├── TakeLanguageExam.tsx         ⏳ Phase 3
│   ├── LanguageMyExams.tsx          ⏳ Phase 3
│   ├── LanguageExamResult.tsx       ⏳ Phase 4
│   └── LanguageTaxonomyManagement.tsx ⏳ Phase 4
│
├── components/language/
│   ├── editors/                     ⏳ Phase 1
│   │   ├── ListeningMCQEditor.tsx
│   │   ├── ListeningFillEditor.tsx
│   │   ├── ReadingMCQEditor.tsx
│   │   ├── ReadingMatchEditor.tsx
│   │   ├── ReadingOrderEditor.tsx
│   │   ├── WritingSentenceEditor.tsx
│   │   ├── WritingEssayEditor.tsx
│   │   ├── SpeakingReadEditor.tsx
│   │   ├── SpeakingDescribeEditor.tsx
│   │   └── SpeakingAnswerEditor.tsx
│   │
│   ├── display/                     ⏳ Phase 3
│   │   ├── LangListeningDisplay.tsx
│   │   ├── LangMatchingDisplay.tsx
│   │   ├── LangOrderingDisplay.tsx
│   │   ├── LangSentenceDisplay.tsx
│   │   ├── LangEssayDisplay.tsx
│   │   └── LangSpeakingDisplay.tsx
│   │
│   ├── AudioUploader.tsx            ⏳ Phase 1
│   └── VoiceRecorder.tsx            ⏳ Phase 3
│
├── hooks/
│   ├── useLangSubjects.ts           ✅ Done
│   ├── useLangQuestions.ts          ✅ Done
│   ├── useLangTaxonomy.ts           ✅ Done
│   └── useLangExams.ts              ⏳ Phase 2
│
└── types/
    └── language.ts                  ✅ Done
```

### Thứ tự thực hiện đề xuất

| Bước | Nội dung | Ước tính |
|------|----------|----------|
| 1 | **Sửa lỗi 404**: Tạo placeholder cho `/language/exams` | Nhỏ |
| 2 | **AudioUploader**: Component upload audio | Vừa |
| 3 | **Question Editor base**: Form chung + routing | Vừa |
| 4 | **10 Editor components**: Từng loại câu hỏi | Lớn |
| 5 | **Exam Management**: Tạo/quản lý đề thi | Lớn |
| 6 | **Display components**: Hiển thị câu hỏi khi làm bài | Lớn |
| 7 | **Take Exam**: Giao diện làm bài hoàn chỉnh | Lớn |
| 8 | **Voice Recorder**: Ghi âm cho Speaking | Vừa |
| 9 | **Results & Taxonomy**: Hoàn thiện | Vừa |

---

## Bước tiếp theo đề xuất

Tôi đề xuất bắt đầu với **Giai đoạn 1** theo thứ tự:

1. **Sửa ngay lỗi 404**: Tạo trang placeholder `/language/exams` để không còn lỗi
2. **Tạo LanguageQuestionEditor.tsx**: Giao diện wizard chọn loại câu hỏi
3. **Tạo AudioUploader.tsx**: Hỗ trợ upload audio cho Listening
4. **Tạo các Editor components**: Bắt đầu với Listening MCQ và Reading MCQ (phổ biến nhất)

Bạn có muốn tôi bắt đầu triển khai theo kế hoạch này không?
