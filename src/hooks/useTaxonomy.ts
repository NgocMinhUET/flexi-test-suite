import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TaxonomyNode, TaxonomyNodeFormData } from '@/types/questionBank';
import { toast } from 'sonner';

// Build tree structure from flat list
function buildTree(nodes: TaxonomyNode[]): TaxonomyNode[] {
  const nodeMap = new Map<string, TaxonomyNode>();
  const roots: TaxonomyNode[] = [];

  // First pass: create map
  nodes.forEach((node) => {
    nodeMap.set(node.id, { ...node, children: [] });
  });

  // Second pass: build tree
  nodes.forEach((node) => {
    const current = nodeMap.get(node.id)!;
    if (node.parent_id && nodeMap.has(node.parent_id)) {
      const parent = nodeMap.get(node.parent_id)!;
      parent.children = parent.children || [];
      parent.children.push(current);
    } else {
      roots.push(current);
    }
  });

  // Sort children by order_index
  const sortChildren = (nodes: TaxonomyNode[]) => {
    nodes.sort((a, b) => a.order_index - b.order_index);
    nodes.forEach((node) => {
      if (node.children?.length) {
        sortChildren(node.children);
      }
    });
  };

  sortChildren(roots);
  return roots;
}

export function useTaxonomyNodes(subjectId: string | undefined) {
  return useQuery({
    queryKey: ['taxonomy', subjectId],
    queryFn: async () => {
      if (!subjectId) return [];
      
      const { data, error } = await supabase
        .from('taxonomy_nodes')
        .select('id, subject_id, parent_id, level, code, name, order_index')
        .eq('subject_id', subjectId)
        .is('deleted_at', null)
        .order('order_index');

      if (error) throw error;
      return data as TaxonomyNode[];
    },
    enabled: !!subjectId,
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes - taxonomy rarely changes
    gcTime: 5 * 60 * 1000,
  });
}

export function useTaxonomyTree(subjectId: string | undefined) {
  const { data: nodes, ...rest } = useTaxonomyNodes(subjectId);
  return {
    ...rest,
    data: nodes ? buildTree(nodes) : [],
    flatNodes: nodes || [],
  };
}

export function useCreateTaxonomyNode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      subjectId,
      data,
      level,
    }: {
      subjectId: string;
      data: TaxonomyNodeFormData;
      level: number;
    }) => {
      // Get max order_index for siblings
      const query = supabase
        .from('taxonomy_nodes')
        .select('order_index')
        .eq('subject_id', subjectId)
        .is('deleted_at', null);

      if (data.parent_id) {
        query.eq('parent_id', data.parent_id);
      } else {
        query.is('parent_id', null);
      }

      const { data: siblings } = await query.order('order_index', { ascending: false }).limit(1);
      const maxOrder = siblings?.[0]?.order_index ?? -1;

      const { data: result, error } = await supabase
        .from('taxonomy_nodes')
        .insert({
          subject_id: subjectId,
          parent_id: data.parent_id || null,
          level,
          code: data.code,
          name: data.name,
          order_index: maxOrder + 1,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, { subjectId }) => {
      queryClient.invalidateQueries({ queryKey: ['taxonomy', subjectId] });
      toast.success('Đã thêm phân loại');
    },
    onError: (error) => {
      console.error('Error creating taxonomy node:', error);
      toast.error('Lỗi khi thêm phân loại');
    },
  });
}

export function useUpdateTaxonomyNode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      subjectId,
      data,
    }: {
      id: string;
      subjectId: string;
      data: Partial<TaxonomyNodeFormData>;
    }) => {
      const { data: result, error } = await supabase
        .from('taxonomy_nodes')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, { subjectId }) => {
      queryClient.invalidateQueries({ queryKey: ['taxonomy', subjectId] });
      toast.success('Đã cập nhật phân loại');
    },
    onError: (error) => {
      console.error('Error updating taxonomy node:', error);
      toast.error('Lỗi khi cập nhật phân loại');
    },
  });
}

export function useDeleteTaxonomyNode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, subjectId }: { id: string; subjectId: string }) => {
      // Hard delete the node (RLS policy allows DELETE for admins)
      const { error } = await supabase
        .from('taxonomy_nodes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, { subjectId }) => {
      queryClient.invalidateQueries({ queryKey: ['taxonomy', subjectId] });
      toast.success('Đã xóa phân loại');
    },
    onError: (error) => {
      console.error('Error deleting taxonomy node:', error);
      toast.error('Lỗi khi xóa phân loại');
    },
  });
}

export function useReorderTaxonomyNode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      subjectId,
      newOrderIndex,
    }: {
      id: string;
      subjectId: string;
      newOrderIndex: number;
    }) => {
      const { error } = await supabase
        .from('taxonomy_nodes')
        .update({ order_index: newOrderIndex })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, { subjectId }) => {
      queryClient.invalidateQueries({ queryKey: ['taxonomy', subjectId] });
    },
  });
}
