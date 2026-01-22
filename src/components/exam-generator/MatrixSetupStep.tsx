import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { TaxonomyNode } from '@/types/questionBank';
import type { MatrixCell, QuestionStats } from '@/types/examGeneration';

interface MatrixSetupStepProps {
  taxonomyNodes: TaxonomyNode[];
  cognitiveLevels: string[];
  questionTypes: string[];
  questionStats?: QuestionStats;
  cells: MatrixCell[];
  onChange: (cells: MatrixCell[]) => void;
}

export function MatrixSetupStep({
  taxonomyNodes,
  cognitiveLevels,
  questionTypes,
  questionStats,
  cells,
  onChange,
}: MatrixSetupStepProps) {
  const [selectedType, setSelectedType] = useState<string>(questionTypes[0] || '');
  const [defaultPoints, setDefaultPoints] = useState(1);

  // Update selectedType when questionTypes changes
  useEffect(() => {
    if (questionTypes.length > 0 && !questionTypes.includes(selectedType)) {
      setSelectedType(questionTypes[0]);
    }
  }, [questionTypes, selectedType]);

  // Get root level taxonomy nodes (level 0)
  const rootNodes = taxonomyNodes.filter(n => n.level === 0);

  // Get available count for a specific combination
  const getAvailableCount = (taxonomyId: string, cognitiveLevel: string, questionType: string) => {
    if (!questionStats?.matrix) return 0;
    return questionStats.matrix[taxonomyId]?.[cognitiveLevel]?.[questionType] || 0;
  };

  // Get current cell value
  const getCellValue = (taxonomyId: string, cognitiveLevel: string): MatrixCell | undefined => {
    return cells.find(
      c => c.taxonomyNodeId === taxonomyId && 
           c.cognitiveLevel === cognitiveLevel && 
           c.questionType === selectedType
    );
  };

  // Update cell
  const updateCell = (taxonomyId: string, taxonomyName: string, cognitiveLevel: string, count: number, points?: number) => {
    const existingIndex = cells.findIndex(
      c => c.taxonomyNodeId === taxonomyId && 
           c.cognitiveLevel === cognitiveLevel && 
           c.questionType === selectedType
    );

    const availableCount = getAvailableCount(taxonomyId, cognitiveLevel, selectedType);
    const validCount = Math.min(Math.max(0, count), availableCount);

    const newCell: MatrixCell = {
      taxonomyNodeId: taxonomyId,
      taxonomyNodeName: taxonomyName,
      cognitiveLevel,
      questionType: selectedType,
      count: validCount,
      points: points ?? getCellValue(taxonomyId, cognitiveLevel)?.points ?? defaultPoints,
      availableCount,
    };

    let newCells = [...cells];
    if (existingIndex >= 0) {
      if (validCount === 0) {
        newCells.splice(existingIndex, 1);
      } else {
        newCells[existingIndex] = newCell;
      }
    } else if (validCount > 0) {
      newCells.push(newCell);
    }

    onChange(newCells);
  };

  // Calculate totals
  const totalQuestions = cells.reduce((sum, c) => sum + c.count, 0);
  const totalPoints = cells.reduce((sum, c) => sum + (c.count * c.points), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">
          Thiết lập số lượng câu hỏi cần lấy cho mỗi ô trong ma trận
        </p>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="defaultPoints" className="text-sm">Điểm mặc định:</Label>
            <Input
              id="defaultPoints"
              type="number"
              min={0.5}
              step={0.5}
              value={defaultPoints}
              onChange={(e) => setDefaultPoints(parseFloat(e.target.value) || 1)}
              className="w-20"
            />
          </div>
          <Badge variant="outline" className="text-base px-3 py-1">
            Tổng: {totalQuestions} câu | {totalPoints} điểm
          </Badge>
        </div>
      </div>

      {questionTypes.length === 0 ? (
        <div className="p-4 border border-dashed border-muted-foreground/50 rounded-lg text-center">
          <p className="text-muted-foreground">
            Môn học chưa được cấu hình loại câu hỏi. Vui lòng thêm các loại câu hỏi (MCQ_SINGLE, TRUE_FALSE_4, SHORT_ANSWER, CODING) trong phần Quản lý môn học.
          </p>
        </div>
      ) : (
      <Tabs value={selectedType} onValueChange={setSelectedType}>
        <TabsList>
          {questionTypes.map(type => (
            <TabsTrigger key={type} value={type}>
              {type === 'MCQ_SINGLE' ? 'Trắc nghiệm' :
               type === 'TRUE_FALSE_4' ? 'Đúng/Sai' :
               type === 'SHORT_ANSWER' ? 'Tự luận ngắn' :
               type === 'CODING' ? 'Lập trình' : type}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedType} className="mt-4">
          <ScrollArea className="h-[400px]">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border border-border p-2 bg-muted text-left min-w-[200px]">
                      Chương/Phần
                    </th>
                    {cognitiveLevels.map(level => (
                      <th key={level} className="border border-border p-2 bg-muted text-center min-w-[120px]">
                        {level}
                      </th>
                    ))}
                    <th className="border border-border p-2 bg-muted text-center min-w-[80px]">
                      Tổng
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rootNodes.length === 0 ? (
                    <tr>
                      <td colSpan={cognitiveLevels.length + 2} className="border border-border p-4 text-center text-muted-foreground">
                        Chưa có phân loại nào. Vui lòng tạo taxonomy cho môn học này.
                      </td>
                    </tr>
                  ) : (
                    rootNodes.map(node => {
                      const rowTotal = cognitiveLevels.reduce((sum, level) => {
                        const cell = getCellValue(node.id, level);
                        return sum + (cell?.count || 0);
                      }, 0);

                      return (
                        <tr key={node.id}>
                          <td className="border border-border p-2 font-medium">
                            {node.code} - {node.name}
                          </td>
                          {cognitiveLevels.map(level => {
                            const available = getAvailableCount(node.id, level, selectedType);
                            const cell = getCellValue(node.id, level);
                            const count = cell?.count || 0;

                            return (
                              <td key={level} className="border border-border p-1">
                                <div className="flex flex-col items-center gap-1">
                                  <Input
                                    type="number"
                                    min={0}
                                    max={available}
                                    value={count}
                                    onChange={(e) => updateCell(node.id, node.name, level, parseInt(e.target.value) || 0)}
                                    className="w-16 text-center"
                                    disabled={available === 0}
                                  />
                                  <span className={`text-xs ${available === 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                                    có {available}
                                  </span>
                                </div>
                              </td>
                            );
                          })}
                          <td className="border border-border p-2 text-center font-medium">
                            {rowTotal}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="border border-border p-2 font-bold bg-muted">
                      Tổng cột
                    </td>
                    {cognitiveLevels.map(level => {
                      const colTotal = cells
                        .filter(c => c.cognitiveLevel === level && c.questionType === selectedType)
                        .reduce((sum, c) => sum + c.count, 0);
                      return (
                        <td key={level} className="border border-border p-2 text-center font-bold bg-muted">
                          {colTotal}
                        </td>
                      );
                    })}
                    <td className="border border-border p-2 text-center font-bold bg-primary text-primary-foreground">
                      {cells.filter(c => c.questionType === selectedType).reduce((sum, c) => sum + c.count, 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
      )}

      {cells.length > 0 && (
        <div className="p-4 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">Tóm tắt lựa chọn:</h4>
          <div className="flex flex-wrap gap-2">
            {cells.map((cell, idx) => (
              <Badge key={idx} variant="secondary">
                {cell.taxonomyNodeName} × {cell.cognitiveLevel} × {cell.questionType}: {cell.count} câu × {cell.points}đ
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
