import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

type MonthPickerDialogProps = {
  open: boolean;
  onClose: () => void;
  /** First month that has any data — dates before this are hidden. */
  earliest: Date | null;
  /** Called with e.g. ["2026-05","2026-06"] and the user's chosen format. */
  onConfirm: (months: string[], format: 'csv' | 'xlsx') => void;
};

/**
 * Builds "YYYY-MM" tags for every month between `from` and `to`
 * inclusive on both ends, iterating with `setUTCMonth` so we don't have
 * to worry about DST or month-length arithmetic. Falls back to an empty
 * list when the range is inverted or the sensor has no known start yet.
 */
function enumerateMonths(from: Date, to: Date): string[] {
  if (from.getTime() > to.getTime()) return [];
  const out: string[] = [];
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1));
  while (cursor.getTime() <= end.getTime()) {
    const y = cursor.getUTCFullYear();
    const m = String(cursor.getUTCMonth() + 1).padStart(2, '0');
    out.push(`${y}-${m}`);
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return out;
}

const MONTH_NAME_KEYS = [
  'month_jan', 'month_feb', 'month_mar', 'month_apr', 'month_may', 'month_jun',
  'month_jul', 'month_aug', 'month_sep', 'month_oct', 'month_nov', 'month_dec',
];

/**
 * Modal for picking one or many calendar months to export. Multi-month
 * picks come back as a ZIP with per-month CSVs and a summary — the
 * backend decides that automatically, the UI just sends the month list.
 * Built on shadcn's Dialog (Radix) so the surface is the theme's solid
 * `--popover` color rather than the app's translucent `--glass-surface` —
 * a modal is meant to isolate its content from whatever's behind it, and
 * the glass tokens (designed for cards sitting *on* the dashboard) let
 * chart lines bleed through and hurt readability here.
 */
export function MonthPickerDialog({
  open,
  onClose,
  earliest,
  onConfirm,
}: MonthPickerDialogProps): React.JSX.Element {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [format, setFormat] = useState<'csv' | 'xlsx'>('xlsx');

  // Reset selection every time the dialog is reopened — carrying picks
  // across sessions is more likely to confuse than help.
  useEffect(() => {
    if (open) {
      setSelected(new Set());
      setFormat('xlsx');
    }
  }, [open]);

  // Group month tags by year for the grid — years become sections, months
  // are the 12-cell grid inside. Months outside [earliest, today] are
  // rendered but disabled, so users see the whole year at once and the
  // grid stays a stable shape as they scroll.
  const groupedByYear = useMemo(() => {
    if (!earliest) return [] as { year: number; months: { tag: string; enabled: boolean }[] }[];
    const today = new Date();
    const allTags = enumerateMonths(
      new Date(Date.UTC(earliest.getUTCFullYear(), 0, 1)),
      new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)),
    );
    const groups = new Map<number, { tag: string; enabled: boolean }[]>();
    for (const tag of allTags) {
      const [y, m] = tag.split('-').map(Number) as [number, number];
      if (!groups.has(y)) groups.set(y, []);
      const monthStart = new Date(Date.UTC(y, m - 1, 1));
      const isPast = monthStart.getTime() <= today.getTime();
      const isAfterEarliest =
        y > earliest.getUTCFullYear() ||
        (y === earliest.getUTCFullYear() && m - 1 >= earliest.getUTCMonth());
      groups.get(y)!.push({ tag, enabled: isPast && isAfterEarliest });
    }
    return Array.from(groups.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([year, months]) => ({ year, months }));
  }, [earliest]);

  const toggle = (tag: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const monthLabel = (tag: string) => {
    const m = Number(tag.split('-')[1]!);
    return t(MONTH_NAME_KEYS[m - 1]!);
  };

  const submit = () => {
    if (selected.size === 0) return;
    const months = Array.from(selected).sort();
    onConfirm(months, format);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="flex max-h-[85vh] w-full max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="gap-1 border-b px-5 py-4">
          <DialogTitle>{t('export_pick_months_title')}</DialogTitle>
          <DialogDescription>{t('export_pick_months_hint')}</DialogDescription>
        </DialogHeader>

        <div className="max-h-[45vh] overflow-y-auto px-5 py-3">
          {groupedByYear.map((group) => (
            <section key={group.year} className="mb-5 last:mb-0">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {group.year}
              </h3>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {group.months.map(({ tag, enabled }) => {
                  const checked = selected.has(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      disabled={!enabled}
                      onClick={() => toggle(tag)}
                      className={cn(
                        'flex items-center justify-center rounded-lg border px-2 py-2 text-xs font-medium transition-colors',
                        enabled ? 'cursor-pointer' : 'cursor-not-allowed opacity-40',
                        checked
                          ? 'border-status-info bg-status-info/15 text-foreground'
                          : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      {monthLabel(tag)}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <div className="border-t px-5 py-4">
          <div className="mb-4">
            <span className="mb-2 block text-xs font-medium text-muted-foreground">
              {t('export_format')}
            </span>
            <RadioGroup
              value={format}
              onValueChange={(v) => setFormat(v as 'csv' | 'xlsx')}
              className="grid-flow-col justify-start gap-4"
            >
              {(['xlsx', 'csv'] as const).map((f) => (
                <label
                  key={f}
                  htmlFor={`export-format-${f}`}
                  className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-foreground"
                >
                  <RadioGroupItem value={f} id={`export-format-${f}`} />
                  {f.toUpperCase()}
                </label>
              ))}
            </RadioGroup>
          </div>

          <DialogFooter className="-mx-0 -mb-0 flex-row items-center justify-between gap-2 rounded-none border-t-0 bg-transparent p-0 sm:flex-row sm:justify-between">
            <span className="text-xs text-muted-foreground">
              {selected.size === 0
                ? t('export_pick_months_none')
                : t('export_pick_months_count', { count: selected.size })}
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onClose}>
                {t('export_cancel')}
              </Button>
              <Button variant="default" size="sm" onClick={submit} disabled={selected.size === 0}>
                {t('export_download')}
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
