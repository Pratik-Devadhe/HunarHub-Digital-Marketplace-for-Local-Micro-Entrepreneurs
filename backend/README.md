# HunarHub MVC Controller Pack

## Important
1. Apply `database/feasibility_patch.sql` before using the order controller.
2. Install `razorpay` for payment routes:
   `npm install razorpay`
3. Keep `.env` outside Git and provide:
   `JWT_SECRET`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`.
4. The project intentionally does not use `/api` at the beginning of endpoints.
5. Every controller database operation uses `withTransaction()`, including reads.
6. Order creation intentionally allows products from only one entrepreneur because the current order-level status model cannot safely represent multi-entrepreneur fulfillment.

## Flow
Route -> Auth/Role Middleware -> Controller -> PostgreSQL transaction

## Next work
Add request validation (Joi/Zod), centralized error middleware, upload storage, Razorpay webhook signature verification, pagination, and automated integration tests.
