export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  image: string;
  available: boolean;
}

export interface Order {
  id: string;
  items: Array<{ id: string; name: string; quantity: number; price: number }>;
  total: number;
  status: 'pending' | 'preparing' | 'ready' | 'completed';
  timestamp: Date;
  notes: string;
  paymentMethod?: 'cash' | 'card' | 'digital';
}

export interface StaffMember {
  id: string;
  name: string;
  role: 'admin' | 'accountant' | 'chef';
  email: string;
  joinDate: Date;
  status: 'active' | 'inactive';
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  reorderLevel: number;
  supplier: string;
  lastRestocked: Date;
}

export const mockMenuItems: MenuItem[] = [
  {
    id: '1',
    name: 'Spicy Tandoori Chicken',
    category: 'Main Courses',
    price: 450,
    description: 'Succulent chicken marinated in yogurt and spices, cooked in tandoor',
    image: '/menu-1.jpg',
    available: true,
  },
  {
    id: '2',
    name: 'Butter Chicken',
    category: 'Main Courses',
    price: 480,
    description: 'Tender chicken in rich tomato-based cream sauce',
    image: '/menu-2.jpg',
    available: true,
  },
  {
    id: '3',
    name: 'Lamb Biryani',
    category: 'Rice Dishes',
    price: 520,
    description: 'Fragrant basmati rice layered with spiced lamb',
    image: '/menu-3.jpg',
    available: true,
  },
  {
    id: '4',
    name: 'Paneer Tikka Masala',
    category: 'Vegetarian',
    price: 380,
    description: 'Cottage cheese in creamy tomato sauce',
    image: '/menu-4.jpg',
    available: true,
  },
  {
    id: '5',
    name: 'Samosa (4 pcs)',
    category: 'Appetizers',
    price: 150,
    description: 'Crispy triangular pastry with spiced potato filling',
    image: '/menu-5.jpg',
    available: true,
  },
  {
    id: '6',
    name: 'Naan Bread',
    category: 'Breads',
    price: 80,
    description: 'Traditional Indian flatbread',
    image: '/menu-6.jpg',
    available: true,
  },
];

export const mockOrders: Order[] = [
  {
    id: 'ORD001',
    items: [
      { id: '1', name: 'Spicy Tandoori Chicken', quantity: 2, price: 450 },
      { id: '6', name: 'Naan Bread', quantity: 2, price: 80 },
    ],
    total: 1060,
    status: 'preparing',
    timestamp: new Date(Date.now() - 5 * 60000),
    notes: 'Extra spicy',
  },
  {
    id: 'ORD002',
    items: [
      { id: '3', name: 'Lamb Biryani', quantity: 1, price: 520 },
    ],
    total: 520,
    status: 'pending',
    timestamp: new Date(Date.now() - 2 * 60000),
    notes: '',
  },
  {
    id: 'ORD003',
    items: [
      { id: '2', name: 'Butter Chicken', quantity: 3, price: 480 },
      { id: '5', name: 'Samosa (4 pcs)', quantity: 2, price: 150 },
    ],
    total: 1740,
    status: 'ready',
    timestamp: new Date(Date.now() - 15 * 60000),
    notes: 'No onions on the side',
    paymentMethod: 'card',
  },
];

export const mockStaff: StaffMember[] = [
  {
    id: '1',
    name: 'Rahul Kumar',
    role: 'admin',
    email: 'admin@spiceestreet.com',
    joinDate: new Date('2023-01-15'),
    status: 'active',
  },
  {
    id: '2',
    name: 'Priya Singh',
    role: 'accountant',
    email: 'cashier@spiceestreet.com',
    joinDate: new Date('2023-06-20'),
    status: 'active',
  },
  {
    id: '3',
    name: 'Arjun Patel',
    role: 'chef',
    email: 'chef@spiceestreet.com',
    joinDate: new Date('2023-03-10'),
    status: 'active',
  },
];

export const mockInventory: InventoryItem[] = [
  {
    id: '1',
    name: 'Chicken Breast',
    quantity: 15,
    unit: 'kg',
    reorderLevel: 10,
    supplier: 'Fresh Farms Ltd',
    lastRestocked: new Date(Date.now() - 2 * 24 * 60 * 60000),
  },
  {
    id: '2',
    name: 'Basmati Rice',
    quantity: 5,
    unit: 'kg',
    reorderLevel: 20,
    supplier: 'Premium Grains',
    lastRestocked: new Date(Date.now() - 5 * 24 * 60 * 60000),
  },
  {
    id: '3',
    name: 'Lamb',
    quantity: 8,
    unit: 'kg',
    reorderLevel: 5,
    supplier: 'Fresh Farms Ltd',
    lastRestocked: new Date(Date.now() - 1 * 24 * 60 * 60000),
  },
  {
    id: '4',
    name: 'Paneer',
    quantity: 12,
    unit: 'kg',
    reorderLevel: 8,
    supplier: 'Dairy Fresh',
    lastRestocked: new Date(Date.now() - 3 * 24 * 60 * 60000),
  },
  {
    id: '5',
    name: 'Spices Mix',
    quantity: 3,
    unit: 'kg',
    reorderLevel: 2,
    supplier: 'Spice Masters',
    lastRestocked: new Date(Date.now() - 10 * 24 * 60 * 60000),
  },
];
