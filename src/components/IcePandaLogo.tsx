import pandaAvatar from "@/assets/ice-panda-avatar.png";

export const IcePandaLogo = ({ size = "default" }: { size?: "default" | "large" }) => {
  const isLarge = size === "large";
  const imgSize = isLarge ? "w-40 h-40" : "w-24 h-24";

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className={`${imgSize} relative`}>
        {/* Main body - static */}
        <img
          src={pandaAvatar}
          alt="I.C.E. Panda"
          className="w-full h-full rounded-lg object-cover"
        />
        {/* Left arm overlay - waving */}
        <div
          className="absolute top-0 left-0 w-full h-full overflow-hidden rounded-lg"
          style={{
            clipPath: "polygon(0% 35%, 0% 85%, 25% 85%, 25% 35%)",
            animation: "wave-left-arm 1.5s ease-in-out infinite",
            transformOrigin: "20% 38%",
          }}
        >
          <img src={pandaAvatar} alt="" className="w-full h-full object-cover" aria-hidden />
        </div>
        {/* Right arm overlay - waving */}
        <div
          className="absolute top-0 left-0 w-full h-full overflow-hidden rounded-lg"
          style={{
            clipPath: "polygon(75% 35%, 75% 85%, 100% 85%, 100% 35%)",
            animation: "wave-right-arm 1.5s ease-in-out infinite",
            transformOrigin: "80% 38%",
          }}
        >
          <img src={pandaAvatar} alt="" className="w-full h-full object-cover" aria-hidden />
        </div>
      </div>
      <div className="text-center">
        <h1 className={`${isLarge ? "text-2xl" : "text-lg"} font-bold tracking-tight text-foreground`}>
          I.C.E. Panda
        </h1>
        {isLarge && (
          <p className="text-[11px] font-mono text-muted-foreground tracking-widest uppercase">
            Intelligence · Compliance · Exposure
          </p>
        )}
      </div>
    </div>
  );
};
