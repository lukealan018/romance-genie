import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const transcript = body?.transcript;

    if (!transcript) {
      throw new Error('No transcript provided');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' });

    const systemPrompt = `You are a date/time parser for scheduling events. Parse voice commands into structured date/time data.

TODAY'S DATE: ${todayStr} (${dayOfWeek})

Handle relative dates:
- "this Friday" → next Friday from today
- "this weekend" → return both Friday and Saturday as ambiguous options
- "next week" → return ambiguous flag with multiple day options
- "tomorrow at 7pm" → tomorrow's date + 19:00
- "tonight" → today's date + appropriate evening time

Default time to 7:00 PM (19:00) if no time specified.

Handle time formats:
- "7pm" or "7 pm" → 19:00
- "seven" or "7" → 19:00
- "7:30pm" → 19:30
- "noon" → 12:00
- "midnight" → 00:00

Return JSON:
If clear and unambiguous:
{
  "scheduledDate": "2025-01-24",
  "scheduledTime": "19:00",
  "ambiguous": false,
  "options": []
}

If ambiguous (e.g., "this weekend", "next week"):
{
  "ambiguous": true,
  "options": [
    {"date": "2025-01-24", "time": "19:00", "label": "Friday, Jan 24 at 7pm"},
    {"date": "2025-01-25", "time": "19:00", "label": "Saturday, Jan 25 at 7pm"}
  ]
}

IMPORTANT: Always return valid JSON. Be forgiving with natural language.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: transcript }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error('AI response missing content:', JSON.stringify(data));
      throw new Error('Invalid AI response: missing content');
    }
    
    const parsed = JSON.parse(content);

    console.log('Schedule interpretation:', parsed);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in interpret-schedule-voice:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
