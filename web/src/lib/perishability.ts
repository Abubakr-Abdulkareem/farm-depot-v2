export const PERISHABILITY = {
  low: {
    label: "Long-lasting",
    note: "Handles long journeys. Keep it dry and well packed.",
  },
  medium: {
    label: "Lasts a day or two",
    note: "Pack carefully and keep it out of the sun. Delivery is limited to about a day of travel.",
  },
  high: {
    label: "Spoils fast",
    note: "Fresh or fragile. Delivered only on short routes, within hours of pickup. Pack in ventilated crates or trays.",
  },
} as const;

export type Perishability = keyof typeof PERISHABILITY;

export function isPerishability(value: string): value is Perishability {
  return value in PERISHABILITY;
}