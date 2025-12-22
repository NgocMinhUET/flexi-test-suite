import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { QuestionStats } from '@/types/examGeneration';

export function useQuestionStats(subjectId: string | undefined) {
  return useQuery({
    queryKey: ['question-stats', subjectId],
    queryFn: async (): Promise<QuestionStats> => {
      if (!subjectId) {
        return {
          total: 0,
          byTaxonomy: {},
          byCognitiveLevel: {},
          byType: {},
          matrix: {},
        };
      }

      const { data: questions, error } = await supabase
        .from('questions')
        .select('id, taxonomy_node_id, cognitive_level, question_type')
        .eq('subject_id', subjectId)
        .eq('status', 'published')
        .is('deleted_at', null);

      if (error) throw error;

      const stats: QuestionStats = {
        total: questions?.length || 0,
        byTaxonomy: {},
        byCognitiveLevel: {},
        byType: {},
        matrix: {},
      };

      questions?.forEach((q) => {
        const taxonomyId = q.taxonomy_node_id || 'uncategorized';
        const cognitiveLevel = q.cognitive_level || 'uncategorized';
        const questionType = q.question_type;

        // Count by taxonomy
        stats.byTaxonomy[taxonomyId] = (stats.byTaxonomy[taxonomyId] || 0) + 1;

        // Count by cognitive level
        stats.byCognitiveLevel[cognitiveLevel] = (stats.byCognitiveLevel[cognitiveLevel] || 0) + 1;

        // Count by type
        stats.byType[questionType] = (stats.byType[questionType] || 0) + 1;

        // Build matrix: taxonomy -> cognitive -> type -> count
        if (!stats.matrix[taxonomyId]) {
          stats.matrix[taxonomyId] = {};
        }
        if (!stats.matrix[taxonomyId][cognitiveLevel]) {
          stats.matrix[taxonomyId][cognitiveLevel] = {};
        }
        stats.matrix[taxonomyId][cognitiveLevel][questionType] = 
          (stats.matrix[taxonomyId][cognitiveLevel][questionType] || 0) + 1;
      });

      return stats;
    },
    enabled: !!subjectId,
    staleTime: 60000, // Cache for 1 minute
    gcTime: 5 * 60 * 1000, // Keep in garbage collection for 5 minutes
  });
}

export function usePublishedQuestions(subjectId: string | undefined) {
  return useQuery({
    queryKey: ['published-questions', subjectId],
    queryFn: async () => {
      if (!subjectId) return [];

      const { data, error } = await supabase
        .from('questions')
        .select('id, content, question_type, cognitive_level, taxonomy_node_id, taxonomy_path, answer_data, difficulty, allow_shuffle')
        .eq('subject_id', subjectId)
        .eq('status', 'published')
        .is('deleted_at', null);

      if (error) throw error;
      return data || [];
    },
    enabled: !!subjectId,
    staleTime: 60000, // Cache for 1 minute
    gcTime: 5 * 60 * 1000,
  });
}
