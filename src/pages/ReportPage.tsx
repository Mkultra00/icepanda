import { useState } from "react";
import { motion } from "framer-motion";
import { TopNav } from "../components/TopNav";
import { ScanOverlay } from "../components/ScanOverlay";
import {
  Shield, AlertTriangle, Scale, FileText, Globe, Search,
  Download, Share2, Volume2, MessageSquare, ChevronDown, ChevronRight,
  ExternalLink, MapPin
} from "lucide-react";

const tabs = ["Executive Summary", "Findings", "Network", "Map", "Sources"];

const findings = [
  {
    category: "Criminal", icon: Shield, color: "#EF4444",
    items: [
      { title: "Federal Civil Case — Securities Fraud Allegation", source: "PACER — SDNY", reliability: "HIGH", confidence: 87, severity: "high", jurisdiction: "New York, NY", date: "2019-03-14", summary: "Named as co-defendant in SEC enforcement action related to insider trading at Vertex Capital predecessor entity. Case settled without admission of guilt." },
      { title: "Misdemeanor — DUI Arrest Record", source: "FL Clerk of Court", reliability: "MEDIUM", confidence: 72, severity: "low", jurisdiction: "Miami-Dade, FL", date: "2016-08-22", summary: "DUI arrest record found in Miami-Dade County. Charges reduced to reckless driving. Adjudication withheld." },
    ]
  },
  {
    category: "Litigation", icon: Scale, color: "#F97316",
    items: [
      { title: "Employment Discrimination Lawsuit (Defendant)", source: "PACER — D.C. Circuit", reliability: "HIGH", confidence: 91, severity: "moderate", jurisdiction: "Washington, D.C.", date: "2021-06-03", summary: "Former employee filed discrimination complaint. Case dismissed with prejudice after settlement conference. Terms sealed." },
    ]
  },
  {
    category: "Fraud & Financial", icon: FileText, color: "#EAB308",
    items: [
      { title: "FINRA BrokerCheck — Customer Complaint", source: "FINRA BrokerCheck", reliability: "HIGH", confidence: 94, severity: "moderate", jurisdiction: "National", date: "2018-11-20", summary: "One customer complaint filed regarding unsuitable investment recommendation. Complaint settled for $45,000. No regulatory action taken." },
    ]
  },
  {
    category: "Sanctions", icon: Globe, color: "#8B5CF6", items: []
  },
  {
    category: "Sex Offender", icon: AlertTriangle, color: "#F59E0B", items: []
  },
  {
    category: "Epstein Files", icon: Search, color: "#F59E0B", items: []
  },
];

const severityBadge: Record<string, string> = {
  critical: "badge-critical",
  high: "badge-high",
  moderate: "badge-moderate",
  low: "badge-low",
  info: "badge-info",
};

const reliabilityColor: Record<string, string> = {
  HIGH: "text-emerald-400",
  MEDIUM: "text-yellow-400",
  LOW: "text-orange-400",
  UNVERIFIED: "text-muted-foreground",
};

const ReportPage = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({ Criminal: true, Litigation: true, "Fraud & Financial": true });
  const [chatOpen, setChatOpen] = useState(false);

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const totalFindings = findings.reduce((sum, f) => sum + f.items.length, 0);

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
              <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                <span className="text-xl font-semibold text-primary">MW</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Marcus R. Whitfield</h1>
                <p className="text-sm text-muted-foreground">VP, Strategic Partnerships — Vertex Capital</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="badge-high text-[10px] font-mono font-semibold px-3 py-1.5 rounded-full">HIGH RISK</span>
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                <span className="text-xs font-mono text-primary">IMCS: 94%</span>
              </div>
            </div>
          </motion.div>

          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex gap-2 mb-6"
          >
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

          {/* Tab Content */}
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
                  { label: "Identity Confidence", value: "94%", sub: "High confidence match" },
                  { label: "Risk Score", value: "72/100", sub: "Elevated risk detected" },
                  { label: "Findings", value: totalFindings.toString(), sub: "Across 3 categories" },
                ].map((m, i) => (
                  <motion.div
                    key={m.label}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="glass rounded-xl p-5 text-center"
                  >
                    <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">{m.label}</p>
                    <p className="text-2xl font-bold text-foreground font-mono">{m.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{m.sub}</p>
                  </motion.div>
                ))}
              </div>

              {/* Assessment */}
              <div className="glass rounded-xl p-6">
                <h3 className="text-sm font-semibold text-foreground mb-3">Overall Assessment</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Marcus R. Whitfield presents an <span className="text-orange-400 font-medium">elevated risk profile</span> based on {totalFindings} adverse findings across criminal, litigation, and financial categories. The most significant finding is a federal securities fraud allegation (SDNY, 2019) in which the subject was named as co-defendant. While the case settled without admission of guilt, the pattern of financial regulatory complaints warrants enhanced due diligence. No sanctions, sex offender, or Epstein-related findings were discovered. Identity confidence is high (94%) based on strong corroboration across employment, education, and geographic signals.
                </p>
              </div>
            </motion.div>
          )}

          {activeTab === 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="space-y-3"
            >
              {findings.map(cat => (
                <div key={cat.category} className="glass rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleCategory(cat.category)}
                    className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-md flex items-center justify-center"
                        style={{ backgroundColor: `${cat.color}15`, border: `1px solid ${cat.color}30` }}>
                        <cat.icon className="w-3.5 h-3.5" style={{ color: cat.color }} />
                      </div>
                      <span className="text-sm font-medium text-foreground">{cat.category}</span>
                      <span className="text-xs font-mono text-muted-foreground">
                        {cat.items.length} {cat.items.length === 1 ? "finding" : "findings"}
                      </span>
                    </div>
                    {expandedCategories[cat.category] ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>

                  {expandedCategories[cat.category] && cat.items.length > 0 && (
                    <div className="border-t border-border/50 divide-y divide-border/30">
                      {cat.items.map((item, j) => (
                        <motion.div
                          key={j}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: j * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                          className="px-5 py-4"
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <h4 className="text-sm font-medium text-foreground">{item.title}</h4>
                            <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${severityBadge[item.severity]}`}>
                              {item.severity.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed mb-3">{item.summary}</p>
                          <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono">
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <ExternalLink className="w-3 h-3" />
                              <span className={reliabilityColor[item.reliability]}>{item.source}</span>
                              <span className="text-muted-foreground/50">({item.reliability})</span>
                            </span>
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <MapPin className="w-3 h-3" />
                              {item.jurisdiction}
                            </span>
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
              ))}
            </motion.div>
          )}

          {activeTab === 2 && (
            <div className="glass rounded-xl p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                <Globe className="w-8 h-8 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">Network graph visualization — coming next</p>
            </div>
          )}

          {activeTab === 3 && (
            <div className="glass rounded-xl p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">Geographic map visualization — coming next</p>
            </div>
          )}

          {activeTab === 4 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass rounded-xl p-6 space-y-4"
            >
              <h3 className="text-sm font-semibold text-foreground mb-4">Sources Consulted</h3>
              {[
                { name: "PACER — Federal Court Records", reliability: "HIGH", status: "Queried" },
                { name: "FINRA BrokerCheck", reliability: "HIGH", status: "Queried" },
                { name: "SEC EDGAR Enforcement Actions", reliability: "HIGH", status: "Queried" },
                { name: "NSOPW Sex Offender Registry", reliability: "HIGH", status: "Queried — No matches" },
                { name: "OFAC SDN Sanctions List", reliability: "HIGH", status: "Queried — No matches" },
                { name: "Florida Clerk of Court", reliability: "MEDIUM", status: "Queried" },
                { name: "Epstein Court Documents", reliability: "MEDIUM", status: "Queried — No matches" },
                { name: "Perplexity Deep Research", reliability: "MEDIUM", status: "14 queries executed" },
              ].map((src, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${src.reliability === "HIGH" ? "bg-emerald-400" : "bg-yellow-400"}`} />
                    <span className="text-sm text-foreground">{src.name}</span>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">{src.status}</span>
                </div>
              ))}
            </motion.div>
          )}
        </div>
      </main>

      {/* Floating chat button */}
      <button
        onClick={() => setChatOpen(!chatOpen)}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center glow-md hover:glow-lg transition-all active:scale-95"
      >
        <MessageSquare className="w-5 h-5" />
      </button>

      {/* Chat panel */}
      {chatOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="fixed bottom-20 right-6 z-50 w-80 glass rounded-xl overflow-hidden"
        >
          <div className="p-4 border-b border-border/50">
            <h3 className="text-sm font-semibold text-foreground">Chat with Report</h3>
            <p className="text-[11px] text-muted-foreground">Ask questions about this investigation</p>
          </div>
          <div className="p-4 h-48 flex items-center justify-center">
            <p className="text-xs text-muted-foreground text-center">AI chat integration — connect your API key to enable</p>
          </div>
          <div className="p-3 border-t border-border/50">
            <input
              placeholder="Ask about findings..."
              className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ReportPage;
