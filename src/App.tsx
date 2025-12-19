import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import TakeExam from "./pages/TakeExam";
import ExamResult from "./pages/ExamResult";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import ExamEditor from "./pages/ExamEditor";
import ExamResults from "./pages/ExamResults";
import UserManagement from "./pages/UserManagement";
import StudentExams from "./pages/StudentExams";
import Profile from "./pages/Profile";
import SubjectsManagement from "./pages/SubjectsManagement";
import TaxonomyManagement from "./pages/TaxonomyManagement";
import QuestionBank from "./pages/QuestionBank";
import QuestionEditor from "./pages/QuestionEditor";
import ContestManagement from "./pages/ContestManagement";
import ContestDetail from "./pages/ContestDetail";
import ContestStatistics from "./pages/ContestStatistics";
import ExamsManagement from "./pages/ExamsManagement";
import PracticeList from "./pages/PracticeList";
import PracticeSession from "./pages/PracticeSession";
import AdaptivePractice from "./pages/AdaptivePractice";
import Achievements from "./pages/Achievements";
import Leaderboard from "./pages/Leaderboard";
import React, { Suspense, lazy } from "react";

// Optimized QueryClient with better caching defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30 seconds default
      gcTime: 5 * 60 * 1000, // 5 minutes garbage collection time
      retry: 1,
      refetchOnWindowFocus: false,
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
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
