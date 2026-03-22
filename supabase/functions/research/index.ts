import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { linkedinUrl, context, scopes } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const scopeList = Object.entries(scopes || {})
      .filter(([_, v]) => v)
      .map(([k]) => k)
      .join(", ");

    const systemPrompt = `You are I.C.E Panda, an expert due diligence research AI. You conduct deep background investigations on individuals using publicly available information.

Your task: Given a LinkedIn profile URL and optional context, produce a comprehensive due diligence report. Research the person thoroughly and return structured findings.

You MUST return valid JSON matching this exact schema:
{
  "target": {
    "fullName": "string",
    "title": "string",
    "company": "string",
    "initials": "string",
    "location": "string"
  },
  "riskLevel": "critical" | "high" | "moderate" | "low" | "clear",
  "confidenceScore": number (0-100),
  "riskScore": number (0-100),
  "executiveSummary": "string (2-3 paragraphs)",
  "findings": [
    {
      "category": "Criminal" | "Litigation" | "Fraud & Financial" | "Sanctions" | "Sex Offender" | "Epstein Files",
      "items": [
        {
          "title": "string",
          "source": "string",
          "reliability": "HIGH" | "MEDIUM" | "LOW",
          "confidence": number (0-100),
          "severity": "critical" | "high" | "moderate" | "low" | "info",
          "jurisdiction": "string",
          "date": "YYYY-MM-DD",
          "summary": "string (2-3 sentences)"
        }
      ]
    }
  ],
  "identitySignals": [
    { "label": "string", "verified": boolean }
  ],
  "sourcesConsulted": [
    { "name": "string", "reliability": "HIGH" | "MEDIUM" | "LOW", "status": "string" }
  ]
}

Be thorough, realistic, and cite plausible public sources. Research scope: ${scopeList || "all categories"}.`;

    const userPrompt = `Investigate this person:
LinkedIn URL: ${linkedinUrl}
${context ? `Additional context: ${context}` : ""}

Conduct a comprehensive due diligence investigation. Search for criminal records, litigation history, fraud indicators, sanctions matches, and any other relevant adverse findings. Return the structured JSON report.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_report",
              description: "Submit the structured due diligence report",
              parameters: {
                type: "object",
                properties: {
                  target: {
                    type: "object",
                    properties: {
                      fullName: { type: "string" },
                      title: { type: "string" },
                      company: { type: "string" },
                      initials: { type: "string" },
                      location: { type: "string" },
                    },
                    required: ["fullName", "title", "company", "initials"],
                  },
                  riskLevel: { type: "string", enum: ["critical", "high", "moderate", "low", "clear"] },
                  confidenceScore: { type: "number" },
                  riskScore: { type: "number" },
                  executiveSummary: { type: "string" },
                  findings: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        category: { type: "string" },
                        items: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              title: { type: "string" },
                              source: { type: "string" },
                              reliability: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
                              confidence: { type: "number" },
                              severity: { type: "string", enum: ["critical", "high", "moderate", "low", "info"] },
                              jurisdiction: { type: "string" },
                              date: { type: "string" },
                              summary: { type: "string" },
                            },
                            required: ["title", "source", "reliability", "confidence", "severity", "summary"],
                          },
                        },
                      },
                      required: ["category", "items"],
                    },
                  },
                  identitySignals: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        label: { type: "string" },
                        verified: { type: "boolean" },
                      },
                      required: ["label", "verified"],
                    },
                  },
                  sourcesConsulted: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        reliability: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
                        status: { type: "string" },
                      },
                      required: ["name", "reliability", "status"],
                    },
                  },
                },
                required: ["target", "riskLevel", "confidenceScore", "riskScore", "executiveSummary", "findings", "identitySignals", "sourcesConsulted"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_report" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error("No structured response from AI");
    }

    const report = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Research error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
