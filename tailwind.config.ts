import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Every --x variable in globals.css is already a COMPLETE color
        // function (`oklch(0.205 0 0)`, sometimes with its own embedded
        // alpha like `oklch(1 0 0 / 10%)`) — never bare component numbers.
        // Wrapping any of them in `oklch(var(--x) / <alpha-value>)` nests
        // an oklch() inside another oklch(), which is invalid CSS the
        // browser silently drops (falls back to `transparent`). That was
        // the actual cause of dropdowns rendering with no background at
        // all — Tailwind still generated *a* rule so the build stopped
        // erroring, but the rule itself painted nothing.
        // Plain `var(--x)` is correct here; Tailwind 3.4's automatic
        // color-mix() fallback already gives every one of these working
        // `/NN` opacity-modifier support without needing the wrapper
        // (proven by `status`/`sensor` below, which never used it).
        border:     'var(--border)',
        input:      'var(--input)',
        ring:       'var(--ring)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: {
          DEFAULT:    'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT:    'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        muted: {
          DEFAULT:    'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        card: {
          DEFAULT:    'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        destructive: {
          DEFAULT:    'var(--destructive)',
        },
        // Referenced by shadcn's dropdown-menu.tsx/tooltip.tsx (bg-popover,
        // focus:bg-accent, …) but were never wired here at all — the CSS
        // variables existed in globals.css, Tailwind just never generated
        // utilities for them.
        popover: {
          DEFAULT:    'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        accent: {
          DEFAULT:    'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        /* Semantic sensor tokens — используют CSS переменные */
        sensor: {
          temp:  'var(--sensor-temp)',
          hum:   'var(--sensor-hum)',
          press: 'var(--sensor-press)',
          mq5:   'var(--sensor-mq5)',
          mq3:   'var(--sensor-mq3)',
        },
        /* Status accent tokens — canonical source for good/warn/bad/info everywhere */
        status: {
          safe:     'var(--status-safe)',
          warning:  'var(--status-warning)',
          critical: 'var(--status-critical)',
          info:     'var(--status-info)',
        },
      },
      borderRadius: {
        /* shadcn base */
        lg:  'var(--radius)',
        md:  'calc(var(--radius) - 2px)',
        sm:  'calc(var(--radius) - 4px)',
        /* dashboard panel tokens — заменяют rounded-[28px] */
        panel: '28px',
        card:  '20px',
      },
      fontFamily: {
        sans: ['Geist Variable', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      backdropBlur: {
        panel: '20px',
      },
      boxShadow: {
        panel: '0 10px 40px rgba(15, 23, 42, 0.35)',
        card:  '0 8px 30px rgba(0, 0, 0, 0.18)',
        glow:  '0 0 12px rgba(74, 222, 128, 0.80)',
      },
    },
  },
  plugins: [],
} satisfies Config;
