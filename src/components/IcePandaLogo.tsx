import pandaBody from "@/assets/ice-panda-body.png";
import pandaLeftArm from "@/assets/panda-left-arm-only.png";
import pandaRightArm from "@/assets/panda-right-arm-only.png";

export const IcePandaLogo = ({ size = "default" }: { size?: "default" | "large" }) => {
  const isLarge = size === "large";
  const containerSize = isLarge ? "w-40 h-40" : "w-24 h-24";

  const leftArmStyle = {
    width: isLarge ? 74 : 44,
    left: isLarge ? -12 : -7,
    top: isLarge ? 62 : 37,
  } as const;

  const rightArmStyle = {
    width: isLarge ? 74 : 44,
    right: isLarge ? -12 : -7,
    top: isLarge ? 62 : 37,
  } as const;

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className={`${containerSize} relative`}>
        <img
          src={pandaBody}
          alt="I.C.E. Panda"
          className="relative z-20 w-full h-full rounded-lg object-contain"
          draggable={false}
        />

        <img
          src={pandaLeftArm}
          alt=""
          aria-hidden
          draggable={false}
          className="absolute z-10 pointer-events-none select-none"
          style={leftArmStyle}
        />

        <img
          src={pandaRightArm}
          alt=""
          aria-hidden
          draggable={false}
          className="absolute z-10 pointer-events-none select-none"
          style={rightArmStyle}
        />
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
