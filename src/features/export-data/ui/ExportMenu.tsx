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
import { buildExportFilename, buildExportUrl, downloadExport } from '@/entities/weather/api/weather-export';
import type { WeatherPageType } from '@/shared/types/common';
import type { CustomDateRange } from '@/shared/lib/date/filter-by-range';
import { ENV } from '@/shared/config/env';

type ExportMenuProps = {
  type: WeatherPageType;
  /** The range currently browsed via DateRangePicker, if any — reused as-is for "download this period". */
  selectedRange: CustomDateRange | null;
};

/**
 * Two ways to get data out, per the "if streaming the whole thing is safe,
 * offer both" call: the backend's export streams via keyset pagination —
 * memory-safe regardless of size — so there's no reason to force a range
 * pick just to get everything.
 */
export function ExportMenu({ type, selectedRange }: ExportMenuProps): React.JSX.Element {
  const { t } = useTranslation();

  if (!ENV.exportBaseUrl) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button
              variant="ghost"
              disabled
              className="h-9 gap-1.5 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-surface-soft)] px-2.5 text-[11px] font-medium text-muted-themed sm:text-xs"
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

  const handleDownload = (range?: CustomDateRange) => {
    const url = buildExportUrl(type, range);
    if (!url) return;
    toast.promise(downloadExport(url, buildExportFilename(type, range)), {
      loading: t('export_toast_loading'),
      success: t('export_toast_success'),
      error: t('export_toast_error'),
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-9 gap-1.5 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-surface-soft)] px-2.5 text-[11px] font-medium text-muted-themed transition-colors hover:bg-[var(--glass-surface-hover)] hover:text-secondary-themed sm:text-xs"
        >
          <Download className="h-3.5 w-3.5" />
          {t('export_data')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleDownload()}>{t('export_all')}</DropdownMenuItem>
        <DropdownMenuItem
          disabled={!selectedRange}
          onClick={() => selectedRange && handleDownload(selectedRange)}
        >
          {selectedRange ? t('export_selected_period') : t('export_pick_period_hint')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
