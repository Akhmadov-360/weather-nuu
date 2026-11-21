export type Box = { left: number; top: number; width: number; height: number };

export function toBox(rect: DOMRect): Box {
  return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
}
