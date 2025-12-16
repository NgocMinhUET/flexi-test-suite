import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2, ChevronDown, ChevronRight, AlertTriangle, Trash2, CheckCircle2 } from 'lucide-react';
import { DuplicateGroup, useDuplicateQuestions, useCleanupDuplicates } from '@/hooks/useDuplicateQuestions';

interface DuplicateCleanupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjectId: string | undefined;
}

const statusLabels: Record<string, string> = {
  draft: 'Nháp',
  review: 'Chờ duyệt',
  approved: 'Đã duyệt',
  published: 'Đã xuất bản',
};

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  review: 'bg-yellow-500/10 text-yellow-600',
  approved: 'bg-blue-500/10 text-blue-600',
  published: 'bg-green-500/10 text-green-600',
};

function stripHtml(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

function truncate(str: string, len: number): string {
  if (str.length <= len) return str;
  return str.slice(0, len) + '...';
}

export function DuplicateCleanupDialog({ open, onOpenChange, subjectId }: DuplicateCleanupDialogProps) {
  const { data: duplicateGroups, isLoading } = useDuplicateQuestions(subjectId);
  const cleanup = useCleanupDuplicates();
  
  // Local state for overriding keepId selections
  const [selections, setSelections] = useState<Record<number, string>>({});
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());

  const getKeepId = (groupIndex: number, group: DuplicateGroup) => {
    return selections[groupIndex] || group.keepId;
  };

  const toggleExpand = (index: number) => {
    const newSet = new Set(expandedGroups);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setExpandedGroups(newSet);
  };

  const handleCleanup = async () => {
    if (!duplicateGroups) return;
    
    // Apply local selections to groups
    const groupsWithSelections = duplicateGroups.map((group, index) => ({
      ...group,
      keepId: getKeepId(index, group),
    }));
    
    await cleanup.mutateAsync(groupsWithSelections);
    onOpenChange(false);
  };

  const totalDuplicates = duplicateGroups?.reduce((sum, g) => sum + g.questions.length - 1, 0) || 0;
  const totalGroups = duplicateGroups?.length || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            Dọn dẹp câu hỏi trùng nội dung
          </DialogTitle>
          <DialogDescription>
            Xác định và xóa các câu hỏi có nội dung giống nhau trong ngân hàng câu hỏi
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : totalGroups === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mb-4" />
            <p className="text-lg font-medium text-foreground">Không có câu hỏi trùng lặp</p>
            <p className="text-sm text-muted-foreground">Ngân hàng câu hỏi đã sạch sẽ!</p>
          </div>
        ) : (
          <>
            {/* Statistics */}
            <div className="bg-muted/50 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalGroups}</p>
                  <p className="text-sm text-muted-foreground">nhóm câu hỏi trùng</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-destructive">{totalDuplicates}</p>
                  <p className="text-sm text-muted-foreground">câu hỏi dư thừa cần xóa</p>
                </div>
              </div>
            </div>

            {/* Duplicate Groups List */}
            <ScrollArea className="flex-1 min-h-0 pr-4">
              <div className="space-y-3">
                {duplicateGroups?.map((group, index) => {
                  const isExpanded = expandedGroups.has(index);
                  const keepId = getKeepId(index, group);
                  const keepQuestion = group.questions.find(q => q.id === keepId);
                  
                  return (
                    <Collapsible key={index} open={isExpanded} onOpenChange={() => toggleExpand(index)}>
                      <div className="border rounded-lg bg-card">
                        <CollapsibleTrigger asChild>
                          <button className="w-full p-3 flex items-start gap-3 text-left hover:bg-muted/50 transition-colors">
                            <div className="mt-0.5">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-foreground line-clamp-2">
                                {truncate(stripHtml(group.questions[0].content), 150)}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="secondary" className="text-xs">
                                  {group.questions.length} câu trùng
                                </Badge>
                                {keepQuestion && (
                                  <span className="text-xs text-muted-foreground">
                                    Giữ lại: <span className="font-medium">{keepQuestion.code || keepQuestion.id.slice(0, 8)}</span>
                                    <Badge className={`ml-1 text-xs ${statusColors[keepQuestion.status]}`}>
                                      {statusLabels[keepQuestion.status]}
                                    </Badge>
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        </CollapsibleTrigger>
                        
                        <CollapsibleContent>
                          <div className="border-t p-3 bg-muted/30">
                            <p className="text-xs text-muted-foreground mb-3">
                              Chọn câu hỏi muốn giữ lại (các câu còn lại sẽ bị xóa):
                            </p>
                            <RadioGroup
                              value={keepId}
                              onValueChange={(value) => setSelections({ ...selections, [index]: value })}
                              className="space-y-2"
                            >
                              {group.questions.map((q) => (
                                <div key={q.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-background">
                                  <RadioGroupItem value={q.id} id={q.id} />
                                  <Label htmlFor={q.id} className="flex-1 cursor-pointer">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                                        {q.code || q.id.slice(0, 8)}
                                      </span>
                                      <Badge className={`text-xs ${statusColors[q.status]}`}>
                                        {statusLabels[q.status]}
                                      </Badge>
                                      <span className="text-xs text-muted-foreground">
                                        {new Date(q.created_at).toLocaleDateString('vi-VN')}
                                      </span>
                                    </div>
                                  </Label>
                                </div>
                              ))}
                            </RadioGroup>
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Warning */}
            <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg text-sm">
              <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-destructive">
                Hành động này sẽ xóa <strong>{totalDuplicates}</strong> câu hỏi trùng lặp (soft delete). 
                Bạn có thể khôi phục từ database nếu cần.
              </p>
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          {totalGroups > 0 && (
            <Button
              variant="destructive"
              onClick={handleCleanup}
              disabled={cleanup.isPending}
            >
              {cleanup.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Xóa {totalDuplicates} câu hỏi trùng
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
