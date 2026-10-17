import { ROUTES } from './routes';

export type SectionId = 'room' | 'street' | 'map' | 'analytics';

/** A top-level page of the app: where it lives and how the header names it. */
export type Section = {
  id: SectionId;
  to: string;
  /** Short name for the navigation (a key of `common.json`). */
  navKey: string;
  /** Title in the header while the section is open (a key of `common.json`). */
  titleKey: string;
  /** Shown in the navigation. A section can be reached by its address while this is off. */
  enabled: boolean;
};

/**
 * The one list of sections. Adding a page: a route in `router.tsx`, an entry here, nav and title
 * keys in `common.json`. The map and the analytics pages are wired and waiting: their owner sets
 * `enabled: true` in the pull request that makes the page real (one line, nothing else in the
 * header changes).
 */
export const SECTIONS: readonly Section[] = [
  { id: 'room', to: ROUTES.room, navKey: 'nav_room', titleKey: 'panel_room', enabled: true },
  { id: 'street', to: ROUTES.street, navKey: 'nav_street', titleKey: 'panel_street', enabled: true },
  { id: 'map', to: ROUTES.map, navKey: 'nav_map', titleKey: 'title_map', enabled: false },
  { id: 'analytics', to: ROUTES.analytics, navKey: 'nav_analytics', titleKey: 'title_analytics', enabled: false },
];

export function enabledSections(sections: readonly Section[] = SECTIONS): Section[] {
  return sections.filter((section) => section.enabled);
}

/** With more than the two dashboards the header shows a full section switch instead of the swap link. */
export function hasSectionNav(sections: readonly Section[] = enabledSections()): boolean {
  return sections.length > 2;
}

/** The section a path belongs to: its own address or anything below it ("/map/..."), never a longer name. */
export function sectionForPath(pathname: string, sections: readonly Section[] = SECTIONS): Section | undefined {
  return sections.find((section) => pathname === section.to || pathname.startsWith(`${section.to}/`));
}
