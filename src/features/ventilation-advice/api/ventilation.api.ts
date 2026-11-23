import { http } from '@/shared/api/http';
import { ENV } from '@/shared/config/env';
import { VentilationAdviceSchema, type VentilationAdvice } from '../model/advice';

/** Advice on the window of the auditorium. `null` when the new API is not configured. */
export async function getVentilationAdvice(): Promise<VentilationAdvice | null> {
  if (!ENV.exportBaseUrl) return null;
  const { data } = await http.get(`${ENV.exportBaseUrl}/v1/ventilation/advice`);
  return VentilationAdviceSchema.parse(data);
}
