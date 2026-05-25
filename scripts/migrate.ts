import 'dotenv/config';
import { pool } from '../lib/db';

async function migrate() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query('CREATE SCHEMA IF NOT EXISTS spiceestreet');

    await client.query(`
      CREATE TABLE IF NOT EXISTS spiceestreet.users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('admin', 'accountant', 'chef')),
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query("ALTER TABLE spiceestreet.users ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'");
    await client.query("ALTER TABLE spiceestreet.users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()");
    await client.query("ALTER TABLE spiceestreet.users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()");

    await client.query(`
      CREATE TABLE IF NOT EXISTS staff (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL CHECK (role IN ('admin', 'accountant', 'chef', 'waiter')),
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
        phone TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query("ALTER TABLE staff ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'");
    await client.query('ALTER TABLE staff ADD COLUMN IF NOT EXISTS phone TEXT');
    await client.query("ALTER TABLE staff ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()");
    await client.query("ALTER TABLE staff ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()");

    await client.query(`
      CREATE TABLE IF NOT EXISTS spiceestreet.menu_items (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        price NUMERIC(10, 2) NOT NULL,
        category TEXT NOT NULL,
        dietary_type TEXT NOT NULL DEFAULT 'veg' CHECK (dietary_type IN ('veg', 'non-veg')),
        available BOOLEAN NOT NULL DEFAULT TRUE,
        image TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query("ALTER TABLE spiceestreet.menu_items ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT ''");
    await client.query("ALTER TABLE spiceestreet.menu_items ADD COLUMN IF NOT EXISTS dietary_type TEXT NOT NULL DEFAULT 'veg'");
    await client.query("ALTER TABLE spiceestreet.menu_items ADD COLUMN IF NOT EXISTS available BOOLEAN NOT NULL DEFAULT TRUE");
    await client.query('ALTER TABLE spiceestreet.menu_items ADD COLUMN IF NOT EXISTS image TEXT');
    await client.query("ALTER TABLE spiceestreet.menu_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()");
    await client.query("ALTER TABLE spiceestreet.menu_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()");

    await client.query(`
      CREATE TABLE IF NOT EXISTS spiceestreet.dining_tables (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        capacity INTEGER NOT NULL DEFAULT 4,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query("ALTER TABLE spiceestreet.dining_tables ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE");
    await client.query("ALTER TABLE spiceestreet.dining_tables ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()");
    await client.query("ALTER TABLE spiceestreet.dining_tables ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()");

    await client.query(`
      CREATE TABLE IF NOT EXISTS spiceestreet.orders (
        id TEXT PRIMARY KEY,
        order_type TEXT NOT NULL CHECK (order_type IN ('dining', 'takeaway')),
        table_id TEXT,
        table_number TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'completed', 'cancelled')),
        subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0,
        total NUMERIC(10, 2) NOT NULL DEFAULT 0,
        payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid')),
        payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'digital')),
        misc_label TEXT,
        misc_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
        billing_note TEXT,
        notes TEXT,
        paid_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT orders_table_fk
          FOREIGN KEY (table_id)
          REFERENCES spiceestreet.dining_tables(id)
          ON DELETE SET NULL
      )
    `);
    await client.query("ALTER TABLE spiceestreet.orders ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid'");
    await client.query('ALTER TABLE spiceestreet.orders ADD COLUMN IF NOT EXISTS payment_method TEXT');
    await client.query('ALTER TABLE spiceestreet.orders ADD COLUMN IF NOT EXISTS misc_label TEXT');
    await client.query("ALTER TABLE spiceestreet.orders ADD COLUMN IF NOT EXISTS misc_amount NUMERIC(10, 2) NOT NULL DEFAULT 0");
    await client.query('ALTER TABLE spiceestreet.orders ADD COLUMN IF NOT EXISTS billing_note TEXT');
    await client.query('ALTER TABLE spiceestreet.orders ADD COLUMN IF NOT EXISTS notes TEXT');
    await client.query('ALTER TABLE spiceestreet.orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ');
    await client.query("ALTER TABLE spiceestreet.orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()");
    await client.query("ALTER TABLE spiceestreet.orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()");

    await client.query(`
      CREATE TABLE IF NOT EXISTS spiceestreet.order_items (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        menu_item_id TEXT,
        name TEXT NOT NULL,
        price NUMERIC(10, 2) NOT NULL,
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'completed')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT order_items_order_fk
          FOREIGN KEY (order_id)
          REFERENCES spiceestreet.orders(id)
          ON DELETE CASCADE,
        CONSTRAINT order_items_menu_item_fk
          FOREIGN KEY (menu_item_id)
          REFERENCES spiceestreet.menu_items(id)
          ON DELETE SET NULL
      )
    `);
    await client.query("ALTER TABLE spiceestreet.order_items ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'");
    await client.query("ALTER TABLE spiceestreet.order_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()");
    await client.query("ALTER TABLE spiceestreet.order_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()");

    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory_items (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        quantity NUMERIC(10, 2) NOT NULL DEFAULT 0,
        unit TEXT NOT NULL,
        min_threshold NUMERIC(10, 2) NOT NULL DEFAULT 0,
        cost_per_unit NUMERIC(10, 2) NOT NULL DEFAULT 0,
        supplier TEXT,
        last_restocked TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query("ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS min_threshold NUMERIC(10, 2) NOT NULL DEFAULT 0");
    await client.query("ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS cost_per_unit NUMERIC(10, 2) NOT NULL DEFAULT 0");
    await client.query('ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS supplier TEXT');
    await client.query('ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS last_restocked TIMESTAMPTZ');
    await client.query("ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()");
    await client.query("ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()");

    await client.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        description TEXT NOT NULL,
        amount NUMERIC(10, 2) NOT NULL,
        category TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        submitted_by TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query("ALTER TABLE expenses ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'");
    await client.query('ALTER TABLE expenses ADD COLUMN IF NOT EXISTS submitted_by TEXT');
    await client.query("ALTER TABLE expenses ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()");
    await client.query("ALTER TABLE expenses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()");

    await client.query('CREATE INDEX IF NOT EXISTS idx_users_email ON spiceestreet.users (LOWER(email))');
    await client.query('CREATE INDEX IF NOT EXISTS idx_staff_email ON staff (LOWER(email))');
    await client.query('CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON spiceestreet.order_items (order_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_orders_created_at ON spiceestreet.orders (created_at DESC)');

    await client.query('COMMIT');
    console.log('Database migration completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Database migration failed.');
    console.error(error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

void migrate();