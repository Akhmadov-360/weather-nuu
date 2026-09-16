import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/shared/ui/button";

type ErrorStateProps = {
  message?: string;
  onRetry?: () => void;
};

export function ErrorState({ message, onRetry }: ErrorStateProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center gap-4 rounded-panel border border-[var(--glass-border)] bg-[var(--glass-surface)] p-6 text-center backdrop-blur-xl"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-status-critical/10 text-status-critical">
        <AlertTriangle className="h-5 w-5" />
      </div>

      <div className="text-sm text-secondary-themed">{message ?? t('error_data')}</div>

      {onRetry && (
        <Button
          onClick={onRetry}
          className="rounded-full border border-[var(--glass-border)] bg-[var(--glass-surface-hover)] px-4 text-sm text-primary-themed backdrop-blur-md hover:bg-[var(--glass-surface-hover)]"
        >
          {t('error_boundary_retry')}
        </Button>
      )}
    </motion.div>
  );
}
