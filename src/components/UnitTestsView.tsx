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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 p-6 rounded-2xl shadow-md text-white border border-emerald-700">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-amber-300 text-xs font-bold border border-white/20 mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Automated System Quality Assurance</span>
          </div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-amber-300" />
            <span>{isArabic ? "اختبارات الوحدة الشاملة (Unit Testing Suite)" : "Comprehensive Unit Testing Suite"}</span>
          </h1>
          <p className="text-xs text-emerald-100 font-medium mt-1">
            {isArabic
              ? "تحقق تلقائي من استقرار جميع خدمات النظام، دقة الذكاء الاصطناعي، وتحديثات الذاكرة"
              : "Live test runner validating backend database, session recording, AI accuracy, and memory updates."}
          </p>
        </div>

        <button
          onClick={runTests}
          disabled={loading}
          className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-md flex items-center gap-2 transition disabled:opacity-50"
        >
          <Play className="w-4 h-4 fill-current text-slate-950" />
          <span>{loading ? (isArabic ? "جاري التشغيل..." : "Executing Tests...") : (isArabic ? "تشغيل الاختبارات الآن" : "Run Unit Tests")}</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      {testSuiteResults && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-emerald-100 p-4 rounded-2xl shadow-xs">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Test Cases</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{testSuiteResults.totalTests}</div>
          </div>

          <div className="bg-white border border-emerald-200 p-4 rounded-2xl shadow-xs">
            <span className="text-emerald-800 text-xs font-bold uppercase tracking-wider">Passed</span>
            <div className="text-2xl font-black text-emerald-600 mt-1">{testSuiteResults.passed}</div>
          </div>

          <div className="bg-white border border-rose-200 p-4 rounded-2xl shadow-xs">
            <span className="text-rose-800 text-xs font-bold uppercase tracking-wider">Failed</span>
            <div className="text-2xl font-black text-rose-600 mt-1">{testSuiteResults.failed}</div>
          </div>

          <div className="bg-white border border-emerald-100 p-4 rounded-2xl shadow-xs">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Execution Time</span>
            <div className="text-2xl font-black text-teal-700 mt-1">{testSuiteResults.durationMs} ms</div>
          </div>
        </div>
      )}

      {/* Test Results Filter & List */}
      <div className="bg-white border border-emerald-100 rounded-2xl p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-emerald-700" />
            <span>Test Execution Logs</span>
          </h2>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            {(["All", "Passed", "Failed"] as const).map(st => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  filterStatus === st ? "bg-emerald-600 text-white shadow-2xs" : "text-slate-700 hover:text-slate-900"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 font-medium animate-pulse">
            Executing test suite against live backend API handlers...
          </div>
        ) : (
          <div className="space-y-3">
            {filteredResults.map((t, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-medium ${
                  t.passed
                    ? "bg-slate-50 border-emerald-200 text-slate-800"
                    : "bg-rose-50 border-rose-200 text-rose-900"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {t.passed ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span className="font-bold text-sm text-slate-900">{t.testName}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-white text-emerald-900 font-bold border border-emerald-200">
                      {t.category}
                    </span>
                  </div>
                  <p className="text-slate-600 text-xs pl-6 font-medium">{t.details}</p>
                </div>

                <div className="text-[11px] font-mono text-slate-500 pl-6 sm:pl-0 font-bold">
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
