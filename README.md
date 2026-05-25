# Spicee Street POS

Restaurant point-of-sale system built with Next.js, React, TypeScript, and PostgreSQL.

This README is written for the exact use case of pulling the project onto another machine, setting up PostgreSQL locally, and exposing the running app through ngrok.

## Prerequisites

- Git
- Node.js 20+
- npm 10+
- PostgreSQL 15+ running locally
- ngrok installed and authenticated

If ngrok is not configured yet, run:

```bash
ngrok config add-authtoken YOUR_NGROK_AUTHTOKEN
```

## 1. Clone the project

```bash
git clone YOUR_GITHUB_REPO_URL SpiceeStreetPOS
cd SpiceeStreetPOS
```

## 2. Install dependencies

```bash
npm install
```

## 3. Create the local PostgreSQL database

Create the database first:

```bash
createdb spiceestreet_pos
```

If you use a different Postgres user, password, port, or database name, adjust the connection string in the next step.

## 4. Configure environment variables

Copy the example env file:

```bash
cp .env.example .env
```

Default local value:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/spiceestreet_pos"
```

Update `.env` so it matches your local PostgreSQL credentials.

## 5. Run database migration

This creates the required schemas and tables used by the app.

```bash
npm run db:migrate
```

What this creates:

- `spiceestreet.users`
- `spiceestreet.menu_items`
- `spiceestreet.dining_tables`
- `spiceestreet.orders`
- `spiceestreet.order_items`
- `staff`
- `inventory_items`
- `expenses`

## 6. Seed demo data

This adds sample users, staff, menu items, tables, inventory, and one sample expense.

```bash
npm run db:seed
```

Demo login credentials:

- `admin@spiceestreet.com` / `password123`
- `cashier@spiceestreet.com` / `password123`
- `chef@spiceestreet.com` / `password123`

## 7. Start the application locally

```bash
npm run dev
```

Open the app at:

```text
http://localhost:3000
```

## 8. Start ngrok

In a new terminal, inside any directory, run:

```bash
ngrok http 3000
```

ngrok will give you a public HTTPS URL similar to:

```text
https://example-name.ngrok-free.app
```

Use that URL to access the app from another device.

## Recommended startup sequence on a fresh machine

After the first-time setup, the normal workflow is:

```bash
npm run dev
```

And in another terminal:

```bash
ngrok http 3000
```

## Full first-time setup commands

```bash
git clone YOUR_GITHUB_REPO_URL SpiceeStreetPOS
cd SpiceeStreetPOS
npm install
cp .env.example .env
createdb spiceestreet_pos
npm run db:migrate
npm run db:seed
npm run dev
```

Then in another terminal:

```bash
ngrok http 3000
```

## Troubleshooting

### Database connection failed

Check that PostgreSQL is running and that `DATABASE_URL` in `.env` is correct.

### `npm run db:migrate` or `npm run db:seed` fails

Most commonly this means:

- PostgreSQL is not running
- the database in `DATABASE_URL` does not exist yet
- the username or password in `DATABASE_URL` is wrong

### ngrok command fails

Make sure ngrok is installed and authenticated:

```bash
ngrok config add-authtoken YOUR_NGROK_AUTHTOKEN
```

### Port 3000 already in use

Run the app on a different port:

```bash
npm run dev -- --port 3001
```

Then expose that port instead:

```bash
ngrok http 3001
```

## Production-style run

If you want to test the built app locally instead of the dev server:

```bash
npm run build
npm start
```

Then expose it with:

```bash
ngrok http 3000
```