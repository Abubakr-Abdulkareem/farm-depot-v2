export const DISPUTE_REASONS = {
  damaged: "The goods were damaged",
  spoiled: "The goods were spoiled",
  wrong_item: "Wrong item delivered",
  short_quantity: "Less than the ordered quantity",
  not_received: "I did not receive my order",
  other: "Something else",
} as const;

export type DisputeReason = keyof typeof DISPUTE_REASONS;

export function isDisputeReason(value: string): value is DisputeReason {
  return Object.prototype.hasOwnProperty.call(DISPUTE_REASONS, value);
}