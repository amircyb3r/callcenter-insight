import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// GapGPT is an OpenAI-compatible gateway. The external CDN base
// (api.gapapi.com) is the one intended for servers hosted outside Iran,
// which is where Supabase Edge Functions run.
const GAPGPT_BASE_URL = Deno.env.get("GAPGPT_BASE_URL") ?? "https://api.gapapi.com/v1";
const GAPGPT_MODEL = Deno.env.get("GAPGPT_MODEL") ?? "gpt-4o";

const SYSTEM_PROMPT = `تو یک تحلیلگر ارشد داده در مرکز عملیات شبکه (NOC) و مرکز تماس پشتیبانی فنی یک شرکت ارائه‌دهنده اینترنت (ISP) هستی. تخصص تو کشف الگو در گزارش‌های خرابی مشترکین، تشخیص نقاط بحرانی جغرافیایی، و اولویت‌بندی اقدامات عملیاتی است.

به تو یک «خلاصه آماری» از فیدبک‌های ثبت‌شده داده می‌شود. وظیفه تو ارائه یک تحلیل عمیق، دقیق و کاملاً حرفه‌ای به زبان فارسی است.

قوانین:
- فقط و فقط بر اساس داده‌های واقعی که در ورودی آمده تحلیل کن. هیچ عدد یا آماری از خودت نساز.
- اگر داده‌ای برای یک بخش وجود ندارد، صادقانه بگو «داده کافی نیست».
- لحن: حرفه‌ای، شفاف، مدیریتی. از کلی‌گویی و جملات تبلیغاتی پرهیز کن.
- خروجی را با Markdown و سرتیترها و بولت‌ها مرتب کن.

ساختار خروجی باید دقیقاً این بخش‌ها باشد:

## خلاصه مدیریتی
دو تا سه جمله که وضعیت کلی و سطح بحران را بیان کند.

## مشکلات کلیدی و الگوها
مهم‌ترین انواع مشکلات، سهم هرکدام، و الگوهای قابل توجه (مثلاً تمرکز روی یک نوع مشکل یا یک محصول مثل فیبر/ADSL/شبکه داخلی).

## نقاط داغ جغرافیایی
شهرها و مراکز پرگزارش و تمرکز خرابی روی آن‌ها.

## تحلیل زمانی و spike
اگر اوج تماس یا افزایش ناگهانی وجود دارد، زمان و شدت آن را تفسیر کن؛ در غیر این صورت بگو روند یکنواخت است.

## فرضیه‌های ریشه‌ای محتمل
چند فرضیه فنی محتمل برای علت مشکلات غالب (مثلاً اختلال backbone، تجهیزات یک مرکز خاص، ازدحام پهنای باند در ساعات پیک).

## اقدامات پیشنهادی (به ترتیب اولویت)
فهرست شماره‌دار و عملیاتی از اقدامات مشخص و قابل اجرا برای تیم فنی.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { stats } = await req.json();
    if (!stats || typeof stats !== "string") {
      return new Response(JSON.stringify({ error: "داده‌ای برای تحلیل ارسال نشده است." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GAPGPT_API_KEY = Deno.env.get("GAPGPT_API_KEY");
    if (!GAPGPT_API_KEY) throw new Error("GAPGPT_API_KEY is not configured");

    const response = await fetch(`${GAPGPT_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GAPGPT_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GAPGPT_MODEL,
        temperature: 0.4,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `خلاصه آماری فیدبک‌ها:\n${stats}\n\nبر اساس این داده‌ها تحلیل کامل را طبق ساختار خواسته‌شده ارائه بده.` },
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
      if (response.status === 401 || response.status === 403) {
        return new Response(JSON.stringify({ error: "کلید API گپ‌جی‌پی‌تی نامعتبر است یا دسترسی ندارد." }), {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "اعتبار ناکافی. لطفاً اعتبار حساب گپ‌جی‌پی‌تی را شارژ کنید." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("GapGPT error:", response.status, t);
      throw new Error("GapGPT API error");
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
