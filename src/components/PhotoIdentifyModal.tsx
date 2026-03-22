import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Camera, ChevronRight, Loader2, Upload } from "lucide-react";

interface PhotoIdentifyModalProps {
  open: boolean;
  onClose: () => void;
  onStart: (imageBase64: string, context: string) => void;
  loading?: boolean;
}

export const PhotoIdentifyModal = ({ open, onClose, onStart, loading }: PhotoIdentifyModalProps) => {
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [context, setContext] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImagePreview(result);
      setImageBase64(result.split(",")[1]);
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImageBase64(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
              <div className="w-10 h-10 rounded-lg bg-[hsl(var(--primary))]/15 border border-[hsl(var(--primary))]/25 flex items-center justify-center"
                style={{ backgroundColor: "#8B5CF615", borderColor: "#8B5CF630" }}>
                <Camera className="w-5 h-5" style={{ color: "#8B5CF6" }} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Photo Identify</h2>
                <p className="text-xs text-muted-foreground">Upload a photo to identify and investigate an individual</p>
              </div>
            </div>

            {/* Image Upload */}
            <div className="mb-4">
              <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">
                Photo of Individual <span className="text-primary">(required)</span>
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
                  <img src={imagePreview} alt="Uploaded photo" className="w-full max-h-48 object-cover" />
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
                    <p className="text-sm text-foreground font-medium">Click to upload photo</p>
                    <p className="text-[11px] text-muted-foreground">PNG, JPG — clear photo of the person's face</p>
                  </div>
                </button>
              )}
            </div>

            {/* Context */}
            <div className="mb-6">
              <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">
                Additional Context <span className="text-muted-foreground/50">(optional)</span>
              </label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="e.g. Seen at conference in Miami, possibly works in finance..."
                rows={2}
                disabled={loading}
                className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all resize-none disabled:opacity-50"
              />
            </div>

            {/* Submit */}
            <button
              onClick={() => imageBase64 && onStart(imageBase64, context)}
              disabled={!imageBase64 || loading}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-all active:scale-[0.97] ${
                imageBase64 && !loading
                  ? "bg-primary text-primary-foreground glow-sm hover:glow-md"
                  : "bg-secondary text-muted-foreground cursor-not-allowed"
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Identifying...
                </>
              ) : (
                <>
                  Identify & Investigate
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
