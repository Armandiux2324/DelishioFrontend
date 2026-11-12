export const inventoryUnits = ['g', 'kg', 'oz', 'lb', 'ml', 'l', 'fl_oz', 'gal', 'pza'] as const;
export type InventoryUnit = typeof inventoryUnits[number];
export interface InventoryPayload { name: string; unit: InventoryUnit; unit_cost: string; current_stock: string }
export interface InventoryItem extends InventoryPayload { id: number; restaurant_id: number }
export interface InventoryLossPayload { inventory_item_id: number; quantity: string; reason: string }
export interface InventoryLoss extends InventoryLossPayload { id: number; registered_by_employee_id: number; created_at: string }
export interface InventoryPage<T> { data: T[]; meta: { current_page: number; last_page: number; total: number } }
