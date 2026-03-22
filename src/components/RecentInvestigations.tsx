import { motion } from "framer-motion";
import { Clock, ExternalLink } from "lucide-react";

interface Investigation {
  id: string;
  name: string;
  date: string;
  riskLevel: "critical" | "high" | "moderate" | "low" | "clear";
  status: "complete" | "researching" | "queued";
  confidence: number;
}

const mockInvestigations: Investigation[] = [
  { id: "1", name: "Marcus R. Whitfield", date: "22 Mar 2026", riskLevel: "high", status: "complete", confidence: 94 },
  { id: "2", name: "Elena Vasquez-Torres", date: "21 Mar 2026", riskLevel: "low", status: "complete", confidence: 88 },
  { id: "3", name: "David Chen", date: "21 Mar 2026", riskLevel: "moderate", status: "complete", confidence: 76 },
  { id: "4", name: "Sarah K. Mitchell", date: "20 Mar 2026", riskLevel: "clear", status: "complete", confidence: 97 },
];

const riskBadge: Record<string, string> = {
  critical: "badge-critical",
  high: "badge-high",
  moderate: "badge-moderate",
  low: "badge-low",
  clear: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
};

const riskLabel: Record<string, string> = {
  critical: "CRITICAL",
  high: "HIGH RISK",
  moderate: "MODERATE",
  low: "LOW RISK",
  clear: "CLEAR",
};

export const RecentInvestigations = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.7, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Recent Investigations</h2>
      </div>
      <div className="glass rounded-xl overflow-hidden divide-y divide-border/50">
        {mockInvestigations.map((inv, i) => (
          <motion.div
            key={inv.id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.6 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="group flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.02] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                <span className="text-xs font-mono text-primary">{inv.confidence}%</span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{inv.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{inv.date}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-[10px] font-mono font-semibold px-2.5 py-1 rounded-full ${riskBadge[inv.riskLevel]}`}>
                {riskLabel[inv.riskLevel]}
              </span>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
