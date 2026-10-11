import { useState } from 'react';
import { Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  buildByMonthsExportUrl,
  buildByMonthsFilename,
  buildExportFilename,
  buildExportUrl,
  downloadExport,
} from '@/entities/weather/api/weather-export';
import type { WeatherPageType } from '@/shared/types/common';
import type { CustomDateRange } from '@/shared/lib/date/filter-by-range';
import { ENV } from '@/shared/config/env';
import { ExportChip } from './ExportChip';
import { MonthPickerDialog } from './MonthPickerDialog';

type ExportMenuProps = {
  type: WeatherPageType;
  /** The range currently browsed via DateRangePicker, if any — reused as-is for "download this period". */
  selectedRange: CustomDateRange | null;
  /** First real reading for this sensor — bounds the month picker so the user can't select before data existed. */
  earliestSensorDate: Date | null;
  /**
   * Invoked when the user clicks the "pick a period first" hint — the
   * parent is expected to programmatically open the DateRangePicker. Without
   * this, the hint reads as clickable but nothing happens on click.
   */
  onRequestPickRange?: () => void;
};

/**
 * Two ways to get data out, per the "if streaming the whole thing is safe,
 * offer both" call: the backend's export streams via keyset pagination —
 * memory-safe regardless of size — so there's no reason to force a range
 * pick just to get everything.
 */
export function ExportMenu({
  type,
  selectedRange,
  earliestSensorDate,
  onRequestPickRange,
}: ExportMenuProps): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);

  if (!ENV.exportBaseUrl) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button
              variant="ghost"
              disabled
              className="h-9 gap-1.5 rounded-xl border border-(--glass-border) bg-(--glass-surface-soft) px-2.5 text-[11px] font-medium text-muted-themed sm:text-xs"
            >
              <Download className="h-3.5 w-3.5" />
              {t('export_data')}
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>{t('export_unavailable_hint')}</TooltipContent>
      </Tooltip>
    );
  }

  /**
   * The download is shown as a chip inside a toast with a fixed id: the same
   * toast is updated as the file streams in, then turns into "saved" or, on
   * failure, into a retry button that runs the whole download again.
   */
  const runDownloadWithProgress = (url: string, filename: string) => {
    const toastId = `export:${filename}`;
    const fmtMB = (n: number) => `${(n / 1024 / 1024).toFixed(1)} MB`;
    const show = (status: 'running' | 'done' | 'error', progress?: string, duration = Infinity) =>
      toast.custom(
        () => <ExportChip status={status} filename={filename} progress={progress} onRetry={() => runDownloadWithProgress(url, filename)} />,
        { id: toastId, duration, unstyled: true, style: { background: 'transparent', border: 'none', boxShadow: 'none', backdropFilter: 'none', width: 'fit-content', maxWidth: 'calc(100vw - 2rem)' } },
      );

    show('running', t('export_toast_preparing'));

    downloadExport(
      url,
      filename,
      (loaded, total, attempt) => {
        // A retry restarts the byte count from 0, so name the attempt: otherwise the counter would look like it dropped.
        const progress = total ? `${fmtMB(loaded)} / ${fmtMB(total)}` : fmtMB(loaded);
        show('running', attempt > 1 ? t('export_toast_progress_attempt', { progress, attempt }) : progress);
      },
      (attempt, maxAttempts) => show('running', t('export_toast_retrying', { attempt: attempt + 1, max: maxAttempts })),
    )
      .then(() => show('done', undefined, 5000))
      .catch(() => show('error', undefined, 15000));
  };

  const handleDownload = (range?: CustomDateRange) => {
    const url = buildExportUrl(type, range, i18n.language);
    if (!url) return;
    runDownloadWithProgress(url, buildExportFilename(type, range));
  };

  const handleByMonthsDownload = (months: string[], format: 'csv' | 'xlsx') => {
    const url = buildByMonthsExportUrl(type, months, format, i18n.language);
    if (!url) return;
    runDownloadWithProgress(url, buildByMonthsFilename(type, months, format));
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-9 gap-1.5 rounded-xl border border-(--glass-border) bg-(--glass-surface-soft) px-2.5 text-[11px] font-medium text-secondary-themed transition-colors hover:bg-(--glass-surface-hover) hover:text-primary-themed sm:text-xs"
          >
            <Download className="h-3.5 w-3.5" />
            {t('export_data')}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleDownload()}>{t('export_all')}</DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              if (selectedRange) {
                handleDownload(selectedRange);
                return;
              }
              // Wait a full frame past this menu's close-animation so the
              // calendar's Popover doesn't fight Radix's focus restoration
              // and click-outside dismiss (0-delay setTimeout wasn't enough
              // in practice — the Popover opened and then immediately closed).
              setTimeout(() => onRequestPickRange?.(), 120);
            }}
          >
            {selectedRange ? t('export_selected_period') : t('export_pick_period_hint')}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!earliestSensorDate}
            onSelect={() => {
              // Same reason as above — Radix restores focus to the trigger
              // as it closes; opening the modal in the same tick can lose
              // the Escape/click-outside handlers to the dropdown.
              setTimeout(() => setMonthPickerOpen(true), 120);
            }}
          >
            {t('export_pick_months')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <MonthPickerDialog
        open={monthPickerOpen}
        onClose={() => setMonthPickerOpen(false)}
        earliest={earliestSensorDate}
        onConfirm={handleByMonthsDownload}
      />
    </>
  );
}
