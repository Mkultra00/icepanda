import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface ActionCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  accentColor: string;
  onClick: () => void;
  delay?: number;
}

export const ActionCard = ({ icon: Icon, title, description, accentColor, onClick, delay = 0 }: ActionCardProps) => {
  return (
    <motion.button
      initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      className="group glass-hover rounded-xl p-6 text-left w-full cursor-pointer active:scale-[0.97] transition-transform duration-150"
    >
      <div
        className="w-12 h-12 rounded-lg flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-105"
        style={{ backgroundColor: `${accentColor}15`, border: `1px solid ${accentColor}30` }}
      >
        <Icon className="w-6 h-6" style={{ color: accentColor }} />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </motion.button>
  );
};
