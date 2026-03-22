import { Shield } from "lucide-react";

export const AiddsLogo = ({ size = "default" }: { size?: "default" | "large" }) => {
  const isLarge = size === "large";
  return (
    <div className="flex items-center gap-3">
      <div className={`relative ${isLarge ? "w-12 h-12" : "w-8 h-8"} flex items-center justify-center`}>
        <div className="absolute inset-0 rounded-lg bg-primary/20 animate-pulse-glow" />
        <Shield className={`${isLarge ? "w-7 h-7" : "w-5 h-5"} text-primary relative z-10`} />
      </div>
      <div>
        <h1 className={`${isLarge ? "text-2xl" : "text-lg"} font-bold tracking-tight text-foreground`}>
          AIDDS
        </h1>
        {isLarge && (
          <p className="text-[11px] font-mono text-muted-foreground tracking-widest uppercase">
            Agentic Intelligence Due Diligence
          </p>
        )}
      </div>
    </div>
  );
};
