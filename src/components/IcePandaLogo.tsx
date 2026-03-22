import pandaAvatar from "@/assets/ice-panda-avatar.png";

export const IcePandaLogo = ({ size = "default" }: { size?: "default" | "large" }) => {
  const isLarge = size === "large";
  const containerSize = isLarge ? "w-40 h-40" : "w-24 h-24";
  const px = isLarge ? 160 : 96;
  const armW = isLarge ? 26 : 15;
  const armH = isLarge ? 44 : 26;

  const armStyle = (side: "left" | "right"): React.CSSProperties => ({
    width: armW,
    height: armH,
    top: "40%",
    [side]: "3%",
    transformOrigin: "50% 0%",
    animation: `arm-wave-${side} 2s cubic-bezier(0.45,0.05,0.55,0.95) infinite`,
  });

  const innerImg = (side: "left" | "right"): React.CSSProperties => ({
    width: px,
    height: px,
    top: -px * 0.4,
    [side]: -px * 0.03,
  });

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className={`${containerSize} relative`}>
        <img
          src={pandaAvatar}
          alt="I.C.E. Panda"
          className="w-full h-full rounded-lg object-cover"
        />
        {(["left", "right"] as const).map((side) => (
          <div
            key={side}
            className="absolute overflow-hidden pointer-events-none"
            style={armStyle(side)}
          >
            <img
              src={pandaAvatar}
              alt=""
              aria-hidden
              className="absolute object-cover rounded-lg"
              style={innerImg(side)}
            />
          </div>
        ))}
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
