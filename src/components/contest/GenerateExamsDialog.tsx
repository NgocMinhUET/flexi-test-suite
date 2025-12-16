import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import { useSubjects } from '@/hooks/useSubjects';
import { useTaxonomyTree } from '@/hooks/useTaxonomy';
import { useQuestionStats } from '@/hooks/useQuestionStats';
import { SubjectSelectStep } from '@/components/exam-generator/SubjectSelectStep';
import { MatrixSetupStep } from '@/components/exam-generator/MatrixSetupStep';
import { ConstraintsStep } from '@/components/exam-generator/ConstraintsStep';
import { GenerateStep } from '@/components/exam-generator/GenerateStep';
import { useGenerateExamsForContest } from '@/hooks/useExamGeneration';
import type { MatrixConfig, GenerationConstraints, MatrixCell } from '@/types/examGeneration';

interface GenerateExamsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contestId: string;
  contestSubject: string;
}

const STEPS = [
  { id: 1, title: 'Chọn môn học' },
  { id: 2, title: 'Thiết lập ma trận' },
  { id: 3, title: 'Cấu hình' },
  { id: 4, title: 'Sinh đề' },
];

export function GenerateExamsDialog({
  open,
  onOpenChange,
  contestId,
  contestSubject,
}: GenerateExamsDialogProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedSubjectName, setSelectedSubjectName] = useState<string>('');
  const [templateName, setTemplateName] = useState('');
  const [matrixConfig, setMatrixConfig] = useState<MatrixConfig>({
    cells: [],
    totalQuestions: 0,
    totalPoints: 0,
    duration: 60,
  });
  const [constraints, setConstraints] = useState<GenerationConstraints>({
    allowShuffle: true,
    shuffleOptions: true,
    minDifficulty: 0,
    maxDifficulty: 1,
    isSectioned: false,
    sectionConfig: [],
  });
  const [variantCount, setVariantCount] = useState(4);

  const { data: subjects } = useSubjects();
  const { flatNodes: taxonomyNodes } = useTaxonomyTree(selectedSubjectId);
  const { data: questionStats } = useQuestionStats(selectedSubjectId);

  const selectedSubject = subjects?.find(s => s.id === selectedSubjectId);
  const cognitiveLevels = (selectedSubject?.cognitive_levels as string[]) || [];
  const questionTypes = (selectedSubject?.question_types as string[]) || [];

  const generateExams = useGenerateExamsForContest();

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubjectSelect = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    const subject = subjects?.find(s => s.id === subjectId);
    setSelectedSubjectName(subject?.name || '');
    setTemplateName(`Đề thi ${subject?.name || ''}`);
    setMatrixConfig({
      cells: [],
      totalQuestions: 0,
      totalPoints: 0,
      duration: 60,
    });
  };

  const handleMatrixChange = (cells: MatrixCell[]) => {
    const totalQuestions = cells.reduce((sum, c) => sum + c.count, 0);
    const totalPoints = cells.reduce((sum, c) => sum + (c.count * c.points), 0);
    setMatrixConfig({
      ...matrixConfig,
      cells,
      totalQuestions,
      totalPoints,
    });
  };

  const handleGenerate = async () => {
    await generateExams.mutateAsync({
      contestId,
      templateName,
      subjectId: selectedSubjectId,
      subjectName: selectedSubjectName,
      matrixConfig,
      constraints,
      variantCount,
    });

    // Reset and close dialog
    resetState();
    onOpenChange(false);
  };

  const resetState = () => {
    setCurrentStep(1);
    setSelectedSubjectId('');
    setSelectedSubjectName('');
    setTemplateName('');
    setMatrixConfig({
      cells: [],
      totalQuestions: 0,
      totalPoints: 0,
      duration: 60,
    });
    setConstraints({
      allowShuffle: true,
      shuffleOptions: true,
      minDifficulty: 0,
      maxDifficulty: 1,
      isSectioned: false,
      sectionConfig: [],
    });
    setVariantCount(4);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return !!selectedSubjectId;
      case 2:
        return matrixConfig.totalQuestions > 0;
      case 3:
        return matrixConfig.duration > 0;
      case 4:
        return variantCount > 0 && templateName.trim().length > 0;
      default:
        return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => {
      if (!value) resetState();
      onOpenChange(value);
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sinh đề từ ma trận</DialogTitle>
          <DialogDescription>
            Tạo các mã đề tự động từ ngân hàng câu hỏi và thêm vào cuộc thi
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-center py-4">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm transition-colors ${
                  currentStep === step.id
                    ? 'bg-primary border-primary text-primary-foreground'
                    : currentStep > step.id
                    ? 'bg-primary/20 border-primary text-primary'
                    : 'border-muted-foreground/30 text-muted-foreground'
                }`}
              >
                {currentStep > step.id ? <Check className="h-4 w-4" /> : step.id}
              </div>
              <span
                className={`ml-1 text-xs font-medium hidden sm:inline ${
                  currentStep >= step.id ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {step.title}
              </span>
              {index < STEPS.length - 1 && (
                <div
                  className={`w-8 h-0.5 mx-2 ${
                    currentStep > step.id ? 'bg-primary' : 'bg-muted-foreground/30'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="py-4">
          {currentStep === 1 && (
            <SubjectSelectStep
              subjects={subjects || []}
              selectedSubjectId={selectedSubjectId}
              onSelect={handleSubjectSelect}
              questionStats={questionStats}
            />
          )}

          {currentStep === 2 && (
            <MatrixSetupStep
              taxonomyNodes={taxonomyNodes || []}
              cognitiveLevels={cognitiveLevels}
              questionTypes={questionTypes}
              questionStats={questionStats}
              cells={matrixConfig.cells}
              onChange={handleMatrixChange}
            />
          )}

          {currentStep === 3 && (
            <ConstraintsStep
              matrixConfig={matrixConfig}
              constraints={constraints}
              questionTypes={questionTypes}
              onMatrixChange={setMatrixConfig}
              onConstraintsChange={setConstraints}
            />
          )}

          {currentStep === 4 && (
            <GenerateStep
              templateName={templateName}
              onTemplateNameChange={setTemplateName}
              matrixConfig={matrixConfig}
              constraints={constraints}
              variantCount={variantCount}
              onVariantCountChange={setVariantCount}
              isGenerating={generateExams.isPending}
            />
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleBack} disabled={currentStep === 1}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại
          </Button>

          {currentStep < 4 ? (
            <Button onClick={handleNext} disabled={!canProceed()}>
              Tiếp theo
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleGenerate}
              disabled={!canProceed() || generateExams.isPending}
            >
              {generateExams.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang sinh đề...
                </>
              ) : (
                <>
                  Sinh đề
                  <Check className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
