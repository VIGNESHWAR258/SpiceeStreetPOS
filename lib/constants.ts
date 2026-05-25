export const ROLES = {
  ADMIN: 'admin',
  ACCOUNTANT: 'accountant',
  CHEF: 'chef',
} as const;

export const ROLE_LABELS = {
  admin: 'Administrator',
  accountant: 'Accountant/Cashier',
  chef: 'Chef',
} as const;

export const MENU_ITEMS = {
  admin: [
    { label: 'Dashboard', href: '/admin', icon: 'LayoutDashboard' },
    { label: 'Orders', href: '/accountant/orders', icon: 'ShoppingCart' },
    { label: 'Menu Management', href: '/admin/menu-management', icon: 'UtensilsCrossed' },
    { label: 'Table Management', href: '/admin/table-management', icon: 'LayoutGrid' },
    { label: 'Staff Management', href: '/admin/staff-management', icon: 'Users' },
    { label: 'Inventory', href: '/admin/inventory', icon: 'Package' },
    { label: 'Expenses', href: '/admin/expenses', icon: 'TrendingDown' },
    { label: 'Analytics', href: '/admin/analytics', icon: 'BarChart3' },
  ],
  accountant: [
    { label: 'Dashboard', href: '/accountant', icon: 'LayoutDashboard' },
    { label: 'Orders', href: '/accountant/orders', icon: 'ShoppingCart' },
    { label: 'Billing', href: '/accountant/billing', icon: 'IndianRupee' },
    { label: 'Menu Availability', href: '/accountant/menu-availability', icon: 'UtensilsCrossed' },
    { label: 'Transactions', href: '/accountant/transactions', icon: 'CreditCard' },
    { label: 'Expenses', href: '/accountant/expenses', icon: 'TrendingDown' },
  ],
  chef: [
    { label: 'Kitchen Display', href: '/chef', icon: 'UtensilsCrossed' },
    { label: 'Orders', href: '/chef/orders', icon: 'ClipboardList' },
  ],
} as const;
