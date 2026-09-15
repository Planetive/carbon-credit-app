/**
 * Strip data-year noise from country labels
 * (e.g. "Pakistan 2024", "Pakistan · 2024", "Pakistan (2025)", "2024 Pakistan").
 */
export function cleanCountryName(name: string): string {
  return String(name ?? "")
    .trim()
    // Leading year: "2024 Pakistan", "2024 - Pakistan"
    .replace(/^20\d{2}\s*[-–—:·•|,]?\s+/i, "")
    // Trailing year with separator: "Pakistan · 2024", "Pakistan | 2025"
    .replace(/\s*[·•|]\s*20\d{2}\s*$/i, "")
    // Trailing year in brackets: "Pakistan (2024)", "Pakistan [2025]"
    .replace(/\s*[\(\[\{]\s*20\d{2}\s*[\)\]\}]\s*$/i, "")
    // Trailing year with dash/underscore/space: "Pakistan-2024", "Pakistan_2024", "Pakistan 2024"
    .replace(/[\s_\-–—]+20\d{2}\s*$/i, "")
    // Trailing ", 2024"
    .replace(/,\s*20\d{2}\s*$/i, "")
    .trim();
}
