import { useState } from 'react';
import { AnimateIcon } from '@animate-ui/react/icons';
import { useTranslation } from 'react-i18next';
import { sileo } from 'sileo';

import { Download } from '@/components/animate-ui/icons/download';
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
import { createProgressStore } from '../model/progress-store';
import { ExportProgress } from './ExportProgress';
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
   * The download is one toast: it shows the file and how far it has got while it streams in, then turns
   * into "saved" or, on failure, into a retry button that runs the whole download again.
   */
  const runDownloadWithProgress = (url: string, filename: string) => {
    const fmtMB = (n: number) => `${(n / 1024 / 1024).toFixed(1)} MB`;
    const progress = createProgressStore(t('export_toast_preparing'));

    const download = downloadExport(
      url,
      filename,
      (loaded, total, attempt) => {
        // A retry restarts the byte count from 0, so name the attempt: otherwise the counter would look like it dropped.
        const text = total ? `${fmtMB(loaded)} / ${fmtMB(total)}` : fmtMB(loaded);
        progress.set(attempt > 1 ? t('export_toast_progress_attempt', { progress: text, attempt }) : text);
      },
      (attempt, maxAttempts) => progress.set(t('export_toast_retrying', { attempt: attempt + 1, max: maxAttempts })),
    );

    // One toast that goes from "downloading" to "saved", or to a retry button when it failed.
    sileo.promise(download, {
      position: 'top-center',
      loading: { title: t('export_chip_running'), description: <ExportProgress filename={filename} store={progress} /> },
      success: { title: t('export_chip_done'), description: filename, duration: 5000 },
      error: {
        title: t('export_chip_error'),
        description: t('export_toast_error'),
        duration: 15000,
        button: { title: t('export_toast_retry'), onClick: () => runDownloadWithProgress(url, filename) },
      },
    }).catch(() => undefined);
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
          <AnimateIcon animateOnHover asChild>
            <Button
              variant="ghost"
              className="h-9 gap-1.5 rounded-xl border border-(--glass-border) bg-(--glass-surface-soft) px-2.5 text-[11px] font-medium text-secondary-themed transition-colors hover:bg-(--glass-surface-hover) hover:text-primary-themed sm:text-xs"
            >
              <Download className="h-3.5 w-3.5" />
              {t('export_data')}
            </Button>
          </AnimateIcon>
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
