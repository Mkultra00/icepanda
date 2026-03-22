import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Camera, Github } from "lucide-react";
import { TopNav } from "../components/TopNav";
import { ScanOverlay } from "../components/ScanOverlay";
import { ActionCard } from "../components/ActionCard";
import { RecentInvestigations } from "../components/RecentInvestigations";
import { InvestigationModal } from "../components/InvestigationModal";
import { GitHubIntegrityModal } from "../components/GitHubIntegrityModal";
import { PhotoIdentifyModal } from "../components/PhotoIdentifyModal";
import { IcePandaLogo } from "../components/IcePandaLogo";
import { useResearch } from "../hooks/useResearch";
import { useGitHubIntegrity } from "../hooks/useGitHubIntegrity";
import { motion } from "framer-motion";
import { toast } from "sonner";

const Dashboard = () => {
  const [investigationModalOpen, setInvestigationModalOpen] = useState(false);
  const [githubModalOpen, setGithubModalOpen] = useState(false);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const navigate = useNavigate();
  const { runResearch, loading } = useResearch();
  const { runResearch: runPhotoResearch, loading: photoLoading } = useResearch();
  const { analyzeRepo, loading: githubLoading } = useGitHubIntegrity();

  const handleStartInvestigation = async (imageBase64: string | null, context: string, scopes: Record<string, boolean>) => {
    try {
      const report = await runResearch(imageBase64, context, scopes);
      sessionStorage.setItem("ice_panda_report", JSON.stringify(report));
      setInvestigationModalOpen(false);
      navigate("/report/live");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Investigation failed");
    }
  };

  const handleGitHubAnalysis = async (repoUrl: string) => {
    try {
      const report = await analyzeRepo(repoUrl);
      sessionStorage.setItem("ice_panda_github_report", JSON.stringify(report));
      setGithubModalOpen(false);
      navigate("/github-report");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "GitHub analysis failed");
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      <ScanOverlay />
      <TopNav />

      <main className="relative z-10 pt-24 pb-16 px-4">
        <div className="container max-w-4xl mx-auto">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="text-center mb-12"
          >
            <div className="flex justify-center mb-6">
              <IcePandaLogo size="large" />
            </div>
            <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
              AI-powered due diligence. Upload a LinkedIn profile screenshot and uncover criminal records, 
              litigation, fraud, sanctions, and more — in seconds.
            </p>
          </motion.div>

          {/* Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            <ActionCard
              icon={Search}
              title="New Investigation"
              description="Upload a LinkedIn profile screenshot to run comprehensive due diligence"
              accentColor="#3B82F6"
              onClick={() => setInvestigationModalOpen(true)}
              delay={0.15}
            />
            <ActionCard
              icon={Camera}
              title="Photo Identify"
              description="Upload a photo to identify and investigate an individual"
              accentColor="#8B5CF6"
              onClick={() => {}}
              delay={0.25}
            />
            <ActionCard
              icon={Github}
              title="GitHub Integrity"
              description="Analyze a repo's commit patterns for hackathon authenticity"
              accentColor="#10B981"
              onClick={() => setGithubModalOpen(true)}
              delay={0.35}
            />
          </div>

          {/* Recent */}
          <RecentInvestigations />
        </div>
      </main>

      <InvestigationModal
        open={investigationModalOpen}
        onClose={() => setInvestigationModalOpen(false)}
        onStart={handleStartInvestigation}
        loading={loading}
      />

      <GitHubIntegrityModal
        open={githubModalOpen}
        onClose={() => setGithubModalOpen(false)}
        onStart={handleGitHubAnalysis}
        loading={githubLoading}
      />
    </div>
  );
};

export default Dashboard;
