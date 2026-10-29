export type FormState = {
  error?: string;
  success?: boolean;
};

export type Product = {
  id: string;
  farmer_id: string;
  name: string;
  category: string | null;
  description: string | null;
  price_per_unit: number;
  unit: string;
  quantity_available: number;
  min_order_quantity: number;
  location: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
};