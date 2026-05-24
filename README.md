# Allo Inventory

Multi-warehouse inventory reservation system with real-time stock management and automated expiry handling.

## Live Demo

https://allo-health-beige-eight.vercel.app

## Getting Started

### Prerequisites

- Node.js 18 or higher
- PostgreSQL database (Neon, Supabase, or Railway recommended)

### Installation

```bash
git clone <your-repo>
cd allo-inventory
npm install
```

### Configuration

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Update the following variables:

| Variable       | Required | Description                                                           |
| -------------- | -------- | --------------------------------------------------------------------- |
| `DATABASE_URL` | Yes      | PostgreSQL connection string with SSL enabled                         |
| `CRON_SECRET`  | No       | Bearer token for cron endpoint authentication                         |

### Database Setup

```bash
# Push schema to database
npm run db:push

# Seed with sample data
npm run db:seed
```

This creates 3 warehouses, 6 products, and 18 inventory records for testing.

### Development

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## API Documentation

### Products

**GET** `/api/products`

Returns all products with stock availability across warehouses.

### Warehouses

**GET** `/api/warehouses`

Returns list of all warehouse locations.

### Reservations

**POST** `/api/reservations`

Creates a new reservation. Returns 409 if insufficient stock.

Request body:
```json
{
  "productId": "string",
  "warehouseId": "string",
  "quantity": number
}
```

Optional header: `Idempotency-Key` for safe retries.

**POST** `/api/reservations/:id/confirm`

Confirms a reservation after payment. Returns 410 if expired.

**POST** `/api/reservations/:id/release`

Releases a reservation, returning stock to available inventory.

### Cron Jobs

**POST** `/api/cron/cleanup`

Releases expired pending reservations. Protected by `CRON_SECRET` bearer token.

## Architecture

### Concurrency Control

The reservation system uses PostgreSQL row-level locking to prevent race conditions:

```sql
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;

SELECT * FROM "Inventory" 
WHERE "productId" = $1 AND "warehouseId" = $2
FOR UPDATE;

-- Check availability within lock
-- Update reserved count atomically

COMMIT;
```

This ensures that when multiple requests compete for limited stock, only one succeeds while others receive a 409 response.

### Expiry Management

Two mechanisms handle reservation expiry:

1. **Scheduled cleanup**: Vercel Cron runs `/api/cron/cleanup` every minute
2. **Lazy validation**: Confirm endpoint checks expiry before processing

This dual approach ensures expired reservations are released promptly while preventing confirmation of stale reservations.

### Idempotency

Reservation endpoints support idempotency keys to handle network retries safely. The key is stored with a unique constraint, ensuring duplicate requests return the original reservation rather than creating duplicates.

## Data Model

The system uses four main entities:

**Product** - Items available for purchase  
**Warehouse** - Physical storage locations  
**Inventory** - Stock levels per product/warehouse combination  
**Reservation** - Customer holds with expiry

### Stock Calculation

Available stock is computed as `total - reserved`:
- `total`: Physical units in warehouse
- `reserved`: Units in pending reservations
- `available`: Units customers can currently reserve

### Reservation Lifecycle

1. **PENDING**: Created with 10-minute expiry, stock reserved
2. **CONFIRMED**: Payment processed, stock decremented
3. **RELEASED**: Expired or cancelled, stock returned

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Prisma ORM
- PostgreSQL
- Tailwind CSS
- Vercel (deployment & cron)

## Project Structure

```
src/
├── app/
│   ├── page.tsx                          # Product catalog
│   ├── reservation/[id]/page.tsx         # Reservation checkout
│   └── api/
│       ├── products/route.ts
│       ├── warehouses/route.ts
│       ├── reservations/
│       │   ├── route.ts                  # Create reservation
│       │   └── [id]/
│       │       ├── confirm/route.ts
│       │       └── release/route.ts
│       └── cron/cleanup/route.ts
├── components/
│   ├── ProductCard.tsx
│   └── ReservationTimer.tsx
├── lib/
│   ├── prisma.ts
│   └── errors.ts
└── types/index.ts

prisma/
├── schema.prisma
└── seed.ts
```

## Development Tools

```bash
# Database management
npm run db:studio      # Open Prisma Studio
npm run db:push        # Sync schema to database
npm run db:migrate     # Create migration

# Development
npm run dev            # Start dev server
npm run build          # Production build
npm run lint           # Run ESLint
```

## Deployment

The application is designed for Vercel deployment:

1. Connect your repository to Vercel.
2. Add the `DATABASE_URL` environment variable.
3. Add `CRON_SECRET` if you want to protect manual calls to `/api/cron/cleanup`.
4. Deploy.

Vercel Cron will run `/api/cron/cleanup` every minute using the schedule in `vercel.json`.
The cleanup route also accepts Vercel Cron requests directly through the `x-vercel-cron` header.

## Testing Concurrency

To test race condition handling, make simultaneous requests for limited stock:

```bash
# Reserve last unit (run both commands together)
curl -X POST http://localhost:3000/api/reservations \
  -H "Content-Type: application/json" \
  -d '{"productId":"...","warehouseId":"...","quantity":1}' &

curl -X POST http://localhost:3000/api/reservations \
  -H "Content-Type: application/json" \
  -d '{"productId":"...","warehouseId":"...","quantity":1}' &
```

Expected: One request succeeds (201), the other fails (409).
