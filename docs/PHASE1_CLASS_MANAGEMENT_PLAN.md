# 📚 PHASE 1: KẾ HOẠCH TRIỂN KHAI QUẢN LÝ LỚP HỌC

**Mức độ ưu tiên:** 🔴 CRITICAL
**Thời gian ước tính:** 2-3 ngày
**Yêu cầu từ người dùng:** "Việc quản lý nên theo lớp vì học sinh, sinh viên có thể ở trong nhiều lớp"

---

## 🎯 MỤC TIÊU

1. ✅ Học sinh có thể ở trong nhiều lớp (many-to-many relationship)
2. ✅ Giáo viên giao bài theo lớp thay vì từng học sinh riêng lẻ
3. ✅ Quản lý danh sách học sinh theo lớp
4. ✅ Xem kết quả, thống kê theo lớp
5. ✅ Giáo viên có thể phụ trách nhiều lớp

---

## 📊 DATABASE SCHEMA

### 1. Table: `classes`

```sql
-- Bảng quản lý lớp học
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE, -- Mã lớp: 10A1, 11B2, CNTT-K65-01
  name TEXT NOT NULL,         -- Tên lớp: Lớp 10A1 - Toán
  description TEXT,

  -- Thông tin học tập
  subject_id UUID REFERENCES public.subjects(id), -- Môn học chính (nullable)
  academic_year TEXT,         -- Năm học: 2025-2026
  semester TEXT,              -- Học kỳ: HK1, HK2, Cả năm
  grade_level TEXT,           -- Khối: 10, 11, 12, K65, K66

  -- Metadata
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  max_students INTEGER,

  -- Audit
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  deleted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT valid_dates CHECK (end_date IS NULL OR end_date >= start_date)
);

-- Indexes
CREATE INDEX idx_classes_code ON public.classes(code);
CREATE INDEX idx_classes_subject ON public.classes(subject_id);
CREATE INDEX idx_classes_created_by ON public.classes(created_by);
CREATE INDEX idx_classes_academic_year ON public.classes(academic_year);
CREATE INDEX idx_classes_active ON public.classes(is_active) WHERE deleted_at IS NULL;

-- Comments
COMMENT ON TABLE public.classes IS 'Quản lý lớp học - một lớp có thể học nhiều môn, một học sinh có thể ở nhiều lớp';
COMMENT ON COLUMN public.classes.code IS 'Mã lớp duy nhất, VD: 10A1, CNTT-K65-01';
COMMENT ON COLUMN public.classes.subject_id IS 'Môn học chính (nullable vì một lớp có thể học nhiều môn)';
```

### 2. Table: `class_students`

```sql
-- Bảng liên kết học sinh - lớp (Many-to-Many)
CREATE TABLE public.class_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Enrollment info
  enrolled_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  status TEXT DEFAULT 'active', -- active, inactive, dropped, graduated
  role TEXT DEFAULT 'student',  -- student, monitor (lớp trưởng), deputy (lớp phó)

  -- Notes
  notes TEXT,

  -- Audit
  enrolled_by UUID REFERENCES auth.users(id), -- Ai thêm học sinh này vào

  -- Constraints
  UNIQUE(class_id, student_id),
  CONSTRAINT valid_status CHECK (status IN ('active', 'inactive', 'dropped', 'graduated')),
  CONSTRAINT valid_role CHECK (role IN ('student', 'monitor', 'deputy'))
);

-- Indexes
CREATE INDEX idx_class_students_class ON public.class_students(class_id);
CREATE INDEX idx_class_students_student ON public.class_students(student_id);
CREATE INDEX idx_class_students_status ON public.class_students(status);

COMMENT ON TABLE public.class_students IS 'Liên kết học sinh với lớp - một học sinh có thể ở nhiều lớp';
```

### 3. Table: `class_teachers`

```sql
-- Bảng giáo viên phụ trách lớp
CREATE TABLE public.class_teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  role TEXT DEFAULT 'primary', -- primary (GVCN), assistant (GV bộ môn), substitute
  subject_id UUID REFERENCES public.subjects(id), -- Môn giảng dạy

  assigned_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  assigned_by UUID REFERENCES auth.users(id),

  -- Constraints
  UNIQUE(class_id, teacher_id, subject_id),
  CONSTRAINT valid_teacher_role CHECK (role IN ('primary', 'assistant', 'substitute'))
);

-- Indexes
CREATE INDEX idx_class_teachers_class ON public.class_teachers(class_id);
CREATE INDEX idx_class_teachers_teacher ON public.class_teachers(teacher_id);
CREATE INDEX idx_class_teachers_subject ON public.class_teachers(subject_id);

COMMENT ON TABLE public.class_teachers IS 'Giáo viên phụ trách lớp - một giáo viên có thể dạy nhiều lớp';
```

### 4. Update: `practice_assignments`

```sql
-- Thêm class_id vào practice_assignments
ALTER TABLE public.practice_assignments
ADD COLUMN class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
ADD COLUMN assignment_scope TEXT DEFAULT 'individual'; -- 'class' hoặc 'individual'

-- Index
CREATE INDEX idx_practice_assignments_class ON public.practice_assignments(class_id);

-- Comment
COMMENT ON COLUMN public.practice_assignments.class_id IS 'Nếu giao bài theo lớp, field này sẽ có giá trị';
COMMENT ON COLUMN public.practice_assignments.assignment_scope IS 'Phạm vi giao bài: class (toàn lớp) hoặc individual (riêng lẻ)';
```

---

## 🔒 RLS POLICIES

### Classes Policies

```sql
-- Enable RLS
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- Admins: full access
CREATE POLICY "Admins can manage all classes"
ON public.classes
USING (has_role(auth.uid(), 'admin'));

-- Teachers: view classes they teach
CREATE POLICY "Teachers can view their classes"
ON public.classes FOR SELECT
USING (
  has_role(auth.uid(), 'teacher')
  AND deleted_at IS NULL
  AND (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.class_teachers ct
      WHERE ct.class_id = id AND ct.teacher_id = auth.uid()
    )
  )
);

-- Teachers: create classes
CREATE POLICY "Teachers can create classes"
ON public.classes FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'teacher')
  AND created_by = auth.uid()
);

-- Teachers: update own classes
CREATE POLICY "Teachers can update own classes"
ON public.classes FOR UPDATE
USING (
  has_role(auth.uid(), 'teacher')
  AND created_by = auth.uid()
);

-- Students: view classes they're enrolled in
CREATE POLICY "Students can view their classes"
ON public.classes FOR SELECT
USING (
  has_role(auth.uid(), 'student')
  AND deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM public.class_students cs
    WHERE cs.class_id = id
    AND cs.student_id = auth.uid()
    AND cs.status = 'active'
  )
);
```

### Class_Students Policies

```sql
ALTER TABLE public.class_students ENABLE ROW LEVEL SECURITY;

-- Admins: full access
CREATE POLICY "Admins can manage class students"
ON public.class_students
USING (has_role(auth.uid(), 'admin'));

-- Teachers: manage students in their classes
CREATE POLICY "Teachers can manage students in their classes"
ON public.class_students
USING (
  has_role(auth.uid(), 'teacher')
  AND EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = class_id
    AND (
      c.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.class_teachers ct
        WHERE ct.class_id = c.id AND ct.teacher_id = auth.uid()
      )
    )
  )
);

-- Students: view their own enrollment
CREATE POLICY "Students can view own enrollment"
ON public.class_students FOR SELECT
USING (
  has_role(auth.uid(), 'student')
  AND student_id = auth.uid()
);
```

### Class_Teachers Policies

```sql
ALTER TABLE public.class_teachers ENABLE ROW LEVEL SECURITY;

-- Admins: full access
CREATE POLICY "Admins can manage class teachers"
ON public.class_teachers
USING (has_role(auth.uid(), 'admin'));

-- Teachers: view classes they teach
CREATE POLICY "Teachers can view class teachers"
ON public.class_teachers FOR SELECT
USING (
  has_role(auth.uid(), 'teacher')
  AND (
    teacher_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = class_id AND c.created_by = auth.uid()
    )
  )
);

-- Class creators can assign teachers
CREATE POLICY "Class creators can assign teachers"
ON public.class_teachers
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'teacher')
  AND EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = class_id AND c.created_by = auth.uid()
  )
);
```

---

## 📁 FILE STRUCTURE

```
src/
├── hooks/
│   └── useClasses.ts                    # Hooks quản lý lớp học
├── pages/
│   ├── ClassManagement.tsx              # Danh sách lớp (Teacher/Admin)
│   ├── ClassDetail.tsx                  # Chi tiết lớp + danh sách học sinh
│   ├── MyClasses.tsx                    # Lớp của tôi (Student)
│   └── PracticeAssignmentManagement.tsx # Update: thêm giao bài theo lớp
├── components/
│   └── class/
│       ├── ClassForm.tsx                # Form tạo/sửa lớp
│       ├── ClassCard.tsx                # Card hiển thị lớp
│       ├── ClassStudentManager.tsx      # Quản lý học sinh trong lớp
│       ├── ClassTeacherManager.tsx      # Quản lý giáo viên trong lớp
│       ├── ClassStatsCard.tsx           # Thống kê lớp
│       └── StudentImportDialog.tsx      # Import học sinh từ CSV/Excel
├── types/
│   └── class.ts                         # Type definitions
└── lib/
    └── classUtils.ts                    # Utilities

supabase/
└── migrations/
    └── 20260101120000_create_classes_system.sql
```

---

## 💻 IMPLEMENTATION DETAILS

### 1. Types (`src/types/class.ts`)

```typescript
export interface Class {
  id: string;
  code: string;
  name: string;
  description?: string;
  subject_id?: string;
  academic_year?: string;
  semester?: string;
  grade_level?: string;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
  max_students?: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface ClassStudent {
  id: string;
  class_id: string;
  student_id: string;
  enrolled_at: string;
  status: 'active' | 'inactive' | 'dropped' | 'graduated';
  role: 'student' | 'monitor' | 'deputy';
  notes?: string;
  enrolled_by?: string;

  // Joined data
  student?: {
    id: string;
    email: string;
    full_name?: string;
  };
}

export interface ClassTeacher {
  id: string;
  class_id: string;
  teacher_id: string;
  role: 'primary' | 'assistant' | 'substitute';
  subject_id?: string;
  assigned_at: string;

  // Joined data
  teacher?: {
    id: string;
    email: string;
    full_name?: string;
  };
  subject?: {
    id: string;
    name: string;
  };
}

export interface ClassWithStats extends Class {
  student_count: number;
  teacher_count: number;
  active_assignments: number;
  avg_completion_rate: number;
}
```

### 2. Hooks (`src/hooks/useClasses.ts`)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Class, ClassStudent, ClassTeacher } from '@/types/class';
import { toast } from 'sonner';

// Fetch all classes (for teachers/admins)
export function useClasses() {
  return useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select(`
          *,
          subject:subjects(id, name),
          student_count:class_students(count),
          teacher_count:class_teachers(count)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ClassWithStats[];
    }
  });
}

// Fetch my classes (for students)
export function useMyClasses() {
  return useQuery({
    queryKey: ['my-classes'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('class_students')
        .select(`
          *,
          class:classes(
            *,
            subject:subjects(id, name)
          )
        `)
        .eq('student_id', user.id)
        .eq('status', 'active');

      if (error) throw error;
      return data;
    }
  });
}

// Fetch class students
export function useClassStudents(classId: string) {
  return useQuery({
    queryKey: ['class-students', classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('class_students')
        .select(`
          *,
          student:profiles!student_id(id, email, full_name, avatar_url)
        `)
        .eq('class_id', classId)
        .order('enrolled_at', { ascending: true });

      if (error) throw error;
      return data as ClassStudent[];
    },
    enabled: !!classId
  });
}

// Create class
export function useCreateClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (classData: Partial<Class>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('classes')
        .insert({
          ...classData,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      toast.success('Tạo lớp học thành công');
    },
    onError: (error) => {
      console.error('Error creating class:', error);
      toast.error('Có lỗi khi tạo lớp học');
    }
  });
}

// Add students to class
export function useAddStudentsToClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ classId, studentIds }: { classId: string; studentIds: string[] }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const enrollments = studentIds.map(studentId => ({
        class_id: classId,
        student_id: studentId,
        enrolled_by: user.id
      }));

      const { data, error } = await supabase
        .from('class_students')
        .insert(enrollments)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['class-students', variables.classId] });
      toast.success('Thêm học sinh thành công');
    },
    onError: (error) => {
      console.error('Error adding students:', error);
      toast.error('Có lỗi khi thêm học sinh');
    }
  });
}

// Remove student from class
export function useRemoveStudentFromClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ classId, studentId }: { classId: string; studentId: string }) => {
      const { error } = await supabase
        .from('class_students')
        .delete()
        .eq('class_id', classId)
        .eq('student_id', studentId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['class-students', variables.classId] });
      toast.success('Xóa học sinh khỏi lớp thành công');
    },
    onError: (error) => {
      console.error('Error removing student:', error);
      toast.error('Có lỗi khi xóa học sinh');
    }
  });
}
```

### 3. UI Components

#### ClassCard (`src/components/class/ClassCard.tsx`)

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, BookOpen, Calendar, ChevronRight } from 'lucide-react';
import { ClassWithStats } from '@/types/class';
import { useNavigate } from 'react-router-dom';

interface ClassCardProps {
  classData: ClassWithStats;
}

export function ClassCard({ classData }: ClassCardProps) {
  const navigate = useNavigate();

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => navigate(`/classes/${classData.id}`)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{classData.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Mã lớp: {classData.code}
            </p>
          </div>
          <Badge variant={classData.is_active ? "default" : "secondary"}>
            {classData.is_active ? 'Đang hoạt động' : 'Không hoạt động'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {classData.subject && (
            <div className="flex items-center gap-2 text-sm">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <span>{classData.subject.name}</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{classData.student_count} học sinh</span>
          </div>

          {classData.academic_year && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{classData.academic_year} - {classData.semester}</span>
            </div>
          )}
        </div>

        <Button variant="ghost" size="sm" className="w-full mt-4">
          Xem chi tiết
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}
```

---

## 🧪 TESTING CHECKLIST

### Database Tests
- [ ] Tạo lớp mới
- [ ] Thêm học sinh vào lớp (single & bulk)
- [ ] Xóa học sinh khỏi lớp
- [ ] Học sinh ở nhiều lớp cùng lúc
- [ ] Giáo viên phụ trách nhiều lớp
- [ ] RLS policies hoạt động đúng (admin/teacher/student)
- [ ] Soft delete classes

### UI Tests
- [ ] Danh sách lớp hiển thị đúng
- [ ] Tạo lớp mới (form validation)
- [ ] Chi tiết lớp + danh sách học sinh
- [ ] Thêm/xóa học sinh
- [ ] Giao bài theo lớp
- [ ] Responsive design (mobile/tablet/desktop)

### Integration Tests
- [ ] Practice Assignment giao theo lớp → auto-populate học sinh
- [ ] Xem kết quả theo lớp
- [ ] Dashboard theo lớp

---

## 📈 SUCCESS METRICS

### Trước khi có Class Management:
- ❌ Giáo viên chọn từng học sinh một khi giao bài
- ❌ Không quản lý được học sinh theo lớp
- ❌ Thời gian giao bài: ~30s cho 30 học sinh

### Sau khi có Class Management:
- ✅ Giáo viên chọn lớp, tự động giao cho toàn bộ học sinh
- ✅ Quản lý tập trung theo lớp
- ✅ Thời gian giao bài: ~5s (giảm 83%)

---

## 🚀 DEPLOYMENT PLAN

### Step 1: Database Migration
```bash
# Chạy migration
supabase migration up

# Verify tables created
supabase db inspect
```

### Step 2: Seed Data (Optional - for testing)
```sql
-- Tạo lớp test
INSERT INTO classes (code, name, academic_year, semester, grade_level, created_by)
VALUES
  ('10A1', 'Lớp 10A1 - Toán', '2025-2026', 'Cả năm', '10', 'teacher-uuid'),
  ('11B2', 'Lớp 11B2 - Lý', '2025-2026', 'HK1', '11', 'teacher-uuid');
```

### Step 3: Deploy Frontend
```bash
# Build
npm run build

# Deploy
# (Tùy theo platform: Vercel, Netlify, etc.)
```

### Step 4: User Testing
- Mời 2-3 giáo viên test
- Thu thập feedback
- Fix bugs nếu có

---

**Next:** Sau khi hoàn thành Phase 1, tiếp tục Phase 2 - Question Reason Explanation
