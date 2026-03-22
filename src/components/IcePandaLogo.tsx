import pandaBody from "@/assets/ice-panda-body.png";

export const IcePandaLogo = ({ size = "default" }: { size?: "default" | "large" }) => {
  const isLarge = size === "large";
  const containerSize = isLarge ? "w-40 h-40" : "w-24 h-24";

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className={`${containerSize} relative`}>
        <img
          src={pandaBody}
          alt="I.C.E. Panda"
          className="w-full h-full object-contain"
          draggable={false}
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
