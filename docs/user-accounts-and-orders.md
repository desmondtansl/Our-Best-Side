# User Accounts, Saved Addresses, Payment Methods & Orders

Signing up used to create an account with nothing to use it for. Customers now get an account page. Checkout records real orders and takes prices from our own database instead of matching Stripe products.

## What customers get

| Feature | Where | Notes |
|---------|-------|-------|
| **Account page** | `/account` (Navbar → **Account**) | Only for logged-in users. Signing up now logs you in and opens this page. |
| **Order history** | Account → **Orders** | Date, items, total, card used, shipping address and a status badge. |
| **Saved addresses** | Account → **Addresses** | Add, edit, delete and set a default (up to 10). The default is pre-selected in the cart. |
| **Payment methods** | Account → **Payment methods** | Cards saved in Stripe, shown as brand, last 4 digits and expiry. **Add a card** opens Stripe; **Remove** detaches the card. |
| **Order confirmation** | `/success` | Clears the cart and shows the order number, items and status. |

Guests can still check out. Their orders are visible to the admin but don't appear in any account.

## What admins get

**Dashboard → Manage Orders** (`/admin/orders`) lists every paid order, including guest orders. Each row has a status dropdown:

`Paid → Processing → Shipped → Delivered` (or `Cancelled`)

Customers see the new status on their account page straight away.

## How checkout works now

```
Cart ──POST /checkout/create-checkout-session { items: [{productId, quantity, size, color}], addressId? }
        │   server loads products from MongoDB and takes prices from the DB (client prices are ignored)
        │   creates Order { status: "pending" }
        │   logged in? → Stripe Customer (created once, id saved on the user)
        │                + "save card" option + shipping pre-filled from the chosen address
        ▼
Stripe Checkout (hosted) ── customer pays
        │
        ├─► redirect to /success?session_id=… → GET /checkout/order/:sessionId (polls until paid)
        │
        └─► Stripe webhook POST /checkout/webhook (signature verified)
              checkout.session.completed → Order.status = "paid"; saves shipping address, email, card brand/last4
              checkout.session.expired   → pending order deleted
```

- **Stripe products are no longer needed.** Line items are built from the product's title, image and price in MongoDB. The old `GET /checkout/get-product-info` endpoint and its description matching have been removed.
- **Card data never touches our server.** Only Stripe's payment method id, brand, last 4 digits and expiry are read, and none of them is stored except brand and last 4 on the order.
- The webhook is what makes an order "paid". If a customer closes the tab after paying, the order is still recorded.

## API reference

All responses use the existing `{ data, error }` shape.

### Checkout (`server/src/routes/checkout.js`, `webhook.js`)
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/checkout/create-checkout-session` | optional | Validates the cart (1–99 per item, max 50 lines), creates a pending order and returns the Stripe Checkout URL |
| GET | `/checkout/order/:sessionId` | none | Order summary for the success page (the session id acts as the key) |
| POST | `/checkout/webhook` | Stripe signature | Marks orders paid or deletes expired ones |

### Account (`server/src/routes/account.js`), all logged-in only
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/account` | Email and addresses |
| GET / POST | `/account/addresses` | List / add (validated; country is a 2-letter code) |
| PUT / DELETE | `/account/addresses/:id` | Update / delete. Exactly one address is always the default. |
| GET | `/account/orders` | This user's orders, newest first, excluding pending ones |
| GET | `/account/payment-methods` | Saved cards from Stripe |
| POST | `/account/payment-methods/setup-session` | Stripe Checkout in setup mode, for adding a card |
| DELETE | `/account/payment-methods/:id` | Detach a card; only allowed if it belongs to this user |

### Admin (`server/src/routes/adminOrders.js`), admin only
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/admin/orders?status=` | Orders, newest first (pending ones hidden unless asked for) |
| PATCH | `/admin/orders/:id` | `{ status }`, one of `paid, processing, shipped, delivered, cancelled` |

## Data model changes

- **`User`** gains `stripeCustomerId` and `addresses[]`: label, fullName, line1, line2, city, state, postalCode, country, phone and isDefault.
- **`Order`** is a new collection. It holds:
  - `user` (empty for guests) and `email`
  - `items[]`, a snapshot of each item: title, image, size, color, price and quantity
  - `subtotal` and `currency`
  - `shippingAddress` and `paymentMethod` (brand and last 4)
  - `stripeSessionId` and `stripePaymentIntentId`
  - `status`

  Item prices are copied into the order, so later product edits don't change past orders.

## Configuration

These are new variables on Render. They're already in `render.yaml` and `server/.env.example`; `docs/deploying-to-render.md` has the setup steps.

| Variable | Default | Purpose |
|----------|---------|---------|
| `STRIPE_WEBHOOK_SECRET` | none (required) | Verifies webhook calls. Without it, orders never become "paid". |
| `CURRENCY` | `sgd` | Checkout currency |
| `SHIPPING_COUNTRIES` | `SG` | Countries Stripe Checkout accepts for shipping, e.g. `SG,MY` |

## Other fixes in this change

- The signup, cart and account pages now show real error messages (for example "Email already in use" or "Can't reach the server") instead of `undefined`.
- Logging out clears the stored auth header, so later requests (including checkout) aren't sent as the old user.
- Cart items get unique React keys. Before, every item had the key `undefined`.

## Styling

The new pages use the site's existing look and add no new fonts or colours:

| Element | Style | Matches |
|---------|-------|---------|
| Font | Urbanist, from the global style in `client/index.html` (no font overrides) | Every existing page |
| Cards (orders, addresses, saved cards) | `0.5px solid lightgray`, `border-radius: 10px` | Cart order summary |
| Main buttons (Save address) | Black background, white text | "Checkout Now" |
| Secondary buttons (Add address, Add a card, Cancel) | `#e1d7c6` | Login / Signup buttons |
| Active tab underline, status badges | `teal` border, `#f8f4f4` background | Size and colour pickers on product pages, announcement bar |
| Error text, Delete links, Cancelled badge | `red` | Newsletter error message |
| Headings | Weight 300 | Cart and summary titles |

Confirmed in Chromium with the real Urbanist font loaded: the computed styles on the new pages match the values above and the existing Login page.

## Verification

| Check | Result |
|-------|--------|
| Server tests (`npm test -w server`) | **53 / 53 pass** (35 new) |
| Client tests (`npm test -w client`) | **29 / 29 pass** (18 new) |
| Client production build (`npm run build -w client`) | Passes |
| End-to-end browser run | **9 / 9 steps pass**, no page errors |

- **Server tests** (`server/test/checkout.test.js`, `account.test.js`, `adminOrders.test.js`) cover:
  - checkout: DB pricing, rejected carts, guest and logged-in checkout
  - webhook: signature checks, the paid and expired paths, idempotency
  - account: address validation and default handling, card ownership checks
  - admin: permissions

  Stripe API calls are faked; webhook signatures are verified for real.
- **Client tests** cover the Account, Cart, Success, AdminOrders and Signup pages.
- **End-to-end run:** Chromium against the real server and client, with an in-memory MongoDB and a faked Stripe. Steps:
  1. Sign up
  2. Add an address
  3. Add to cart (saved address pre-selected)
  4. Check out
  5. Webhook marks the order paid; the success page shows it
  6. Order history shows it
  7. Add a card
  8. Admin marks the order shipped
  9. Customer sees "Shipped"

**Not yet tested against real Stripe.** After deploying, do one test purchase with card `4242 4242 4242 4242`. See [Deployment checklist](#deployment-checklist).

## Files changed

**Server**
| File | Change |
|------|--------|
| `src/models/Order.js` | **New.** Order model and status list |
| `src/models/User.js` | Added `stripeCustomerId` and `addresses[]` |
| `src/stripe.js` | **New.** Shared Stripe client and `ensureStripeCustomer()` |
| `src/middleware/optionalAuth.js` | **New.** Lets guests through at checkout |
| `src/routes/checkout.js` | Rewritten: DB-priced checkout, order summary endpoint; old Stripe product lookup removed |
| `src/routes/webhook.js` | **New.** Stripe webhook handler |
| `src/routes/account.js` | **New.** Account, addresses, orders and payment methods |
| `src/routes/adminOrders.js` | **New.** Admin order list and status updates |
| `src/app.js` | Mounts the new routes; raw body for the webhook; allows `PATCH` in CORS |
| `test/helpers.js` | Stripe stub and test env vars |
| `test/checkout.test.js`, `account.test.js`, `adminOrders.test.js` | **New** tests |

**Client**
| File | Change |
|------|--------|
| `src/pages/Account.jsx` | **New.** Account page with tabs |
| `src/components/account/OrderHistory.jsx`, `SavedAddresses.jsx`, `PaymentMethods.jsx`, `styles.js` | **New.** Tab contents and shared styles |
| `src/pages/AdminOrders.jsx` | **New.** Admin orders page |
| `src/routes/UserRoutes.jsx` | **New.** Login-required route guard |
| `src/utils/format.js`, `redirect.js` | **New.** Money, date and error helpers; Stripe redirect |
| `src/pages/Cart.jsx` | New checkout request, "Ship to" picker, error message, unique item keys |
| `src/pages/Success.jsx` | Clears the cart and shows the order, waiting for payment confirmation |
| `src/pages/Signup.jsx` | Logs in after signup; readable errors |
| `src/pages/AdminDashboard.jsx` | "Manage Orders" link |
| `src/components/Navbar.jsx` | "Account" link when logged in |
| `src/context/Auth.jsx` | Clears the auth header when logged out |
| `src/App.jsx` | `/account` and `/admin/orders` routes |
| `src/pages/*.test.jsx` | **New** tests |

**Config and docs:** `render.yaml`, `server/.env.example`, `docs/deploying-to-render.md` (Stripe webhook section), this file, and `docs/phase-1-security-and-admin-fixes.md` (Phase 2 checkout items marked done).

## Deployment checklist

Infrastructure set up during this build:

- [x] New MongoDB Atlas cluster **OurBestSide** (the old cluster ran a MongoDB version Atlas no longer supports and couldn't be resumed)
- [x] Backend moved from Cyclic (shut down) to Render, using `render.yaml`
- [x] Netlify `VITE_BASE_URL` pointed at the Render service, and the site redeployed from `main`

Still to do for this feature:

- [ ] Merge this PR. Netlify and Render both redeploy from `main`.
- [ ] Stripe (Test mode) → **Developers → Webhooks** → add an endpoint:
  - URL: `https://<render-service>.onrender.com/checkout/webhook`
  - Scope: **Your account**
  - Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`
- [ ] Render → **Environment**: add `STRIPE_WEBHOOK_SECRET` (the `whsec_...` value). Optionally add `CURRENCY=sgd` and `SHIPPING_COUNTRIES=SG`; these are also the defaults.
- [ ] Test purchase with `4242 4242 4242 4242`. The order should show as **Paid** under Account → Orders and in Dashboard → Manage Orders.
- [ ] Give your own user admin rights in Atlas (`users` → `isAdmin: true`) to use Manage Orders.

## Known limitations / follow-ups

- **Stock isn't reduced** when an order is paid (`inStock` is unchanged).
- **No emails are sent.** Stripe can send receipts: turn them on in Stripe → Settings → Customer emails.
- **Saved cards at checkout:** reusing a saved card in Stripe Checkout depends on the customer ticking "save" at checkout, and on your Stripe account's Checkout settings. Cards added from the account page are always listed there.
- **Existing mobile layout:** the site's shared page layout is about 10px wider than a 390px phone screen (this happens on existing pages too). That's for the Phase 3 UI clean-up.
