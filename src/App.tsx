import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import React, { Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";

// Eager load frequently used pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";

// Lazy load less frequently used pages
const TakeExam = lazy(() => import("./pages/TakeExam"));
const ExamResult = lazy(() => import("./pages/ExamResult"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ExamEditor = lazy(() => import("./pages/ExamEditor"));
const ExamResults = lazy(() => import("./pages/ExamResults"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const StudentExams = lazy(() => import("./pages/StudentExams"));
const Profile = lazy(() => import("./pages/Profile"));
const SubjectsManagement = lazy(() => import("./pages/SubjectsManagement"));
const TaxonomyManagement = lazy(() => import("./pages/TaxonomyManagement"));
const QuestionBank = lazy(() => import("./pages/QuestionBank"));
const QuestionEditor = lazy(() => import("./pages/QuestionEditor"));
const ContestManagement = lazy(() => import("./pages/ContestManagement"));
const ContestDetail = lazy(() => import("./pages/ContestDetail"));
const ContestStatistics = lazy(() => import("./pages/ContestStatistics"));
const ExamsManagement = lazy(() => import("./pages/ExamsManagement"));
const PracticeList = lazy(() => import("./pages/PracticeList"));
const PracticeSession = lazy(() => import("./pages/PracticeSession"));
const AdaptivePractice = lazy(() => import("./pages/AdaptivePractice"));
const Achievements = lazy(() => import("./pages/Achievements"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));

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

const App = () => (
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
              <Route path="/achievements" element={<Achievements />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
