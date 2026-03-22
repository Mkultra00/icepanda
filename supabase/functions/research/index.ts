import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type LinkedInAnchor = {
  normalizedUrl: string;
  fullName?: string;
  title?: string;
  company?: string;
  location?: string;
  initials?: string;
  profileImageUrl?: string;
};

const REQUIRED_CATEGORIES = [
  "Criminal",
  "Litigation",
  "Fraud & Financial",
  "Sanctions",
  "Sex Offender",
  "Epstein Files",
] as const;

const normalizeLinkedInUrl = (rawUrl: string) => {
  const trimmed = rawUrl.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const url = new URL(withProtocol);
  if (!url.hostname.toLowerCase().includes("linkedin.com") || !url.pathname.startsWith("/in/")) {
    throw new Error("Please provide a valid LinkedIn profile URL (linkedin.com/in/...)");
  }
  url.protocol = "https:";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
};

const toInitials = (name?: string) => {
  if (!name) return "NA";
  const parts = name.split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "NA";
};

const slugToNameFallback = (normalizedUrl: string) => {
  const slug = normalizedUrl.split("/in/")[1]?.split("/")[0] ?? "";
  if (!slug) return undefined;
  return decodeURIComponent(slug).replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim();
};

const fetchLinkedInAnchor = async (normalizedUrl: string): Promise<LinkedInAnchor> => {
  const anchor: LinkedInAnchor = { normalizedUrl };
  try {
    const noProtocol = normalizedUrl.replace(/^https?:\/\//i, "");
    const jinaUrl = `https://r.jina.ai/http://${noProtocol}`;
    const response = await fetch(jinaUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
    const markdown = await response.text();

    const titleLineMatch = markdown.match(/^Title:\s*(.+)$/m);
    const titleLine = titleLineMatch?.[1]?.trim();
    if (titleLine) {
      const cleaned = titleLine.replace(/\s*\|\s*LinkedIn\s*$/i, "").trim();
      const [possibleName, ...rest] = cleaned.split(" - ");
      if (possibleName?.trim()) anchor.fullName = possibleName.trim();
      if (rest.length > 0) anchor.title = rest.join(" - ").trim();
    }

    const h1Matches = [...markdown.matchAll(/^#\s+(.+)$/gm)].map((m) => m[1].trim());
    const firstPlainNameHeading = h1Matches.find((h) => h && !h.includes("| LinkedIn") && h.split(" ").length <= 5);
    if (!anchor.fullName && firstPlainNameHeading) anchor.fullName = firstPlainNameHeading;

    const locationMatch = markdown.match(/^###\s+(.+?)\s+Contact Info\s*$/m);
    if (locationMatch?.[1]) anchor.location = locationMatch[1].trim();

    const companyMatch = markdown.match(/introduce you to \d+ people at ([^\n]+)/i);
    if (companyMatch?.[1]) anchor.company = companyMatch[1].trim();

    // Extract profile photo (not banner/background)
    // Profile photos contain "profile-displayphoto" in the URL
    const allImgMatches = [...markdown.matchAll(/!\[.*?\]\((https:\/\/media\.licdn\.com\/[^\s)]+)\)/g)];
    const profilePhotoMatch = allImgMatches.find(m => m[1].includes("profile-displayphoto"));
    if (profilePhotoMatch?.[1]) {
      anchor.profileImageUrl = profilePhotoMatch[1];
    } else {
      // Fallback: try smaller images (profile photos are typically 200x200 or 400x400)
      const smallImgMatch = allImgMatches.find(m => !m[1].includes("background") && !m[1].includes("banner"));
      if (smallImgMatch?.[1]) anchor.profileImageUrl = smallImgMatch[1];
    }
    // Also try the "Image" metadata line as last resort
    if (!anchor.profileImageUrl) {
      const imgLineMatch = markdown.match(/^Image:\s*(https:\/\/[^\s]+)/m);
      if (imgLineMatch?.[1] && !imgLineMatch[1].includes("background")) {
        anchor.profileImageUrl = imgLineMatch[1];
      }
    }

    if (!anchor.fullName) anchor.fullName = slugToNameFallback(normalizedUrl);
    if (!anchor.initials) anchor.initials = toInitials(anchor.fullName);
  } catch (error) {
    console.warn("Could not fetch LinkedIn anchor data:", error);
    anchor.fullName = anchor.fullName ?? slugToNameFallback(normalizedUrl);
    anchor.initials = toInitials(anchor.fullName);
  }
  return anchor;
};

const normalizeScore = (value: unknown) => {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return 0;
  const normalized = num <= 1 ? num * 100 : num;
  return Math.max(0, Math.min(100, Math.round(normalized)));
};

const enforceAnchorOnReport = (report: any, anchor: LinkedInAnchor) => {
  report.target = report.target ?? {};
  if (anchor.fullName) report.target.fullName = anchor.fullName;
  if (anchor.initials) report.target.initials = anchor.initials;
  if (anchor.title) report.target.title = anchor.title;
  if (anchor.company) report.target.company = anchor.company;
  if (anchor.location) report.target.location = anchor.location;
  if (anchor.profileImageUrl) report.target.profileImageUrl = anchor.profileImageUrl;
  if (!report.target.title) report.target.title = "LinkedIn Profile";
  if (!report.target.company) report.target.company = "Unspecified";
  if (!report.target.location) report.target.location = "Unknown";

  report.confidenceScore = normalizeScore(report.confidenceScore);
  report.riskScore = normalizeScore(report.riskScore);

  report.biography = report.biography ?? {};

  const identitySignals = Array.isArray(report.identitySignals) ? report.identitySignals : [];
  identitySignals.unshift({ label: `LinkedIn URL anchored: ${anchor.normalizedUrl}`, verified: true });
  report.identitySignals = identitySignals;

  const sources = Array.isArray(report.sourcesConsulted) ? report.sourcesConsulted : [];
  sources.unshift({ name: "LinkedIn Public Profile", reliability: "HIGH", status: `Anchored to ${anchor.normalizedUrl}` });
  report.sourcesConsulted = sources;

  const existingFindings = Array.isArray(report.findings) ? report.findings : [];
  const byCategory = new Map(existingFindings.map((f: any) => [f.category, f]));
  report.findings = REQUIRED_CATEGORIES.map((category) => {
    const current = byCategory.get(category);
    return { category, items: Array.isArray(current?.items) ? current.items : [] };
  });

  return report;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { linkedinUrl, context, scopes } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const normalizedLinkedInUrl = normalizeLinkedInUrl(linkedinUrl);
    const anchor = await fetchLinkedInAnchor(normalizedLinkedInUrl);

    const scopeList = Object.entries(scopes || {}).filter(([_, v]) => v).map(([k]) => k).join(", ");

    const systemPrompt = `You are I.C.E Panda, an expert due diligence and intelligence research AI. You produce comprehensive life briefings and risk assessments.

CRITICAL IDENTITY RULES:
1) The target identity is anchored to this exact LinkedIn URL: ${anchor.normalizedUrl}
2) Prefer these anchor fields over web ambiguity:
   - fullName: ${anchor.fullName ?? "unknown"}
   - title: ${anchor.title ?? "unknown"}
   - company: ${anchor.company ?? "unknown"}
   - location: ${anchor.location ?? "unknown"}
3) Never switch to a different same-name person.
4) If evidence conflicts, keep the anchored identity and lower confidence.

BIOGRAPHY INSTRUCTIONS:
Research and compile a comprehensive life briefing. For each biography section, write 2-4 detailed sentences based on publicly available information. If information is not available for a section, write "No public information available." Include:
- earlyLife: Where they grew up, family background if public, formative years
- education: Schools, universities, degrees, academic achievements
- career: Full career trajectory from earliest known role to current position, key transitions
- notableAchievements: Awards, publications, patents, major deals, public recognition
- personalLife: Public interests, board memberships, philanthropy, community involvement
- publicPresence: Media appearances, social media activity, public speaking, thought leadership

DUE DILIGENCE INSTRUCTIONS:
Also produce thorough risk findings across all categories. Be factual and cite real public databases. If no adverse findings exist in a category, return an empty items array for that category.

Return ONLY structured report JSON via tool call.`;

    const userPrompt = `Investigate this person and create a comprehensive life briefing report:
LinkedIn URL: ${normalizedLinkedInUrl}
${context ? `Additional context: ${context}` : ""}

Research scope: ${scopeList || "all categories"}

Produce a comprehensive due diligence report with a detailed biographical briefing and risk findings based on publicly available information.`;

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
              description: "Submit the structured due diligence report with life briefing",
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
                  biography: {
                    type: "object",
                    description: "Comprehensive life briefing sections",
                    properties: {
                      earlyLife: { type: "string", description: "Early life, upbringing, family background" },
                      education: { type: "string", description: "Educational history, degrees, institutions" },
                      career: { type: "string", description: "Full career trajectory and key roles" },
                      notableAchievements: { type: "string", description: "Awards, publications, major accomplishments" },
                      personalLife: { type: "string", description: "Public interests, philanthropy, community" },
                      publicPresence: { type: "string", description: "Media, social media, public speaking" },
                    },
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
                required: ["target", "biography", "riskLevel", "confidenceScore", "riskScore", "executiveSummary", "findings", "identitySignals", "sourcesConsulted"],
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
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No structured response from AI");

    const report = JSON.parse(toolCall.function.arguments);
    const anchoredReport = enforceAnchorOnReport(report, anchor);

    return new Response(JSON.stringify(anchoredReport), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Research error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
