import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import React, { Suspense, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { clearLazyWithRetryFlag, lazyWithRetry } from "@/lib/lazyWithRetry";

// Eager load frequently used pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";

// Lazy load less frequently used pages
const TakeExam = lazyWithRetry(() => import("./pages/TakeExam"));
const ExamResult = lazyWithRetry(() => import("./pages/ExamResult"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const ExamEditor = lazyWithRetry(() => import("./pages/ExamEditor"));
const ExamResults = lazyWithRetry(() => import("./pages/ExamResults"));
const UserManagement = lazyWithRetry(() => import("./pages/UserManagement"));
const StudentExams = lazyWithRetry(() => import("./pages/StudentExams"));
const Profile = lazyWithRetry(() => import("./pages/Profile"));
const SubjectsManagement = lazyWithRetry(() => import("./pages/SubjectsManagement"));
const TaxonomyManagement = lazyWithRetry(() => import("./pages/TaxonomyManagement"));
const QuestionBank = lazyWithRetry(() => import("./pages/QuestionBank"));
const QuestionEditor = lazyWithRetry(() => import("./pages/QuestionEditor"));
const ContestManagement = lazyWithRetry(() => import("./pages/ContestManagement"));
const ContestDetail = lazyWithRetry(() => import("./pages/ContestDetail"));
const ContestStatistics = lazyWithRetry(() => import("./pages/ContestStatistics"));
const ExamsManagement = lazyWithRetry(() => import("./pages/ExamsManagement"));
const PracticeList = lazyWithRetry(() => import("./pages/PracticeList"));
const PracticeSession = lazyWithRetry(() => import("./pages/PracticeSession"));
const AdaptivePractice = lazyWithRetry(() => import("./pages/AdaptivePractice"));
const Achievements = lazyWithRetry(() => import("./pages/Achievements"));
const Leaderboard = lazyWithRetry(() => import("./pages/Leaderboard"));
const SkillsAnalysis = lazyWithRetry(() => import("./pages/SkillsAnalysis"));
const PracticeAssignmentManagement = lazyWithRetry(() => import("./pages/PracticeAssignmentManagement"));
const StudentPracticeAssignments = lazyWithRetry(() => import("./pages/StudentPracticeAssignments"));
const TakePracticeAssignment = lazyWithRetry(() => import("./pages/TakePracticeAssignment"));
const PracticeAssignmentResults = lazyWithRetry(() => import("./pages/PracticeAssignmentResults"));
const TeacherAssignmentResults = lazyWithRetry(() => import("./pages/TeacherAssignmentResults"));
const ClassManagement = lazyWithRetry(() => import("./pages/ClassManagement"));
const ClassDetail = lazyWithRetry(() => import("./pages/ClassDetail"));
const ClassProgressReport = lazyWithRetry(() => import("./pages/ClassProgressReport"));
const MyClasses = lazyWithRetry(() => import("./pages/MyClasses"));

// Language Module (Independent)
const LanguageDashboard = lazyWithRetry(() => import("./pages/language/LanguageDashboard"));
const LanguageSubjects = lazyWithRetry(() => import("./pages/language/LanguageSubjects"));
const LanguageQuestionBank = lazyWithRetry(() => import("./pages/language/LanguageQuestionBank"));
const LanguageQuestionEditor = lazyWithRetry(() => import("./pages/language/LanguageQuestionEditor"));
const LanguageExamManagement = lazyWithRetry(() => import("./pages/language/LanguageExamManagement"));

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

// Optimized QueryClient with better caching defaults for improved performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - reduce refetch frequency
      gcTime: 10 * 60 * 1000, // 10 minutes garbage collection time
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: false, // Don't refetch on every mount if data is fresh
    },
  },
});

const App = () => {
  useEffect(() => {
    // If we successfully loaded, clear the one-time auto-reload guard.
    clearLazyWithRetryFlag();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/admin/users" element={<UserManagement />} />
                <Route path="/admin/subjects" element={<SubjectsManagement />} />
                <Route path="/admin/subjects/:id/taxonomy" element={<TaxonomyManagement />} />
                <Route path="/questions" element={<QuestionBank />} />
                <Route path="/questions/new" element={<QuestionEditor />} />
                <Route path="/questions/:id/edit" element={<QuestionEditor />} />
                <Route path="/my-exams" element={<StudentExams />} />
                <Route path="/exams" element={<ExamsManagement />} />
                <Route path="/exam/new" element={<ExamEditor />} />
                <Route path="/contests" element={<ContestManagement />} />
                <Route path="/contests/:id" element={<ContestDetail />} />
                <Route path="/contests/:id/statistics" element={<ContestStatistics />} />
                <Route path="/exam/:id/edit" element={<ExamEditor />} />
                <Route path="/exam/:id" element={<TakeExam />} />
                <Route path="/exam/:id/result" element={<ExamResult />} />
                <Route path="/exam/:id/results" element={<ExamResults />} />
                <Route path="/results/:resultId" element={<ExamResult />} />
                <Route path="/practice" element={<PracticeList />} />
                <Route path="/practice/:id" element={<PracticeSession />} />
                <Route path="/adaptive-practice" element={<AdaptivePractice />} />
                <Route path="/practice/session" element={<PracticeSession />} />
                <Route path="/practice/skills" element={<SkillsAnalysis />} />
                <Route path="/achievements" element={<Achievements />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/practice-assignments" element={<PracticeAssignmentManagement />} />
                <Route path="/my-practice-assignments" element={<StudentPracticeAssignments />} />
                <Route path="/practice-assignment/:id" element={<TakePracticeAssignment />} />
                <Route path="/practice-assignment/:id/results" element={<PracticeAssignmentResults />} />
                <Route path="/practice-assignments/:id/results" element={<TeacherAssignmentResults />} />
                <Route path="/classes" element={<ClassManagement />} />
                <Route path="/classes/:id" element={<ClassDetail />} />
                <Route path="/classes/:id/progress" element={<ClassProgressReport />} />
                <Route path="/my-classes" element={<MyClasses />} />
                
                {/* Language Module Routes */}
                <Route path="/language" element={<LanguageDashboard />} />
                <Route path="/language/subjects" element={<LanguageSubjects />} />
                <Route path="/language/questions" element={<LanguageQuestionBank />} />
                <Route path="/language/questions/new" element={<LanguageQuestionEditor />} />
                <Route path="/language/questions/:id/edit" element={<LanguageQuestionEditor />} />
                <Route path="/language/exams" element={<LanguageExamManagement />} />
                
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
