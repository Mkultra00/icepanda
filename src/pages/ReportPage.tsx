import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { TopNav } from "../components/TopNav";
import { ScanOverlay } from "../components/ScanOverlay";
import {
  Shield, AlertTriangle, Scale, FileText, Globe, Search,
  Download, Share2, Volume2, MessageSquare, ChevronDown, ChevronRight,
  ExternalLink, MapPin, GraduationCap, Briefcase, Award, User, Mic,
  Brain, Target, MessageCircle, Crown, Gauge, ShieldAlert
} from "lucide-react";
import { ResearchReport } from "../hooks/useResearch";
import { generateReportPdf } from "../utils/generateReportPdf";

const iconMap: Record<string, typeof Shield> = {
  "Criminal": Shield,
  "Litigation": Scale,
  "Fraud & Financial": FileText,
  "Sanctions": Globe,
  "Sex Offender": AlertTriangle,
  "Epstein Files": Search,
};

const colorMap: Record<string, string> = {
  "Criminal": "#EF4444",
  "Litigation": "#F97316",
  "Fraud & Financial": "#EAB308",
  "Sanctions": "#8B5CF6",
  "Sex Offender": "#F59E0B",
  "Epstein Files": "#F59E0B",
};

const tabs = ["Briefing", "Findings", "Sources"];

const severityBadge: Record<string, string> = {
  critical: "badge-critical",
  high: "badge-high",
  moderate: "badge-moderate",
  low: "badge-low",
  info: "badge-info",
};

const riskBadgeMap: Record<string, string> = {
  critical: "badge-critical",
  high: "badge-high",
  moderate: "badge-moderate",
  low: "badge-low",
  clear: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
};

const riskLabelMap: Record<string, string> = {
  critical: "CRITICAL",
  high: "HIGH RISK",
  moderate: "MODERATE",
  low: "LOW RISK",
  clear: "CLEAR",
};

const reliabilityColor: Record<string, string> = {
  HIGH: "text-emerald-400",
  MEDIUM: "text-yellow-400",
  LOW: "text-orange-400",
};

const bioSections = [
  { key: "earlyLife", label: "Early Life", icon: User, color: "#3B82F6" },
  { key: "education", label: "Education", icon: GraduationCap, color: "#8B5CF6" },
  { key: "career", label: "Career", icon: Briefcase, color: "#10B981" },
  { key: "notableAchievements", label: "Notable Achievements", icon: Award, color: "#F59E0B" },
  { key: "personalLife", label: "Personal Life", icon: User, color: "#EC4899" },
  { key: "publicPresence", label: "Public Presence", icon: Mic, color: "#06B6D4" },
] as const;

const psychSections = [
  { key: "personalityTraits", label: "Personality Traits", icon: Brain, color: "#A855F7" },
  { key: "motivations", label: "Motivations", icon: Target, color: "#F43F5E" },
  { key: "communicationStyle", label: "Communication Style", icon: MessageCircle, color: "#3B82F6" },
  { key: "leadershipStyle", label: "Leadership Style", icon: Crown, color: "#F59E0B" },
  { key: "riskTolerance", label: "Risk Tolerance", icon: Gauge, color: "#10B981" },
  { key: "potentialVulnerabilities", label: "Potential Vulnerabilities", icon: ShieldAlert, color: "#EF4444" },
] as const;

const ReportPage = () => {
  const navigate = useNavigate();
  const [report, setReport] = useState<ResearchReport | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("ice_panda_report");
    if (stored) {
      const parsed = JSON.parse(stored) as ResearchReport;
      setReport(parsed);
      const expanded: Record<string, boolean> = {};
      parsed.findings?.forEach(f => {
        if (f.items.length > 0) expanded[f.category] = true;
      });
      setExpandedCategories(expanded);
    } else {
      navigate("/");
    }
  }, [navigate]);

  if (!report) return null;

  const totalFindings = report.findings.reduce((sum, f) => sum + f.items.length, 0);

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

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
              {report.target.profileImageUrl ? (
                <img
                  src={report.target.profileImageUrl}
                  alt={report.target.fullName}
                  className="w-14 h-14 rounded-full object-cover border-2 border-primary/20"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <span className="text-xl font-semibold text-primary">{report.target.initials}</span>
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold text-foreground">{report.target.fullName}</h1>
                <p className="text-sm text-muted-foreground">{report.target.title} — {report.target.company}</p>
                {report.target.location && (
                  <p className="text-xs text-muted-foreground/70 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" />{report.target.location}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-mono font-semibold px-3 py-1.5 rounded-full ${riskBadgeMap[report.riskLevel]}`}>
                {riskLabelMap[report.riskLevel]}
              </span>
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                <span className="text-xs font-mono text-primary">IMCS: {report.confidenceScore}%</span>
              </div>
            </div>
          </motion.div>

          {/* Action buttons */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex gap-2 mb-6">
            {[
              { icon: Download, label: "Download PDF" },
              { icon: Share2, label: "Share" },
              { icon: Volume2, label: "Voice Briefing" },
            ].map(btn => (
              <button key={btn.label} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all active:scale-[0.97]">
                <btn.icon className="w-3.5 h-3.5" />
                {btn.label}
              </button>
            ))}
          </motion.div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
            {tabs.map((tab, i) => (
              <button
                key={tab}
                onClick={() => setActiveTab(i)}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  activeTab === i
                    ? "bg-primary/15 text-primary border border-primary/25"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/[0.03]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Briefing Tab */}
          {activeTab === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6"
            >
              {/* Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: "Identity Confidence", value: `${report.confidenceScore}%`, sub: "AI-verified match" },
                  { label: "Risk Score", value: `${report.riskScore}/100`, sub: report.riskScore > 60 ? "Elevated risk detected" : "Within normal range" },
                  { label: "Findings", value: totalFindings.toString(), sub: `Across ${report.findings.filter(f => f.items.length > 0).length} categories` },
                ].map((m, i) => (
                  <motion.div key={m.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="glass rounded-xl p-5 text-center">
                    <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">{m.label}</p>
                    <p className="text-2xl font-bold text-foreground font-mono">{m.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{m.sub}</p>
                  </motion.div>
                ))}
              </div>

              {/* Executive Summary */}
              <div className="glass rounded-xl p-6">
                <h3 className="text-sm font-semibold text-foreground mb-3">Executive Summary</h3>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{report.executiveSummary}</p>
              </div>

              {/* Life Briefing */}
              {report.biography && (
                <div className="space-y-3">
                  <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Life Briefing</h3>
                  {bioSections.map(({ key, label, icon: Icon, color }, i) => {
                    const content = report.biography?.[key as keyof typeof report.biography];
                    if (!content || content === "No public information available.") return null;
                    return (
                      <motion.div
                        key={key}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 + i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        className="glass rounded-xl p-5"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}>
                            <Icon className="w-3.5 h-3.5" style={{ color }} />
                          </div>
                          <h4 className="text-sm font-semibold text-foreground">{label}</h4>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{content}</p>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Psychological Profile */}
              {report.psychProfile && (
                <div className="space-y-3">
                  <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Psychological Profile</h3>
                  {psychSections.map(({ key, label, icon: Icon, color }, i) => {
                    const content = report.psychProfile?.[key as keyof typeof report.psychProfile];
                    if (!content || content === "Insufficient public data for assessment.") return null;
                    return (
                      <motion.div
                        key={key}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 + i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        className="glass rounded-xl p-5"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}>
                            <Icon className="w-3.5 h-3.5" style={{ color }} />
                          </div>
                          <h4 className="text-sm font-semibold text-foreground">{label}</h4>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{content}</p>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* Findings */}
          {activeTab === 1 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="space-y-3">
              {report.findings.map(cat => {
                const CatIcon = iconMap[cat.category] || Shield;
                const catColor = colorMap[cat.category] || "#3B82F6";
                return (
                  <div key={cat.category} className="glass rounded-xl overflow-hidden">
                    <button onClick={() => toggleCategory(cat.category)} className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ backgroundColor: `${catColor}15`, border: `1px solid ${catColor}30` }}>
                          <CatIcon className="w-3.5 h-3.5" style={{ color: catColor }} />
                        </div>
                        <span className="text-sm font-medium text-foreground">{cat.category}</span>
                        <span className="text-xs font-mono text-muted-foreground">{cat.items.length} {cat.items.length === 1 ? "finding" : "findings"}</span>
                      </div>
                      {expandedCategories[cat.category] ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                    </button>
                    {expandedCategories[cat.category] && cat.items.length > 0 && (
                      <div className="border-t border-border/50 divide-y divide-border/30">
                        {cat.items.map((item, j) => (
                          <motion.div key={j} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: j * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="px-5 py-4">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <h4 className="text-sm font-medium text-foreground">{item.title}</h4>
                              <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${severityBadge[item.severity]}`}>{item.severity.toUpperCase()}</span>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed mb-3">{item.summary}</p>
                            <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono">
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <ExternalLink className="w-3 h-3" />
                                {item.source.startsWith("http") ? (
                                  <a href={item.source} target="_blank" rel="noopener noreferrer" className={`${reliabilityColor[item.reliability]} hover:underline`}>{item.source}</a>
                                ) : (
                                  <span className={reliabilityColor[item.reliability]}>{item.source}</span>
                                )}
                                <span className="text-muted-foreground/50">({item.reliability})</span>
                              </span>
                              {item.jurisdiction && (
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <MapPin className="w-3 h-3" />
                                  {item.jurisdiction}
                                </span>
                              )}
                              <span className="text-primary">IMCS: {item.confidence}%</span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                    {expandedCategories[cat.category] && cat.items.length === 0 && (
                      <div className="border-t border-border/50 px-5 py-6 text-center">
                        <p className="text-xs text-muted-foreground/60">No findings in this category</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </motion.div>
          )}

          {/* Sources */}
          {activeTab === 2 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-xl p-6 space-y-4">
              <h3 className="text-sm font-semibold text-foreground mb-4">Sources Consulted</h3>
              {report.sourcesConsulted.map((src, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${src.reliability === "HIGH" ? "bg-emerald-400" : src.reliability === "MEDIUM" ? "bg-yellow-400" : "bg-orange-400"}`} />
                    <span className="text-sm text-foreground">{src.name}</span>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">{src.status}</span>
                </div>
              ))}
            </motion.div>
          )}
        </div>
      </main>

      {/* Chat FAB */}
      <button onClick={() => setChatOpen(!chatOpen)} className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center glow-md hover:glow-lg transition-all active:scale-95">
        <MessageSquare className="w-5 h-5" />
      </button>

      {chatOpen && (
        <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="fixed bottom-20 right-6 z-50 w-80 glass rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border/50">
            <h3 className="text-sm font-semibold text-foreground">Chat with Report</h3>
            <p className="text-[11px] text-muted-foreground">Ask questions about this investigation</p>
          </div>
          <div className="p-4 h-48 flex items-center justify-center">
            <p className="text-xs text-muted-foreground text-center">AI chat coming soon — powered by Gemini</p>
          </div>
          <div className="p-3 border-t border-border/50">
            <input placeholder="Ask about findings..." className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40" />
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ReportPage;
