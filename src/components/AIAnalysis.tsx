import { useMemo, useState } from "react";
import {
  MapPin, Building2, Activity, Wifi, Server, Zap,
  Sparkles, Brain, AlertTriangle, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Feedback } from "@/hooks/useFeedbacks";

interface AIAnalysisProps {
  feedbacks: Feedback[];
}

type WarningCategory = "network" | "speed" | "hardware";

const WARNING_ICONS: Record<WarningCategory, JSX.Element> = {
  network: <Wifi className="w-3.5 h-3.5" />,
  speed: <Zap className="w-3.5 h-3.5" />,
  hardware: <Server className="w-3.5 h-3.5" />,
};

/** Lightweight markdown renderer for the AI response (no extra deps). */
function AIMarkdown({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1.5 text-sm leading-7 text-foreground/90">
      {lines.map((raw, i) => {
        const line = raw.trim();
        if (!line) return <div key={i} className="h-1.5" />;
        if (line.startsWith("## ")) {
          return (
            <h4 key={i} className="text-sm font-bold text-primary mt-3 mb-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> {line.replace(/^##\s+/, "")}
            </h4>
          );
        }
        if (line.startsWith("# ")) {
          return <h3 key={i} className="text-base font-bold mt-3 mb-1">{line.replace(/^#\s+/, "")}</h3>;
        }
        if (/^[-*•]\s+/.test(line)) {
          return (
            <div key={i} className="flex gap-2 pr-2">
              <span className="text-primary mt-1">•</span>
              <span>{line.replace(/^[-*•]\s+/, "")}</span>
            </div>
          );
        }
        if (/^\d+[.)]\s+/.test(line)) {
          const num = line.match(/^(\d+)[.)]/)?.[1];
          return (
            <div key={i} className="flex gap-2 pr-2">
              <span className="font-bold text-primary">{num}.</span>
              <span>{line.replace(/^\d+[.)]\s+/, "")}</span>
            </div>
          );
        }
        return <p key={i}>{line}</p>;
      })}
    </div>
  );
}

export default function AIAnalysis({ feedbacks }: AIAnalysisProps) {
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const analysis = useMemo(() => {
    if (!feedbacks?.length) {
      return {
        hasData: false as const,
        statsText: "",
        summary: "داده‌ای برای تحلیل وجود ندارد",
        status: { level: "idle", text: "بدون داده", icon: "⚪", bg: "bg-muted/40", border: "border-border", textColor: "text-muted-foreground" },
      };
    }

    const total = feedbacks.length;

    const issueCounts: Record<string, number> = {};
    const cityCounts: Record<string, number> = {};
    const centerCounts: Record<string, number> = {};

    feedbacks.forEach((f) => {
      const issue = f.issue_type || "نامشخص";
      const city = f.city || "نامشخص";
      const center = f.center_name || "نامشخص";
      issueCounts[issue] = (issueCounts[issue] || 0) + 1;
      cityCounts[city] = (cityCounts[city] || 0) + 1;
      centerCounts[center] = (centerCounts[center] || 0) + 1;
    });

    const sortedIssues = Object.entries(issueCounts).sort((a, b) => b[1] - a[1]);
    const sortedCities = Object.entries(cityCounts).sort((a, b) => b[1] - a[1]);
    const sortedCenters = Object.entries(centerCounts).sort((a, b) => b[1] - a[1]);

    const topIssue = sortedIssues[0]?.[0] || "نامشخص";
    const topIssueCount = sortedIssues[0]?.[1] || 0;
    const topIssuePercent = ((topIssueCount / total) * 100).toFixed(1);

    const topCity = sortedCities[0]?.[0] || "نامشخص";
    const topCityCount = sortedCities[0]?.[1] || 0;
    const topCityPercent = ((topCityCount / total) * 100).toFixed(1);

    const topCenter = sortedCenters[0]?.[0] || "نامشخص";

    const networkKeywords = ["شبکه داخلی", "مشکل شبکه", "قطع اینترنت", "اتصال", "اینترنت"];
    const speedKeywords = ["افت سرعت", "سرعت پایین", "اسکای فایبر", "فایبر", "ADSL", "VDSL"];
    const hardwareKeywords = ["مودم", "سخت افزار", "دستگاه", "تجهیزات"];

    let networkCount = 0, speedCount = 0, hardwareCount = 0;
    const networkIssuesList: string[] = [];
    const speedIssuesList: string[] = [];

    sortedIssues.forEach(([issue, count]) => {
      if (networkKeywords.some((kw) => issue.includes(kw))) { networkCount += count; networkIssuesList.push(issue); }
      if (speedKeywords.some((kw) => issue.includes(kw))) { speedCount += count; speedIssuesList.push(issue); }
      if (hardwareKeywords.some((kw) => issue.includes(kw))) { hardwareCount += count; }
    });

    const networkPercent = ((networkCount / total) * 100).toFixed(1);
    const speedPercent = ((speedCount / total) * 100).toFixed(1);
    const hardwarePercent = ((hardwareCount / total) * 100).toFixed(1);

    let criticalScore = 0;
    if (parseFloat(networkPercent) > 25) criticalScore += 2; else if (parseFloat(networkPercent) > 15) criticalScore += 1;
    if (parseFloat(speedPercent) > 25) criticalScore += 2; else if (parseFloat(speedPercent) > 15) criticalScore += 1;
    if (parseFloat(topIssuePercent) > 35) criticalScore += 2; else if (parseFloat(topIssuePercent) > 20) criticalScore += 1;
    if (total > 150) criticalScore += 1;

    let status = { level: "normal", text: "عادی", icon: "🟢", bg: "bg-success/10", border: "border-success/30", textColor: "text-success" };
    if (criticalScore >= 4) status = { level: "critical", text: "بحرانی", icon: "🔴", bg: "bg-destructive/10", border: "border-destructive/30", textColor: "text-destructive" };
    else if (criticalScore >= 2) status = { level: "warning", text: "هشدار", icon: "🟡", bg: "bg-warning/10", border: "border-warning/30", textColor: "text-warning" };

    let summary: string;
    if (status.level === "critical") summary = `وضعیت بحرانی! مشکل «${topIssue}» با ${topIssuePercent}% بیشترین سهم را دارد. اولویت با بررسی مرکز ${topCenter} و شهر ${topCity}.`;
    else if (status.level === "warning") summary = `وضعیت هشدار. بیشترین فشار روی «${topIssue}» (${topIssuePercent}%) است. جزئیات تماس‌ها را بررسی کنید.`;
    else summary = `وضعیت عادی. الگوی پراکندگی متعادل است.`;

    const warnings: { title: string; count: number; percent: string; category: WarningCategory; issues?: string[] }[] = [];
    if (parseFloat(networkPercent) > 15) warnings.push({ title: "مشکلات شبکه داخلی", count: networkCount, percent: networkPercent, category: "network", issues: networkIssuesList.slice(0, 2) });
    if (parseFloat(speedPercent) > 15) warnings.push({ title: "مشکلات افت سرعت", count: speedCount, percent: speedPercent, category: "speed", issues: speedIssuesList.slice(0, 2) });
    if (parseFloat(hardwarePercent) > 10) warnings.push({ title: "مشکلات سخت‌افزاری", count: hardwareCount, percent: hardwarePercent, category: "hardware" });

    const insights = [
      { icon: <MapPin className="w-3.5 h-3.5" />, text: `شهر ${topCity} با ${topCityPercent}% تماس‌ها بیشترین حجم را دارد` },
      { icon: <Building2 className="w-3.5 h-3.5" />, text: `مرکز ${topCenter} بیشترین حجم تماس را دارد` },
    ];

    // Time spikes (10-min buckets)
    const buckets: Record<string, number> = {};
    feedbacks.forEach((f) => {
      const d = new Date(f.created_at);
      d.setMinutes(Math.floor(d.getMinutes() / 10) * 10, 0, 0);
      buckets[d.toISOString()] = (buckets[d.toISOString()] || 0) + 1;
    });
    const avgPerBucket = total / Math.max(Object.keys(buckets).length, 1);
    const spikes = Object.entries(buckets).sort((a, b) => b[1] - a[1]).filter(([, c]) => c > avgPerBucket * 2).slice(0, 3);

    const statsText = [
      `آمار کل: ${total} فیدبک`,
      `سطح وضعیت (محاسبه محلی): ${status.text}`,
      `مشکلات پرتکرار: ${sortedIssues.slice(0, 10).map(([n, c]) => `${n}(${c}، ${((c / total) * 100).toFixed(1)}%)`).join(", ")}`,
      `شهرهای پرتکرار: ${sortedCities.slice(0, 10).map(([n, c]) => `${n}(${c})`).join(", ")}`,
      `مراکز پرتکرار: ${sortedCenters.slice(0, 5).map(([n, c]) => `${n}(${c})`).join(", ")}`,
      `دسته‌بندی: شبکه ${networkPercent}% | سرعت ${speedPercent}% | سخت‌افزار ${hardwarePercent}%`,
      spikes.length
        ? `اوج تماس: ${spikes.map(([t, c]) => `${new Date(t).toLocaleTimeString("fa-IR")}(${c} فیدبک)`).join(", ")}`
        : "بدون spike مشخص",
    ].join("\n");

    return {
      hasData: true as const,
      total, status, summary, warnings, insights,
      topIssue, topIssuePercent, topCity, topCityPercent, topCenter,
      statsText,
    };
  }, [feedbacks]);

  const generateAI = async () => {
    if (!analysis.hasData) return;
    setAiLoading(true);
    setAiError("");
    setAiText("");
    try {
      const { data, error } = await supabase.functions.invoke("ai-analysis", {
        body: { stats: analysis.statsText },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAiText(data?.analysis || "خطا در دریافت تحلیل");
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "خطا در اتصال به سرویس تحلیل");
    } finally {
      setAiLoading(false);
    }
  };

  if (!analysis.hasData) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/60 p-8 text-center">
        <Activity className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-muted-foreground">تحلیلی وجود ندارد</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status banner */}
      <div className={`rounded-xl p-4 border ${analysis.status.bg} ${analysis.status.border}`}>
        <div className="flex items-center gap-2">
          <span className="text-xl">{analysis.status.icon}</span>
          <span className={`text-sm font-bold ${analysis.status.textColor}`}>وضعیت: {analysis.status.text}</span>
          <span className="text-xs text-muted-foreground mr-auto">کل تماس‌ها: {analysis.total}</span>
        </div>
        <p className="text-sm text-foreground/80 mt-2">{analysis.summary}</p>
      </div>

      {/* Quick stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-card p-3 text-center rounded-xl border">
          <p className="text-[10px] text-muted-foreground">مشکل اصلی</p>
          <p className="text-xs font-bold truncate" title={analysis.topIssue}>{analysis.topIssue}</p>
          <p className="text-[10px]">{analysis.topIssuePercent}%</p>
        </div>
        <div className="bg-card p-3 text-center rounded-xl border">
          <p className="text-[10px] text-muted-foreground">شهر اصلی</p>
          <p className="text-xs font-bold truncate" title={analysis.topCity}>{analysis.topCity}</p>
          <p className="text-[10px]">{analysis.topCityPercent}%</p>
        </div>
        <div className="bg-card p-3 text-center rounded-xl border">
          <p className="text-[10px] text-muted-foreground">مرکز اصلی</p>
          <p className="text-xs font-bold truncate" title={analysis.topCenter}>{analysis.topCenter}</p>
        </div>
      </div>

      {/* Warnings */}
      {analysis.warnings.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3">
          <p className="text-sm font-bold text-destructive flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" /> هشدارها
          </p>
          {analysis.warnings.map((w, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-destructive mt-1">
              {WARNING_ICONS[w.category]} <span>{w.title}: {w.count} تماس ({w.percent}%)</span>
            </div>
          ))}
        </div>
      )}

      {/* Quick insights */}
      <div className="bg-muted/40 border rounded-xl p-3 space-y-1">
        {analysis.insights.map((it, i) => (
          <div key={i} className="flex items-center gap-2 text-sm text-foreground/80">
            {it.icon} <span>{it.text}</span>
          </div>
        ))}
      </div>

      {/* AI deep analysis (GapGPT) */}
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Brain className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">تحلیل عمیق هوش مصنوعی</h3>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> مبتنی بر GapGPT
              </p>
            </div>
          </div>
          <Button size="sm" onClick={generateAI} disabled={aiLoading}>
            {aiLoading ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : <Sparkles className="w-4 h-4 ml-1" />}
            {aiLoading ? "در حال تحلیل..." : aiText ? "بروزرسانی تحلیل" : "تولید تحلیل هوشمند"}
          </Button>
        </div>

        {aiError && (
          <div className="text-destructive text-sm bg-destructive/10 border border-destructive/30 rounded-lg p-3">
            {aiError}
          </div>
        )}

        {aiLoading && (
          <div className="space-y-2">
            <div className="h-4 w-full bg-muted rounded animate-pulse" />
            <div className="h-4 w-4/5 bg-muted rounded animate-pulse" />
            <div className="h-4 w-3/5 bg-muted rounded animate-pulse" />
          </div>
        )}

        {!aiLoading && aiText && (
          <div className="bg-muted/40 rounded-lg p-4">
            <AIMarkdown text={aiText} />
          </div>
        )}

        {!aiLoading && !aiText && !aiError && (
          <p className="text-muted-foreground text-sm">
            برای دریافت تحلیل عمیق و حرفه‌ای از داده‌های فعلی، روی «تولید تحلیل هوشمند» کلیک کنید.
          </p>
        )}
      </div>
    </div>
  );
}
