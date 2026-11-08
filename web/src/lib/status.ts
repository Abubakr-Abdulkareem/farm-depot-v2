// Colors for order status badges, shared across pages
export const orderStatusStyle: Record<string, string> = {
  pending: "bg-gray-800 text-gray-300",
  paid: "bg-yellow-900 text-yellow-300",
  confirmed: "bg-blue-900 text-blue-300",
  picked_up: "bg-purple-900 text-purple-300",
  delivered: "bg-green-900 text-green-300",
  completed: "bg-green-900 text-green-300",
  disputed: "bg-red-900 text-red-300",
  refunded: "bg-gray-700 text-gray-200",
  cancelled: "bg-red-900 text-red-300",
};