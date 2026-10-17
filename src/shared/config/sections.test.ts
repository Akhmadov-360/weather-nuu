import { describe, expect, it } from 'vitest';
import { enabledSections, hasSectionNav, sectionForPath, SECTIONS, type Section } from './sections';

const make = (id: Section['id'], to: string, enabled: boolean): Section => ({ id, to, navKey: `nav_${id}`, titleKey: `title_${id}`, enabled });

describe('SECTIONS registry', () => {
  it('starts with the two dashboards, both on', () => {
    expect(SECTIONS.slice(0, 2).map((s) => [s.id, s.to, s.enabled])).toEqual([
      ['room', '/room', true],
      ['street', '/street', true],
    ]);
  });

  it('has unique ids and unique paths', () => {
    expect(new Set(SECTIONS.map((s) => s.id)).size).toBe(SECTIONS.length);
    expect(new Set(SECTIONS.map((s) => s.to)).size).toBe(SECTIONS.length);
  });

  it('reaches every section by its path, enabled or not', () => {
    for (const section of SECTIONS) expect(sectionForPath(section.to)).toBe(section);
  });
});

describe('enabledSections', () => {
  const list = [make('room', '/room', true), make('street', '/street', true), make('map', '/map', false), make('analytics', '/analytics', true)];

  it('keeps only the enabled ones, in registry order', () => {
    expect(enabledSections(list).map((s) => s.id)).toEqual(['room', 'street', 'analytics']);
  });
});

describe('hasSectionNav', () => {
  it('is false for the two dashboards alone: the header keeps its swap link', () => {
    expect(hasSectionNav([make('room', '/room', true), make('street', '/street', true)])).toBe(false);
  });

  it('is true as soon as a third section is on', () => {
    expect(hasSectionNav([make('room', '/room', true), make('street', '/street', true), make('map', '/map', true)])).toBe(true);
  });
});

describe('sectionForPath', () => {
  const list = [make('room', '/room', true), make('map', '/map', false)];

  it('matches an exact path', () => {
    expect(sectionForPath('/map', list)?.id).toBe('map');
  });

  it('matches a path with a trailing slash or a sub-path', () => {
    expect(sectionForPath('/map/', list)?.id).toBe('map');
    expect(sectionForPath('/map/station/room', list)?.id).toBe('map');
  });

  it('does not match a path that only starts with the same letters', () => {
    expect(sectionForPath('/mapping', list)).toBeUndefined();
  });

  it('returns undefined for an unknown path', () => {
    expect(sectionForPath('/nope', list)).toBeUndefined();
  });
});
