import { useState, useEffect, useCallback } from "react";
import { useFeedbacks, useFeedbackRealtime, type FeedbackFilters } from "@/hooks/useFeedbacks";
import { usePhases } from "@/hooks/usePhases";
import { useIssueTypes } from "@/hooks/useIssueTypes";
import { IRAN_CITIES } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Download, List } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";

export default function LiveFeedbackPage() {
  useFeedbackRealtime();
  const qc = useQueryClient();
  const { data: phases } = usePhases();
  const { data: issueTypes } = useIssueTypes();
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  const [filters, setFilters] = useState<FeedbackFilters>({});
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const { data: feedbacks, isLoading, refetch } = useFeedbacks(filters);

  // Load profiles
  useEffect(() => {
    supabase.from("profiles").select("user_id, full_name, email").then(({ data }) => {
      if (data) {
        const map: Record<string, string> = {};
        data.forEach(p => { map[p.user_id] = p.full_name || p.email; });
        setProfiles(map);
      }
    });
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      refetch();
      setLastRefresh(new Date());
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, refetch]);

  const handleRefresh = () => {
    refetch();
    setLastRefresh(new Date());
  };

  const exportCSV = () => {
    if (!feedbacks?.length) return;
    const rows = feedbacks.map(f => ({
      "زمان": new Date(f.created_at).toLocaleString("fa-IR"),
      "نوع مشکل": f.issue_type,
      "شهر": f.city || "",
      "مرکز": f.center_name || "",
      "شناسه مشترک": f.customer_id || f.sim_card_number || "",
      "IP": f.customer_ip || "",
      "کارشناس": profiles[f.created_by] || f.created_by,
      "توضیحات": f.description || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Feedbacks");
    XLSX.writeFile(wb, "feedbacks.xlsx");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <List className="w-6 h-6" /> فیدبک زنده
        </h1>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs">
            آخرین بروزرسانی: {lastRefresh.toLocaleTimeString("fa-IR")}
          </Badge>
          <div className="flex items-center gap-2">
            <Label className="text-xs">رفرش خودکار</Label>
            <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
          </div>
          <Button size="sm" variant="outline" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 ml-1" /> رفرش
          </Button>
          <Button size="sm" variant="outline" onClick={exportCSV}>
            <Download className="w-4 h-4 ml-1" /> خروجی Excel
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
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
              <Label className="text-xs">نوع مشکل</Label>
              <Select value={filters.issueTypes?.[0] || "all"} onValueChange={v => setFilters(p => ({ ...p, issueTypes: v === "all" ? undefined : [v] }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="all">همه</SelectItem>
                  {issueTypes?.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">شهر</Label>
              <Select value={filters.city || "all"} onValueChange={v => setFilters(p => ({ ...p, city: v === "all" ? undefined : v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="all">همه</SelectItem>
                  {IRAN_CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">مرکز (شامل)</Label>
              <Input className="h-9" placeholder="جستجو..." value={filters.centerName || ""} onChange={e => setFilters(p => ({ ...p, centerName: e.target.value || undefined }))} />
            </div>
            <div>
              <Label className="text-xs">از تاریخ</Label>
              <Input className="h-9" type="datetime-local" dir="ltr" value={filters.dateFrom || ""} onChange={e => setFilters(p => ({ ...p, dateFrom: e.target.value || undefined }))} />
            </div>
            <div>
              <Label className="text-xs">تا تاریخ</Label>
              <Input className="h-9" type="datetime-local" dir="ltr" value={filters.dateTo || ""} onChange={e => setFilters(p => ({ ...p, dateTo: e.target.value || undefined }))} />
            </div>
            <div className="col-span-2 md:col-span-4 lg:col-span-6">
              <Label className="text-xs">جستجوی آزاد (شناسه، IP، سیمکارت، توضیحات)</Label>
              <Input className="h-9" placeholder="جستجو..." value={filters.search || ""} onChange={e => setFilters(p => ({ ...p, search: e.target.value || undefined }))} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">زمان</TableHead>
                <TableHead className="text-right">نوع مشکل</TableHead>
                <TableHead className="text-right">شهر</TableHead>
                <TableHead className="text-right">مرکز</TableHead>
                <TableHead className="text-right">شناسه/سیمکارت</TableHead>
                <TableHead className="text-right">IP</TableHead>
                <TableHead className="text-right">کارشناس</TableHead>
                <TableHead className="text-right">توضیحات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">بارگذاری...</TableCell></TableRow>
              )}
              {!isLoading && feedbacks?.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">فیدبکی یافت نشد</TableCell></TableRow>
              )}
              {feedbacks?.map(f => (
                <TableRow key={f.id}>
                  <TableCell className="text-xs whitespace-nowrap">{new Date(f.created_at).toLocaleString("fa-IR")}</TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate">{f.issue_type}</TableCell>
                  <TableCell className="text-sm">{f.city || "—"}</TableCell>
                  <TableCell className="text-sm">{f.center_name || "—"}</TableCell>
                  <TableCell className="text-sm font-mono" dir="ltr">{f.customer_id || f.sim_card_number || "—"}</TableCell>
                  <TableCell className="text-sm font-mono" dir="ltr">{f.customer_ip || "—"}</TableCell>
                  <TableCell className="text-sm">{profiles[f.created_by] || "—"}</TableCell>
                  <TableCell className="text-sm max-w-[150px] truncate">{f.description || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
