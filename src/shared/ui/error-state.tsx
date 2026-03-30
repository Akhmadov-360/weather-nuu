import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/shared/ui/button";

type ErrorStateProps = {
  message?: string;
  onRetry?: () => void;
};

export function ErrorState({ message, onRetry }: ErrorStateProps): React.JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center gap-4 rounded-[24px] border border-white/10 bg-white/5 p-6 text-center backdrop-blur-xl"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-400/10 text-red-400">
        <AlertTriangle className="h-5 w-5" />
      </div>

      <div className="text-sm text-slate-300/80">{message ?? "Failed to load data"}</div>

      {onRetry && (
        <Button
          onClick={onRetry}
          className="rounded-full border border-white/10 bg-white/10 px-4 text-sm text-white backdrop-blur-md hover:bg-white/20"
        >
          Retry
        </Button>
      )}
    </motion.div>
  );
}
