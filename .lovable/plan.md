
# Kế hoạch Nâng cấp Cấu trúc Language Module cho Ma trận sinh đề

## Phân tích vấn đề

### Ma trận sinh đề tiêu chuẩn (Hệ thống chính)

```text
                        Mức nhận thức Bloom
                 +------------+------------+------------+
                 | Nhận biết  | Thông hiểu | Vận dụng   |
+--------------+------------+------------+------------+
| Chương 1     |     5      |     3      |     2      | → 10 câu
| Chương 2     |     4      |     4      |     2      | → 10 câu  
| Chương 3     |     3      |     4      |     3      | → 10 câu
+--------------+------------+------------+------------+
                 Theo từng loại câu hỏi (MCQ, Tự luận...)
```

### Yêu cầu đặc thù cho Ngoại ngữ (HSK, TOPIK, IELTS...)

Ngoài ma trận trên, đề thi ngoại ngữ cần phân theo:
- **Skill (Kỹ năng)**: Listening, Reading, Writing, Speaking
- **Proficiency Level**: HSK1-6, TOPIK I-II, IELTS Band...
- **Topic/Theme (Chủ đề)**: Gia đình, Du lịch, Công việc, Môi trường...
- **Cognitive Level**: Vẫn áp dụng Bloom (Hiểu nghĩa → Suy luận → Ứng dụng)

## Giải pháp đề xuất

### 1. Bổ sung cột `cognitive_level` vào bảng `lang_questions`

```text
ALTER TABLE lang_questions 
ADD COLUMN cognitive_level text;
```

Các mức nhận thức cho ngoại ngữ:
- **Nhận diện** (Recognition): Nghe/đọc từ vựng đơn lẻ
- **Hiểu nghĩa** (Comprehension): Hiểu nghĩa câu/đoạn
- **Suy luận** (Inference): Suy ra ý ẩn, ngữ cảnh
- **Ứng dụng** (Application): Tạo lập văn bản/lời nói

### 2. Mở rộng cấu hình `lang_subjects` với `cognitive_levels`

Thêm cột JSONB `cognitive_levels` để mỗi môn tự định nghĩa:

```text
// Tiếng Trung (HSK-style)
["Nhận diện", "Hiểu nghĩa", "Suy luận", "Ứng dụng"]

// Tiếng Anh (IELTS-style) 
["Literal", "Inferential", "Evaluative", "Applied"]
```

### 3. Chuẩn hóa Taxonomy theo Topic/Theme

Bảng `lang_taxonomy_nodes` đã có nhưng cần thiết lập cấu trúc:

```text
Level 0: Chủ đề lớn (Topic)
├── 家庭 (Gia đình)
├── 工作 (Công việc)
├── 旅游 (Du lịch)
└── 环境 (Môi trường)

Level 1: Chủ đề con (Sub-topic)
├── 家庭 > 家庭成员 (Thành viên gia đình)
├── 家庭 > 家庭活动 (Hoạt động gia đình)
└── ...
```

### 4. Tạo config `matrix_config` cho `lang_subjects`

Thêm JSONB config để định nghĩa cấu trúc ma trận linh hoạt:

```text
{
  "dimensions": ["skill_type", "proficiency_level", "cognitive_level", "taxonomy"],
  "sections": [
    {"name": "Listening", "skills": ["listening"], "duration": 30},
    {"name": "Reading", "skills": ["reading"], "duration": 50},
    {"name": "Writing", "skills": ["writing"], "duration": 60},
    {"name": "Speaking", "skills": ["speaking"], "duration": 15}
  ]
}
```

## Thay đổi Database

### Migration SQL

```sql
-- 1. Thêm cognitive_level vào câu hỏi
ALTER TABLE lang_questions 
ADD COLUMN cognitive_level text;

-- 2. Thêm cognitive_levels và matrix_config vào môn học
ALTER TABLE lang_subjects 
ADD COLUMN cognitive_levels jsonb DEFAULT '[]'::jsonb,
ADD COLUMN matrix_config jsonb;

-- 3. Cập nhật 4 môn học mẫu với cognitive_levels
UPDATE lang_subjects SET cognitive_levels = '["Nhận diện", "Hiểu nghĩa", "Suy luận", "Ứng dụng"]'::jsonb;
```

## Thay đổi Frontend

### 1. Cập nhật Types (`src/types/language.ts`)

```typescript
// Thêm vào LangSubject
export interface LangSubject {
  // ... existing fields
  cognitive_levels: string[];  // NEW
  matrix_config?: MatrixConfig; // NEW
}

// Thêm vào LangQuestion
export interface LangQuestion {
  // ... existing fields
  cognitive_level?: string | null; // NEW
}
```

### 2. Cập nhật Question Editor

Thêm Select cho `cognitive_level` trong form tạo câu hỏi (ngay sau `proficiency_level`)

### 3. Cập nhật Language Subject Form

Thêm UI quản lý `cognitive_levels` array (tương tự `skill_types`)

### 4. Tạo Ma trận sinh đề cho Language

Cấu trúc ma trận 4 chiều:

```text
Ma trận sinh đề ngoại ngữ
├── Chọn Skill: [Listening] [Reading] [Writing] [Speaking]
├── Chọn Proficiency: [HSK1] [HSK2] [HSK3] ... 
└── Ma trận 2D:
    - Rows: Taxonomy (Topics/Themes)
    - Columns: Cognitive Levels
    - Cells: Số lượng câu hỏi + điểm
```

## So sánh trước/sau

| Thuộc tính | Trước | Sau |
|------------|-------|-----|
| Phân loại theo Topic | ✅ taxonomy | ✅ taxonomy |
| Phân loại theo Kỹ năng | ✅ skill_type | ✅ skill_type |
| Phân loại theo Cấp độ | ✅ proficiency_level | ✅ proficiency_level |
| Phân loại theo Mức nhận thức | ❌ Thiếu | ✅ cognitive_level |
| Cấu hình linh hoạt theo môn | ❌ Cố định | ✅ cognitive_levels[] + matrix_config |

## Thứ tự thực hiện

| Bước | Nội dung |
|------|----------|
| 1 | Chạy SQL migration thêm cột mới |
| 2 | Cập nhật `src/types/language.ts` |
| 3 | Cập nhật `LanguageQuestionEditor` thêm cognitive_level select |
| 4 | Cập nhật `LanguageSubjects` thêm UI quản lý cognitive_levels |
| 5 | Tạo hook `useLangQuestionStats` thống kê theo ma trận |
| 6 | Tạo `LanguageExamGenerator` với ma trận 4 chiều |

## Lợi ích

1. **Khoa học**: Đảm bảo đề thi cân bằng về mức nhận thức (không chỉ toàn nhận diện)
2. **Linh hoạt**: Mỗi môn tự định nghĩa cognitive levels phù hợp tiêu chuẩn riêng
3. **Hiệu quả**: Hỗ trợ sinh đề tự động theo ma trận đa chiều
4. **Nhất quán**: Cấu trúc tương đồng với hệ thống chính, dễ maintain
