/**
 * The sky behind the header: a gradient from the season's colour into the page
 * colour, a little darker when it is cloudy. Static, so it is all the "calm"
 * level draws.
 */
export function AtmosphereSky({ cloud }: { cloud: number }): React.JSX.Element {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 h-[260px]"
      style={{ background: 'linear-gradient(180deg, var(--season-sky-from), var(--season-sky-to))' }}
      aria-hidden
    >
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(180deg, color-mix(in srgb, var(--text-primary) ${Math.round(cloud * 14)}%, transparent), transparent)` }}
      />
    </div>
  );
}
