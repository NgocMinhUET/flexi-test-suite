import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { LangTaxonomyNode } from '@/types/language';

export function useLangTaxonomyNodes(subjectId: string | undefined) {
  return useQuery({
    queryKey: ['lang-taxonomy', subjectId],
    queryFn: async () => {
      if (!subjectId) return [];
      
      const { data, error } = await supabase
        .from('lang_taxonomy_nodes')
        .select('*')
        .eq('subject_id', subjectId)
        .is('deleted_at', null)
        .order('level')
        .order('order_index');
      
      if (error) throw error;
      return data as LangTaxonomyNode[];
    },
    enabled: !!subjectId,
  });
}

// Build tree structure from flat list
export function useLangTaxonomyTree(subjectId: string | undefined) {
  const { data: nodes, ...rest } = useLangTaxonomyNodes(subjectId);
  
  const tree = buildTree(nodes || []);
  const flatNodes = flattenTree(tree);
  
  return { 
    data: tree, 
    flatNodes,
    ...rest 
  };
}

function buildTree(nodes: LangTaxonomyNode[]): LangTaxonomyNode[] {
  const nodeMap = new Map<string, LangTaxonomyNode>();
  const roots: LangTaxonomyNode[] = [];

  // Create map
  nodes.forEach(node => {
    nodeMap.set(node.id, { ...node, children: [] });
  });

  // Build tree
  nodes.forEach(node => {
    const current = nodeMap.get(node.id)!;
    if (node.parent_id && nodeMap.has(node.parent_id)) {
      nodeMap.get(node.parent_id)!.children!.push(current);
    } else {
      roots.push(current);
    }
  });

  return roots;
}

function flattenTree(nodes: LangTaxonomyNode[], prefix = ''): LangTaxonomyNode[] {
  const result: LangTaxonomyNode[] = [];
  
  nodes.forEach(node => {
    const displayName = prefix ? `${prefix} > ${node.name}` : node.name;
    result.push({ ...node, name: displayName });
    
    if (node.children?.length) {
      result.push(...flattenTree(node.children, displayName));
    }
  });
  
  return result;
}

interface TaxonomyFormData {
  code: string;
  name: string;
  parent_id?: string | null;
}

export function useCreateLangTaxonomyNode(subjectId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (formData: TaxonomyFormData) => {
      // Calculate level based on parent
      let level = 0;
      if (formData.parent_id) {
        const { data: parent } = await supabase
          .from('lang_taxonomy_nodes')
          .select('level')
          .eq('id', formData.parent_id)
          .single();
        level = (parent?.level || 0) + 1;
      }

      // Get next order_index
      const { data: siblings } = await supabase
        .from('lang_taxonomy_nodes')
        .select('order_index')
        .eq('subject_id', subjectId)
        .eq('parent_id', formData.parent_id || null)
        .is('deleted_at', null)
        .order('order_index', { ascending: false })
        .limit(1);
      
      const orderIndex = (siblings?.[0]?.order_index ?? -1) + 1;

      const { data, error } = await supabase
        .from('lang_taxonomy_nodes')
        .insert({
          subject_id: subjectId,
          parent_id: formData.parent_id,
          code: formData.code,
          name: formData.name,
          level,
          order_index: orderIndex,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lang-taxonomy', subjectId] });
      toast({ title: 'Thành công', description: 'Đã tạo mục phân loại mới' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Lỗi', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });
}

export function useUpdateLangTaxonomyNode(subjectId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data: formData }: { id: string; data: Partial<TaxonomyFormData> }) => {
      const { data, error } = await supabase
        .from('lang_taxonomy_nodes')
        .update({
          ...(formData.code !== undefined && { code: formData.code }),
          ...(formData.name !== undefined && { name: formData.name }),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lang-taxonomy', subjectId] });
      toast({ title: 'Thành công', description: 'Đã cập nhật mục phân loại' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Lỗi', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });
}

export function useDeleteLangTaxonomyNode(subjectId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('lang_taxonomy_nodes')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lang-taxonomy', subjectId] });
      toast({ title: 'Thành công', description: 'Đã xóa mục phân loại' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Lỗi', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });
}
