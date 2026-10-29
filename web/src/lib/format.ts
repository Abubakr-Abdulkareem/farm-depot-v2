export function formatNaira(value: number | string) {
  return `₦${Number(value).toLocaleString("en-NG")}`;
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}