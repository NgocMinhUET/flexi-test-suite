import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSubjects } from '@/hooks/useSubjects';
import { useTaxonomyTree } from '@/hooks/useTaxonomy';
import { useQuestionStats } from '@/hooks/useQuestionStats';
import { useCreateExamTemplate, useGenerateExams } from '@/hooks/useExamGeneration';
import { SubjectSelectStep } from '@/components/exam-generator/SubjectSelectStep';
import { MatrixSetupStep } from '@/components/exam-generator/MatrixSetupStep';
import { ConstraintsStep } from '@/components/exam-generator/ConstraintsStep';
import { GenerateStep } from '@/components/exam-generator/GenerateStep';
import type { MatrixConfig, GenerationConstraints, MatrixCell } from '@/types/examGeneration';

const STEPS = [
  { id: 1, title: 'Chọn môn học' },
  { id: 2, title: 'Thiết lập ma trận' },
  { id: 3, title: 'Cấu hình' },
  { id: 4, title: 'Sinh đề' },
];

export default function ExamGenerator() {
  const navigate = useNavigate();
  const { isAdmin, isTeacher, isLoading: authLoading } = useAuth();
  
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
  const { data: taxonomyTree, flatNodes: taxonomyNodes } = useTaxonomyTree(selectedSubjectId);
  const { data: questionStats } = useQuestionStats(selectedSubjectId);
  
  const selectedSubject = subjects?.find(s => s.id === selectedSubjectId);
  const cognitiveLevels = (selectedSubject?.cognitive_levels as string[]) || [];
  const questionTypes = (selectedSubject?.question_types as string[]) || [];

  const createTemplate = useCreateExamTemplate();
  const generateExams = useGenerateExams();

  if (authLoading) {
    return <div className="flex items-center justify-center min-h-screen">Đang tải...</div>;
  }

  if (!isAdmin && !isTeacher) {
    navigate('/');
    return null;
  }

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
    // Reset matrix when subject changes
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
    // First save the template
    const template = await createTemplate.mutateAsync({
      name: templateName,
      subjectId: selectedSubjectId,
      matrixConfig,
      constraints,
    });

    // Then generate exams
    await generateExams.mutateAsync({
      templateId: template.id,
      variantCount,
      subjectName: selectedSubjectName,
    });

    // Navigate to dashboard
    navigate('/dashboard');
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 px-4 max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Sinh đề từ ma trận</h1>
            <p className="text-muted-foreground">Tạo nhiều mã đề từ ngân hàng câu hỏi</p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                  currentStep === step.id
                    ? 'bg-primary border-primary text-primary-foreground'
                    : currentStep > step.id
                    ? 'bg-primary/20 border-primary text-primary'
                    : 'border-muted-foreground/30 text-muted-foreground'
                }`}
              >
                {currentStep > step.id ? <Check className="h-5 w-5" /> : step.id}
              </div>
              <span
                className={`ml-2 text-sm font-medium ${
                  currentStep >= step.id ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {step.title}
              </span>
              {index < STEPS.length - 1 && (
                <div
                  className={`w-16 h-0.5 mx-4 ${
                    currentStep > step.id ? 'bg-primary' : 'bg-muted-foreground/30'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <Card>
          <CardHeader>
            <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
          </CardHeader>
          <CardContent>
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
                isGenerating={createTemplate.isPending || generateExams.isPending}
              />
            )}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
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
              disabled={!canProceed() || createTemplate.isPending || generateExams.isPending}
            >
              {createTemplate.isPending || generateExams.isPending ? 'Đang sinh đề...' : 'Sinh đề'}
              <Check className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
