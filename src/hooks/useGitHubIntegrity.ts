import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface GitHubRedFlag {
  flag: string;
  severity: "critical" | "high" | "moderate" | "low";
  evidence: string;
}

export interface GitHubPositiveSignal {
  signal: string;
  evidence: string;
}

export interface GitHubIntegrityReport {
  repoName: string;
  repoDescription?: string;
  repoUrl: string;
  authenticityScore: number;
  verdict: "authentic" | "likely_authentic" | "inconclusive" | "suspicious" | "likely_fabricated";
  executiveSummary: string;
  commitAnalysis: {
    totalCommits: number;
    timeSpan: string;
    avgGapMinutes: number;
    pattern: string;
    messageQuality: "high" | "medium" | "low";
    messageAnalysis: string;
  };
  contributorAnalysis: {
    totalContributors: number;
    distribution: string;
    assessment: string;
  };
  redFlags: GitHubRedFlag[];
  positiveSignals: GitHubPositiveSignal[];
  developmentFlow: string;
  analyzedAt: string;
  rawStats: {
    stars: number;
    forks: number;
    language: string;
    size: number;
    branches: number;
    createdAt: string;
  };
}

export const useGitHubIntegrity = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<GitHubIntegrityReport | null>(null);

  const analyzeRepo = async (repoUrl: string) => {
    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("github-integrity", {
        body: { repoUrl },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      setReport(data as GitHubIntegrityReport);
      return data as GitHubIntegrityReport;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Analysis failed";
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  return { analyzeRepo, loading, error, report };
};
