import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ResearchTarget {
  fullName: string;
  title: string;
  company: string;
  initials: string;
  location?: string;
  profileImageUrl?: string;
}

export interface BiographySection {
  earlyLife?: string;
  education?: string;
  career?: string;
  notableAchievements?: string;
  personalLife?: string;
  publicPresence?: string;
}

export interface FindingItem {
  title: string;
  source: string;
  reliability: "HIGH" | "MEDIUM" | "LOW";
  confidence: number;
  severity: "critical" | "high" | "moderate" | "low" | "info";
  jurisdiction?: string;
  date?: string;
  summary: string;
}

export interface FindingCategory {
  category: string;
  items: FindingItem[];
}

export interface IdentitySignal {
  label: string;
  verified: boolean;
}

export interface SourceConsulted {
  name: string;
  reliability: "HIGH" | "MEDIUM" | "LOW";
  status: string;
}

export interface ResearchReport {
  target: ResearchTarget;
  biography: BiographySection;
  riskLevel: "critical" | "high" | "moderate" | "low" | "clear";
  confidenceScore: number;
  riskScore: number;
  executiveSummary: string;
  findings: FindingCategory[];
  identitySignals: IdentitySignal[];
  sourcesConsulted: SourceConsulted[];
}

export const useResearch = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ResearchReport | null>(null);

  const runResearch = async (imageBase64: string | null, context: string, scopes: Record<string, boolean>) => {
    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("research", {
        body: { imageBase64, context, scopes },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      setReport(data as ResearchReport);
      return data as ResearchReport;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Research failed";
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  return { runResearch, loading, error, report };
};
