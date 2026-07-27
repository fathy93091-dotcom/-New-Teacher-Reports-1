import React, { useState, useEffect } from "react";
import {
  CheckCircle,
  XCircle,
  Play,
  RotateCcw,
  Terminal,
  ShieldCheck,
  CheckSquare,
  Clock,
  AlertTriangle,
  Code
} from "lucide-react";
import { UnitTestResult, AppSettings } from "../types";

interface UnitTestsViewProps {
  settings: AppSettings;
}

export const UnitTestsView: React.FC<UnitTestsViewProps> = ({ settings }) => {
  const isArabic = settings.preferredLanguage === "ar";
  const [testSuiteResults, setTestSuiteResults] = useState<{
    totalTests: number;
    passed: number;
    failed: number;
    durationMs: number;
    results: UnitTestResult[];
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"All" | "Passed" | "Failed">("All");

  const runTests = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tests/run", { method: "POST" });
      if (!res.ok) {
        console.error("Failed to run unit tests, status:", res.status);
        return;
      }
      const data = await res.json();
      if (data && typeof data === "object" && !("error" in data)) {
        setTestSuiteResults(data);
      }
    } catch (err) {
      console.error("Error executing unit tests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runTests();
  }, []);

  const filteredResults = testSuiteResults?.results.filter(r => {
    if (filterStatus === "Passed") return r.passed;
    if (filterStatus === "Failed") return !r.passed;
    return true;
  }) || [];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20 mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Automated System Quality Assurance</span>
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-emerald-400" />
            <span>{isArabic ? "اختبارات الوحدة الشاملة (Unit Testing Suite)" : "Comprehensive Unit Testing Suite"}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isArabic
              ? "تحقق تلقائي من استقرار جميع خدمات النظام، دقة الذكاء الاصطناعي، وتحديثات الذاكرة"
              : "Live test runner validating backend database, session recording, AI accuracy, and memory updates."}
          </p>
        </div>

        <button
          onClick={runTests}
          disabled={loading}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-900/40 flex items-center gap-2 transition disabled:opacity-50"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>{loading ? (isArabic ? "جاري التشغيل..." : "Executing Tests...") : (isArabic ? "تشغيل الاختبارات الآن" : "Run Unit Tests")}</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      {testSuiteResults && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Total Test Cases</span>
            <div className="text-2xl font-extrabold text-white mt-1">{testSuiteResults.totalTests}</div>
          </div>

          <div className="bg-slate-900 border border-emerald-500/30 p-4 rounded-2xl">
            <span className="text-emerald-400 text-xs font-medium uppercase tracking-wider">Passed</span>
            <div className="text-2xl font-extrabold text-emerald-400 mt-1">{testSuiteResults.passed}</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <span className="text-rose-400 text-xs font-medium uppercase tracking-wider">Failed</span>
            <div className="text-2xl font-extrabold text-rose-400 mt-1">{testSuiteResults.failed}</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Execution Time</span>
            <div className="text-2xl font-extrabold text-teal-400 mt-1">{testSuiteResults.durationMs} ms</div>
          </div>
        </div>
      )}

      {/* Test Results Filter & List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Terminal className="w-5 h-5 text-emerald-400" />
            <span>Test Execution Logs</span>
          </h2>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {(["All", "Passed", "Failed"] as const).map(st => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  filterStatus === st ? "bg-emerald-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 animate-pulse">
            Executing test suite against live backend API handlers...
          </div>
        ) : (
          <div className="space-y-3">
            {filteredResults.map((t, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                  t.passed
                    ? "bg-slate-950/80 border-emerald-500/20 text-slate-200"
                    : "bg-rose-950/20 border-rose-500/30 text-rose-200"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {t.passed ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span className="font-bold text-sm text-white">{t.testName}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-teal-300 font-semibold border border-slate-700">
                      {t.category}
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs pl-6">{t.details}</p>
                </div>

                <div className="text-[11px] font-mono text-slate-500 pl-6 sm:pl-0">
                  {t.durationMs}ms
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
