import { useState } from "react";
import { usePhases, useCreatePhase, useClosePhase } from "@/hooks/usePhases";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Lock, Settings2 } from "lucide-react";

export default function PhasesPage() {
  const { data: phases, isLoading } = usePhases();
  const createPhase = useCreatePhase();
  const closePhase = useClosePhase();
  const [title, setTitle] = useState("");

  const handleCreate = async () => {
    if (!title.trim()) return;
    try {
      await createPhase.mutateAsync(title.trim());
      toast.success("فاز جدید ایجاد شد");
      setTitle("");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleClose = async (id: string) => {
    try {
      await closePhase.mutateAsync(id);
      toast.success("فاز بسته شد");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Settings2 className="w-6 h-6" /> مدیریت فازها
      </h1>

      {/* Create phase */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Input
              placeholder="عنوان فاز جدید (مثلاً: فاز ۳)"
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleCreate()}
            />
            <Button onClick={handleCreate} disabled={!title.trim() || createPhase.isPending}>
              <Plus className="w-4 h-4 ml-1" /> ایجاد
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Phases list */}
      <div className="space-y-3">
        {isLoading && <p className="text-muted-foreground">بارگذاری...</p>}
        {phases?.map(phase => (
          <Card key={phase.id}>
            <CardContent className="flex items-center justify-between pt-6">
              <div className="flex items-center gap-3">
                <span className="font-medium">{phase.title}</span>
                <Badge variant={phase.status === "OPEN" ? "default" : "secondary"}>
                  {phase.status === "OPEN" ? "فعال" : "بسته"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(phase.created_at).toLocaleDateString("fa-IR")}
                </span>
              </div>
              {phase.status === "OPEN" && (
                <Button variant="outline" size="sm" onClick={() => handleClose(phase.id)}>
                  <Lock className="w-3 h-3 ml-1" /> بستن فاز
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
