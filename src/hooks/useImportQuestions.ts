import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { ParsedQuestion, mapTaxonomyCodeToId, buildTaxonomyPath } from '@/utils/questionExcelParser';
import { toast } from 'sonner';

interface TaxonomyNode {
  id: string;
  code: string;
  name: string;
  parent_id?: string | null;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: { code: string; message: string }[];
}

interface ImportParams {
  questions: ParsedQuestion[];
  subjectId: string;
  taxonomyNodes: TaxonomyNode[];
  onProgress?: (current: number, total: number) => void;
}

const BATCH_SIZE = 20;

export function useImportQuestions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      questions,
      subjectId,
      taxonomyNodes,
      onProgress,
    }: ImportParams): Promise<ImportResult> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const result: ImportResult = {
        success: 0,
        failed: 0,
        errors: [],
      };

      // Process in batches
      for (let i = 0; i < questions.length; i += BATCH_SIZE) {
        const batch = questions.slice(i, i + BATCH_SIZE);
        
        const insertData = batch.map(q => {
          const taxonomyNodeId = q.taxonomy_code
            ? mapTaxonomyCodeToId(q.taxonomy_code, taxonomyNodes)
            : null;

          const taxonomyPath = taxonomyNodeId
            ? buildTaxonomyPath(taxonomyNodeId, taxonomyNodes)
            : [];

          return {
            subject_id: subjectId,
            code: q.code,
            content: q.content,
            content_plain: q.content, // Plain text since imported from Excel
            question_type: q.question_type,
            taxonomy_node_id: taxonomyNodeId,
            taxonomy_path: taxonomyPath as unknown as Json,
            cognitive_level: q.cognitive_level || null,
            difficulty: q.difficulty,
            estimated_time: q.estimated_time,
            answer_data: q.answer_data as unknown as Json,
            labels: (q.needs_rich_edit ? ['needs_edit'] : []) as unknown as Json,
            allow_shuffle: true,
            media: [] as unknown as Json,
            status: 'draft' as const,
            created_by: user.id,
          };
        });

        const { data, error } = await supabase
          .from('questions')
          .insert(insertData as any)
          .select('id, code');

        if (error) {
          // If batch fails, try inserting one by one to identify which ones failed
          for (const item of insertData) {
            const { error: singleError } = await supabase
              .from('questions')
              .insert(item as any);

            if (singleError) {
              result.failed++;
              result.errors.push({
                code: item.code || 'unknown',
                message: singleError.message,
              });
            } else {
              result.success++;
            }
          }
        } else {
          result.success += data?.length || 0;
        }

        // Report progress
        if (onProgress) {
          onProgress(Math.min(i + BATCH_SIZE, questions.length), questions.length);
        }
      }

      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      if (result.failed === 0) {
        toast.success(`Đã import ${result.success} câu hỏi thành công`);
      } else {
        toast.warning(
          `Import: ${result.success} thành công, ${result.failed} thất bại`
        );
      }
    },
    onError: (error) => {
      console.error('Error importing questions:', error);
      toast.error('Lỗi khi import câu hỏi');
    },
  });
}
