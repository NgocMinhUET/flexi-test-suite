import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, Search, FileText, Clock, Users } from "lucide-react";

export default function LanguageExamManagement() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/language")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Quản lý đề thi Ngoại ngữ</h1>
          <p className="text-muted-foreground">
            Tạo và quản lý các đề thi ngoại ngữ với 4 kỹ năng
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm đề thi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => navigate("/language/exams/new")}>
          <Plus className="h-4 w-4 mr-2" />
          Tạo đề thi mới
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Đề thi ngoại ngữ
          </CardTitle>
          <CardDescription>
            Trang này đang được phát triển. Sẽ sớm có các tính năng:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-primary" />
                <span className="font-medium">Tạo đề thi</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Tạo đề thi với các section Listening, Reading, Writing, Speaking
              </p>
            </div>
            <div className="p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-primary" />
                <span className="font-medium">Quản lý thời gian</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Thiết lập thời gian riêng cho từng section
              </p>
            </div>
            <div className="p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-primary" />
                <span className="font-medium">Gán học sinh</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Gán đề thi cho học sinh hoặc lớp học
              </p>
            </div>
          </div>
          
          <div className="mt-6 p-8 border-2 border-dashed rounded-lg text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Chưa có đề thi nào. Nhấn "Tạo đề thi mới" để bắt đầu.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
