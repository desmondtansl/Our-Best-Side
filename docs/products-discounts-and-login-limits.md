# Products, Discounts and Login Limits

Batch H.

## Summary

| # | Improvement | Why it matters |
|---|-------------|----------------|
| 1 | **Archive** products instead of deleting them, and **Restore** them | Products couldn't be removed at all. Archiving takes a product out of the shop while past orders still show it. |
| 2 | **Draft** products, published when ready | New products went live the moment they were uploaded. Now a collection can be prepared ahead. |
| 3 | A **Products** page for admins, with Live, Drafts and Archived tabs, search and sort | The old page was a search box with no list. |
| 4 | **Edit Stock**: stock for many products on one screen | Updating stock after a delivery meant opening each product. |
| 5 | **Sale prices**: a "was" price shown crossed out with a Sale badge | There was no way to show a reduced price. |
| 6 | **Discounts**: promotions with a name, a code, a percentage and dates. Shoppers enter the code in their cart. | There were no discount codes. |
| 7 | **Login attempt limits** | Anyone could try passwords on an account endlessly. |

Nothing needs setting up: no new environment variables, and no Stripe settings to change.

## 1–2. Live, draft and archived products

Every product now has a status. Products from before this update count as **live**.

| Status | Shoppers | Admins |
|---|---|---|
| **Live** | See it in listings, search, filters, Featured Products, "You may also like", and on its own page | See it in the Live tab |
| **Draft** | Can't see it. Its page shows "not found". | Drafts tab. **Publish** makes it live. |
| **Archived** | Can't see it, and can't buy it even from a cart saved earlier: checkout says "X is no longer available. Please remove it from your cart." | Archived tab. **Restore** makes it live again. |

- **Saving a draft:** on the upload form, tick **Save as a draft**.
- **Changing the status:** use the Products page, or the bar at the top of a product's edit page (**Publish**, **Archive**, **Restore to the shop**).
- **Archiving** asks you to confirm first.
- **Featured Products:** archiving a product also takes it off the homepage's Featured Products.
- **Orders and stock:** past orders, their links and the order pages are unaffected. Archived products no longer appear under the dashboard's Low stock.

**Files:**
- `server/src/models/Product.js`: `status`, `compareAtPrice`, and `VISIBLE`, the filter for live products
- `server/src/routes/products.js`: every shopper route uses `VISIBLE`
- `server/src/routes/checkout.js`
- `server/src/routes/adminProducts.js` (new)
- `client/src/components/admin/ProductStatusBar.jsx` (new)

## 3. Products page

**Where it is:** Dashboard → **Products** (`/search`, the address of the old search page, so existing links still work).

- **Tabs:** **Live**, **Drafts** and **Archived**, each with its count.
- **Product name** search, and **Sort** (newest, name, price, lowest stock first).
- **Each row:** photo, name (opens the edit page), category, price (with the was-price and Sale badge when on sale), stock (per size, e.g. "S 4 · M 1 · L 0"), status and Featured.
- **Actions:** Edit, View, Publish, Archive, Restore.
- **Paging:** 50 products per page, with **Load more**.
- **Kept in the address:** the tab, search and sort.
- **Links:** **+ Upload a new product** and **Edit stock**.

**File:** `client/src/pages/AdminProducts.jsx` (new; it replaces `AdminSearchProduct.jsx`)

## 4. Edit Stock

**Where it is:** Dashboard → **Edit Stock** (`/admin/stock`).

- **What it lists:** every live product (or every draft), by name, with a box per size or one box for the whole product.
- **Find a product** narrows the list by name.
- **Changed rows** are shaded. The **Save** bar stays at the bottom of the screen and shows how many products changed.
- **Only changed products are saved.** Products with stock per size get their total updated too.
- **If an order comes in while you're editing**, that product isn't overwritten. The page says which products weren't saved, reloads them with their current stock, and you check them and save again. Everything else is saved.
- **Mistakes:** if any row is invalid (e.g. a negative number), nothing is saved and the message names the product.

**Files:**
- `client/src/pages/AdminStock.jsx` (new)
- `PUT /admin/products/stock`

## 5. Sale prices

- **Setting one:** the upload and edit forms have a **"Was" price (optional)** box. Enter the old price, and set **Price** to the sale price.
- **What shoppers see:** the price, the was-price crossed out, and a red **Sale** badge. This shows in listings, search, Featured Products, "You may also like" and the product page.
- **Ending it:** empty the "Was" price box and save. Sales don't end automatically on a date; for time-limited offers, use a discount code with an end date.
- **Checkout always charges the price.** The was-price is only shown.
- **Rules:** the "was" price must be higher than the price. Otherwise it's refused, including when you raise the price above an existing was-price.

**Files:**
- `client/src/components/WasPrice.jsx` (new)
- `server/src/productFields.js`

## 6. Discounts

**Where it is:** Dashboard → **Discounts** (`/admin/discounts`).

**Each promotion has:**
- **Name:** e.g. "Welcome offer". Shown to the shopper with the code.
- **Code:** what shoppers type, e.g. `WELCOME10`. 3–30 letters, numbers, `-` or `_`. Codes aren't case-sensitive, and each code is unique.
- **Discount (%):** a whole number from 1 to 90, taken off the whole order.
- **Start date** and an optional **End date.**
  - A code works from 00:00 on the start date to 23:59 on the end date, Singapore time.
  - Without an end date, it works until paused.

**The list shows:**
- Each promotion's code, discount and dates.
- Its status: **Running**, **Scheduled** (not started), **Ended** or **Paused**.
- How many paid orders used it.

**Actions:**
- **Edit:** fills the form above. Orders already placed keep the discount they had.
- **Pause** / **Resume.**
- **Delete:** only for promotions never used, so past orders always make sense. Used ones can be paused instead.

**In the cart:**
1. A **Discount code** box sits under Shipping. **Apply** checks the code and shows, e.g., "WELCOME10 (10% off) · Welcome offer · −$6.90", with a new total and a **Remove** link.
2. Codes that can't be used get a clear message: "isn't valid", "can't be used yet" or "has expired". A paused code reads as "isn't valid".
3. Checkout checks the code again, in case it ended in the meantime.

**At Stripe checkout:**
- The discount is applied through a Stripe coupon, created automatically the first time the code is used. A new one is made if you change the percentage.
- Stripe's page and receipt show the discount.
- When payment is confirmed, the order records Stripe's exact amounts and the promotion's use count goes up.

**On orders:**
- The order page and the customer's order history show the code and the amount taken off.
- The order's total, refunds and the dashboard's revenue all use what the customer actually paid.

**Files:**
- `server/src/models/Promotion.js` (new)
- `server/src/promotions.js` (new)
- `server/src/routes/adminPromotions.js` (new)
- `server/src/routes/checkout.js`
- `server/src/routes/webhook.js`
- `client/src/pages/AdminDiscounts.jsx` (new)
- `client/src/components/DiscountCode.jsx` (new)

### Homepage banner

Each running promotion is announced in a teal banner at the top of the homepage, under the header. This is the same look as the old announcement bar.

**What it shows:**
- **The message:** by default, "Use promo code XMAS20 for 20% off!". You can write your own, e.g. "Use promo code XMAS20 for the festive season!", up to 140 characters.
- **The code:** shoppers can tap it to copy it ("Copied!").
- **The end date,** if there is one: "Ends 31 Dec 2026".
- **✕** closes the banner. It stays closed in that shopper's browser for that code, and a new code shows again.

**When it shows:** only while the promotion is **running**.
- A promotion created for a later date gets its banner on its start date.
- The banner disappears when the promotion ends or is paused, within a minute (browsers may keep the list for up to 60 seconds).
- Up to 3 banners show at once, newest first.

**In the Discounts form:**
- **Turning it off:** each promotion has **Show a banner on the homepage while it's running**, ticked by default. Untick it for codes you want to keep private, e.g. staff or influencer codes.
- **Banner message:** an optional box. Left empty, the banner uses the standard wording, which follows the code and percentage.
- **Preview:** shows exactly what the banner will say.
- **The list:** shows "Banner showing" for running promotions with a banner, and "Banner on" for the others.

**Files:**
- `client/src/components/PromoBanner.jsx` (new)
- `client/src/pages/Homepage.jsx`
- `server/src/routes/promotions.js` (new): `GET /promotions/banners`, public, which returns only the code, percentage, end date and message
- `showBanner` and `bannerText` on `server/src/models/Promotion.js`

## 7. Login attempt limits

Three limits, each counted over a fixed time window:

| Limit | Blocks | For | Purpose |
|---|---|---|---|
| Same account, same address | after **5** wrong passwords | 15 minutes | Stops password guessing. A correct password clears it. |
| Same account, any address | after **20** wrong passwords | an hour | Stops guessing spread across many addresses |
| Same address, any account | after **30** attempts | 15 minutes | Stops one machine trying many accounts |

**Why not lock an account after a few wrong passwords?** Then anyone who knows your email could lock you out of your own shop on purpose. With these limits, guessing from one place is stopped after 5 tries. A browser that has logged in to the account before is a "trusted device", and the account-wide limit doesn't apply to it.

**When a limit is reached:**
- The site answers "Too many login attempts. Please wait a few minutes and try again…" (HTTP 429, with a `Retry-After` time).
- The password isn't even checked.
- The message is the same whether or not the account exists. Unknown emails also take as long to check as real ones, so the site never reveals which emails have accounts.

**Other changes to logging in:**
- The email is always treated as text, and in any case, so `Owner@Example.com` works.
- Error messages now show on the login page itself ("Wrong email or password.") instead of in a browser pop-up. A network problem shows "Can't reach the server" instead of breaking the page.

**How it works:**
- **Counts** are stored in MongoDB, with emails hashed, and deleted automatically when their window ends. They're stored in `ratecounts`.
- **Addresses:** the server trusts Render's proxy to give it the visitor's address (`trust proxy`).

**Files:**
- `server/src/loginLimits.js` (new)
- `server/src/models/LoginAttempt.js` (new)
- `server/src/routes/auth.js`
- `server/src/app.js`
- `client/src/pages/Login.jsx`

## API (admins)

| Method | Path | Does |
|---|---|---|
| GET | `/admin/products?status=&q=&sort=&page=` | Lists products by status (`live`, `draft`, `archived`), 50 per page, with `counts` and `hasMore` |
| GET | `/admin/products/:id` | Returns one product, whatever its status |
| PATCH | `/admin/products/:id/status` | Takes `{ status }`. Archiving also un-features the product. |
| PUT | `/admin/products/stock` | Takes `{ changes: [{ id, updatedAt, inStock }` or `{ id, updatedAt, sizeStock: { S: 3 } }] }`. Returns `{ saved, conflicts }`. |
| GET / POST | `/admin/promotions` | Lists promotions (each with `state`), or creates one from `{ name, code, percentOff, startDate, endDate?, active?, showBanner?, bannerText? }` |
| PUT / DELETE | `/admin/promotions/:id` | Edits a promotion, or deletes one that was never used |

**For shoppers:**
- `POST /checkout/discount` takes `{ code }` and returns `{ code, name, percentOff }`, or a message explaining why the code can't be used.
- `POST /checkout/create-checkout-session` accepts an optional `discountCode`.

## Tests

**Server** (`npm test -w server`, 202 tests). New:
- **`productsAdmin.test.js`:**
  - Drafts and archived products hidden from every shopper route and from checkout. Older products without a status are still shown.
  - The admin list: tabs, counts, search, sort, paging, admins only.
  - Publish, archive (which un-features) and restore.
  - Saving a draft on upload.
  - Bulk stock: per size and per product. Nothing saved if a row is invalid. A product that changed meanwhile isn't overwritten.
  - Sale price checks, and checkout charging the price.
- **`promotions.test.js`:**
  - Create, edit, list and delete. Delete is for unused promotions only.
  - Checks: name, code format, 1–90%, real dates, the end not before the start, duplicate codes.
  - States: running, scheduled, ended, paused, and no end date.
  - Codes in any case, the last day working until midnight, and injected objects refused.
  - Stripe coupons: one per promotion, and a new one after the percentage changes.
  - The order's discount fields.
  - Checkout refused if the code stopped working.
  - Stripe's exact totals recorded on payment, with the use counted once even when Stripe sends the event twice.
- **`loginLimits.test.js`:**
  - Each of the three limits.
  - Another address isn't blocked by the per-address limit, and trusted devices get past the account-wide limit.
  - A correct password clears the count.
  - The same answer for unknown and real accounts.
  - The email is treated as text.

**Client** (`npm test -w client`, 222 tests):
- **New test files:**
  - `AdminProducts.test.jsx`, `AdminStock.test.jsx`, `AdminDiscounts.test.jsx`
  - `WasPrice.test.jsx`
- **Updated test files:**
  - Edit page: the admin route, the was-price, publish and archive with confirmation.
  - Cart: applying, refusing and removing a code. The code is sent to checkout.
  - Login: wrong password, too many attempts, server unreachable.
  - Dashboard menu.

**In a real browser** (Chromium, desktop 1280px and phone 390px, with sample data and Stripe faked):
- **Shop:** listings showed the live products only, and the sale shirt with its was-price and Sale badge.
- **Cart:**
  - An expired code said so.
  - `welcome10` took 10% off ($69.00 → $62.10).
- **Login:** the sixth wrong password showed the "Too many login attempts" message on the page.
- **Products page:**
  - Showed Live (3), Drafts (1) and Archived (1).
  - Publishing the draft moved it to Live (4).
- **Edit Stock:** saved 2 products.
- **Discounts:** a "Year end sale" promotion was created and listed as Scheduled.
- **Phones:** no sideways scrolling on Products, Edit Stock, Discounts or the cart.

## Not included (possible follow-ups)

- **Sales that end automatically** on a date. Discount codes with end dates cover time-limited offers for now.
- **Limits on discount codes:**
  - a usage limit (e.g. first 100 orders)
  - a minimum order value
  - one use per customer
- **Discounts on particular products or categories only.** Codes apply to the whole order.
- **Email alerts:** when an account is being guessed, and a "forgot password" email. Both need an email service (Batch B).
