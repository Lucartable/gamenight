/**
 * Helper minimaliste pour composer des classNames conditionnels.
 * Pas de dépendance ajoutée. Style clsx-like.
 *
 * Exemples :
 *   cn("btn", isActive && "btn-active", { "btn-disabled": isDisabled })
 *   cn("base", variantClass, className)
 */
export type ClassValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | ClassValue[]
  | { [key: string]: boolean | null | undefined };

export function cn(...values: ClassValue[]): string {
  const out: string[] = [];
  for (const value of values) {
    if (!value) continue;
    if (typeof value === "string" || typeof value === "number") {
      out.push(String(value));
      continue;
    }
    if (Array.isArray(value)) {
      const nested = cn(...value);
      if (nested) out.push(nested);
      continue;
    }
    if (typeof value === "object") {
      for (const [key, on] of Object.entries(value)) {
        if (on) out.push(key);
      }
    }
  }
  return out.join(" ");
}
