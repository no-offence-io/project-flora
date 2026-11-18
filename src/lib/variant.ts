/**
 * How a line's choices are written wherever an order or cart line is shown: "Taupe, M", "Taupe",
 * "M" or nothing. Colour first, the way people say it ("the taupe one, in medium").
 */
export function variantLabel(line: { colour?: string | null; size?: string | null }): string {
  return [line.colour?.trim(), line.size?.trim()].filter(Boolean).join(", ");
}
