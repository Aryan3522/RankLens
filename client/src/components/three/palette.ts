/**
 * Single source of truth for 3D scene colors. Mirrors the graphite design
 * tokens in index.css (Electric Blue / Cyan Glow / AI Purple + status colors)
 * so every R3F scene + fallback stays on-brand and a palette tweak is one edit.
 * Three.js materials need literal hex, so these are duplicated from the CSS
 * tokens rather than read from CSS custom properties at runtime.
 */
export const C = {
  blue: "#4F8CFF", // Electric Blue — primary
  cyan: "#4FE5FF", // Cyan Glow
  purple: "#7C5CFF", // AI Purple — secondary
  success: "#29D398",
  warning: "#FFB648",
  error: "#FF5E7A",
  /** Keyword/data node fill — a soft tint of Electric Blue. */
  node: "#9DC2FF",
  /** Neutral connection line. */
  line: "#4F8CFF",
} as const;

/**
 * Engine identity colors, shared by the citation/universe scenes and their
 * static fallbacks. Unknown engines fall back to Electric Blue.
 */
export const ENGINE_COLORS: Record<string, string> = {
  ChatGPT: C.success,
  Gemini: C.blue,
  Claude: C.purple,
  Perplexity: C.cyan,
  Copilot: C.warning,
  Google: C.blue,
  Grok: "#E879F9",
};

export function engineColor(name: string): string {
  return ENGINE_COLORS[name] ?? C.blue;
}
