import React, { useState, useEffect } from "react";
import {
  Code,
  Globe,
  Play,
  CheckCircle,
  Copy,
  ChevronDown,
  ChevronRight,
  Terminal,
  Sparkles,
  Server,
  Layers,
  FileCode
} from "lucide-react";
import { ApiDocEndpoint, AppSettings } from "../types";

interface ApiDocsViewProps {
  settings: AppSettings;
}

export const ApiDocsView: React.FC<ApiDocsViewProps> = ({ settings }) => {
  const isArabic = settings.preferredLanguage === "ar";
  const [docsData, setDocsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEndpoint, setSelectedStudentEndpoint] = useState<ApiDocEndpoint | null>(null);
  const [activeTab, setActiveTab] = useState<"spec" | "tester">("spec");

  // Test Request Executor State
  const [testResponse, setTestResponse] = useState<any>(null);
  const [executing, setExecuting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/docs")
      .then(res => res.json())
      .then(data => {
        setDocsData(data);
        if (data.endpoints && data.endpoints.length > 0) {
          setSelectedStudentEndpoint(data.endpoints[0]);
        }
      })
      .catch(err => console.error("Error loading API docs:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleExecuteApiCall = async () => {
    if (!selectedEndpoint) return;
    setExecuting(true);
    setTestResponse(null);

    try {
      let url = selectedEndpoint.path;
      // replace path params like :studentId or :id
      url = url.replace(":studentId", "std_001").replace(":id", "std_001");

      const options: RequestInit = {
        method: selectedEndpoint.method,
        headers: { "Content-Type": "application/json" }
      };

      if (["POST", "PUT"].includes(selectedEndpoint.method) && selectedEndpoint.requestBodySample) {
        options.body = JSON.stringify(selectedEndpoint.requestBodySample);
      }

      const res = await fetch(url, options);
      const data = await res.json();
      setTestResponse({
        status: res.status,
        statusText: res.statusText,
        data
      });
    } catch (err: any) {
      setTestResponse({
        error: err.message || "Failed request execution"
      });
    } finally {
      setExecuting(false);
    }
  };

  const getMethodBadgeColor = (method: string) => {
    switch (method) {
      case "GET":
        return "bg-blue-500/20 text-blue-300 border-blue-500/40";
      case "POST":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
      case "PUT":
        return "bg-amber-500/20 text-amber-300 border-amber-500/40";
      case "DELETE":
        return "bg-rose-500/20 text-rose-300 border-rose-500/40";
      default:
        return "bg-slate-800 text-slate-300";
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 animate-pulse flex items-center justify-center gap-2">
        <Code className="w-5 h-5 text-emerald-400" />
        <span>Loading API Specifications...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-semibold border border-blue-500/20 mb-1">
            <Server className="w-3.5 h-3.5" />
            <span>OpenAPI 3.0 Standard Documentation</span>
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Code className="w-6 h-6 text-blue-400" />
            <span>{isArabic ? "توثيق واجهات برمجة التطبيقات (API Documentation)" : "Interactive API Explorer & Documentation"}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isArabic
              ? "توثيق شامل ودقيق لجميع مسارات النظام مع إمكانية تجربة الطلبات الحية مباشرة"
              : "Complete reference for DITA REST API endpoints, schemas, parameters, and live test call runner."}
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab("spec")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === "spec" ? "bg-blue-600 text-white font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            API Specification
          </button>
          <button
            onClick={() => setActiveTab("tester")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === "tester" ? "bg-blue-600 text-white font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            Live Request Console
          </button>
        </div>
      </div>

      {/* Main Explorer Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (4 cols): Endpoint Navigation Sidebar */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 max-h-[75vh] overflow-y-auto">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block px-2 mb-2">
            Available Endpoints ({docsData?.endpoints?.length || 0})
          </span>

          <div className="space-y-1">
            {docsData?.endpoints?.map((ep: ApiDocEndpoint, idx: number) => {
              const isSelected = selectedEndpoint?.path === ep.path && selectedEndpoint?.method === ep.method;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedStudentEndpoint(ep);
                    setTestResponse(null);
                  }}
                  className={`w-full p-2.5 rounded-xl border text-left transition flex items-center justify-between gap-2 text-xs ${
                    isSelected
                      ? "bg-slate-800 border-blue-500/60 text-white font-semibold shadow-md"
                      : "bg-slate-950/60 border-slate-800/80 text-slate-300 hover:bg-slate-800/50"
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${getMethodBadgeColor(ep.method)}`}>
                      {ep.method}
                    </span>
                    <span className="font-mono truncate">{ep.path}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column (8 cols): Details & Try-It-Out Console */}
        <div className="lg:col-span-8 space-y-4">
          {selectedEndpoint ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
              {/* Endpoint Overview Header */}
              <div className="border-b border-slate-800 pb-4 space-y-2">
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-lg text-xs font-extrabold border ${getMethodBadgeColor(selectedEndpoint.method)}`}>
                    {selectedEndpoint.method}
                  </span>
                  <span className="text-lg font-mono font-bold text-white">{selectedEndpoint.path}</span>
                </div>
                <h3 className="text-sm font-semibold text-slate-200">{selectedEndpoint.summary}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{selectedEndpoint.description}</p>
              </div>

              {/* Path / Query Parameters */}
              {selectedEndpoint.parameters && selectedEndpoint.parameters.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Parameters</span>
                  <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="p-2.5">Name</th>
                          <th className="p-2.5">Type</th>
                          <th className="p-2.5">Required</th>
                          <th className="p-2.5">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300">
                        {selectedEndpoint.parameters.map((param, i) => (
                          <tr key={i}>
                            <td className="p-2.5 font-mono text-emerald-400">{param.name}</td>
                            <td className="p-2.5 text-slate-400">{param.type}</td>
                            <td className="p-2.5">
                              {param.required ? (
                                <span className="text-red-400 font-bold">Yes</span>
                              ) : (
                                <span className="text-slate-500">No</span>
                              )}
                            </td>
                            <td className="p-2.5">{param.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Sample Request Body */}
              {selectedEndpoint.requestBodySample && (
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Sample Request Body (JSON)</span>
                  <pre className="p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-slate-300 overflow-x-auto">
                    {JSON.stringify(selectedEndpoint.requestBodySample, null, 2)}
                  </pre>
                </div>
              )}

              {/* Sample Response */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Expected Response Schema (200 OK)</span>
                <pre className="p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-emerald-300 overflow-x-auto max-h-52">
                  {JSON.stringify(selectedEndpoint.responseSample, null, 2)}
                </pre>
              </div>

              {/* Try It Out Interactive Call */}
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                    <Terminal className="w-4 h-4" />
                    <span>Live Console Execution</span>
                  </span>

                  <button
                    onClick={handleExecuteApiCall}
                    disabled={executing}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-900/30 transition disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{executing ? "Sending Request..." : "Execute Test Call"}</span>
                  </button>
                </div>

                {/* Live Call Result Output */}
                {testResponse && (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2 font-mono text-xs">
                    <div className="flex items-center justify-between text-slate-400 border-b border-slate-800/80 pb-2">
                      <span className="flex items-center gap-2">
                        <span>HTTP Status:</span>
                        <strong className="text-emerald-400 font-bold">{testResponse.status} {testResponse.statusText || "OK"}</strong>
                      </span>
                      <span>{new Date().toLocaleTimeString()}</span>
                    </div>

                    <pre className="text-slate-200 overflow-x-auto max-h-60 pt-1">
                      {JSON.stringify(testResponse.data || testResponse, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 text-sm">
              Select an endpoint from the left menu to view its full OpenAPI specification.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
