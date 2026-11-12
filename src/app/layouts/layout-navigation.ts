import { NavigationItem } from '../shared/navigation/navigation.component';

export const superAdminNavigation: NavigationItem[] = [
  { label: { es: 'Restaurantes', en: 'Restaurants' }, icon: 'building-2', route: '/super-admin' },
];

export const adminNavigation: NavigationItem[] = [
  { label: { es: 'Dashboard', en: 'Dashboard' }, icon: 'layout-dashboard', route: '/admin' },
  { label: { es: 'Menú', en: 'Menu' }, icon: 'utensils' },
  { label: { es: 'Catálogo', en: 'Catalog' }, icon: 'percent', route: '/admin/catalog', exact: false },
  { label: { es: 'Inventario', en: 'Inventory' }, icon: 'package' },
  { label: { es: 'Empleados', en: 'Employees' }, icon: 'chef-hat' },
  { label: { es: 'Clientes', en: 'Customers' }, icon: 'users' },
  { label: { es: 'Promociones', en: 'Promotions' }, icon: 'tag' },
  { label: { es: 'Reportes', en: 'Reports' }, icon: 'chart-no-axes-combined' },
  { label: { es: 'Configuración', en: 'Settings' }, icon: 'settings', route: '/admin/settings' },
];

export const customerNavigation: NavigationItem[] = [
  { label: { es: 'Restaurantes', en: 'Restaurants' }, icon: 'building-2', route: '/cliente' },
  { label: { es: 'Pedidos', en: 'Orders' }, icon: 'receipt-text' },
  { label: { es: 'Puntos', en: 'Points' }, icon: 'gift' },
];
