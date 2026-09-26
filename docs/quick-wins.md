# Quick Wins: Saved Cart, Stock Tracking, Self-Hosted Images, Delivery Info, 404 & Page Titles, Carousel

Batch A of the improvement list (items 1, 5, 6, 14, 17 and 18).

## Summary

| # | Improvement | Why it matters |
|---|-------------|----------------|
| 1 | The cart is saved in the browser | Before, refreshing the page or coming back later emptied the cart, and shoppers lost what they had picked |
| 5 | Stock goes down when an order is paid and back up when it is cancelled | Before, `inStock` never changed, so a product could sell forever |
| 6 | Carousel and footer images are hosted with the site | They were hot-linked from Pexels and i.ibb.co, and would break if those links changed |
| 14 | Delivery and returns info on every product page, plus "Only N left" | Top fashion sites show this next to Add to Cart, because it is the most common question before buying |
| 17 | A "Page not found" page, and a proper tab title and description on every page | Mistyped links showed a blank page, and every tab had the same title ("OUR BEST SIDE") with no description for search engines |
| 18 | Evergreen carousel copy | The old slides advertised dated sales |

## 1. Saved cart
**Files:** `client/src/redux/store.js`

- **What is saved:** the cart is stored in `localStorage` under `ourbestside-cart-v1` after every change (add, +/−, Remove, Reset, checkout success).
- **What happens on load:** the cart is restored from storage. It survives reloads, new tabs and return visits on the same browser.
- **Checks on load:**
  - lines with no product id or a quantity below 1 are dropped
  - the total is recalculated in cents rather than trusted
  - corrupt data is ignored and the cart starts empty
- **Blocked or full storage** (e.g. some private-browsing modes): the cart still works for the visit, it just isn't saved.
- **Safety:** prices in the saved cart are only for display. The server still prices every order from the database at checkout (unchanged).
- **Changing the cart format:** bump the key to `-v2`. Old saved carts are then ignored instead of misread.

## 5. Stock tracking
**Files:**
- `server/src/inventory.js` (new)
- `server/src/routes/checkout.js`
- `server/src/routes/webhook.js`
- `server/src/routes/adminOrders.js`

| When | What happens to `inStock` |
|------|---------------------------|
| Checkout starts | Nothing changes, but checkout is refused with a clear message if there isn't enough, e.g. "Only 2 left of Suede Loafers" or "Suede Loafers is out of stock". Quantities are added up across sizes and colours of the same product. |
| Stripe confirms payment (webhook) | Goes down by the quantity bought. This happens once per order, even if Stripe sends the event again. |
| Admin changes an order to **Cancelled** | Goes back up |
| Admin changes a cancelled order back to another status | Goes down again |

- **Products with no stock number** (the field is empty) are treated as unlimited and never change.
- **Stock never goes below 0.** Two shoppers can both pay for the last item at the same moment. If that happens, stock is set to 0 and the server log shows `Product … sold more than was in stock` so you can follow up with the customer.
- **Why stock is taken at payment, not checkout:** stock isn't held while a shopper is on the Stripe page. Abandoned checkouts therefore don't lock items away.

## 6. Self-hosted images
**Files:**
- `client/public/carousel/` (new): `menswear.jpg`, `dresses.jpg`, `essentials.jpg`
- `client/src/assets/carouselPhotos.js`
- `client/src/components/Carousel.jsx`
- `client/src/components/Footer.jsx`

- **Carousel:** the three photos now come from the shop's own product photos, resized to 1200px tall and compressed (60–190 KB each). Netlify serves them with the site. Each has `alt` text for screen readers and search engines.
- **Footer:** the hot-linked card-logo image is replaced by a **🔒 Secure checkout** label and text badges for **VISA**, **Mastercard** and **AMEX** (the cards Stripe Checkout accepts). They use lightgray borders to match the site.
- **Result:** the browser check found no requests to other sites (apart from Google Fonts).
- **Not done here:** existing product photos in S3 were not recompressed. That is part of Batch D (photo compression).

## 14. Delivery, returns and low stock
**Files:**
- `client/src/config/store.js` (new)
- `client/src/components/ProductDetails.jsx`
- `client/src/pages/Cart.jsx`

- **Policies block:** under Add to Cart, separated by a light grey line:
  - 🚚 **Free delivery in Singapore.** Arrives in 3–5 working days.
  - ↩ **Free returns within 14 days.** Items must be unworn, with tags attached.
- **Low stock:** a red **"Only N left"** appears under the price when 1–3 are left. Out-of-stock products keep the disabled "Out of Stock" button.
- **Cart:** the Shipping line in the cart summary uses the same config.

> **⚠️ The policy wording is a placeholder. Edit it before going live.** Everything is in one file, `client/src/config/store.js`:
> ```js
> export const DELIVERY = { headline: "Free delivery in Singapore", detail: "Arrives in 3–5 working days.", cartLabel: "Free" };
> export const RETURNS = { headline: "Free returns within 14 days", detail: "Items must be unworn, with tags attached." };
> export const LOW_STOCK_THRESHOLD = 3; // show "Only N left" at or below this
> ```

## 17. 404 page and page titles
**Files:**
- `client/src/pages/NotFound.jsx` (new)
- `client/src/App.jsx`
- `client/src/hooks/useDocumentTitle.js` (new)
- every page component
- `client/index.html`

- **404 page:** any unknown address (e.g. `/mens`, `/men/abc/def`) shows **"Page not found"** with links to Home, Shop Men and Shop Ladies. The navbar and footer are included.
- **Tab titles:** every page sets the browser tab title:

  | Page | Tab title |
  |------|-----------|
  | Home | `Our Best Side` |
  | Men / Ladies | `Men \| Our Best Side`, `Ladies \| Our Best Side` |
  | Product | `Suede Loafers \| Our Best Side` (the product description becomes the meta description, which Google and link previews show) |
  | Cart | `Your Cart \| Our Best Side` |
  | Order confirmation | `Order Confirmed \| Our Best Side` |
  | Account, Login, Sign Up | matching titles |
  | Admin pages | matching titles |
  | Unknown address | `Page not found \| Our Best Side` |

- `index.html` now has a default meta description, and its title changes from "OUR BEST SIDE" to "Our Best Side".

## 18. Carousel copy
| Slide | Heading | Text | Links to |
|-------|---------|------|----------|
| 1 | STAY IN TREND | Leather, suede and everyday essentials for him | /men |
| 2 | LIGHT & EASY | Printed dresses and rompers made for warm days | /ladies |
| 3 | THE ESSENTIALS | Crisp shirts and tees that go with everything | /men |

To run a promotion, edit `client/src/assets/carouselPhotos.js`.

## Tests
**Server** (`server/test/inventory.test.js`, 6 new, 81 total):
- the stock limit is counted across all sizes of a product
- out-of-stock products are refused at checkout
- products with no stock number are unlimited
- stock goes down only when payment is confirmed, and only once when the webhook repeats
- stock never goes below 0
- cancelling restocks, and un-cancelling takes stock again

**Client** (11 new, 70 total):
- `src/redux/store.test.js`:
  - the cart is saved and restored
  - Reset clears the saved cart
  - corrupt data is ignored
  - invalid lines are dropped and the total is recalculated
  - blocked storage doesn't break the cart
- `src/hooks/useDocumentTitle.test.jsx`: title and meta description are set, and only one description tag is created
- `src/pages/NotFound.test.jsx`: an unknown route shows the 404 page, its links and its title
- `src/components/ProductDetails.test.jsx`:
  - "Only N left" shows at low stock
  - it is hidden at high, untracked or zero stock
  - the delivery and returns lines show
  - the product title appears in the tab

**Browser check** (Chromium, real app with an in-memory database):
- the carousel shows the three local images and the new copy
- the footer shows the badges
- the product page shows "Only 2 left" and the policies
- the cart survives a reload and appears in a new tab
- `/nope/deeper` shows the 404 page
- tab titles are correct
- no page errors, and no requests to other sites

**Known issue, not from this batch:** at phone width the existing navbar is about 10px wider than the screen. Batch E replaces it with a mobile menu.

## Deploying
- **Netlify:** nothing to configure. The carousel images are in `client/public` and ship with the build.
- **Render:** nothing to configure. Stock tracking uses the existing `inStock` field, so no data migration is needed.
