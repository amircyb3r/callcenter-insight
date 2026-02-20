import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { stats } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `تو یک تحلیلگر داده‌ی مرکز تماس پشتیبانی فنی اینترنت هستی. 
وظیفه تو فقط و فقط «گزارش آماری» دادن است. ممنوع است راه‌حل، توصیه فنی، یا مراحل رفع مشکل ارائه بدهی.

خروجی تو باید شامل:
1. خلاصه وضعیت (تعداد کل، روند کلی)
2. مشکلات پرتکرار و سهم هرکدام
3. شهرها و مراکز پرگزارش
4. اگر spike (افزایش ناگهانی) وجود دارد، زمان و شدت آن
5. مقایسه نسبی بین انواع مشکلات

خروجی باید فارسی، مختصر و حرفه‌ای باشد. فقط گزارش بده.`
          },
          {
            role: "user",
            content: `آمار فیدبک‌ها:\n${stats}`
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "محدودیت تعداد درخواست. لطفاً کمی صبر کنید." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "اعتبار ناکافی. لطفاً اعتبار خود را شارژ کنید." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content || "خطا در تولید تحلیل";

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-analysis error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
