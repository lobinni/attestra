/**
 * Section visibility flags.
 *
 * Each flag is read from a public environment variable so hosting can enable or
 * disable a section without a code change. Values are referenced literally
 * because Next.js inlines `process.env.NEXT_PUBLIC_*` at build time; a computed
 * key would not be replaced and would always read undefined in the browser.
 *
 * Accepted values: "true", "1", "on", "yes" and "false", "0", "off", "no".
 */

function flag(raw: string | undefined, fallback: boolean): boolean {
  const value = (raw ?? "").trim().toLowerCase();
  if (["true", "1", "on", "yes", "enabled"].includes(value)) return true;
  if (["false", "0", "off", "no", "disabled"].includes(value)) return false;
  return fallback;
}

export const FEATURES = {
  /** Prepared sample mandates on the overview page and the template picker. */
  samples: flag(process.env.NEXT_PUBLIC_SHOW_SAMPLES, true),
  /** Live mandate registry and the mandate workspace routes. */
  mandates: flag(process.env.NEXT_PUBLIC_SHOW_MANDATES, true),
  /** Operator passport page. */
  operators: flag(process.env.NEXT_PUBLIC_SHOW_OPERATORS, true),
  /** Protocol explanation page. */
  protocol: flag(process.env.NEXT_PUBLIC_SHOW_PROTOCOL, true),
  /** Getting-started guide page. */
  guide: flag(process.env.NEXT_PUBLIC_SHOW_GUIDE, true),
  /** Deployment proof page. Disabled by default. */
  contract: flag(process.env.NEXT_PUBLIC_SHOW_CONTRACT, false),
  /** Live protocol statistics block on the overview page. */
  liveStats: flag(process.env.NEXT_PUBLIC_SHOW_LIVE_STATS, true),
  /** Outcome explanation cards on the overview page. */
  outcomes: flag(process.env.NEXT_PUBLIC_SHOW_OUTCOMES, true),
} as const;

export type FeatureName = keyof typeof FEATURES;

export function isEnabled(feature: FeatureName): boolean {
  return FEATURES[feature];
}

export interface NavigationItem {
  href: string;
  label: string;
  feature?: FeatureName;
}

export const NAVIGATION: NavigationItem[] = [
  { href: "/", label: "Overview" },
  { href: "/mandates", label: "Mandates", feature: "mandates" },
  { href: "/operators", label: "Operators", feature: "operators" },
  { href: "/protocol", label: "Protocol", feature: "protocol" },
  { href: "/guide", label: "Guide", feature: "guide" },
  { href: "/contract", label: "Contract", feature: "contract" },
];

export function visibleNavigation(): NavigationItem[] {
  return NAVIGATION.filter((item) => !item.feature || FEATURES[item.feature]);
}
