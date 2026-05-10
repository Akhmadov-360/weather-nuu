import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border:     'oklch(var(--border))',
        input:      'oklch(var(--input))',
        ring:       'oklch(var(--ring))',
        background: 'oklch(var(--background))',
        foreground: 'oklch(var(--foreground))',
        primary: {
          DEFAULT:    'oklch(var(--primary))',
          foreground: 'oklch(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT:    'oklch(var(--secondary))',
          foreground: 'oklch(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT:    'oklch(var(--muted))',
          foreground: 'oklch(var(--muted-foreground))',
        },
        card: {
          DEFAULT:    'oklch(var(--card))',
          foreground: 'oklch(var(--card-foreground))',
        },
        destructive: {
          DEFAULT:    'oklch(var(--destructive))',
        },
        /* Semantic sensor tokens — используют CSS переменные */
        sensor: {
          temp:  'var(--sensor-temp)',
          hum:   'var(--sensor-hum)',
          press: 'var(--sensor-press)',
          mq5:   'var(--sensor-mq5)',
          mq3:   'var(--sensor-mq3)',
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
