export type PreparationStation = 'none' | 'kitchen' | 'bar';
export interface RecipeIngredient { inventory_item_id: number; quantity: string }
export interface MenuItemPayload {
  category_id: number; name: string; sale_price: string; description: string | null; image_url: string | null;
  legal_age_required: boolean; preparation_station: PreparationStation; active: boolean; ingredients: RecipeIngredient[];
}
export interface MenuItem extends MenuItemPayload { id: number; created_at: string | null; updated_at: string | null }
export interface MenuItemsPage { data: MenuItem[]; meta: { current_page: number; last_page: number; total: number } }
