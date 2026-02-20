import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Feedback, FeedbackFilters } from "@/hooks/useFeedbacks";

interface Props {
  filters: FeedbackFilters;
  feedbacks: Feedback[];
}

export default function AIAnalysis({ filters, feedbacks }: Props) {
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    if (!feedbacks.length) {
      setError("داده‌ای برای تحلیل وجود ندارد");
      return;
    }

    setLoading(true);
    setError("");
    setAnalysis("");

    // Build stats summary
    const issueCount: Record<string, number> = {};
    const cityCount: Record<string, number> = {};
    const centerCount: Record<string, number> = {};
    feedbacks.forEach(f => {
      issueCount[f.issue_type] = (issueCount[f.issue_type] || 0) + 1;
      if (f.city) cityCount[f.city] = (cityCount[f.city] || 0) + 1;
      if (f.center_name) centerCount[f.center_name] = (centerCount[f.center_name] || 0) + 1;
    });

    const topIssues = Object.entries(issueCount).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const topCities = Object.entries(cityCount).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const topCenters = Object.entries(centerCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

    // Check for time spikes (10-min buckets)
    const buckets: Record<string, number> = {};
    feedbacks.forEach(f => {
      const d = new Date(f.created_at);
      const mins = Math.floor(d.getMinutes() / 10) * 10;
      d.setMinutes(mins, 0, 0);
      buckets[d.toISOString()] = (buckets[d.toISOString()] || 0) + 1;
    });
    const bucketArr = Object.entries(buckets).sort((a, b) => b[1] - a[1]);
    const avgPerBucket = feedbacks.length / Math.max(Object.keys(buckets).length, 1);
    const spikes = bucketArr.filter(([_, c]) => c > avgPerBucket * 2).slice(0, 3);

    const statsText = `
آمار کل: ${feedbacks.length} فیدبک
مشکلات پرتکرار: ${topIssues.map(([n, c]) => `${n}(${c})`).join(", ")}
شهرهای پرتکرار: ${topCities.map(([n, c]) => `${n}(${c})`).join(", ")}
مراکز پرتکرار: ${topCenters.map(([n, c]) => `${n}(${c})`).join(", ")}
${spikes.length ? `اوج تماس: ${spikes.map(([t, c]) => `${new Date(t).toLocaleTimeString("fa-IR")}(${c} فیدبک)`).join(", ")}` : "بدون spike مشخص"}
    `.trim();

    try {
      const { data, error: fnError } = await supabase.functions.invoke("ai-analysis", {
        body: { stats: statsText },
      });

      if (fnError) throw fnError;
      setAnalysis(data.analysis || "خطا در دریافت تحلیل");
    } catch (e: any) {
      setError(e.message || "خطا در اتصال");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-warning" /> تحلیل AI
        </CardTitle>
        <Button size="sm" onClick={generate} disabled={loading}>
          {loading ? <RefreshCw className="w-4 h-4 animate-spin ml-1" /> : <Sparkles className="w-4 h-4 ml-1" />}
          {loading ? "در حال تحلیل..." : "تولید/بروزرسانی تحلیل"}
        </Button>
      </CardHeader>
      <CardContent>
        {error && <p className="text-destructive text-sm">{error}</p>}
        {analysis ? (
          <div className="whitespace-pre-wrap text-sm leading-7 bg-muted/50 rounded-lg p-4">{analysis}</div>
        ) : (
          !loading && <p className="text-muted-foreground text-sm">روی دکمه بالا کلیک کنید تا تحلیل AI تولید شود.</p>
        )}
      </CardContent>
    </Card>
  );
}
