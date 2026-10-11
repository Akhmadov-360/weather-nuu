import { Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import CallChip, { type CallChipStatus } from '@/components/ui/call-chip';

type ExportChipProps = {
  status: Exclude<CallChipStatus, 'idle'>;
  filename: string;
  /** "3.2 MB" while the file streams in; the server does not announce a total size. */
  progress?: string;
  onRetry?: () => void;
};

/**
 * The download as a live chip: a bar fills while the file is prepared, the
 * icon turns into a check when it has been saved, or into a retry arrow when
 * it failed. Rendered inside a sonner toast, which keeps the placement,
 * stacking and dismissal.
 */
export function ExportChip({ status, filename, progress, onRetry }: ExportChipProps): React.JSX.Element {
  const { t } = useTranslation();
  const argument = status === 'error' ? t('export_chip_failed') : progress ? `${filename} · ${progress}` : filename;

  return (
    <CallChip
      icon={<Download size={14} strokeWidth={1.8} />}
      name={t(status === 'running' ? 'export_chip_running' : status === 'done' ? 'export_chip_done' : 'export_chip_error')}
      argument={argument}
      status={status}
      expectedMs={12000}
      size={42}
      radius={14}
      color="var(--text-primary)"
      surfaceColor="var(--surface)"
      progressColor="var(--status-info)"
      progressOpacity={0.2}
      doneColor="var(--status-safe)"
      errorColor="var(--status-critical)"
      onRetry={onRetry}
      className="border border-(--glass-border) shadow-lg"
    />
  );
}
