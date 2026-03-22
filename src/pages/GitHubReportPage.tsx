import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { TopNav } from "../components/TopNav";
import { ScanOverlay } from "../components/ScanOverlay";
import {
  Github, AlertTriangle, CheckCircle2, ShieldAlert, ChevronDown, ChevronRight,
  GitCommit, Users, Clock, Star, GitBranch, Code, ExternalLink, Copy
} from "lucide-react";
import { GitHubIntegrityReport } from "../hooks/useGitHubIntegrity";

const verdictConfig: Record<string, { label: string; color: string; bg: string }> = {
  authentic: { label: "AUTHENTIC", color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/20" },
  likely_authentic: { label: "LIKELY AUTHENTIC", color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/20" },
  inconclusive: { label: "INCONCLUSIVE", color: "text-yellow-400", bg: "bg-yellow-500/15 border-yellow-500/20" },
  suspicious: { label: "SUSPICIOUS", color: "text-orange-400", bg: "bg-orange-500/15 border-orange-500/20" },
  likely_fabricated: { label: "LIKELY FABRICATED", color: "text-red-400", bg: "bg-red-500/15 border-red-500/20" },
};

const severityBadge: Record<string, string> = {
  critical: "bg-red-500/15 text-red-400 border border-red-500/20",
  high: "bg-orange-500/15 text-orange-400 border border-orange-500/20",
  moderate: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/20",
  low: "bg-blue-500/15 text-blue-400 border border-blue-500/20",
};

const GitHubReportPage = () => {
  const navigate = useNavigate();
  const [report, setReport] = useState<GitHubIntegrityReport | null>(null);
  const [showRedFlags, setShowRedFlags] = useState(true);
  const [showPositive, setShowPositive] = useState(true);
  const [showSimilar, setShowSimilar] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem("ice_panda_github_report");
    if (stored) {
      setReport(JSON.parse(stored));
    } else {
      navigate("/");
    }
  }, [navigate]);

  if (!report) return null;

  const v = verdictConfig[report.verdict] || verdictConfig.inconclusive;

  return (
    <div className="min-h-screen bg-background relative">
      <ScanOverlay />
      <TopNav />

      <main className="relative z-10 pt-20 pb-16 px-4">
        <div className="container max-w-5xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Github className="w-7 h-7 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">{report.repoName}</h1>
                {report.repoDescription && (
                  <p className="text-sm text-muted-foreground">{report.repoDescription}</p>
                )}
                <a href={report.repoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1 mt-0.5 hover:underline">
                  <ExternalLink className="w-3 h-3" /> View on GitHub
                </a>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-mono font-semibold px-3 py-1.5 rounded-full border ${v.bg} ${v.color}`}>
                {v.label}
              </span>
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                <span className="text-xs font-mono text-primary">Score: {report.authenticityScore}%</span>
              </div>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6"
          >
            {[
              { icon: GitCommit, label: "Commits", value: report.commitAnalysis.totalCommits },
              { icon: Users, label: "Contributors", value: report.contributorAnalysis.totalContributors },
              { icon: Star, label: "Stars", value: report.rawStats.stars },
              { icon: GitBranch, label: "Branches", value: report.rawStats.branches },
              { icon: Code, label: "Language", value: report.rawStats.language || "N/A" },
            ].map((s, i) => (
              <div key={s.label} className="glass rounded-xl p-4 text-center">
                <s.icon className="w-4 h-4 text-muted-foreground mx-auto mb-1.5" />
                <p className="text-lg font-bold font-mono text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </motion.div>

          {/* Executive Summary */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="glass rounded-xl p-6 mb-6"
          >
            <h3 className="text-sm font-semibold text-foreground mb-3">Executive Summary</h3>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{report.executiveSummary}</p>
          </motion.div>

          {/* Commit Analysis */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="glass rounded-xl p-6 mb-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-7 h-7 rounded-md bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
                <GitCommit className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Commit Analysis</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-secondary/30 rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Time Span</p>
                <p className="text-sm font-mono text-foreground">{report.commitAnalysis.timeSpan}</p>
              </div>
              <div className="bg-secondary/30 rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Avg Gap</p>
                <p className="text-sm font-mono text-foreground">{report.commitAnalysis.avgGapMinutes} min</p>
              </div>
              <div className="bg-secondary/30 rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Message Quality</p>
                <p className={`text-sm font-mono ${
                  report.commitAnalysis.messageQuality === "high" ? "text-emerald-400" :
                  report.commitAnalysis.messageQuality === "medium" ? "text-yellow-400" : "text-red-400"
                }`}>{report.commitAnalysis.messageQuality.toUpperCase()}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">{report.commitAnalysis.pattern}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{report.commitAnalysis.messageAnalysis}</p>
          </motion.div>

          {/* Contributor Analysis */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            className="glass rounded-xl p-6 mb-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-7 h-7 rounded-md bg-purple-500/15 border border-purple-500/30 flex items-center justify-center">
                <Users className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Contributor Analysis</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-2">{report.contributorAnalysis.distribution}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{report.contributorAnalysis.assessment}</p>
          </motion.div>

          {/* Development Flow */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="glass rounded-xl p-6 mb-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-7 h-7 rounded-md bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Development Flow</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{report.developmentFlow}</p>
          </motion.div>

          {/* Red Flags */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="glass rounded-xl overflow-hidden mb-4"
          >
            <button onClick={() => setShowRedFlags(!showRedFlags)} className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-md bg-red-500/15 border border-red-500/30 flex items-center justify-center">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                </div>
                <span className="text-sm font-medium text-foreground">Red Flags</span>
                <span className="text-xs font-mono text-muted-foreground">{report.redFlags.length} found</span>
              </div>
              {showRedFlags ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </button>
            {showRedFlags && report.redFlags.length > 0 && (
              <div className="border-t border-border/50 divide-y divide-border/30">
                {report.redFlags.map((flag, j) => (
                  <div key={j} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h4 className="text-sm font-medium text-foreground">{flag.flag}</h4>
                      <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${severityBadge[flag.severity]}`}>{flag.severity.toUpperCase()}</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{flag.evidence}</p>
                  </div>
                ))}
              </div>
            )}
            {showRedFlags && report.redFlags.length === 0 && (
              <div className="border-t border-border/50 px-5 py-6 text-center">
                <p className="text-xs text-muted-foreground/60">No red flags detected</p>
              </div>
            )}
          </motion.div>

          {/* Positive Signals */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="glass rounded-xl overflow-hidden"
          >
            <button onClick={() => setShowPositive(!showPositive)} className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-md bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <span className="text-sm font-medium text-foreground">Positive Signals</span>
                <span className="text-xs font-mono text-muted-foreground">{report.positiveSignals.length} found</span>
              </div>
              {showPositive ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </button>
            {showPositive && report.positiveSignals.length > 0 && (
              <div className="border-t border-border/50 divide-y divide-border/30">
                {report.positiveSignals.map((sig, j) => (
                  <div key={j} className="px-5 py-4">
                    <h4 className="text-sm font-medium text-foreground mb-1">{sig.signal}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{sig.evidence}</p>
                  </div>
                ))}
              </div>
            )}
            {showPositive && report.positiveSignals.length === 0 && (
              <div className="border-t border-border/50 px-5 py-6 text-center">
                <p className="text-xs text-muted-foreground/60">No positive signals detected</p>
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default GitHubReportPage;
