import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, ChevronRight, Loader2, Upload, ImageIcon } from "lucide-react";

interface InvestigationModalProps {
  open: boolean;
  onClose: () => void;
  onStart: (imageBase64: string | null, context: string, scopes: Record<string, boolean>) => void;
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
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [context, setContext] = useState("");
  const [scopes, setScopes] = useState<Record<string, boolean>>(
    Object.fromEntries(scopeOptions.map(s => [s.key, s.defaultOn]))
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasImage = !!imageBase64;
  const hasContext = context.trim().length >= 5;
  const isValid = hasImage || hasContext;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImagePreview(result);
      // Strip the data:image/...;base64, prefix for the API
      const base64 = result.split(",")[1];
      setImageBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImageBase64(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

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
                <p className="text-xs text-muted-foreground">Upload a LinkedIn profile screenshot or describe the person</p>
              </div>
            </div>

            {/* Image Upload */}
            <div className="mb-4">
              <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">
                LinkedIn Profile Screenshot <span className="text-muted-foreground/50">(optional)</span>
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                disabled={loading}
              />
              {imagePreview ? (
                <div className="relative rounded-lg overflow-hidden border border-border bg-secondary/30">
                  <img src={imagePreview} alt="LinkedIn screenshot" className="w-full max-h-48 object-cover" />
                  <button
                    onClick={clearImage}
                    disabled={loading}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors"
                  >
                    <X className="w-3 h-3 text-foreground" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  className="w-full flex flex-col items-center gap-2 py-6 rounded-lg border border-dashed border-border bg-secondary/20 hover:bg-secondary/40 hover:border-primary/30 transition-all disabled:opacity-50"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Upload className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-foreground font-medium">Click to upload screenshot</p>
                    <p className="text-[11px] text-muted-foreground">PNG, JPG — screenshot of their LinkedIn profile</p>
                  </div>
                </button>
              )}
            </div>

            {/* Context */}
            <div className="mb-1">
              <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">
                Context {!hasImage && <span className="text-primary">(required without screenshot)</span>}
              </label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="e.g. John Smith, CFO at Acme Corp, based in New York..."
                rows={2}
                disabled={loading}
                className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all resize-none disabled:opacity-50"
              />
            </div>

            {/* Mode indicator */}
            {!hasImage && hasContext && (
              <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-primary/5 border border-primary/15">
                <ImageIcon className="w-3.5 h-3.5 text-primary" />
                <span className="text-[11px] text-primary font-mono">Web-only research mode — no LinkedIn screenshot</span>
              </div>
            )}
            {hasImage && (
              <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-primary/5 border border-primary/15">
                <ImageIcon className="w-3.5 h-3.5 text-primary" />
                <span className="text-[11px] text-primary font-mono">LinkedIn screenshot uploaded — vision extraction enabled</span>
              </div>
            )}
            {!hasImage && !hasContext && (
              <div className="mb-4" />
            )}

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
              onClick={() => isValid && onStart(imageBase64, context, scopes)}
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
