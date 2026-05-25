import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool } from '../lib/db';

const demoPassword = 'password123';

async function seed() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const passwordHash = await bcrypt.hash(demoPassword, 10);

    const users = [
      { id: 'user-admin', name: 'Rahul Kumar', email: 'admin@spiceestreet.com', role: 'admin' },
      { id: 'user-cashier', name: 'Priya Singh', email: 'cashier@spiceestreet.com', role: 'accountant' },
      { id: 'user-chef', name: 'Arjun Patel', email: 'chef@spiceestreet.com', role: 'chef' },
    ] as const;

    for (const user of users) {
      await client.query(
        `INSERT INTO spiceestreet.users (id, name, email, password_hash, role, status)
         VALUES ($1, $2, $3, $4, $5, 'active')
         ON CONFLICT (email) DO UPDATE SET
           name = EXCLUDED.name,
           password_hash = EXCLUDED.password_hash,
           role = EXCLUDED.role,
           status = 'active',
           updated_at = NOW()`,
        [user.id, user.name, user.email, passwordHash, user.role]
      );
    }

    const staff = [
      { id: 'staff-admin', name: 'Rahul Kumar', email: 'admin@spiceestreet.com', role: 'admin', phone: '+91 9876543210' },
      { id: 'staff-cashier', name: 'Priya Singh', email: 'cashier@spiceestreet.com', role: 'accountant', phone: '+91 9876543211' },
      { id: 'staff-chef', name: 'Arjun Patel', email: 'chef@spiceestreet.com', role: 'chef', phone: '+91 9876543212' },
    ] as const;

    for (const member of staff) {
      await client.query(
        `INSERT INTO staff (id, name, email, role, status, phone)
         VALUES ($1, $2, $3, $4, 'active', $5)
         ON CONFLICT (email) DO UPDATE SET
           name = EXCLUDED.name,
           role = EXCLUDED.role,
           status = 'active',
           phone = EXCLUDED.phone,
           updated_at = NOW()`,
        [member.id, member.name, member.email, member.role, member.phone]
      );
    }

    const menuItems = [
      { id: 'menu-0001', name: 'Spicy Tandoori Chicken', description: 'Succulent chicken marinated in yogurt and spices, cooked in tandoor', price: 450, category: 'Main Courses', dietaryType: 'non-veg', available: true, image: '/menu-1.jpg' },
      { id: 'menu-0002', name: 'Butter Chicken', description: 'Tender chicken in rich tomato-based cream sauce', price: 480, category: 'Main Courses', dietaryType: 'non-veg', available: true, image: '/menu-2.jpg' },
      { id: 'menu-0003', name: 'Lamb Biryani', description: 'Fragrant basmati rice layered with spiced lamb', price: 520, category: 'Rice Dishes', dietaryType: 'non-veg', available: true, image: '/menu-3.jpg' },
      { id: 'menu-0004', name: 'Paneer Tikka Masala', description: 'Cottage cheese in creamy tomato sauce', price: 380, category: 'Vegetarian', dietaryType: 'veg', available: true, image: '/menu-4.jpg' },
      { id: 'menu-0005', name: 'Samosa (4 pcs)', description: 'Crispy triangular pastry with spiced potato filling', price: 150, category: 'Appetizers', dietaryType: 'veg', available: true, image: '/menu-5.jpg' },
      { id: 'menu-0006', name: 'Naan Bread', description: 'Traditional Indian flatbread', price: 80, category: 'Breads', dietaryType: 'veg', available: true, image: '/menu-6.jpg' },
    ] as const;

    for (const item of menuItems) {
      await client.query(
        `INSERT INTO spiceestreet.menu_items (id, name, description, price, category, dietary_type, available, image)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           price = EXCLUDED.price,
           category = EXCLUDED.category,
           dietary_type = EXCLUDED.dietary_type,
           available = EXCLUDED.available,
           image = EXCLUDED.image,
           updated_at = NOW()`,
        [item.id, item.name, item.description, item.price, item.category, item.dietaryType, item.available, item.image]
      );
    }

    const tables = [
      { id: 'table-01', name: 'T1', capacity: 2, active: true },
      { id: 'table-02', name: 'T2', capacity: 4, active: true },
      { id: 'table-03', name: 'T3', capacity: 4, active: true },
      { id: 'table-04', name: 'T4', capacity: 6, active: true },
    ] as const;

    for (const table of tables) {
      await client.query(
        `INSERT INTO spiceestreet.dining_tables (id, name, capacity, active)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           capacity = EXCLUDED.capacity,
           active = EXCLUDED.active,
           updated_at = NOW()`,
        [table.id, table.name, table.capacity, table.active]
      );
    }

    const inventoryItems = [
      { id: 'inv-0001', name: 'Chicken Breast', quantity: 15, unit: 'kg', minThreshold: 10, costPerUnit: 260, supplier: 'Fresh Farms Ltd', lastRestocked: '2026-05-20T09:00:00Z' },
      { id: 'inv-0002', name: 'Basmati Rice', quantity: 5, unit: 'kg', minThreshold: 20, costPerUnit: 120, supplier: 'Premium Grains', lastRestocked: '2026-05-17T09:00:00Z' },
      { id: 'inv-0003', name: 'Lamb', quantity: 8, unit: 'kg', minThreshold: 5, costPerUnit: 540, supplier: 'Fresh Farms Ltd', lastRestocked: '2026-05-22T09:00:00Z' },
      { id: 'inv-0004', name: 'Paneer', quantity: 12, unit: 'kg', minThreshold: 8, costPerUnit: 210, supplier: 'Dairy Fresh', lastRestocked: '2026-05-19T09:00:00Z' },
      { id: 'inv-0005', name: 'Spices Mix', quantity: 3, unit: 'kg', minThreshold: 2, costPerUnit: 300, supplier: 'Spice Masters', lastRestocked: '2026-05-12T09:00:00Z' },
    ] as const;

    for (const item of inventoryItems) {
      await client.query(
        `INSERT INTO inventory_items (id, name, quantity, unit, min_threshold, cost_per_unit, supplier, last_restocked)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           quantity = EXCLUDED.quantity,
           unit = EXCLUDED.unit,
           min_threshold = EXCLUDED.min_threshold,
           cost_per_unit = EXCLUDED.cost_per_unit,
           supplier = EXCLUDED.supplier,
           last_restocked = EXCLUDED.last_restocked,
           updated_at = NOW()`,
        [item.id, item.name, item.quantity, item.unit, item.minThreshold, item.costPerUnit, item.supplier, item.lastRestocked]
      );
    }

    await client.query(
      `INSERT INTO expenses (id, description, amount, category, status, submitted_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         description = EXCLUDED.description,
         amount = EXCLUDED.amount,
         category = EXCLUDED.category,
         status = EXCLUDED.status,
         submitted_by = EXCLUDED.submitted_by,
         updated_at = NOW()`,
      ['exp-0001', 'Fresh produce purchase', 4200, 'Inventory', 'approved', 'Rahul Kumar']
    );

    await client.query('COMMIT');
    console.log('Database seed completed successfully.');
    console.log('Demo logins:');
    console.log(`- admin@spiceestreet.com / ${demoPassword}`);
    console.log(`- cashier@spiceestreet.com / ${demoPassword}`);
    console.log(`- chef@spiceestreet.com / ${demoPassword}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Database seed failed.');
    console.error(error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

void seed();