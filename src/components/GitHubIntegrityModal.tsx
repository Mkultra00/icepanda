import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Github, ChevronRight, Loader2 } from "lucide-react";

interface GitHubIntegrityModalProps {
  open: boolean;
  onClose: () => void;
  onStart: (repoUrl: string) => void;
  loading?: boolean;
}

export const GitHubIntegrityModal = ({ open, onClose, onStart, loading }: GitHubIntegrityModalProps) => {
  const [repoUrl, setRepoUrl] = useState("");

  const isValid = /github\.com\/[^\/]+\/[^\/\?\#]+/.test(repoUrl.trim());

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
              <div className="w-10 h-10 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
                <Github className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">GitHub Integrity</h2>
                <p className="text-xs text-muted-foreground">Analyze a repo's commit patterns for authenticity</p>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">
                Repository URL
              </label>
              <input
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/owner/repo"
                disabled={loading}
                className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-all disabled:opacity-50"
              />
              {repoUrl && !isValid && (
                <p className="text-[11px] text-destructive mt-1.5 font-mono">Enter a valid GitHub URL (e.g. https://github.com/owner/repo)</p>
              )}
            </div>

            <div className="mb-6 p-3 rounded-lg bg-secondary/30 border border-border/50">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                This analysis examines commit timing, message quality, contributor patterns, and development flow 
                to assess whether a repository was authentically developed or artificially constructed.
              </p>
            </div>

            <button
              onClick={() => isValid && onStart(repoUrl.trim())}
              disabled={!isValid || loading}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-all active:scale-[0.97] ${
                isValid && !loading
                  ? "bg-emerald-500 text-white hover:bg-emerald-400"
                  : "bg-secondary text-muted-foreground cursor-not-allowed"
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing Repository...
                </>
              ) : (
                <>
                  Analyze Integrity
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
