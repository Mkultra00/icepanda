import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, ChevronRight, Loader2 } from "lucide-react";

interface InvestigationModalProps {
  open: boolean;
  onClose: () => void;
  onStart: (url: string, context: string, scopes: Record<string, boolean>) => void;
  loading?: boolean;
}

const scopeOptions = [
  { key: "criminal", label: "Criminal Records", defaultOn: true },
  { key: "sex_offender", label: "Sex Offender Registries", defaultOn: true },
  { key: "litigation", label: "Litigation & Legal", defaultOn: true },
  { key: "fraud", label: "Fraud & Financial", defaultOn: true },
  { key: "sanctions", label: "Sanctions & Watchlists", defaultOn: true },
  { key: "epstein", label: "Epstein Files", defaultOn: true },
];

export const InvestigationModal = ({ open, onClose, onStart, loading }: InvestigationModalProps) => {
  const [url, setUrl] = useState("");
  const [context, setContext] = useState("");
  const [scopes, setScopes] = useState<Record<string, boolean>>(
    Object.fromEntries(scopeOptions.map(s => [s.key, s.defaultOn]))
  );

  const isValid = url.includes("linkedin.com/in/");

  const toggleScope = (key: string) => {
    setScopes(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative glass rounded-2xl w-full max-w-lg p-6 z-10"
          >
            <button
              onClick={onClose}
              disabled={loading}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/5 transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center">
                <Search className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">New Investigation</h2>
                <p className="text-xs text-muted-foreground">Enter a LinkedIn profile to begin due diligence</p>
              </div>
            </div>

            {/* URL Input */}
            <div className="mb-4">
              <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">
                LinkedIn Profile URL
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://linkedin.com/in/username"
                disabled={loading}
                className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all disabled:opacity-50"
              />
            </div>

            {/* Context */}
            <div className="mb-5">
              <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">
                Additional Context <span className="text-muted-foreground/50">(optional)</span>
              </label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Known to have worked in finance in NYC 2015–2020..."
                rows={2}
                disabled={loading}
                className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all resize-none disabled:opacity-50"
              />
            </div>

            {/* Scope Checkboxes */}
            <div className="mb-6">
              <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">
                Investigation Scope
              </label>
              <div className="grid grid-cols-2 gap-2">
                {scopeOptions.map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => toggleScope(opt.key)}
                    disabled={loading}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      scopes[opt.key]
                        ? "bg-primary/10 border border-primary/25 text-primary"
                        : "bg-secondary/30 border border-border text-muted-foreground"
                    } disabled:opacity-50`}
                  >
                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
                      scopes[opt.key] ? "bg-primary border-primary" : "border-muted-foreground/40"
                    }`}>
                      {scopes[opt.key] && (
                        <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                          <path d="M1 3L3 5L7 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground" />
                        </svg>
                      )}
                    </div>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={() => isValid && onStart(url, context, scopes)}
              disabled={!isValid || loading}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-all active:scale-[0.97] ${
                isValid && !loading
                  ? "bg-primary text-primary-foreground glow-sm hover:glow-md"
                  : "bg-secondary text-muted-foreground cursor-not-allowed"
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Researching...
                </>
              ) : (
                <>
                  Begin Investigation
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
