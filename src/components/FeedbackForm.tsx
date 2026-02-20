import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActivePhase } from "@/hooks/usePhases";
import { useIssueTypes } from "@/hooks/useIssueTypes";
import { IRAN_CITIES, MOBILE_ISSUE_TYPES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Send } from "lucide-react";

export default function FeedbackForm() {
  const { user } = useAuth();
  const { data: activePhase } = useActivePhase();
  const { data: issueTypes } = useIssueTypes();
  const firstFieldRef = useRef<HTMLInputElement>(null);

  const [issueType, setIssueType] = useState("");
  const [city, setCity] = useState("");
  const [centerName, setCenterName] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [customerIp, setCustomerIp] = useState("");
  const [simCardNumber, setSimCardNumber] = useState("");
  const [connectedOperator, setConnectedOperator] = useState("");
  const [area, setArea] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isMobile = MOBILE_ISSUE_TYPES.includes(issueType);

  const resetForm = () => {
    setIssueType("");
    setCity("");
    setCenterName("");
    setCustomerId("");
    setCustomerIp("");
    setSimCardNumber("");
    setConnectedOperator("");
    setArea("");
    setDescription("");
    setTimeout(() => firstFieldRef.current?.focus(), 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePhase) {
      toast.error("هیچ فاز فعالی وجود ندارد. با سرشیفت هماهنگ کنید.");
      return;
    }
    if (!user) return;

    setSubmitting(true);
    const payload: Record<string, unknown> = {
      phase_id: activePhase.id,
      issue_type: issueType,
      city,
      description: description || null,
      created_by: user.id,
      is_mobile_issue: isMobile,
    };

    if (isMobile) {
      payload.sim_card_number = simCardNumber;
      payload.connected_operator = connectedOperator;
      payload.area = area;
    } else {
      payload.customer_id = customerId;
      payload.customer_ip = customerIp;
      payload.center_name = centerName;
    }

    const { error } = await supabase.from("feedbacks").insert(payload as any);
    setSubmitting(false);
    if (error) {
      toast.error("خطا در ثبت فیدبک: " + error.message);
    } else {
      toast.success("ثبت شد ✓");
      resetForm();
    }
  };

  if (!activePhase) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">هیچ فاز فعالی وجود ندارد. لطفاً با سرشیفت هماهنگ کنید.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="w-5 h-5 text-primary" />
          ثبت فیدبک جدید
        </CardTitle>
        <p className="text-sm text-muted-foreground">فاز فعال: {activePhase.title}</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Issue Type */}
          <div className="space-y-2">
            <Label>نوع مشکل *</Label>
            <Select value={issueType} onValueChange={setIssueType} required>
              <SelectTrigger><SelectValue placeholder="انتخاب کنید" /></SelectTrigger>
              <SelectContent className="max-h-64">
                {issueTypes?.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* City */}
          <div className="space-y-2">
            <Label>شهر *</Label>
            <Select value={city} onValueChange={setCity} required>
              <SelectTrigger><SelectValue placeholder="انتخاب شهر" /></SelectTrigger>
              <SelectContent className="max-h-64">
                {IRAN_CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {isMobile ? (
            <>
              <div className="space-y-2">
                <Label>شماره سیمکارت *</Label>
                <Input ref={firstFieldRef} dir="ltr" value={simCardNumber} onChange={e => setSimCardNumber(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>اپراتور متصل *</Label>
                <Input value={connectedOperator} onChange={e => setConnectedOperator(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>شهر و منطقه *</Label>
                <Input value={area} onChange={e => setArea(e.target.value)} required />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label>شناسه مشترک *</Label>
                <Input ref={firstFieldRef} dir="ltr" value={customerId} onChange={e => setCustomerId(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>IP مشترک *</Label>
                <Input dir="ltr" value={customerIp} onChange={e => setCustomerIp(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>نام مرکز *</Label>
                <Input value={centerName} onChange={e => setCenterName(e.target.value)} required />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>توضیحات (اختیاری)</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
          </div>

          <Button type="submit" className="w-full" disabled={submitting || !issueType || !city}>
            {submitting ? "در حال ثبت..." : "ثبت فیدبک"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
