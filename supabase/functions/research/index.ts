import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ProfileAnchor = {
  fullName?: string;
  title?: string;
  company?: string;
  location?: string;
  initials?: string;
  profileSnapshot?: string;
  source: "screenshot" | "context";
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

const PSYCH_PROFILE_KEYS = [
  "personalityTraits",
  "motivations",
  "communicationStyle",
  "leadershipStyle",
  "riskTolerance",
  "potentialVulnerabilities",
] as const;

const toInitials = (name?: string) => {
  if (!name) return "NA";
  const parts = name.split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "NA";
};

const normalizeScore = (value: unknown) => {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return 0;
  const normalized = num <= 1 ? num * 100 : num;
  return Math.max(0, Math.min(100, Math.round(normalized)));
};

const normalizePersonName = (name?: string) =>
  (name ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

type WebMention = {
  title: string;
  snippet: string;
  url: string;
  reliability: "HIGH" | "MEDIUM" | "LOW";
};

const htmlEntityMap: Record<string, string> = {
  "&amp;": "&",
  "&quot;": '"',
  "&#39;": "'",
  "&lt;": "<",
  "&gt;": ">",
  "&nbsp;": " ",
};

const stripHtml = (value: string) => value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const decodeHtmlEntities = (value: string) =>
  value.replace(/&(amp|quot|#39|lt|gt|nbsp);/g, (entity) => htmlEntityMap[entity] ?? entity);

const unwrapDuckDuckGoRedirect = (href: string) => {
  try {
    const url = new URL(href, "https://duckduckgo.com");
    const redirect = url.searchParams.get("uddg");
    return redirect ? decodeURIComponent(redirect) : url.toString();
  } catch {
    return href;
  }
};

const scoreMentionReliability = (url: string): "HIGH" | "MEDIUM" | "LOW" => {
  const lowered = url.toLowerCase();
  if (["justice.gov", "courtlistener.com", "documentcloud.org"].some((host) => lowered.includes(host))) return "HIGH";
  if (["reuters.com", "apnews.com", "nytimes.com", "bbc.com", "wsj.com", "theguardian.com"].some((host) => lowered.includes(host))) return "MEDIUM";
  return "LOW";
};

const NAME_STOPWORDS = new Set(["dr", "mr", "mrs", "ms", "prof", "professor", "sir"]);

const tokenizeIdentity = (value: string) =>
  normalizePersonName(value)
    .split(" ")
    .filter(Boolean)
    .filter((token) => !NAME_STOPWORDS.has(token));

const nameAppearsInText = (name: string, text: string) => {
  const nameTokens = tokenizeIdentity(name);
  const textTokens = tokenizeIdentity(text);
  if (!nameTokens.length || !textTokens.length) return false;

  const shared = nameTokens.filter((token) => textTokens.includes(token));
  if (shared.length >= Math.min(2, nameTokens.length)) return true;

  const nameLast = nameTokens[nameTokens.length - 1];
  const firstInitial = nameTokens[0]?.[0];
  return Boolean(
    nameLast &&
      firstInitial &&
      textTokens.includes(nameLast) &&
      textTokens.some((token) => token[0] === firstInitial),
  );
};

type CategorySearchConfig = {
  category: string;
  searchTerms: string[];
  requiredKeywords: string[];
  severityDefault: "critical" | "high" | "moderate" | "low" | "info";
};

const CATEGORY_SEARCH_CONFIGS: CategorySearchConfig[] = [
  {
    category: "Criminal",
    searchTerms: ["criminal charges", "arrested", "convicted", "indicted", "criminal investigation"],
    requiredKeywords: ["criminal", "arrest", "charged", "convicted", "indicted", "felony", "misdemeanor", "plea"],
    severityDefault: "high",
  },
  {
    category: "Litigation",
    searchTerms: ["lawsuit", "sued", "litigation", "court case", "legal dispute"],
    requiredKeywords: ["lawsuit", "sued", "litigation", "plaintiff", "defendant", "court", "settlement", "injunction"],
    severityDefault: "moderate",
  },
  {
    category: "Fraud & Financial",
    searchTerms: ["fraud", "financial misconduct", "SEC violation", "embezzlement", "bankruptcy"],
    requiredKeywords: ["fraud", "embezzlement", "SEC", "ponzi", "bankrupt", "misconduct", "scandal", "fined"],
    severityDefault: "high",
  },
  {
    category: "Sanctions",
    searchTerms: ["sanctions", "OFAC", "watchlist", "export control violation", "sanctioned"],
    requiredKeywords: ["sanction", "OFAC", "watchlist", "blacklist", "embargo", "export control", "designated"],
    severityDefault: "critical",
  },
  {
    category: "Sex Offender",
    searchTerms: ["sex offender", "sexual assault", "sexual misconduct", "harassment allegation"],
    requiredKeywords: ["sex offend", "sexual assault", "sexual misconduct", "harassment", "molestation", "indecent"],
    severityDefault: "critical",
  },
  {
    category: "Epstein Files",
    searchTerms: ["Epstein", "Epstein Files", "Epstein flight logs", "Epstein black book"],
    requiredKeywords: ["epstein"],
    severityDefault: "moderate",
  },
];

const searchWebMentions = async (fullName: string, config: CategorySearchConfig): Promise<WebMention[]> => {
  try {
    const nameTokens = tokenizeIdentity(fullName);
    const searchIdentity = nameTokens.join(" ").trim() || fullName;

    // Build queries: use both quoted and unquoted name for broader coverage
    let queries: string[];
    if (config.category === "Epstein Files") {
      // Epstein searches need to be more aggressive — names may appear in various forms in documents
      const lastName = nameTokens[nameTokens.length - 1] || fullName;
      queries = [
        `${searchIdentity} Epstein flight logs`,
        `${searchIdentity} Epstein black book`,
        `${searchIdentity} Jeffrey Epstein`,
        `"${searchIdentity}" Epstein`,
        `${lastName} Epstein flight logs lolita express`,
        `${lastName} Epstein black book contact list`,
        `${searchIdentity} Ghislaine Maxwell`,
      ];
    } else {
      queries = [
        ...config.searchTerms.slice(0, 2).map((term) => `"${searchIdentity}" ${term}`),
        ...config.searchTerms.slice(0, 2).map((term) => `${searchIdentity} ${term}`),
      ];
    }

    const mentions: WebMention[] = [];
    const seenUrls = new Set<string>();
    const linkRegex = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;

    for (const query of queries) {
      if (mentions.length >= 5) break;

      const response = await fetch(`https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; ICE-Panda/1.0)" },
      });

      if (!response.ok) continue;
      const html = await response.text();
      let match: RegExpExecArray | null;

      while ((match = linkRegex.exec(html)) !== null) {
        const href = unwrapDuckDuckGoRedirect(match[1]);
        const title = decodeHtmlEntities(stripHtml(match[2] ?? ""));
        if (!href || !title || seenUrls.has(href)) continue;

        const nearby = html.slice(match.index, match.index + 1500);
        const snippetMatch = nearby.match(/<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>|<div[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/div>/i);
        const snippetRaw = snippetMatch?.[1] ?? snippetMatch?.[2] ?? "";
        const snippet = decodeHtmlEntities(stripHtml(snippetRaw));
        const combined = `${title} ${snippet}`;
        const normalizedCombined = normalizePersonName(combined);

        const hasRequiredKeyword = config.requiredKeywords.some((kw) => normalizedCombined.includes(kw));
        if (!hasRequiredKeyword) continue;

        // For Epstein category, be more lenient with name matching — even a last name match counts
        if (config.category === "Epstein Files") {
          const lastNameMatch = nameTokens.some((token) => token.length >= 3 && normalizedCombined.includes(token));
          if (!lastNameMatch) continue;
        } else {
          if (!nameAppearsInText(searchIdentity, combined)) continue;
        }

        mentions.push({ title, snippet, url: href, reliability: scoreMentionReliability(href) });
        seenUrls.add(href);
        if (mentions.length >= 5) break;
      }
    }

    return mentions;
  } catch (error) {
    console.warn(`${config.category} web mention scan failed:`, error);
    return [];
  }
};

// Direct Epstein document search — fetches known public sources and scans for name
const searchEpsteinDocumentsDirect = async (fullName: string): Promise<WebMention[]> => {
  const nameTokens = tokenizeIdentity(fullName);
  if (!nameTokens.length) return [];

  const mentions: WebMention[] = [];
  const seenUrls = new Set<string>();
  const linkRegex = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;

  // Specific Epstein document queries — broader and more varied
  const specificQueries = [
    `site:epsteinsblackbook.com ${nameTokens.join(" ")}`,
    `"epstein" "black book" "${nameTokens[nameTokens.length - 1]}"`,
    `"epstein" "flight log" "${nameTokens[nameTokens.length - 1]}"`,
    `"epstein" "lolita express" "${nameTokens[nameTokens.length - 1]}"`,
    `"jeffrey epstein" "${nameTokens.join(" ")}"`,
    `ghislaine maxwell "${nameTokens[nameTokens.length - 1]}" documents`,
    `epstein associates list "${nameTokens[nameTokens.length - 1]}"`,
    `epstein court documents "${nameTokens.join(" ")}"`,
  ];

  for (const query of specificQueries) {
    if (mentions.length >= 5) break;
    try {
      const response = await fetch(`https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
      });
      if (!response.ok) continue;
      const html = await response.text();
      let match: RegExpExecArray | null;

      while ((match = linkRegex.exec(html)) !== null) {
        const href = unwrapDuckDuckGoRedirect(match[1]);
        const title = decodeHtmlEntities(stripHtml(match[2] ?? ""));
        if (!href || !title || seenUrls.has(href)) continue;

        const nearby = html.slice(match.index, match.index + 1500);
        const snippetMatch = nearby.match(/<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>|<div[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/div>/i);
        const snippet = decodeHtmlEntities(stripHtml(snippetMatch?.[1] ?? snippetMatch?.[2] ?? ""));
        const combined = normalizePersonName(`${title} ${snippet}`);

        const hasNameToken = nameTokens.some((t) => t.length >= 3 && combined.includes(t));
        if (!hasNameToken) continue;

        mentions.push({ title, snippet, url: href, reliability: scoreMentionReliability(href) });
        seenUrls.add(href);
        if (mentions.length >= 5) break;
      }
    } catch (err) {
      console.warn("Epstein direct search query failed:", err);
    }
  }

  // Direct fetch from epsteinsblackbook.com
  try {
    const lastName = nameTokens[nameTokens.length - 1];
    const bbResponse = await fetch(`https://epsteinsblackbook.com/names/${encodeURIComponent(lastName)}`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    });
    if (bbResponse.ok) {
      const bbHtml = await bbResponse.text();
      const normalized = normalizePersonName(bbHtml);
      const nameMatches = nameTokens.filter((t) => t.length >= 3 && normalized.includes(t));
      if (nameMatches.length > 0 && !seenUrls.has(bbResponse.url)) {
        const titleMatch = bbHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        const pageTitle = titleMatch ? stripHtml(titleMatch[1]) : "Epstein Black Book Entry";
        mentions.push({
          title: `Black Book: ${pageTitle}`,
          snippet: `Name match found on epsteinsblackbook.com for tokens: ${nameMatches.join(", ")}. Direct document source.`,
          url: bbResponse.url,
          reliability: "HIGH",
        });
      }
    }
  } catch (err) {
    console.warn("Epstein black book direct fetch failed:", err);
  }

  return mentions;
};

const addWebFallbackFindings = async (report: any, fullName?: string) => {
  if (!fullName) return report;

  const findings = Array.isArray(report.findings) ? report.findings : [];
  const sources = Array.isArray(report.sourcesConsulted) ? report.sourcesConsulted : [];
  const identitySignals = Array.isArray(report.identitySignals) ? report.identitySignals : [];
  let anyMentionsFound = false;
  const categoriesWithMentions: string[] = [];

  for (const config of CATEGORY_SEARCH_CONFIGS) {
    const existingCategory = findings.find((item: any) => item?.category === config.category);
    const existingItems = Array.isArray(existingCategory?.items) ? existingCategory.items : [];
    // Always run web search to enhance findings, not just as fallback
    const existingUrls = new Set(existingItems.map((item: any) => item.source).filter(Boolean));

    const webMentions = await searchWebMentions(fullName, config);

    sources.push({
      name: `Open Web ${config.category} Scan`,
      reliability: webMentions.length > 0 ? "MEDIUM" : "LOW",
      status: webMentions.length > 0
        ? `Potential ${config.category.toLowerCase()} match(es) found for ${fullName}`
        : `No additional ${config.category.toLowerCase()} web matches for ${fullName}`,
    });

    if (!webMentions.length) continue;

    // Filter out duplicates that already exist
    const newMentions = webMentions.filter((m) => !existingUrls.has(m.url));
    if (!newMentions.length) continue;

    anyMentionsFound = true;
    categoriesWithMentions.push(config.category);

    const mappedItems = newMentions.slice(0, 3).map((mention) => ({
      title: `Web: ${mention.title}`,
      source: mention.url,
      reliability: mention.reliability,
      confidence: mention.reliability === "HIGH" ? 70 : mention.reliability === "MEDIUM" ? 55 : 40,
      severity: config.severityDefault,
      summary: mention.snippet
        ? `Open web scan found a possible ${config.category.toLowerCase()} mention for ${fullName}. Snippet: ${mention.snippet}. ⚠️ Note: Web search may return results for different people with a similar name — manual verification required.`
        : `Open web scan found a possible ${config.category.toLowerCase()} mention for ${fullName}. ⚠️ Note: Web search may return results for different people with a similar name — manual verification required.`,
    }));

    if (existingCategory) {
      existingCategory.items = [...existingItems, ...mappedItems];
    } else {
      findings.push({ category: config.category, items: mappedItems });
    }
  }

  // DEDICATED Epstein document deep search — runs in addition to the generic web search above
  {
    const epsteinCategory = findings.find((f: any) => f?.category === "Epstein Files");
    const epsteinItems = Array.isArray(epsteinCategory?.items) ? epsteinCategory.items : [];
    const epsteinUrls = new Set(epsteinItems.map((item: any) => item.source).filter(Boolean));

    const directEpsteinMentions = await searchEpsteinDocumentsDirect(fullName);
    const newDirectMentions = directEpsteinMentions.filter((m) => !epsteinUrls.has(m.url));

    if (newDirectMentions.length > 0) {
      anyMentionsFound = true;
      if (!categoriesWithMentions.includes("Epstein Files")) categoriesWithMentions.push("Epstein Files");

      const mappedDirect = newDirectMentions.slice(0, 5).map((mention) => ({
        title: `Document Search: ${mention.title}`,
        source: mention.url,
        reliability: mention.reliability,
        confidence: mention.reliability === "HIGH" ? 75 : mention.reliability === "MEDIUM" ? 60 : 45,
        severity: "moderate" as const,
        summary: mention.snippet
          ? `Direct Epstein document search found a match for ${fullName}. ${mention.snippet}. ⚠️ Note: Web search may return results for different people with a similar name — manual verification required.`
          : `Direct Epstein document search found a potential reference to ${fullName}. ⚠️ Note: Web search may return results for different people with a similar name — manual verification required.`,
      }));

      if (epsteinCategory) {
        epsteinCategory.items = [...epsteinItems, ...mappedDirect];
      } else {
        findings.push({ category: "Epstein Files", items: mappedDirect });
      }

      sources.push({
        name: "Epstein Document Direct Search",
        reliability: "MEDIUM",
        status: `${newDirectMentions.length} potential match(es) found in Epstein documents for ${fullName}`,
      });
    } else {
      sources.push({
        name: "Epstein Document Direct Search",
        reliability: "LOW",
        status: `No direct Epstein document matches found for ${fullName}`,
      });
    }
  }
  report.sourcesConsulted = sources;

  if (anyMentionsFound) {
    identitySignals.unshift({
      label: `Potential web mentions detected in: ${categoriesWithMentions.join(", ")}; manual verification recommended`,
      verified: false,
    });
    report.identitySignals = identitySignals;

    report.riskScore = Math.max(normalizeScore(report.riskScore), 40);
    if (report.riskLevel === "clear" || report.riskLevel === "low") {
      report.riskLevel = "moderate";
    }

    const currentSummary = typeof report.executiveSummary === "string" ? report.executiveSummary : "";
    report.executiveSummary = `${currentSummary} Open web scanning found potential adverse mentions in ${categoriesWithMentions.join(", ")} that were included for manual validation.`.trim();
  }

  return report;
};

const isIdentityAligned = (anchor: ProfileAnchor, reportedName?: string) => {
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

const applyIdentityMismatchSafeguards = (report: any, anchor: ProfileAnchor) => {
  report.biography = report.biography ?? {};
  for (const key of BIOGRAPHY_KEYS) {
    report.biography[key] = "No public information available.";
  }
  report.confidenceScore = Math.min(normalizeScore(report.confidenceScore), 35);
  report.executiveSummary = `Identity mismatch warning: external evidence could not be confidently matched to ${anchor.fullName ?? "the target"}. Biography has been intentionally constrained.`;
  const identitySignals = Array.isArray(report.identitySignals) ? report.identitySignals : [];
  identitySignals.unshift({ label: "Identity safeguard applied: non-matching subject details were suppressed", verified: false });
  report.identitySignals = identitySignals;
  return report;
};

// Extract profile info from a LinkedIn screenshot using vision AI
const extractProfileFromScreenshot = async (imageBase64: string, LOVABLE_API_KEY: string): Promise<ProfileAnchor> => {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `You are a data extraction assistant. Extract the following from this LinkedIn profile screenshot:
- fullName: the person's full name
- title: their job title/headline
- company: their current company
- location: their location
- profileSummary: a comprehensive text summary of EVERYTHING visible on the profile (experience, education, skills, about section, posts, etc.)

Return ONLY a JSON object with these fields. If a field is not visible, use null.`,
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract all profile information from this LinkedIn screenshot." },
            { type: "image_url", image_url: { url: `data:image/png;base64,${imageBase64}` } },
          ],
        },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    console.error("Vision extraction failed:", response.status);
    throw new Error("Failed to extract profile from screenshot");
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;
  if (!content) throw new Error("No extraction result from vision model");

  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    // Try to find JSON in the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    else throw new Error("Could not parse vision extraction result");
  }

  return {
    fullName: parsed.fullName || undefined,
    title: parsed.title || undefined,
    company: parsed.company || undefined,
    location: parsed.location || undefined,
    initials: toInitials(parsed.fullName),
    profileSnapshot: parsed.profileSummary || undefined,
    source: "screenshot",
  };
};

const enforceAnchorOnReport = (report: any, anchor: ProfileAnchor) => {
  report.target = report.target ?? {};
  if (anchor.fullName) report.target.fullName = anchor.fullName;
  if (anchor.initials) report.target.initials = anchor.initials;
  if (anchor.title) report.target.title = anchor.title;
  if (anchor.company) report.target.company = anchor.company;
  if (anchor.location) report.target.location = anchor.location;
  if (!report.target.title) report.target.title = "Unknown";
  if (!report.target.company) report.target.company = "Unspecified";
  if (!report.target.location) report.target.location = "Unknown";

  report.confidenceScore = normalizeScore(report.confidenceScore);
  report.riskScore = normalizeScore(report.riskScore);
  report.biography = report.biography ?? {};

  const identitySignals = Array.isArray(report.identitySignals) ? report.identitySignals : [];
  identitySignals.unshift({
    label: anchor.source === "screenshot"
      ? "LinkedIn profile extracted from uploaded screenshot"
      : "Context-only investigation — no LinkedIn profile",
    verified: anchor.source === "screenshot",
  });
  report.identitySignals = identitySignals;

  const sources = Array.isArray(report.sourcesConsulted) ? report.sourcesConsulted : [];
  sources.unshift({
    name: anchor.source === "screenshot" ? "LinkedIn Profile Screenshot" : "Web Research (Context-Based)",
    reliability: anchor.source === "screenshot" ? "HIGH" : "MEDIUM",
    status: anchor.source === "screenshot" ? "Extracted via vision AI" : "No LinkedIn profile available",
  });
  report.sourcesConsulted = sources;

  const existingFindings = Array.isArray(report.findings) ? report.findings : [];
  const byCategory = new Map(existingFindings.map((f: any) => [f.category, f]));
  report.findings = REQUIRED_CATEGORIES.map((category) => {
    const current = byCategory.get(category) as { items?: unknown[] } | undefined;
    return { category, items: Array.isArray(current?.items) ? current.items : [] };
  });

  return report;
};

const buildSystemPrompt = (anchor: ProfileAnchor, strictIdentity = false) => `You are I.C.E. Panda, an expert due diligence and intelligence research AI.

CRITICAL IDENTITY RULES — FOLLOW EXACTLY:
1) The target is ONLY the person described below.
2) Their identity from the LinkedIn profile:
   - fullName: ${anchor.fullName ?? "unknown"}
   - title: ${anchor.title ?? "unknown"}
   - company: ${anchor.company ?? "unknown"}
   - location: ${anchor.location ?? "unknown"}
3) There may be MANY people with this same name. You MUST write about THIS specific person only.
4) Do NOT confuse them with any other person who shares the same name.
5) If you cannot confirm a fact belongs to THIS specific person, write "No public information available."
6) The profile snapshot below is your PRIMARY and most trusted source.
${strictIdentity ? "7) STRICT MODE: A prior attempt returned wrong-person data. If ANY doubt exists, write 'No public information available.'" : ""}

LINKEDIN PROFILE SNAPSHOT (YOUR PRIMARY SOURCE):
${anchor.profileSnapshot || "No profile snapshot available."}

BIOGRAPHY INSTRUCTIONS:
Write the biography ONLY about the person described above. For each section:
- Base your content primarily on what can be inferred from the profile snapshot
- Only supplement with external information if you are highly confident it refers to THIS exact person
- If the snapshot doesn't mention information for a section, write "No public information available."

Sections:
- earlyLife: Where they grew up, family background if public
- education: Schools, universities, degrees
- career: Career trajectory and key roles
- notableAchievements: Awards, publications, major accomplishments
- personalLife: Public interests, philanthropy
- publicPresence: Media, speaking, social media

PSYCHOLOGICAL PROFILE INSTRUCTIONS:
Build a psychological profile based on observable behaviors, public statements, career choices, communication patterns, and any available interviews or media appearances. This is an ANALYTICAL ASSESSMENT, not a clinical diagnosis. Base it on evidence from the profile and public information.

Sections:
- personalityTraits: Observable personality characteristics (e.g., analytical, charismatic, detail-oriented, risk-taking). Cite behavioral evidence.
- motivations: What appears to drive this person professionally and personally. Infer from career moves, public statements, philanthropic choices.
- communicationStyle: How they communicate publicly — formal vs casual, data-driven vs narrative, confrontational vs diplomatic. Base on public appearances, writing, social media.
- leadershipStyle: Their approach to leadership and management based on career trajectory, team dynamics, organizational choices.
- riskTolerance: Assessment of their appetite for risk based on career moves, business decisions, investments, public positions taken.
- potentialVulnerabilities: Psychological or behavioral patterns that could represent risks — ego-driven decisions, conflict avoidance, overconfidence, susceptibility to flattery, etc. Be candid but evidence-based.

If insufficient information exists for a section, write "Insufficient public data for assessment."

DUE DILIGENCE INSTRUCTIONS:
You MUST actively search for and report ANY negative, adverse, or controversial information about this person. This includes but is not limited to:
- Criminal charges, arrests, convictions, or investigations
- Lawsuits (plaintiff or defendant), regulatory actions, or legal disputes
- Fraud allegations, financial misconduct, bankruptcy filings
- Sanctions, watchlist appearances, export control violations
- Sexual misconduct allegations or registry appearances
- Connections to controversial individuals or organizations (including Epstein files)
- Negative press coverage, public controversies, scandals
- Workplace complaints, discrimination suits, whistleblower reports
- Regulatory fines, compliance violations, enforcement actions
- Questionable business practices, failed ventures with investor losses
- Social media controversies, inflammatory public statements

EPSTEIN FILES — CRITICAL INSTRUCTION:
You MUST specifically check whether this person's name appears in the Jeffrey Epstein flight logs, court documents, black book, or any related unsealed files. The Epstein files include:
- Flight logs of Jeffrey Epstein's private aircraft (the "Lolita Express")
- Ghislaine Maxwell trial exhibits and unsealed court documents
- Jeffrey Epstein's black book / contact list
- Civil lawsuit depositions mentioning associates
- Any media reports linking this person to Epstein, Maxwell, or their network
If the person's name (or a plausible variation) appears in ANY of these documents, you MUST report it as a finding under the "Epstein Files" category with the specific document source and context. Do NOT omit Epstein connections out of caution — this is a due diligence report and the user needs complete information. If their name genuinely does not appear, return an empty items array for that category.

Do NOT shy away from reporting negative findings. The purpose of this report is risk assessment — omitting adverse information defeats the purpose. If genuinely no adverse findings exist for a category, return an empty items array, but err on the side of including borderline findings with appropriate confidence scores rather than omitting them.

Return ONLY structured report JSON via tool call.`;

const buildUserPrompt = (context: string, scopeList: string) => `Investigate this person and create a comprehensive life briefing report.
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
                  properties: {
                    earlyLife: { type: "string" },
                    education: { type: "string" },
                    career: { type: "string" },
                    notableAchievements: { type: "string" },
                    personalLife: { type: "string" },
                    publicPresence: { type: "string" },
                  },
                },
                psychProfile: {
                  type: "object",
                  properties: {
                    personalityTraits: { type: "string" },
                    motivations: { type: "string" },
                    communicationStyle: { type: "string" },
                    leadershipStyle: { type: "string" },
                    riskTolerance: { type: "string" },
                    potentialVulnerabilities: { type: "string" },
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
              required: ["target", "biography", "psychProfile", "riskLevel", "confidenceScore", "riskScore", "executiveSummary", "findings", "identitySignals", "sourcesConsulted"],
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "submit_report" } },
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error("RATE_LIMITED");
    if (response.status === 402) throw new Error("AI_CREDITS_EXHAUSTED");
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
    const { imageBase64, context, scopes } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const scopeList = Object.entries(scopes || {}).filter(([_, v]) => v).map(([k]) => k).join(", ");
    const hasImage = !!imageBase64;

    let anchor: ProfileAnchor;

    if (hasImage) {
      // Extract profile from screenshot using vision AI
      anchor = await extractProfileFromScreenshot(imageBase64, LOVABLE_API_KEY);
    } else {
      // Context-only
      if (!context || context.trim().length < 5) {
        throw new Error("Please provide either a LinkedIn screenshot or a detailed description of the person to investigate.");
      }
      anchor = {
        fullName: undefined,
        source: "context",
      };
    }

    const systemPrompt = buildSystemPrompt(anchor, false);
    const userPrompt = buildUserPrompt(context || "", scopeList);

    let report = await requestStructuredReport({ LOVABLE_API_KEY, systemPrompt, userPrompt });

    let identityAligned = isIdentityAligned(anchor, report?.target?.fullName);
    if (hasImage && !identityAligned) {
      console.warn("Identity mismatch detected, retrying with stricter prompt");
      report = await requestStructuredReport({
        LOVABLE_API_KEY,
        systemPrompt: buildSystemPrompt(anchor, true),
        userPrompt,
      });
      identityAligned = isIdentityAligned(anchor, report?.target?.fullName);
    }

    // For context-only, set initials from the AI response
    if (!hasImage) {
      report.target = report.target ?? {};
      report.target.initials = toInitials(report.target.fullName);
    }

    const anchoredReport = enforceAnchorOnReport(report, anchor);
    const enrichedReport = await addWebFallbackFindings(
      anchoredReport,
      anchor.fullName ?? anchoredReport?.target?.fullName,
    );

    if (hasImage && !identityAligned) {
      return new Response(JSON.stringify(applyIdentityMismatchSafeguards(enrichedReport, anchor)), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(enrichedReport), {
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
