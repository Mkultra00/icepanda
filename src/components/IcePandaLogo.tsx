import pandaAvatar from "@/assets/ice-panda-avatar.png";

export const IcePandaLogo = ({ size = "default" }: { size?: "default" | "large" }) => {
  const isLarge = size === "large";
  const containerSize = isLarge ? "w-40 h-40" : "w-24 h-24";
  const armW = isLarge ? 28 : 16;
  const armH = isLarge ? 48 : 28;

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className={`${containerSize} relative`}>
        {/* Static body */}
        <img
          src={pandaAvatar}
          alt="I.C.E. Panda"
          className="w-full h-full rounded-lg object-cover"
        />
        {/* Left arm wave overlay */}
        <div
          className="absolute overflow-hidden pointer-events-none"
          style={{
            width: armW,
            height: armH,
            top: "38%",
            left: "2%",
            transformOrigin: "top center",
            animation: "arm-wave-left 1.2s ease-in-out infinite",
          }}
        >
          <img
            src={pandaAvatar}
            alt=""
            aria-hidden
            className="absolute object-cover rounded-lg"
            style={{
              width: isLarge ? 160 : 96,
              height: isLarge ? 160 : 96,
              top: -(isLarge ? 160 : 96) * 0.38,
              left: -(isLarge ? 160 : 96) * 0.02,
            }}
          />
        </div>
        {/* Right arm wave overlay */}
        <div
          className="absolute overflow-hidden pointer-events-none"
          style={{
            width: armW,
            height: armH,
            top: "38%",
            right: "2%",
            transformOrigin: "top center",
            animation: "arm-wave-right 1.2s ease-in-out infinite",
          }}
        >
          <img
            src={pandaAvatar}
            alt=""
            aria-hidden
            className="absolute object-cover rounded-lg"
            style={{
              width: isLarge ? 160 : 96,
              height: isLarge ? 160 : 96,
              top: -(isLarge ? 160 : 96) * 0.38,
              right: -(isLarge ? 160 : 96) * 0.02,
            }}
          />
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
