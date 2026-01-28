
# Kế hoạch: Thêm Module Thi Ngoại Ngữ (HSK-style)

## Tổng quan

Xây dựng module thi ngoại ngữ chuyên biệt hỗ trợ đầy đủ 4 kỹ năng ngôn ngữ: **Nghe - Nói - Đọc - Viết**, theo chuẩn quốc tế như HSK (Tiếng Trung), TOPIK (Tiếng Hàn), JLPT (Tiếng Nhật), IELTS/TOEFL (Tiếng Anh).

---

## 1. Phân tích cấu trúc HSK

Dựa trên nghiên cứu từ chinesetest.cn:

| Cấp độ | Nghe | Đọc | Viết | Nói | Dịch |
|--------|------|-----|------|-----|------|
| HSK 1-2 | Yes | Yes | - | - | - |
| HSK 3-6 | Yes | Yes | Yes | HSKK riêng | - |
| HSK 7-9 | Yes | Yes | Yes | Yes | Yes |

**Các dạng bài phổ biến:**
- **Nghe**: Nghe và chọn đáp án, nghe và đánh giá đúng/sai, điền từ vào chỗ trống
- **Đọc**: Đọc hiểu chọn đáp án, sắp xếp câu, điền từ, ghép cặp
- **Viết**: Sắp xếp từ thành câu, viết đoạn văn ngắn, tóm tắt bài đọc
- **Nói**: Đọc to, mô tả hình ảnh, trả lời câu hỏi, thuyết trình

---

## 2. Các thay đổi về kiểu dữ liệu (Types)

### 2.1. Mở rộng `QuestionType`

```text
src/types/exam.ts - Thêm các loại câu hỏi mới:

- 'listening-mcq'      : Nghe và chọn đáp án
- 'listening-fill'     : Nghe và điền từ
- 'reading-mcq'        : Đọc hiểu trắc nghiệm
- 'reading-order'      : Sắp xếp câu/đoạn
- 'reading-match'      : Ghép cặp (matching)
- 'writing-sentence'   : Sắp xếp từ thành câu
- 'writing-essay'      : Viết đoạn văn/bài luận
- 'speaking-read'      : Đọc to (ghi âm)
- 'speaking-describe'  : Mô tả hình ảnh (ghi âm)
- 'speaking-answer'    : Trả lời câu hỏi (ghi âm)
```

### 2.2. Interface mới cho câu hỏi ngôn ngữ

```text
ListeningQuestion {
  audioUrl: string;           // URL file audio
  audioTranscript?: string;   // Transcript (ẩn khi thi)
  playCount: number;          // Số lần được nghe (1-3)
  audioDuration: number;      // Độ dài audio (giây)
}

SpeakingQuestion {
  promptAudioUrl?: string;    // Audio hướng dẫn (nếu có)
  imageUrl?: string;          // Hình ảnh để mô tả
  recordingTimeLimit: number; // Giới hạn thời gian ghi âm (giây)
  preparationTime: number;    // Thời gian chuẩn bị (giây)
}

MatchingQuestion {
  leftItems: {id: string; text: string}[];   // Cột trái
  rightItems: {id: string; text: string}[];  // Cột phải
  correctPairs: {left: string; right: string}[];
}

OrderingQuestion {
  items: {id: string; text: string}[];       // Các phần tử cần sắp xếp
  correctOrder: string[];                     // Thứ tự đúng (mảng ID)
}
```

---

## 3. Thay đổi Database

### 3.1. Mở rộng ENUM `question_type`

```sql
ALTER TYPE question_type ADD VALUE 'LISTENING_MCQ';
ALTER TYPE question_type ADD VALUE 'LISTENING_FILL';
ALTER TYPE question_type ADD VALUE 'READING_MCQ';
ALTER TYPE question_type ADD VALUE 'READING_ORDER';
ALTER TYPE question_type ADD VALUE 'READING_MATCH';
ALTER TYPE question_type ADD VALUE 'WRITING_SENTENCE';
ALTER TYPE question_type ADD VALUE 'WRITING_ESSAY';
ALTER TYPE question_type ADD VALUE 'SPEAKING_READ';
ALTER TYPE question_type ADD VALUE 'SPEAKING_DESCRIBE';
ALTER TYPE question_type ADD VALUE 'SPEAKING_ANSWER';
```

### 3.2. Bảng lưu trữ media files

```sql
-- Bảng lưu metadata audio/recording
CREATE TABLE language_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES questions(id),
  media_type TEXT NOT NULL, -- 'audio_prompt', 'audio_answer', 'image'
  storage_path TEXT NOT NULL,
  duration INTEGER, -- duration in seconds (for audio)
  transcript TEXT,  -- transcript for audio (hidden during exam)
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.3. Bảng lưu câu trả lời ghi âm

```sql
-- Lưu bản ghi âm của thí sinh
CREATE TABLE speaking_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_result_id UUID REFERENCES exam_results(id),
  question_id UUID NOT NULL,
  recording_url TEXT NOT NULL,
  duration INTEGER NOT NULL, -- seconds
  transcript TEXT, -- AI transcription
  ai_score NUMERIC(5,2),
  ai_feedback TEXT,
  manual_score NUMERIC(5,2),
  manual_feedback TEXT,
  graded_by UUID REFERENCES auth.users(id),
  graded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 4. Supabase Storage

Tạo 2 buckets mới:
- `language-audio`: Lưu file audio đề bài (prompt)
- `student-recordings`: Lưu bản ghi âm của thí sinh

---

## 5. UI Components mới

### 5.1. Audio Player Component

```text
src/components/exam/AudioPlayer.tsx

- Hiển thị player với nút Play/Pause
- Đếm số lần đã nghe
- Khóa player khi hết lượt nghe cho phép
- Progress bar hiển thị vị trí audio
```

### 5.2. Voice Recorder Component

```text
src/components/exam/VoiceRecorder.tsx

- Giao diện ghi âm với thời gian đếm ngược
- Hiển thị waveform khi đang ghi
- Nút Start/Stop/Re-record
- Upload recording lên Supabase Storage
- Playback để thí sinh tự nghe lại
```

### 5.3. Matching Question Component

```text
src/components/exam/MatchingQuestion.tsx

- 2 cột items có thể kéo thả hoặc click để ghép
- Hiển thị các cặp đã ghép bằng đường nối
- Cho phép hủy ghép và ghép lại
```

### 5.4. Ordering Question Component

```text
src/components/exam/OrderingQuestion.tsx

- Danh sách items có thể kéo thả sắp xếp
- Hiển thị số thứ tự hiện tại
- Animation khi di chuyển items
```

---

## 6. Question Editor - Phần mở rộng

### 6.1. Listening Question Editor

```text
- Upload audio file (MP3/WAV)
- Nhập transcript (ẩn khi thi)
- Cấu hình số lần được nghe
- Preview audio
```

### 6.2. Speaking Question Editor

```text
- Tùy chọn upload audio hướng dẫn
- Tùy chọn upload hình ảnh
- Cấu hình thời gian chuẩn bị
- Cấu hình thời gian ghi âm tối đa
- Rubric chấm điểm
```

### 6.3. Matching/Ordering Editor

```text
- Nhập danh sách items
- Kéo thả để thiết lập thứ tự đúng
- Preview giao diện thí sinh
```

---

## 7. Chấm điểm

### 7.1. Tự động (Auto-grading)

| Loại câu hỏi | Phương pháp |
|--------------|-------------|
| Listening MCQ | So khớp đáp án |
| Listening Fill | So khớp text (normalize) |
| Reading MCQ | So khớp đáp án |
| Reading Order | So sánh mảng thứ tự |
| Reading Match | So sánh các cặp ghép |
| Writing Sentence | So sánh thứ tự từ |

### 7.2. AI-assisted (Cần tích hợp)

| Loại câu hỏi | Phương pháp |
|--------------|-------------|
| Writing Essay | AI đánh giá theo rubric |
| Speaking | Speech-to-Text + AI đánh giá phát âm, ngữ pháp |

### 7.3. Chấm tay (Manual)

- Giao diện cho giáo viên nghe recording và chấm điểm
- Nhập feedback chi tiết
- Override điểm AI nếu cần

---

## 8. HSK Template Builder

### 8.1. Tạo Preset cấu trúc HSK

```text
src/components/exam/LanguageExamTemplates.tsx

Các template có sẵn:
- HSK 1 (20 Listening + 20 Reading)
- HSK 2 (35 Listening + 25 Reading)
- HSK 3 (40 Listening + 30 Reading + 10 Writing)
- HSK 4-6 (cấu trúc tương ứng)
- Custom (tự tạo)
```

### 8.2. Tích hợp vào Section Manager

- Khi chọn môn "Tiếng Trung" hoặc ngôn ngữ khác
- Hiển thị option chọn template chuẩn
- Tự động tạo sections với cấu trúc phù hợp

---

## 9. Thứ tự triển khai

### Phase 1: Foundation (2-3 tuần)
1. Mở rộng database schema và types
2. Tạo Storage buckets
3. Component AudioPlayer cơ bản
4. Listening MCQ question type

### Phase 2: Reading Skills (1-2 tuần)
5. Reading MCQ, Order, Match components
6. Matching drag-and-drop UI
7. Ordering drag-and-drop UI
8. Auto-grading cho các loại trên

### Phase 3: Writing & Speaking (2-3 tuần)
9. Writing question types
10. VoiceRecorder component
11. Speaking question types
12. Storage integration cho recordings

### Phase 4: AI Grading (2-3 tuần)
13. Tích hợp Speech-to-Text (AI model)
14. AI grading cho Writing/Speaking
15. Manual grading UI cho giáo viên

### Phase 5: Templates & Polish (1 tuần)
16. HSK/TOPIK/JLPT template presets
17. Testing & bug fixes
18. Documentation

---

## 10. Technical Details

### Dependencies cần thêm

```json
{
  "@dnd-kit/core": "^6.x",        // Drag and drop
  "@dnd-kit/sortable": "^8.x",    // Sortable lists
  "wavesurfer.js": "^7.x",        // Audio waveform visualization
  "recordrtc": "^5.x"             // Audio recording
}
```

### Edge Functions mới

```text
supabase/functions/transcribe-audio/
- Nhận audio file, trả về transcript
- Sử dụng Lovable AI (Gemini/GPT) cho STT

supabase/functions/grade-speaking/
- Đánh giá pronunciation, fluency, grammar
- Trả về điểm số và feedback chi tiết

supabase/functions/grade-writing/
- Đánh giá theo rubric
- Trả về điểm từng tiêu chí
```

---

## Tổng kết

Module này sẽ biến FlexiTest thành nền tảng thi ngoại ngữ toàn diện, hỗ trợ:
- 10+ loại câu hỏi ngôn ngữ mới
- Audio playback với giới hạn lượt nghe
- Voice recording với real-time waveform
- Drag-and-drop cho matching/ordering
- AI-powered grading cho Speaking/Writing
- Template chuẩn HSK, TOPIK, JLPT, IELTS
