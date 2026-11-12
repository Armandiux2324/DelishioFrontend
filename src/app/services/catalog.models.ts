export interface TaxClass { id: number; restaurant_id: number; name: string; percentage: string }
export interface SuperCategory { id: number; restaurant_id: number; name: string; tax_class_id: number }
export interface Category { id: number; name: string; super_category_id: number; description: string | null }
export interface CatalogRecords { 'tax-classes': TaxClass; 'super-categories': SuperCategory; categories: Category }
export interface CatalogPayloads {
  'tax-classes': { name: string; percentage: string };
  'super-categories': { name: string; tax_class_id: number };
  categories: { name: string; super_category_id: number; description: string | null };
}
export type CatalogKind = keyof CatalogRecords;
export type CatalogRecord = CatalogRecords[CatalogKind];
export interface CatalogPage<T> { data: T[]; meta: { current_page: number; last_page: number; total: number } }
