import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const fetchGitHubData = async (owner: string, repo: string) => {
  const headers: Record<string, string> = { "Accept": "application/vnd.github.v3+json", "User-Agent": "ICE-Panda" };

  const [repoRes, commitsRes, contributorsRes, branchesRes] = await Promise.all([
    fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers }),
    fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=100`, { headers }),
    fetch(`https://api.github.com/repos/${owner}/${repo}/contributors?per_page=50`, { headers }),
    fetch(`https://api.github.com/repos/${owner}/${repo}/branches?per_page=50`, { headers }),
  ]);

  if (!repoRes.ok) {
    const err = await repoRes.text();
    throw new Error(`Repository not found or inaccessible: ${err}`);
  }

  const repoData = await repoRes.json();
  const commits = commitsRes.ok ? await commitsRes.json() : [];
  const contributors = contributorsRes.ok ? await contributorsRes.json() : [];
  const branches = branchesRes.ok ? await branchesRes.json() : [];

  // Analyze commit timing patterns
  const commitTimestamps = (Array.isArray(commits) ? commits : []).map((c: any) => ({
    date: c.commit?.author?.date,
    message: c.commit?.message?.substring(0, 120),
    author: c.commit?.author?.name,
    additions: c.stats?.additions,
    deletions: c.stats?.deletions,
  }));

  // Calculate time gaps between commits
  const sortedDates = commitTimestamps
    .map((c: any) => new Date(c.date).getTime())
    .filter((t: number) => !isNaN(t))
    .sort((a: number, b: number) => a - b);

  const gaps = sortedDates.slice(1).map((t: number, i: number) => ({
    gapMinutes: Math.round((t - sortedDates[i]) / 60000),
  }));

  const avgGapMinutes = gaps.length > 0
    ? Math.round(gaps.reduce((s: number, g: any) => s + g.gapMinutes, 0) / gaps.length)
    : 0;

  // Time span
  const firstCommit = sortedDates.length > 0 ? new Date(sortedDates[0]).toISOString() : null;
  const lastCommit = sortedDates.length > 0 ? new Date(sortedDates[sortedDates.length - 1]).toISOString() : null;
  const totalSpanHours = sortedDates.length > 1
    ? Math.round((sortedDates[sortedDates.length - 1] - sortedDates[0]) / 3600000)
    : 0;

  // Hour-of-day distribution
  const hourBuckets: Record<number, number> = {};
  const uniqueDays = new Set<string>();
  sortedDates.forEach((t: number) => {
    const d = new Date(t);
    const h = d.getUTCHours();
    hourBuckets[h] = (hourBuckets[h] || 0) + 1;
    uniqueDays.add(d.toISOString().slice(0, 10));
  });

  const uniqueDayCount = uniqueDays.size;
  const allSameDay = uniqueDayCount <= 1 && sortedDates.length > 1;

  return {
    repo: {
      name: repoData.full_name,
      description: repoData.description,
      language: repoData.language,
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      createdAt: repoData.created_at,
      updatedAt: repoData.updated_at,
      size: repoData.size,
      defaultBranch: repoData.default_branch,
    },
    commits: {
      total: commitTimestamps.length,
      samples: commitTimestamps.slice(0, 30),
      firstCommit,
      lastCommit,
      totalSpanHours,
      avgGapMinutes,
      hourDistribution: hourBuckets,
      gaps: gaps.slice(0, 20),
      uniqueDayCount,
      allCommitsSameDay: allSameDay,
      uniqueDays: [...uniqueDays].sort(),
    },
    contributors: (Array.isArray(contributors) ? contributors : []).map((c: any) => ({
      login: c.login,
      contributions: c.contributions,
    })),
    branches: (Array.isArray(branches) ? branches : []).map((b: any) => b.name),
  };
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { repoUrl } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!repoUrl || typeof repoUrl !== "string") {
      throw new Error("Please provide a GitHub repository URL.");
    }

    // Parse owner/repo from URL
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/\?\#]+)/);
    if (!match) throw new Error("Invalid GitHub URL. Expected format: https://github.com/owner/repo");

    const [, owner, repo] = match;
    console.log(`Analyzing repo: ${owner}/${repo}`);

    const githubData = await fetchGitHubData(owner, repo.replace(/\.git$/, ""));

    const systemPrompt = `You are I.C.E. Panda's GitHub Integrity Analyzer. You assess whether a GitHub repository's commit history suggests authentic, organic development or shows signs of artificial/staged activity (common in hackathon fraud, fake portfolios, or misrepresented work).

ANALYSIS CRITERIA:
1. **Commit Timing Patterns**: Are commits evenly spaced (suspicious) or naturally irregular? Were they all made in a very short burst?
2. **Commit Messages**: Are they meaningful or generic/auto-generated? Do they follow a natural progression?
3. **Contributor Patterns**: Single author or team? Does contribution distribution look natural?
4. **Development Flow**: Does the commit history show iterative development (builds, fixes, refactors) or was code dumped in large chunks?
5. **Red Flags**: Force pushes, squashed history hiding prior work, weekend-only commits during "work" claims, timezone inconsistencies, suspiciously perfect commit cadence.
6. **Positive Signals**: Bug fixes after features, README updates, incremental progress, review-style improvements.

Be direct and analytical. If the repo looks suspicious, say so clearly with evidence.`;

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
          { role: "user", content: `Analyze this GitHub repository for authenticity:\n\n${JSON.stringify(githubData, null, 2)}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "submit_integrity_report",
            description: "Submit the GitHub integrity analysis report",
            parameters: {
              type: "object",
              properties: {
                repoName: { type: "string" },
                repoDescription: { type: "string" },
                authenticityScore: { type: "number", description: "0-100, where 100 is fully authentic" },
                verdict: { type: "string", enum: ["authentic", "likely_authentic", "inconclusive", "suspicious", "likely_fabricated"] },
                executiveSummary: { type: "string" },
                commitAnalysis: {
                  type: "object",
                  properties: {
                    totalCommits: { type: "number" },
                    timeSpan: { type: "string" },
                    avgGapMinutes: { type: "number" },
                    pattern: { type: "string", description: "Description of the commit timing pattern" },
                    messageQuality: { type: "string", enum: ["high", "medium", "low"] },
                    messageAnalysis: { type: "string" },
                  },
                },
                contributorAnalysis: {
                  type: "object",
                  properties: {
                    totalContributors: { type: "number" },
                    distribution: { type: "string" },
                    assessment: { type: "string" },
                  },
                },
                redFlags: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      flag: { type: "string" },
                      severity: { type: "string", enum: ["critical", "high", "moderate", "low"] },
                      evidence: { type: "string" },
                    },
                    required: ["flag", "severity", "evidence"],
                  },
                },
                positiveSignals: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      signal: { type: "string" },
                      evidence: { type: "string" },
                    },
                    required: ["signal", "evidence"],
                  },
                },
                developmentFlow: { type: "string", description: "Assessment of the overall development progression" },
              },
              required: ["repoName", "authenticityScore", "verdict", "executiveSummary", "commitAnalysis", "contributorAnalysis", "redFlags", "positiveSignals", "developmentFlow"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "submit_integrity_report" } },
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

    const report = JSON.parse(toolCall.function.arguments);
    report.repoUrl = repoUrl;
    report.analyzedAt = new Date().toISOString();
    report.rawStats = {
      stars: githubData.repo.stars,
      forks: githubData.repo.forks,
      language: githubData.repo.language,
      size: githubData.repo.size,
      branches: githubData.branches.length,
      createdAt: githubData.repo.createdAt,
    };

    return new Response(JSON.stringify(report), {
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
    console.error("GitHub integrity error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
