# Cart Page: Layout, Quantity Controls, Footer & Stripe Errors

## What was wrong

| Issue | Cause |
|-------|-------|
| Product, Color, Size, Qty and Price looked scattered and misaligned | Each item used a 400px-wide photo with the details spread over its full height, and the Qty/Price column had a fixed 150px right margin |
| No way to change the quantity or remove an item in the cart | Not built |
| Footer "bumped up" instead of at the bottom | The page had no full-height layout. The Order Summary box had a fixed height (`50vh`) while "Reset Cart" sat 350px below "Checkout Now", so it overflowed the box. The site-wide footer also had a fixed 60px height its content didn't fit in. |
| Stripe message shown to shoppers ("You did not provide an API key…") | The backend has no Stripe secret key (`STRIPE_PRIVATE_KEY` is missing or misnamed on Render), and the raw Stripe error was passed straight to the page |

## What changed

### Cart items (`client/src/pages/Cart.jsx`)
- **Row layout:** each line is one aligned row: **photo | details | − qty + | price**. The quantity control and price are vertically centred on the photo, and rows are separated by a light grey line.
- **Details:**
  - product name, 18px
  - `Color: …` and `Size: …` in smaller text (a line is hidden if the product has no colour or size)
  - the unit price, e.g. `$250.00 each`
- **Line price:** right-aligned, formatted as money (`$500.00` instead of `$ 500`).
- **Mobile (≤768px):** the photo sits on the left, details on the right, and the quantity control and price below the details. Nothing overflows horizontally.
- **Empty cart:** shows "Your cart is empty." with a Start shopping link. Checkout Now is disabled and Reset Cart is hidden.

### Removing an item
- A red, underlined **Remove** link under each item's details, styled like the Delete links on the account page.
- It deletes that line immediately (no confirmation, since it's easy to add back). The totals and the cart badge in the navbar update.
- Removing the last item shows the empty-cart message.
- In the cart state: a new `removeProduct({ index })` action.

### Quantity controls
- **The buttons:** **−** and **+** either side of the quantity, using the same teal quantity box as the product page.
- **What happens on each click:**
  - **+** adds 1, up to the product's stock when it's known
  - **−** removes 1, down to 1 (it's disabled at 1)
  - the line price, subtotal and total update straight away
- **At checkout:** the edited quantity is what's sent, and the server still checks prices and quantities.
- **In the cart state** (`client/src/redux/cartRedux.js`):
  - new `changeQuantity({ index, delta })` action and `maxQuantity(product)` helper
  - totals are now calculated in cents, so repeated edits never produce values like `177.10000000000002`

### Order Summary
- Subtotal and Total use the same money format.
- The box grows with its content instead of using a fixed height.
- Reset Cart sits directly under Checkout Now.

### Footer
- **Cart page:** it's now a full-height column, so the footer is at the bottom of the window even when the cart is empty or short.
- **Every page:** the footer (`client/src/components/Footer.jsx`) uses `min-height: 60px` instead of `height: 60px`, so it fits its content rather than spilling 20px (more on phones) below the page.

### Stripe errors (`server/src/stripe.js`, `routes/checkout.js`, `routes/account.js`)
Shoppers never see Stripe's internal messages any more:

| Situation | Shopper sees | Server log (Render → Logs) |
|-----------|--------------|------------------------------|
| `STRIPE_PRIVATE_KEY` not set | *Payments aren't set up yet. Please try again later.* (HTTP 503). No order is created. | `STRIPE_PRIVATE_KEY is not set; payments are disabled.` |
| Stripe rejects the request (wrong key, Stripe outage…) | *We couldn't reach our payment provider. Please try again in a moment.* (HTTP 502). The pending order is removed. | `Stripe error while trying to start checkout: <Stripe's message>` |

The same applies to the saved-cards features on the account page.

## Fixing the live Stripe error (Render)

The live error means the backend has no Stripe secret key. In Render → **ourbestside-api** → **Environment**:

1. Check there's a variable named exactly **`STRIPE_PRIVATE_KEY`**, not `STRIPE_SECRET_KEY` or anything else.
2. Its value must be the **secret** key from Stripe → Developers → API keys:
   - it starts with `sk_test_` (test mode) or `sk_live_`
   - not the publishable `pk_...` key
   - no quotes or spaces
3. **Save Changes** and wait for the redeploy.
4. Try checkout again with card `4242 4242 4242 4242`. If it still fails, the Render logs show the exact Stripe error.

## Files changed

| File | Change |
|------|--------|
| `client/src/pages/Cart.jsx` | New aligned row layout, − / + quantity controls, Remove link, money formatting, empty state, full-height page, summary box fits its content |
| `client/src/redux/cartRedux.js` | `changeQuantity` and `removeProduct` actions, `maxQuantity` helper, totals calculated in cents |
| `client/src/components/Footer.jsx` | `min-height` instead of a fixed height |
| `server/src/stripe.js` | `isStripeConfigured()`, `paymentErrorResponse()`, `paymentsNotConfigured()` |
| `server/src/routes/checkout.js` | Friendly errors; returns 503 before creating an order when the key is missing |
| `server/src/routes/account.js` | Friendly errors for saved cards and adding a card |
| `client/src/redux/cartRedux.test.js` | **New.** Totals, quantity limits, rounding, removing lines |
| `client/src/pages/Cart.test.jsx` | Item details, + / − and totals, Remove updating totals and badge count, stock limit, edited quantity sent to checkout, empty state |
| `server/test/checkout.test.js` | Stripe failures hide Stripe's message; missing key returns 503 with no order |

## Verification

| Check | Result |
|-------|--------|
| Server tests | **75 / 75 pass** |
| Client tests | **59 / 59 pass** (11 new) |
| Client build | Passes |
| Browser run | **8 / 8 steps pass**, no page errors |

The browser run used the real client and server, an in-memory database and real product photos. Steps:
1. Empty cart: the footer is at the bottom of the window.
2. Two products in the cart: in each row, the quantity box and price are centred on the photo.
3. **+ +** gives quantity 3 and a total of $830.00; **−** gives $580.00.
4. The footer is the last thing on the page (no overflow).
5. Checkout with Stripe unreachable shows the friendly message. The Stripe details appear only in the server log.
6. The mobile layout (390px) has no horizontal overflow.
7. **Remove** deletes a line: 1 item left, total $80.00, cart badge 1.
8. Removing the last item shows the empty cart, and the footer stays at the bottom.

The same fixed-height footer bug existed on every page, and the fix applies site-wide.
