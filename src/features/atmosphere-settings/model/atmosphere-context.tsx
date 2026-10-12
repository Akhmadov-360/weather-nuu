import { createContext, useContext } from 'react';

import type { AtmosphereState } from './use-atmosphere';

const AtmosphereContext = createContext<AtmosphereState | null>(null);

export const AtmosphereProvider = AtmosphereContext.Provider;

/** The shared atmosphere state: the header control and the page frame read the same one. */
// eslint-disable-next-line react-refresh/only-export-components
export function useAtmosphereState(): AtmosphereState | null {
  return useContext(AtmosphereContext);
}
