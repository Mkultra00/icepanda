import pandaAvatar from "@/assets/ice-panda-avatar.png";

export const IcePandaLogo = ({ size = "default" }: { size?: "default" | "large" }) => {
  const isLarge = size === "large";
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <img
        src={pandaAvatar}
        alt="I.C.E. Panda"
        className={`${isLarge ? "w-40 h-40" : "w-24 h-24"} rounded-lg object-cover`}
        style={{ animation: "panda-sway 2.5s ease-in-out infinite" }}
      />
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
