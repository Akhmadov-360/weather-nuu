import type { ToolStep } from './conversation';

/**
 * The tools of one answer as a single line. A question can call several tools (even the same one twice);
 * the visitor needs "working" while any runs, then one "data received", not a line for each.
 * It says "error" only when no tool gave data.
 */
export function summarizeTools(tools: readonly ToolStep[]): Pick<ToolStep, 'name' | 'status'> | null {
  if (tools.length === 0) return null;
  const working = tools.find((t) => t.status === 'working');
  if (working) return { name: working.name, status: 'working' };
  const last = tools.at(-1)!;
  return tools.some((t) => t.status === 'done') ? { name: last.name, status: 'done' } : { name: last.name, status: 'error' };
}
