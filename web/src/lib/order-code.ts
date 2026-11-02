export function orderCode(id: string) {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}