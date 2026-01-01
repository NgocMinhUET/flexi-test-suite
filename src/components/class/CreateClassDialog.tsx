import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSubjects } from '@/hooks/useSubjects';
import { useCreateClass, useUpdateClass } from '@/hooks/useClasses';
import type { ClassWithDetails, CreateClassInput } from '@/types/class';

const classFormSchema = z.object({
  code: z.string().min(1, 'Mã lớp là bắt buộc').max(20, 'Mã lớp tối đa 20 ký tự'),
  name: z.string().min(1, 'Tên lớp là bắt buộc').max(100, 'Tên lớp tối đa 100 ký tự'),
  description: z.string().optional(),
  subject_id: z.string().optional(),
  academic_year: z.string().optional(),
  semester: z.string().optional(),
  grade_level: z.string().optional(),
  max_students: z.number().min(1).max(500).optional(),
  is_active: z.boolean().default(true),
});

type ClassFormValues = z.infer<typeof classFormSchema>;

interface CreateClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingClass?: ClassWithDetails | null;
}

export function CreateClassDialog({ 
  open, 
  onOpenChange,
  editingClass 
}: CreateClassDialogProps) {
  const { data: subjects } = useSubjects();
  const createClass = useCreateClass();
  const updateClass = useUpdateClass();
  
  const isEditing = !!editingClass;

  const form = useForm<ClassFormValues>({
    resolver: zodResolver(classFormSchema),
    defaultValues: {
      code: editingClass?.code || '',
      name: editingClass?.name || '',
      description: editingClass?.description || '',
      subject_id: editingClass?.subject_id || undefined,
      academic_year: editingClass?.academic_year || '',
      semester: editingClass?.semester || '',
      grade_level: editingClass?.grade_level || '',
      max_students: editingClass?.max_students || 50,
      is_active: editingClass?.is_active ?? true,
    },
  });

  // Reset form when dialog opens with new data
  useState(() => {
    if (open && editingClass) {
      form.reset({
        code: editingClass.code,
        name: editingClass.name,
        description: editingClass.description || '',
        subject_id: editingClass.subject_id || undefined,
        academic_year: editingClass.academic_year || '',
        semester: editingClass.semester || '',
        grade_level: editingClass.grade_level || '',
        max_students: editingClass.max_students || 50,
        is_active: editingClass.is_active,
      });
    } else if (open && !editingClass) {
      form.reset({
        code: '',
        name: '',
        description: '',
        subject_id: undefined,
        academic_year: '',
        semester: '',
        grade_level: '',
        max_students: 50,
        is_active: true,
      });
    }
  });

  const onSubmit = async (values: ClassFormValues) => {
    const input: CreateClassInput = {
      code: values.code,
      name: values.name,
      description: values.description || null,
      subject_id: values.subject_id || null,
      academic_year: values.academic_year || null,
      semester: values.semester || null,
      grade_level: values.grade_level || null,
      max_students: values.max_students || null,
      is_active: values.is_active,
    };

    try {
      if (isEditing && editingClass) {
        await updateClass.mutateAsync({ id: editingClass.id, ...input });
      } else {
        await createClass.mutateAsync(input);
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const currentYear = new Date().getFullYear();
  const academicYears = [
    `${currentYear - 1}-${currentYear}`,
    `${currentYear}-${currentYear + 1}`,
    `${currentYear + 1}-${currentYear + 2}`,
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Chỉnh sửa lớp học' : 'Tạo lớp học mới'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mã lớp *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="VD: 12A1-2024" 
                        {...field} 
                        disabled={isEditing}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="max_students"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sĩ số tối đa</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="50" 
                        {...field}
                        onChange={e => field.onChange(parseInt(e.target.value) || 50)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên lớp *</FormLabel>
                  <FormControl>
                    <Input placeholder="VD: Lớp 12A1 - Toán nâng cao" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mô tả</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Mô tả ngắn về lớp học..."
                      className="resize-none"
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subject_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Môn học</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn môn học (tùy chọn)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {subjects?.map(subject => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="academic_year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Năm học</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {academicYears.map(year => (
                          <SelectItem key={year} value={year}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="semester"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Học kỳ</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="HK1">Học kỳ 1</SelectItem>
                        <SelectItem value="HK2">Học kỳ 2</SelectItem>
                        <SelectItem value="Cả năm">Cả năm</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="grade_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Khối lớp</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {[...Array(12)].map((_, i) => (
                          <SelectItem key={i + 1} value={`Lớp ${i + 1}`}>
                            Lớp {i + 1}
                          </SelectItem>
                        ))}
                        <SelectItem value="Đại học">Đại học</SelectItem>
                        <SelectItem value="Sau đại học">Sau đại học</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Trạng thái hoạt động</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Lớp đang hoạt động có thể nhận bài tập và học sinh mới
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Hủy
              </Button>
              <Button 
                type="submit" 
                disabled={createClass.isPending || updateClass.isPending}
              >
                {createClass.isPending || updateClass.isPending 
                  ? 'Đang xử lý...' 
                  : isEditing 
                    ? 'Cập nhật' 
                    : 'Tạo lớp'
                }
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
