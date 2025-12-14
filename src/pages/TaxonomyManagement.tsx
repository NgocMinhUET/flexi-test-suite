import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubject } from '@/hooks/useSubjects';
import {
  useTaxonomyTree,
  useCreateTaxonomyNode,
  useUpdateTaxonomyNode,
  useDeleteTaxonomyNode,
} from '@/hooks/useTaxonomy';
import { TaxonomyNode, TaxonomyNodeFormData } from '@/types/questionBank';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Code2,
  Plus,
  Edit,
  Trash2,
  LogOut,
  Loader2,
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  FolderOpen,
  Folder,
} from 'lucide-react';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';

interface TreeNodeProps {
  node: TaxonomyNode;
  level: number;
  levelNames: string[];
  onEdit: (node: TaxonomyNode) => void;
  onDelete: (node: TaxonomyNode) => void;
  onAddChild: (parentId: string, level: number) => void;
}

function TreeNode({ node, level, levelNames, onEdit, onDelete, onAddChild }: TreeNodeProps) {
  const [isOpen, setIsOpen] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const canAddChild = level < levelNames.length - 1;

  return (
    <div className="ml-4 first:ml-0">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div
          className={cn(
            'flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-muted/50 group transition-colors',
            level === 0 && 'bg-muted/30'
          )}
        >
          {hasChildren ? (
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          ) : (
            <div className="w-6 h-6 flex items-center justify-center">
              {hasChildren ? (
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Folder className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">{node.name}</span>
              <span className="text-xs text-muted-foreground">({node.code})</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                {levelNames[level]}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {canAddChild && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onAddChild(node.id, level + 1)}
                title={`Thêm ${levelNames[level + 1]}`}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onEdit(node)}
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onDelete(node)}
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        </div>

        {hasChildren && (
          <CollapsibleContent>
            <div className="border-l-2 border-border/50 ml-3">
              {node.children!.map((child) => (
                <TreeNode
                  key={child.id}
                  node={child}
                  level={level + 1}
                  levelNames={levelNames}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onAddChild={onAddChild}
                />
              ))}
            </div>
          </CollapsibleContent>
        )}
      </Collapsible>
    </div>
  );
}

export default function TaxonomyManagement() {
  const { id: subjectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile, isAdmin, isLoading: authLoading, signOut } = useAuth();
  const { data: subject, isLoading: subjectLoading } = useSubject(subjectId);
  const { data: tree, isLoading: treeLoading } = useTaxonomyTree(subjectId);

  const createNode = useCreateTaxonomyNode();
  const updateNode = useUpdateTaxonomyNode();
  const deleteNode = useDeleteTaxonomyNode();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<TaxonomyNode | null>(null);
  const [parentIdForNew, setParentIdForNew] = useState<string | null>(null);
  const [levelForNew, setLevelForNew] = useState(0);
  const [formData, setFormData] = useState<TaxonomyNodeFormData>({ code: '', name: '' });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (!authLoading && user && !isAdmin) {
      toast.error('Chỉ Admin mới có quyền truy cập trang này');
      navigate('/dashboard');
    }
  }, [user, authLoading, isAdmin, navigate]);

  const levelNames = subject?.taxonomy_config.levels || ['Chương', 'Bài', 'Mục'];

  const handleOpenDialog = (node?: TaxonomyNode, parentId?: string, level?: number) => {
    if (node) {
      setSelectedNode(node);
      setParentIdForNew(null);
      setFormData({ code: node.code, name: node.name });
    } else {
      setSelectedNode(null);
      setParentIdForNew(parentId || null);
      setLevelForNew(level ?? 0);
      setFormData({ code: '', name: '' });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.code.trim() || !formData.name.trim()) {
      toast.error('Vui lòng nhập mã và tên');
      return;
    }

    try {
      if (selectedNode) {
        await updateNode.mutateAsync({
          id: selectedNode.id,
          subjectId: subjectId!,
          data: formData,
        });
      } else {
        await createNode.mutateAsync({
          subjectId: subjectId!,
          data: { ...formData, parent_id: parentIdForNew },
          level: levelForNew,
        });
      }
      setDialogOpen(false);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleDelete = async () => {
    if (!selectedNode) return;
    try {
      await deleteNode.mutateAsync({ id: selectedNode.id, subjectId: subjectId! });
      setDeleteDialogOpen(false);
      setSelectedNode(null);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isLoading = authLoading || subjectLoading || treeLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Không tìm thấy môn học</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
                <Code2 className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">
                Exam<span className="text-gradient">Pro</span>
              </span>
            </Link>

            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-foreground">{profile?.full_name}</p>
                <p className="text-xs text-muted-foreground">Admin</p>
              </div>
              <Button variant="ghost" size="icon" onClick={handleSignOut}>
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/dashboard" className="hover:text-foreground">
            Dashboard
          </Link>
          <span>/</span>
          <Link to="/admin/subjects" className="hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" />
            Quản lý môn học
          </Link>
          <span>/</span>
          <span className="text-foreground">{subject.name}</span>
        </div>

        {/* Page Title */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Phân loại nội dung: {subject.name}
            </h1>
            <p className="text-muted-foreground">
              Cấu trúc: {levelNames.join(' → ')}
            </p>
          </div>
          <Button variant="hero" onClick={() => handleOpenDialog(undefined, undefined, 0)}>
            <Plus className="w-4 h-4 mr-2" />
            Thêm {levelNames[0]}
          </Button>
        </div>

        {/* Taxonomy Tree */}
        <Card>
          <CardHeader>
            <CardTitle>Cấu trúc phân loại</CardTitle>
          </CardHeader>
          <CardContent>
            {tree.length === 0 ? (
              <div className="text-center py-12">
                <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Chưa có phân loại nào</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => handleOpenDialog(undefined, undefined, 0)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Thêm {levelNames[0]} đầu tiên
                </Button>
              </div>
            ) : (
              <div className="space-y-1">
                {tree.map((node) => (
                  <TreeNode
                    key={node.id}
                    node={node}
                    level={0}
                    levelNames={levelNames}
                    onEdit={(n) => handleOpenDialog(n)}
                    onDelete={(n) => {
                      setSelectedNode(n);
                      setDeleteDialogOpen(true);
                    }}
                    onAddChild={(parentId, level) => handleOpenDialog(undefined, parentId, level)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedNode
                ? `Chỉnh sửa ${levelNames[selectedNode.level]}`
                : `Thêm ${levelNames[levelForNew]}`}
            </DialogTitle>
            <DialogDescription>
              Nhập thông tin phân loại
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="code">Mã</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="C1"
              />
            </div>
            <div>
              <Label htmlFor="name">Tên</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Chương 1: Hàm số"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Hủy
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createNode.isPending || updateNode.isPending}
            >
              {(createNode.isPending || updateNode.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {selectedNode ? 'Cập nhật' : 'Tạo mới'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa "{selectedNode?.name}"? Hành động này sẽ xóa tất cả phân loại
              con bên trong.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Xóa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
