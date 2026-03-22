import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { TopNav } from "../components/TopNav";
import { ScanOverlay } from "../components/ScanOverlay";
import { Shield, Search, FileText, Scale, AlertTriangle, Globe, Users, CheckCircle2, Loader2 } from "lucide-react";

interface AgentLog {
  id: number;
  agent: string;
  action: string;
  status: "in_progress" | "complete" | "error";
  detail?: string;
  icon: typeof Shield;
  color: string;
}

const agentSequence: Omit<AgentLog, "id" | "status">[] = [
  { agent: "Identity Resolver", action: "Extracting LinkedIn profile data...", icon: Users, color: "#3B82F6" },
  { agent: "Identity Resolver", action: "Cross-referencing voter records & property data", icon: Users, color: "#3B82F6" },
  { agent: "Criminal Records Agent", action: "Searching PACER federal court records", icon: Shield, color: "#EF4444" },
  { agent: "Criminal Records Agent", action: "Querying state criminal repositories (NY, CA, FL)", icon: Shield, color: "#EF4444" },
  { agent: "Sex Offender Agent", action: "Screening NSOPW national registry", icon: AlertTriangle, color: "#F59E0B" },
  { agent: "Litigation Agent", action: "Searching federal & state civil court dockets", icon: Scale, color: "#F97316" },
  { agent: "Fraud Agent", action: "Querying SEC EDGAR & FINRA BrokerCheck", icon: FileText, color: "#EAB308" },
  { agent: "Sanctions Agent", action: "Screening OFAC SDN, EU sanctions, Interpol", icon: Globe, color: "#8B5CF6" },
  { agent: "Epstein Files Agent", action: "Cross-referencing flight logs & court documents", icon: Search, color: "#F59E0B" },
  { agent: "Report Generator", action: "Compiling comprehensive due diligence report", icon: FileText, color: "#3B82F6" },
];

const identitySignals = [
  { label: "Full Name Verified", delay: 1.5 },
  { label: "DOB Estimated", delay: 3 },
  { label: "Employer History Confirmed", delay: 4.5 },
  { label: "Address History Matched", delay: 6 },
  { label: "Education Verified", delay: 7.5 },
  { label: "Professional Licenses Found", delay: 9 },
];

const LiveInvestigation = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [confidence, setConfidence] = useState(0);
  const [signalsResolved, setSignalsResolved] = useState(0);

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    agentSequence.forEach((entry, i) => {
      // Start
      timers.push(setTimeout(() => {
        setLogs(prev => [...prev, { ...entry, id: i, status: "in_progress" }]);
      }, i * 1200));
      // Complete
      timers.push(setTimeout(() => {
        setLogs(prev => prev.map(l => l.id === i ? { ...l, status: "complete" } : l));
      }, i * 1200 + 900));
    });

    // Confidence ticker
    const confInterval = setInterval(() => {
      setConfidence(prev => {
        if (prev >= 94) { clearInterval(confInterval); return 94; }
        return prev + Math.random() * 8;
      });
    }, 800);

    // Signal resolver
    identitySignals.forEach((_, i) => {
      timers.push(setTimeout(() => setSignalsResolved(i + 1), identitySignals[i].delay * 1000));
    });

    // Navigate to report when done
    timers.push(setTimeout(() => navigate("/report/demo"), agentSequence.length * 1200 + 1500));

    return () => { timers.forEach(clearTimeout); clearInterval(confInterval); };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background relative">
      <ScanOverlay />
      <TopNav />
      <main className="relative z-10 pt-20 pb-16 px-4">
        <div className="container max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Agent Feed - left 3 cols */}
            <div className="lg:col-span-3 space-y-2">
              <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-4">Agent Activity</h2>
              {logs.map((log, i) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -20, filter: "blur(4px)" }}
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="glass rounded-lg px-4 py-3 flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${log.color}15`, border: `1px solid ${log.color}30` }}>
                    <log.icon className="w-4 h-4" style={{ color: log.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-muted-foreground">{log.agent}</p>
                    <p className="text-sm text-foreground truncate">{log.action}</p>
                  </div>
                  {log.status === "in_progress" ? (
                    <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  )}
                </motion.div>
              ))}
            </div>

            {/* Identity Profile - right 2 cols */}
            <div className="lg:col-span-2">
              <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-4">Identity Profile</h2>
              <div className="glass rounded-xl p-5 space-y-5">
                {/* Target info */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <span className="text-lg font-semibold text-primary">MW</span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Marcus R. Whitfield</p>
                    <p className="text-xs text-muted-foreground">VP, Strategic Partnerships — Vertex Capital</p>
                  </div>
                </div>

                {/* Confidence score */}
                <div className="text-center py-4">
                  <div className="relative w-24 h-24 mx-auto">
                    <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="42" strokeWidth="6" stroke="hsl(var(--steel))" fill="none" />
                      <circle cx="50" cy="50" r="42" strokeWidth="6" stroke="hsl(var(--primary))"
                        fill="none" strokeLinecap="round"
                        strokeDasharray={`${Math.min(confidence, 100) * 2.64} 264`}
                        className="transition-all duration-500"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xl font-mono font-bold text-primary">{Math.round(Math.min(confidence, 100))}%</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 font-mono">Identity Confidence</p>
                </div>

                {/* Signals */}
                <div className="space-y-2">
                  {identitySignals.map((signal, i) => (
                    <div key={signal.label} className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full transition-colors duration-500 ${
                        i < signalsResolved ? "bg-emerald-400" : "bg-steel"
                      }`} />
                      <span className={`text-xs transition-colors duration-500 ${
                        i < signalsResolved ? "text-foreground" : "text-muted-foreground/50"
                      }`}>{signal.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LiveInvestigation;
