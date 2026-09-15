/**
 * Strip sector classification codes from display labels
 * (e.g. "A - Agriculture", "Agriculture (A)", "C10 · Food").
 * Keeps the human-readable sector name only.
 */
export function cleanSectorDisplayName(name: string, code?: string): string {
  let n = String(name ?? "").trim();
  const c = String(code ?? "").trim();
  if (!n) return n;

  if (c) {
    const esc = c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    n = n.replace(new RegExp(`^${esc}\\s*[-–—:·•|/]\\s*`, "i"), "");
    n = n.replace(new RegExp(`\\s*[\\(（]\\s*${esc}\\s*[\\)）]\\s*$`, "i"), "");
    n = n.replace(new RegExp(`\\s*[·•|/]\\s*${esc}\\s*$`, "i"), "");
    n = n.replace(new RegExp(`\\s*[-–—:]\\s*${esc}\\s*$`, "i"), "");
    if (n.toLowerCase() === c.toLowerCase()) {
      return String(name).trim();
    }
  }

  // Generic leading code patterns: "A - …", "C10: …", "AA01 · …"
  n = n.replace(/^[A-Za-z]{1,4}\d{0,4}\s*[-–—:·•|/]\s+/, "");
  return n.trim() || String(name).trim();
}
