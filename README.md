# Node.js E-commerce API

REST API for an e-commerce store built with Express 5 and MongoDB (Mongoose).

## Features

- JWT authentication (signup, login, forgot/reset password via email code)
- Role-based access (user, manager, admin)
- Categories, sub-categories, brands, products (with image upload and resizing)
- Reviews, wishlist, addresses, coupons
- Cart with coupon support
- Orders: cash and card payments via Stripe Checkout + webhook
- Filtering, sorting, field limiting, search and pagination

## Tech stack

Express 5, Mongoose, JWT, express-validator, Multer + Sharp, Nodemailer, Stripe

## Getting started

```bash
npm install
```

Create/fill `config.env` in the project root (it is git-ignored):

| Variable | Description |
| --- | --- |
| `PORT` | Server port |
| `BASE_URL` | Public base URL, e.g. `http://localhost:8000` (no quotes or semicolon) |
| `MONGODB_USERNAME`, `MONGODB_PASSWORD`, `MONGODB_NAME`, `MONGODB_URI` | MongoDB Atlas connection |
| `ATLAS_PUBLIC_KEY`, `ATLAS_PRIVATE_KEY`, `ATLAS_PROJECT_ID`, `ATLAS_ENTRY_COMMENT` | Used by the script that whitelists your IP in Atlas before start |
| `JWT_SECRET_KEY`, `JWT_EXPIRY_DATE` | JWT signing secret and lifetime |
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASSWORD` | SMTP settings for password reset emails |
| `STRIPE_SECRET`, `STRIPE_WEBHOOK_SECRET` | Stripe API key and webhook signing secret |

Run:

```bash
npm run start:dev   # nodemon, development
npm run start:prod  # production
```

Both scripts first run `seeders/auto-update-mongo-whitelist.js` to add your current IP to the Atlas access list.

Seed or clear the dummy products:

```bash
node utils/dummy_data/seeder.js -i   # import
node utils/dummy_data/seeder.js -d   # destroy
```

## API routes

All routes are prefixed with `/api/v1`.

| Resource | Path |
| --- | --- |
| Auth | `/auth` |
| Users | `/users` |
| Categories | `/categories` |
| Sub-categories | `/subcategories` |
| Brands | `/brands` |
| Products | `/products` |
| Reviews | `/reviews` |
| Wishlist | `/wishlist` |
| Addresses | `/addresses` |
| Coupons | `/coupons` |
| Cart | `/cart` |
| Orders | `/orders` |

Stripe webhook: `POST /webhook-checkout` (mounted outside `/api/v1` because it needs the raw request body).

## Stripe

See [STRIPE_TESTING.md](STRIPE_TESTING.md) for how to test the card payment flow locally with the Stripe CLI.

## Project structure

```text
app.js          Express app setup and middleware
server.js       Entry point (DB connection, listen)
routes/         Route definitions (mounted in routes/index.js)
services/       Request handlers / business logic
models/         Mongoose schemas
middlewares/    Error handling, validation, image upload
utils/          Helpers (API features, errors, tokens, email, validators, dummy data)
seeders/        Atlas IP whitelist script
uploads/        Uploaded images (git-ignored)
```
