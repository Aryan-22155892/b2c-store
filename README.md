# B2C Store Application

A full-stack Business-to-Consumer store application built with **React**, **Node.js/Express**, **Prisma**, and **PostgreSQL**.

This project extends the backend API with a complete responsive frontend, mock checkout, purchase history, admin dashboard, API documentation, backend tests, frontend E2E tests, and a GitHub Actions CI pipeline.

---

## Features

| Requirement | Implemented |
|---|---|
| User authentication | Register/login with JWT, role-based access for USER and ADMIN |
| Product browsing | Product cards with name, description, price, category, stock, and image |
| Product search/filter | Search by product name, filter by category, sort by price/name/newest |
| Shopping cart | Add items, update quantity, remove items, view cart subtotal |
| Mock payment | Checkout converts cart to paid order; card number `0000` simulates decline |
| Purchase history | Users can view previous orders with date, status, items, and total |
| Admin dashboard | Dashboard stats, product create/edit/delete, purchase record table |
| API documentation | Swagger UI at `/api/docs` |
| E2E tests | Playwright tests for user purchase flow and admin dashboard |
| CI pipeline | GitHub Actions runs install, Prisma, API tests, frontend build, and E2E tests |

---

## Tech Stack

- **Frontend**: React + Vite + responsive custom CSS
- **Backend**: Node.js + Express REST API
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: JWT + bcryptjs
- **Testing**: Jest/Supertest for API tests, Playwright for E2E tests
- **Docs**: Swagger UI
- **CI**: GitHub Actions

---

## Project Structure

```txt
b2c-store/
├── client/                 # React frontend
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       └── styles.css
├── e2e/                    # Playwright E2E tests
├── prisma/                 # Prisma schema and seed data
├── src/                    # Express backend
│   ├── controllers/
│   ├── routes/
│   ├── middleware/
│   ├── docs/
│   └── index.js
├── tests/                  # Jest API tests
├── .github/workflows/ci.yml
├── package.json
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 16+

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/b2c_store?schema=public"
JWT_SECRET="change-me-to-a-long-random-secret"
JWT_EXPIRES_IN="7d"
PORT=3000
NODE_ENV=development
RATE_LIMIT_MAX=100
```

### 3. Set up the database

```bash
npx prisma migrate dev --name init
npm run db:seed
```

Seed accounts:

```txt
Admin: admin@store.com / admin123
User:  user@store.com  / user123
```

### 4. Run the app in development

Open two terminals:

```bash
npm run dev
```

```bash
npm run dev:client
```

Frontend: `http://localhost:5173`  
Backend API: `http://localhost:3000/api`  
Swagger docs: `http://localhost:3000/api/docs`

You can also run both with:

```bash
npm run dev:full
```

---

## Production Build

```bash
npm run build
npm start
```

After building, Express serves the React app from `dist/` and the API from `/api`.

Production URL locally: `http://localhost:3000`

---

## Running Tests

### API tests

```bash
npm test
npm run test:coverage
```

### E2E tests

First seed the database and build the frontend:

```bash
npm run db:seed
npm run build
npx playwright install chromium
npm run test:e2e
```

The E2E test checks:

1. User can log in.
2. User can browse products.
3. User can add an item to cart.
4. User can checkout with mock payment.
5. User can view purchase history.
6. Admin can open the dashboard and manage products.

---

## API Documentation

Interactive Swagger documentation is available at:

```txt
/api/docs
```

### Base URL

```txt
/api
```

### Auth endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Register a new user |
| POST | `/auth/login` | Login and receive JWT |
| GET | `/auth/me` | Get logged-in user profile |

### Product endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/products` | List products with search/filter/sort |
| GET | `/products/:id` | Get one product |
| POST | `/products` | Create product, admin only |
| PATCH | `/products/:id` | Update product, admin only |
| DELETE | `/products/:id` | Delete product, admin only |

### Cart endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/cart` | View cart |
| POST | `/cart` | Add product to cart |
| PATCH | `/cart/:productId` | Update cart quantity |
| DELETE | `/cart/:productId` | Remove product from cart |
| DELETE | `/cart` | Clear cart |

### Order endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/orders/checkout` | Mock payment checkout |
| GET | `/orders` | User purchase history |
| GET | `/orders/:id` | Order detail |

### Admin endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/admin/stats` | Dashboard stats |
| GET | `/admin/orders` | All purchase records |
| GET | `/admin/users` | All users |
| PATCH | `/admin/users/:id/role` | Change user role |

Protected routes require:

```txt
Authorization: Bearer <token>
```

---

## Deployment Notes

### Render example

1. Create a PostgreSQL database.
2. Create a Web Service connected to this repository.
3. Set environment variables: `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `NODE_ENV=production`.
4. Build command:

```bash
npm install && npx prisma generate && npx prisma migrate deploy && npm run build
```

5. Start command:

```bash
npm start
```

### Vercel/Netlify frontend + hosted API

For split deployment, set frontend env variable:

```env
VITE_API_URL=https://your-api-url.com/api
```

---

## Submission Checklist

Before submitting, do **not** include:

```txt
node_modules/
.git/
.env
coverage/
playwright-report/
test-results/
```

Include:

```txt
client/
e2e/
prisma/
src/
tests/
.github/
.env.example
.gitignore
package.json
package-lock.json, if available
README.md
```

---

## Demo Video Guide

For the 3–5 minute demo video, show:

1. Login as a user.
2. Browse products.
3. Search/filter products.
4. Add product to cart.
5. Checkout using mock payment.
6. View purchase history.
7. Login as admin.
8. Open dashboard, add/edit/delete a product, and view purchase records.
9. Briefly show API docs and CI workflow file.

---

## Notes

- This app uses a mock payment flow for assignment purposes.
- `0000` as card number intentionally fails payment.
- Product images use placeholder URLs in seed data.
