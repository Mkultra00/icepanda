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
  profileSnapshot?: string;
};

const REQUIRED_CATEGORIES = [
  "Criminal",
  "Litigation",
  "Fraud & Financial",
  "Sanctions",
  "Sex Offender",
  "Epstein Files",
] as const;

const BIOGRAPHY_KEYS = [
  "earlyLife",
  "education",
  "career",
  "notableAchievements",
  "personalLife",
  "publicPresence",
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

const looksLikePersonName = (value?: string) => {
  if (!value) return false;
  const cleaned = value.trim();
  if (!cleaned || cleaned.length < 3 || cleaned.length > 60) return false;
  if (/\d/.test(cleaned) || /[:|@]/.test(cleaned)) return false;

  const disallowed = ["linkedin", "future", "profile", "search", "people", "contact", "info", "jobs"];
  const lower = cleaned.toLowerCase();
  if (disallowed.some((word) => lower.includes(word))) return false;

  const tokens = cleaned.split(/\s+/).filter(Boolean);
  if (tokens.length < 2 || tokens.length > 5) return false;

  const alphaTokens = tokens.filter((t) => /^[a-zA-Z'’.-]+$/.test(t));
  if (alphaTokens.length < 2) return false;

  const capitalizedTokens = tokens.filter((t) => /^[A-Z][a-zA-Z'’.-]+$/.test(t));
  return capitalizedTokens.length >= 2;
};

const createProfileSnapshot = (markdown: string) => {
  const cleaned = markdown
    .split("\n")
    .filter((line) => {
      const lower = line.toLowerCase();
      return (
        !line.startsWith("![") &&
        !lower.startsWith("title:") &&
        !lower.startsWith("source url:") &&
        !lower.startsWith("markdown content:")
      );
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return cleaned.slice(0, 5000);
};

const normalizePersonName = (name?: string) =>
  (name ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const isIdentityAligned = (anchor: LinkedInAnchor, reportedName?: string) => {
  if (!anchor.fullName || !reportedName) return true;

  const anchorTokens = normalizePersonName(anchor.fullName).split(" ").filter(Boolean);
  const reportedTokens = normalizePersonName(reportedName).split(" ").filter(Boolean);
  if (!anchorTokens.length || !reportedTokens.length) return true;

  const sharedTokens = anchorTokens.filter((token) => reportedTokens.includes(token));
  const anchorLast = anchorTokens[anchorTokens.length - 1];
  const reportedLast = reportedTokens[reportedTokens.length - 1];
  const firstInitialMatch = anchorTokens[0]?.[0] === reportedTokens[0]?.[0];

  return sharedTokens.length >= 2 || (Boolean(anchorLast) && anchorLast === reportedLast && firstInitialMatch);
};

const applyIdentityMismatchSafeguards = (report: any, anchor: LinkedInAnchor) => {
  report.biography = report.biography ?? {};
  for (const key of BIOGRAPHY_KEYS) {
    report.biography[key] = "No public information available.";
  }

  report.confidenceScore = Math.min(normalizeScore(report.confidenceScore), 35);
  report.executiveSummary = `Identity mismatch warning: external evidence could not be confidently matched to ${anchor.fullName ?? "the LinkedIn target"}. Biography has been intentionally constrained.`;

  const identitySignals = Array.isArray(report.identitySignals) ? report.identitySignals : [];
  identitySignals.unshift({
    label: "Identity safeguard applied: non-matching subject details were suppressed",
    verified: false,
  });
  report.identitySignals = identitySignals;

  return report;
};

// Portrait search removed — web image search returns wrong-person photos.
// Only LinkedIn profile images (from Jina scrape) are trustworthy.

const fetchLinkedInAnchor = async (normalizedUrl: string): Promise<LinkedInAnchor> => {
  const anchor: LinkedInAnchor = { normalizedUrl };
  try {
    const noProtocol = normalizedUrl.replace(/^https?:\/\//i, "");
    const jinaUrl = `https://r.jina.ai/http://${noProtocol}`;
    const response = await fetch(jinaUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
    const markdown = await response.text();
    anchor.profileSnapshot = createProfileSnapshot(markdown);

    const titleLineMatch = markdown.match(/^Title:\s*(.+)$/m);
    const titleLine = titleLineMatch?.[1]?.trim();
    if (titleLine) {
      const cleaned = titleLine.replace(/\s*\|\s*LinkedIn\s*$/i, "").trim();
      const segments = cleaned.split(" - ").map((segment) => segment.trim()).filter(Boolean);
      const possibleName = segments.find((segment) => looksLikePersonName(segment));
      if (possibleName) {
        anchor.fullName = possibleName;
        const titleSegments = segments.filter((segment) => segment !== possibleName);
        if (titleSegments.length > 0) anchor.title = titleSegments.join(" - ").trim();
      }
    }

    const h1Matches = [...markdown.matchAll(/^#\s+(.+)$/gm)].map((m) => m[1].trim());
    const firstPlainNameHeading = h1Matches.find((h) => looksLikePersonName(h));
    if (firstPlainNameHeading) anchor.fullName = firstPlainNameHeading;

    const locationMatch = markdown.match(/^###\s+(.+?)\s+Contact Info\s*$/m);
    if (locationMatch?.[1]) anchor.location = locationMatch[1].trim();

    const companyMatch = markdown.match(/introduce you to \d+ people at ([^\n]+)/i);
    if (companyMatch?.[1]) anchor.company = companyMatch[1].trim();

    // Extract profile photo (not banner/background)
    const allImgMatches = [...markdown.matchAll(/!\[.*?\]\((https:\/\/media\.licdn\.com\/[^\s)]+)\)/g)];
    const profilePhotoMatch = allImgMatches.find(m => m[1].includes("profile-displayphoto"));
    if (profilePhotoMatch?.[1]) {
      anchor.profileImageUrl = profilePhotoMatch[1];
    } else {
      const smallImgMatch = allImgMatches.find(m => !m[1].includes("background") && !m[1].includes("banner"));
      if (smallImgMatch?.[1]) anchor.profileImageUrl = smallImgMatch[1];
    }
    if (!anchor.profileImageUrl) {
      const imgLineMatch = markdown.match(/^Image:\s*(https:\/\/[^\s]+)/m);
      if (imgLineMatch?.[1] && !imgLineMatch[1].includes("background")) {
        anchor.profileImageUrl = imgLineMatch[1];
      }
    }

    if (!anchor.fullName) anchor.fullName = slugToNameFallback(normalizedUrl);
    if (!anchor.initials) anchor.initials = toInitials(anchor.fullName);

    // If no profile image found from LinkedIn, search the web for their portrait
    if (!anchor.profileImageUrl && anchor.fullName) {
      console.log("No LinkedIn profile image found, searching web for portrait of:", anchor.fullName);
      const portraitUrl = await searchForPortrait(anchor.fullName + (anchor.company ? ` ${anchor.company}` : ""));
      if (portraitUrl) {
        anchor.profileImageUrl = portraitUrl;
        console.log("Found portrait via web search:", portraitUrl);
      }
    }
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
    const current = byCategory.get(category) as { items?: unknown[] } | undefined;
    return { category, items: Array.isArray(current?.items) ? current.items : [] };
  });

  return report;
};

const buildSystemPrompt = (anchor: LinkedInAnchor, strictIdentity = false) => `You are I.C.E. Panda, an expert due diligence and intelligence research AI.

CRITICAL IDENTITY RULES — FOLLOW EXACTLY:
1) The target is ONLY the person at this LinkedIn URL: ${anchor.normalizedUrl}
2) Their verified identity from LinkedIn:
   - fullName: ${anchor.fullName ?? "unknown"}
   - title: ${anchor.title ?? "unknown"}
   - company: ${anchor.company ?? "unknown"}
   - location: ${anchor.location ?? "unknown"}
3) There may be MANY people with this same name. You MUST write about THIS specific person only.
4) Do NOT confuse them with any other person who shares the same name — no matter how famous that other person is.
5) If you cannot confirm a fact belongs to THIS specific person (matching their title, company, location, or LinkedIn profile), write "No public information available." for that section.
6) The LinkedIn snapshot below is your PRIMARY and most trusted source. Base the biography primarily on what is stated or implied in the snapshot.
${strictIdentity ? "7) STRICT MODE: A prior attempt returned wrong-person data. If ANY doubt exists about whether information matches THIS person, write 'No public information available.' Do NOT guess." : ""}

LINKEDIN PROFILE SNAPSHOT (YOUR PRIMARY SOURCE — trust this above all else):
${anchor.profileSnapshot || "No profile snapshot available."}

BIOGRAPHY INSTRUCTIONS:
Write the biography ONLY about the person described in the LinkedIn snapshot above. For each section:
- Base your content primarily on what can be inferred from the LinkedIn profile snapshot
- Only supplement with external information if you are highly confident it refers to THIS exact person (same name + same company + same role)
- If the LinkedIn snapshot doesn't mention information for a section, write "No public information available."
- Do NOT fill in sections with information about a different person who has the same name

Sections:
- earlyLife: Where they grew up, family background if public
- education: Schools, universities, degrees — ONLY if mentioned or implied in the LinkedIn profile
- career: Career trajectory as described in LinkedIn experience section
- notableAchievements: Awards, publications — ONLY if clearly attributable to THIS person
- personalLife: Public interests, philanthropy — ONLY if evident from their LinkedIn profile
- publicPresence: Media, speaking — ONLY if evident from their LinkedIn profile

DUE DILIGENCE INSTRUCTIONS:
Produce risk findings across all categories. Be factual. If no adverse findings exist for THIS specific person, return empty items arrays. Do NOT attribute findings from a different same-name person.

Return ONLY structured report JSON via tool call.`;

const buildUserPrompt = (normalizedLinkedInUrl: string, context: string, scopeList: string) => `Investigate this person and create a comprehensive life briefing report:
LinkedIn URL: ${normalizedLinkedInUrl}
${context ? `Additional context: ${context}` : ""}

Research scope: ${scopeList || "all categories"}

Produce a comprehensive due diligence report with a detailed biographical briefing and risk findings based on publicly available information.`;

const requestStructuredReport = async ({
  LOVABLE_API_KEY,
  systemPrompt,
  userPrompt,
}: {
  LOVABLE_API_KEY: string;
  systemPrompt: string;
  userPrompt: string;
}) => {
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
      throw new Error("RATE_LIMITED");
    }
    if (response.status === 402) {
      throw new Error("AI_CREDITS_EXHAUSTED");
    }
    const errText = await response.text();
    console.error("AI gateway error:", response.status, errText);
    throw new Error(`AI gateway error: ${response.status}`);
  }

  const aiResponse = await response.json();
  const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("No structured response from AI");

  return JSON.parse(toolCall.function.arguments);
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
    const userPrompt = buildUserPrompt(normalizedLinkedInUrl, context, scopeList);

    let report = await requestStructuredReport({
      LOVABLE_API_KEY,
      systemPrompt: buildSystemPrompt(anchor, false),
      userPrompt,
    });

    let identityAligned = isIdentityAligned(anchor, report?.target?.fullName);
    if (!identityAligned) {
      console.warn("Identity mismatch detected, retrying with stricter prompt", {
        anchorName: anchor.fullName,
        modelName: report?.target?.fullName,
      });

      report = await requestStructuredReport({
        LOVABLE_API_KEY,
        systemPrompt: buildSystemPrompt(anchor, true),
        userPrompt,
      });
      identityAligned = isIdentityAligned(anchor, report?.target?.fullName);
    }

    let anchoredReport = enforceAnchorOnReport(report, anchor);
    if (!identityAligned) {
      anchoredReport = applyIdentityMismatchSafeguards(anchoredReport, anchor);
    }

    return new Response(JSON.stringify(anchoredReport), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    if (e instanceof Error && e.message === "RATE_LIMITED") {
      return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (e instanceof Error && e.message === "AI_CREDITS_EXHAUSTED") {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.error("Research error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
