import { useState, useMemo } from "react";
import { useFeedbacks, type FeedbackFilters } from "@/hooks/useFeedbacks";
import { usePhases } from "@/hooks/usePhases";
import { useIssueTypes } from "@/hooks/useIssueTypes";
import { IRAN_CITIES } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, LineChart, Line, CartesianGrid, LabelList,
} from "recharts";
import AIAnalysis from "@/components/AIAnalysis";

const COLORS = [
  "hsl(215,70%,50%)", "hsl(175,60%,45%)", "hsl(38,92%,50%)", "hsl(340,65%,50%)",
  "hsl(270,50%,55%)", "hsl(145,60%,40%)", "hsl(15,80%,55%)", "hsl(195,80%,45%)",
  "hsl(60,70%,45%)", "hsl(300,50%,50%)",
];
const CITY_COLOR = "hsl(215,70%,50%)";
const CENTER_COLOR = "hsl(38,92%,50%)";

export default function AnalyticsPage() {
  const { data: phases } = usePhases();
  const [filters, setFilters] = useState<FeedbackFilters>({});
  const { data: feedbacks } = useFeedbacks(filters);

  // Issue type distribution
  const issueData = useMemo(() => {
    if (!feedbacks?.length) return [];
    const count: Record<string, number> = {};
    feedbacks.forEach(f => { count[f.issue_type] = (count[f.issue_type] || 0) + 1; });
    const entries = Object.entries(count).sort((a, b) => b[1] - a[1]);
    const top = entries.slice(0, 8);
    const othersCount = entries.slice(8).reduce((s, e) => s + e[1], 0);
    const result = top.map(([name, value]) => ({ name, value }));
    if (othersCount > 0) result.push({ name: "سایر", value: othersCount });
    return result;
  }, [feedbacks]);

  // City distribution - top 10 + others
  const cityData = useMemo(() => {
    if (!feedbacks?.length) return [];
    const count: Record<string, number> = {};
    feedbacks.forEach(f => { if (f.city) count[f.city] = (count[f.city] || 0) + 1; });
    const entries = Object.entries(count).sort((a, b) => b[1] - a[1]);
    const top = entries.slice(0, 10);
    const othersCount = entries.slice(10).reduce((s, e) => s + e[1], 0);
    const result = top.map(([name, value]) => ({ name, value }));
    if (othersCount > 0) result.push({ name: "سایر", value: othersCount });
    return result;
  }, [feedbacks]);

  // Center distribution - top 10 + others
  const centerData = useMemo(() => {
    if (!feedbacks?.length) return [];
    const count: Record<string, number> = {};
    feedbacks.forEach(f => { if (f.center_name) count[f.center_name] = (count[f.center_name] || 0) + 1; });
    const entries = Object.entries(count).sort((a, b) => b[1] - a[1]);
    const top = entries.slice(0, 10);
    const othersCount = entries.slice(10).reduce((s, e) => s + e[1], 0);
    const result = top.map(([name, value]) => ({ name, value }));
    if (othersCount > 0) result.push({ name: "سایر", value: othersCount });
    return result;
  }, [feedbacks]);

  // Timeline - 10 min buckets
  const timelineData = useMemo(() => {
    if (!feedbacks?.length) return [];
    const buckets: Record<string, number> = {};
    feedbacks.forEach(f => {
      const d = new Date(f.created_at);
      const mins = Math.floor(d.getMinutes() / 10) * 10;
      d.setMinutes(mins, 0, 0);
      const key = d.toISOString();
      buckets[key] = (buckets[key] || 0) + 1;
    });
    return Object.entries(buckets)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([time, count]) => ({
        time: new Date(time).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" }),
        count,
      }));
  }, [feedbacks]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">تحلیل و نمودار</h1>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">فاز</Label>
              <Select value={filters.phaseId || "all"} onValueChange={v => setFilters(p => ({ ...p, phaseId: v === "all" ? undefined : v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه</SelectItem>
                  {phases?.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">از تاریخ</Label>
              <Input className="h-9" type="datetime-local" dir="ltr" value={filters.dateFrom || ""} onChange={e => setFilters(p => ({ ...p, dateFrom: e.target.value || undefined }))} />
            </div>
            <div>
              <Label className="text-xs">تا تاریخ</Label>
              <Input className="h-9" type="datetime-local" dir="ltr" value={filters.dateTo || ""} onChange={e => setFilters(p => ({ ...p, dateTo: e.target.value || undefined }))} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie - Issue Types */}
        <Card>
          <CardHeader><CardTitle className="text-base">سهم نوع مشکلات</CardTitle></CardHeader>
          <CardContent>
            {issueData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">بدون داده</p>
            ) : (
              <div className="flex flex-col lg:flex-row items-center gap-4">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={issueData} cx="50%" cy="50%" outerRadius={100} dataKey="value" labelLine={false}
                      label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
                      {issueData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 text-xs shrink-0 max-w-[200px]">
                  {issueData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="truncate">{d.name}</span>
                      <span className="mr-auto text-muted-foreground">({d.value})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader><CardTitle className="text-base">روند زمانی (۱۰ دقیقه‌ای)</CardTitle></CardHeader>
          <CardContent>
            {timelineData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">بدون داده</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="hsl(215,70%,50%)" strokeWidth={2} dot={{ r: 3 }} name="تعداد" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Bar - Cities */}
        <Card>
          <CardHeader><CardTitle className="text-base">تعداد گزارش بر اساس شهر</CardTitle></CardHeader>
          <CardContent>
            {cityData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">بدون داده</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(280, cityData.length * 32)}>
                <BarChart data={cityData} layout="vertical" margin={{ right: 40 }}>
                  <XAxis type="number" fontSize={11} />
                  <YAxis type="category" dataKey="name" width={80} fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="value" fill={CITY_COLOR} radius={[0, 4, 4, 0]} name="شهر">
                    <LabelList dataKey="value" position="right" fontSize={11} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Bar - Centers */}
        <Card>
          <CardHeader><CardTitle className="text-base">تعداد گزارش بر اساس مرکز</CardTitle></CardHeader>
          <CardContent>
            {centerData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">بدون داده</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(280, centerData.length * 32)}>
                <BarChart data={centerData} layout="vertical" margin={{ right: 40 }}>
                  <XAxis type="number" fontSize={11} />
                  <YAxis type="category" dataKey="name" width={100} fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="value" fill={CENTER_COLOR} radius={[0, 4, 4, 0]} name="مرکز">
                    <LabelList dataKey="value" position="right" fontSize={11} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Analysis */}
      <AIAnalysis filters={filters} feedbacks={feedbacks || []} />
    </div>
  );
}
