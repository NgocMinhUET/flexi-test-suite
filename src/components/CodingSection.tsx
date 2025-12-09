import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Play, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Cpu,
  Zap,
  Code2
} from "lucide-react";

const CodingSection = () => {
  const languages = [
    "Python", "JavaScript", "Java", "C++", "C", "Go", "Rust", "Ruby", "PHP", "Swift"
  ];

  const testCases = [
    { input: "[1,2,3,4,5]", expected: "15", output: "15", passed: true, time: "12ms" },
    { input: "[10,20,30]", expected: "60", output: "60", passed: true, time: "8ms" },
    { input: "[]", expected: "0", output: "0", passed: true, time: "5ms" },
    { input: "[-1,-2,3]", expected: "0", output: "-1", passed: false, time: "10ms" },
  ];

  return (
    <section id="coding" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left - Info */}
          <div>
            <Badge variant="accent" className="mb-4">
              <Code2 className="w-3 h-3 mr-1" />
              Thi lập trình
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Môi trường code
              <span className="text-gradient-accent"> chuyên nghiệp</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Trải nghiệm thi lập trình như thật với IDE tích hợp, 
              hỗ trợ 10+ ngôn ngữ phổ biến và chấm điểm tự động theo test case.
            </p>

            {/* Languages */}
            <div className="mb-8">
              <h4 className="text-sm font-semibold text-foreground mb-3">Ngôn ngữ hỗ trợ</h4>
              <div className="flex flex-wrap gap-2">
                {languages.map((lang, index) => (
                  <Badge key={index} variant="secondary" className="text-sm">
                    {lang}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Features */}
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { icon: Zap, title: "Chạy code tức thì", desc: "Compile và chạy trong < 1 giây" },
                { icon: CheckCircle2, title: "Auto grading", desc: "Chấm điểm tự động theo test case" },
                { icon: Clock, title: "Đo thời gian", desc: "Phân tích time complexity" },
                { icon: Cpu, title: "Memory tracking", desc: "Theo dõi bộ nhớ sử dụng" },
              ].map((feature, index) => (
                <div key={index} className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border/50">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h5 className="font-semibold text-foreground">{feature.title}</h5>
                    <p className="text-sm text-muted-foreground">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right - Code Editor Preview */}
          <div className="relative">
            <div className="bg-[hsl(222,47%,8%)] rounded-2xl overflow-hidden shadow-2xl border border-border/30">
              {/* Editor Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-[hsl(222,47%,6%)] border-b border-border/30">
                <div className="flex items-center gap-3">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-destructive" />
                    <div className="w-3 h-3 rounded-full bg-warning" />
                    <div className="w-3 h-3 rounded-full bg-success" />
                  </div>
                  <span className="text-sm text-muted-foreground">solution.py</span>
                </div>
                <Badge className="bg-accent/20 text-accent border-0 text-xs">Python</Badge>
              </div>

              {/* Code Area */}
              <div className="p-4 font-mono text-sm">
                <div className="flex">
                  <div className="pr-4 text-muted-foreground/50 select-none text-right" style={{ minWidth: '2rem' }}>
                    {[1,2,3,4,5,6,7].map(n => <div key={n}>{n}</div>)}
                  </div>
                  <div className="flex-1 overflow-x-auto">
                    <pre className="text-muted-foreground">
                      <code>
                        <span className="text-purple-400">def</span>{" "}
                        <span className="text-blue-400">sum_array</span>
                        <span className="text-foreground">(arr):</span>{"\n"}
                        <span className="text-muted-foreground/70">    """Tính tổng các phần tử"""</span>{"\n"}
                        <span className="text-purple-400">    if</span>
                        <span className="text-foreground"> </span>
                        <span className="text-purple-400">not</span>
                        <span className="text-foreground"> arr:</span>{"\n"}
                        <span className="text-purple-400">        return</span>
                        <span className="text-orange-400"> 0</span>{"\n"}
                        <span className="text-purple-400">    return</span>
                        <span className="text-blue-400"> sum</span>
                        <span className="text-foreground">(arr)</span>{"\n"}
                      </code>
                    </pre>
                  </div>
                </div>
              </div>

              {/* Run Button */}
              <div className="px-4 pb-4">
                <Button variant="accent" size="sm" className="w-full">
                  <Play className="w-4 h-4" />
                  Chạy code
                </Button>
              </div>

              {/* Test Cases */}
              <div className="border-t border-border/30">
                <div className="px-4 py-3 flex items-center justify-between bg-[hsl(222,47%,6%)]">
                  <span className="text-sm font-medium text-foreground">Test Cases</span>
                  <Badge variant="success" className="text-xs">3/4 passed</Badge>
                </div>
                <div className="divide-y divide-border/30">
                  {testCases.map((tc, index) => (
                    <div key={index} className="px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {tc.passed ? (
                          <CheckCircle2 className="w-5 h-5 text-success" />
                        ) : (
                          <XCircle className="w-5 h-5 text-destructive" />
                        )}
                        <div className="text-sm">
                          <span className="text-muted-foreground">Input: </span>
                          <span className="text-foreground font-mono">{tc.input}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-muted-foreground font-mono">{tc.time}</span>
                        <span className={`text-sm font-mono ${tc.passed ? "text-success" : "text-destructive"}`}>
                          {tc.output}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Floating badge */}
            <div className="absolute -top-4 -right-4 bg-card border border-border px-4 py-2 rounded-xl shadow-lg animate-float">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-warning" />
                <span className="text-sm font-medium">Chạy trong 35ms</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CodingSection;
