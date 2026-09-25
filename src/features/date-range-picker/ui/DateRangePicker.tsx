import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarIcon } from 'lucide-react';
import type { DateRange, Matcher } from 'react-day-picker';
import { ru, uz, enUS } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="h-9 gap-1.5 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-surface-soft)] px-2.5 text-[11px] font-medium text-secondary-themed transition-colors hover:bg-[var(--glass-surface-hover)] hover:text-primary-themed sm:text-xs"
        >
          <CalendarIcon className="h-3.5 w-3.5" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-2">
        <Calendar
          mode="range"
          numberOfMonths={2}
          locale={calendarLocale}
          selected={selected}
          defaultMonth={value?.to}
          startMonth={fromDate}
          endMonth={toDate}
          disabled={disabledMatchers}
          onSelect={(range) => {
            if (range?.from && range.to) {
              onChange({ from: range.from, to: range.to });
              setOpen(false);
            } else if (!range) {
              onChange(null);
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
