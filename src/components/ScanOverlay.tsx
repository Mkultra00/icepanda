export const ScanOverlay = () => (
  <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
    <div className="absolute inset-0 grid-bg opacity-40" />
    <div className="absolute inset-0 scan-line opacity-30" style={{ height: "200%" }} />
    {/* Subtle corner vignette */}
    <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background opacity-60" />
    <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background opacity-40" />
  </div>
);
