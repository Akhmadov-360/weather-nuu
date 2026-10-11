import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarIcon } from 'lucide-react';
import type { DateRange, Matcher } from 'react-day-picker';
import { ru, uz, enUS } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useMediaQuery } from '@/shared/hooks/useMediaQuery';
import type { CustomDateRange } from '@/shared/lib/date/filter-by-range';

const CALENDAR_LOCALES = { ru, uz, en: enUS } as const;

type DateRangePickerProps = {
  value: CustomDateRange | null;
  onChange: (range: CustomDateRange | null) => void;
  /** Bounds what's pickable — typically the sensor's earliest known reading through today. */
  fromDate?: Date;
  toDate?: Date;
  /** External open control — lets a sibling UI (e.g. the export menu) pop the calendar open. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

/**
 * Generic calendar range primitive — used here to browse arbitrary history
 * windows on the chart, and meant to be reused as-is for the export UI
 * later (same `CustomDateRange` shape the export endpoint's from/to will
 * take, same gap-awareness once that's wired up).
 */
export function DateRangePicker({
  value,
  onChange,
  fromDate,
  toDate,
  open: openProp,
  onOpenChange,
}: DateRangePickerProps): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const isPhone = useMediaQuery('(max-width: 639px)');
  const [openInternal, setOpenInternal] = useState(false);
  const open = openProp ?? openInternal;
  const setOpen = (next: boolean) => {
    onOpenChange?.(next);
    if (openProp === undefined) setOpenInternal(next);
  };

  const selected: DateRange | undefined = value ? { from: value.from, to: value.to } : undefined;

  const formatter = new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: '2-digit', year: 'numeric' });
  const label = value ? `${formatter.format(value.from)} – ${formatter.format(value.to)}` : t('range_custom');
  const calendarLocale = CALENDAR_LOCALES[i18n.language as keyof typeof CALENDAR_LOCALES] ?? enUS;

  const disabledMatchers: Matcher[] = [
    ...(fromDate ? [{ before: fromDate }] : []),
    ...(toDate ? [{ after: toDate }] : []),
  ];

  const triggerClass =
    'h-9 gap-1.5 rounded-xl border border-(--glass-border) bg-(--glass-surface-soft) px-2.5 text-[11px] font-medium text-secondary-themed transition-colors hover:bg-(--glass-surface-hover) hover:text-primary-themed sm:text-xs';

  const handleSelect = (range: DateRange | undefined) => {
    if (range?.from && range.to) {
      // The calendar hands over midnight of the last day, which would cut that day off: take it to the end of the day (but not into the future).
      const endOfDay = new Date(range.to);
      endOfDay.setHours(23, 59, 59, 999);
      onChange({ from: range.from, to: new Date(Math.min(endOfDay.getTime(), Date.now())) });
      setOpen(false);
    } else if (!range) {
      onChange(null);
    }
  };

  const calendar = (months: number, className?: string) => (
    <Calendar
      mode="range"
      numberOfMonths={months}
      locale={calendarLocale}
      selected={selected}
      defaultMonth={value?.to}
      startMonth={fromDate}
      endMonth={toDate}
      disabled={disabledMatchers}
      onSelect={handleSelect}
      className={className}
    />
  );

  // On a phone the calendar is a bottom sheet with one large month: two months do not fit a popover that narrow.
  if (isPhone) {
    return (
      <>
        <Button variant="ghost" className={triggerClass} onClick={() => setOpen(true)}>
          <CalendarIcon className="h-3.5 w-3.5" />
          {label}
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-sm:fixed max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:max-w-full max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-b-none max-sm:rounded-t-2xl gap-2 p-3 pb-6">
            <DialogHeader>
              <DialogTitle>{t('range_custom')}</DialogTitle>
              <DialogDescription>{t('range_pick_hint')}</DialogDescription>
            </DialogHeader>
            {calendar(1, 'mx-auto w-full bg-transparent [--cell-size:2.75rem]')}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" className={triggerClass}>
          <CalendarIcon className="h-3.5 w-3.5" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-2">
        {calendar(2)}
      </PopoverContent>
    </Popover>
  );
}
