import { useAuth } from "@/hooks/useAuth";
import { useActivePhase } from "@/hooks/usePhases";
import { useFeedbacks } from "@/hooks/useFeedbacks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Clock, TrendingUp, MapPin } from "lucide-react";
import FeedbackForm from "@/components/FeedbackForm";

export default function AgentDashboard() {
  const { role } = useAuth();
  const { data: activePhase } = useActivePhase();

  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const tenMinAgo = new Date(now.getTime() - 10 * 60 * 1000).toISOString();

  const { data: allFeedbacks } = useFeedbacks({ phaseId: activePhase?.id });
  const { data: hourFeedbacks } = useFeedbacks({ phaseId: activePhase?.id, dateFrom: oneHourAgo });
  const { data: tenMinFeedbacks } = useFeedbacks({ phaseId: activePhase?.id, dateFrom: tenMinAgo });

  // Top issue types
  const issueCount: Record<string, number> = {};
  allFeedbacks?.forEach(f => { issueCount[f.issue_type] = (issueCount[f.issue_type] || 0) + 1; });
  const topIssues = Object.entries(issueCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Top cities
  const cityCount: Record<string, number> = {};
  allFeedbacks?.forEach(f => { if (f.city) cityCount[f.city] = (cityCount[f.city] || 0) + 1; });
  const topCities = Object.entries(cityCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Phase banner */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">داشبورد</h1>
        {activePhase && (
          <Badge variant="secondary" className="text-sm">
            فاز فعال: {activePhase.title}
          </Badge>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="کل فیدبک‌ها (فاز فعال)" value={allFeedbacks?.length ?? 0} icon={<BarChart3 className="w-5 h-5" />} />
        <StatCard title="۱ ساعت اخیر" value={hourFeedbacks?.length ?? 0} icon={<Clock className="w-5 h-5" />} />
        <StatCard title="۱۰ دقیقه اخیر" value={tenMinFeedbacks?.length ?? 0} icon={<TrendingUp className="w-5 h-5" />} />
      </div>

      {/* Top issues & cities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">مشکلات پرتکرار</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topIssues.length === 0 && <p className="text-sm text-muted-foreground">بدون داده</p>}
            {topIssues.map(([name, count]) => (
              <div key={name} className="flex justify-between items-center text-sm">
                <span className="truncate max-w-[70%]">{name}</span>
                <Badge variant="outline">{count}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4" /> شهرهای پرتکرار
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topCities.length === 0 && <p className="text-sm text-muted-foreground">بدون داده</p>}
            {topCities.map(([name, count]) => (
              <div key={name} className="flex justify-between items-center text-sm">
                <span>{name}</span>
                <Badge variant="outline">{count}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Feedback form for agents */}
      {role === "agent" && (
        <div className="pt-4">
          <FeedbackForm />
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-6">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
