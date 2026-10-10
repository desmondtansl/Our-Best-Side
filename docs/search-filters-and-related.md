# Finding Products: Search, Filters & Sort, "You May Also Like"

Batch C of the improvement list (items 8, 9 and 13), plus official payment
logos (including PayNow) in the footer.

## Summary

| # | Improvement | Why it matters |
|---|-------------|----------------|
| 8 | A search bar in the header for shoppers, with suggestions as you type and a results page | Before, only the admin dashboard could search. Shoppers who knew what they wanted (e.g. "black jacket") had to scroll the whole category |
| 9 | Filter by size, colour and price, and sort by newest or price, on the Men, Ladies and search results pages | Listings were one unsorted grid, which gets harder to use as the catalogue grows |
| 13 | "You may also like" under every product | After viewing a product, the only way onward was the navbar. Suggestions lead to more items per order |

## 8. Search

**Files:**
- `client/src/components/SearchBar.jsx` (new)
- `client/src/components/Navbar.jsx`
- `client/src/pages/SearchResults.jsx` (new)
- `client/src/App.jsx`

- **Where it is:** a **Search products** box in the header on every page, with a lightgray border and radius 10 to match the site's inputs.
- **Suggestions:**
  - appear after 2 letters, with a short pause after typing (250ms) so the server isn't asked on every keystroke
  - show up to 5 products, each with photo, name and price and linking to the product page, plus a **See all results for "…"** link
  - say "No matching products" when nothing matches
- **Keyboard:** **↑ / ↓** move through the suggestions, **Enter** opens the highlighted one (or the results page if none is highlighted), and **Esc** closes the list.
- **Screen readers:** the box is announced as a search box with a suggestion list.
- **Results page:** `/results?q=black+jacket` shows **Results for "black jacket"** with the usual product grid, filters and sort. It covers both Men and Ladies, and each product links to its own category page.
  - The search box shows the current search on the results page.
  - With no results, it suggests trying another word or browsing Men or Ladies.
  - `/results` with no search shows every product.
- **How matching works:**
  - Every word must appear in the product's name, description, colour or category, ignoring upper/lower case.
  - Words match from their start, so typing "loaf" finds "Loafers". Text inside other words doesn't match, so "men" doesn't match "wo**men**".
  - Special characters are treated as plain text.
- **Admin search:** the admin dashboard's product search (`/search`) is unchanged.

### Header layout
- **Desktop:** the search box sits under Login/Account and the cart. The header grows to fit; its fixed 60px height became a minimum.
- **Tablets (≤1024px):** the search box has its own line, right-aligned.
- **Phones (≤540px):** the search box has its own line, full width and centred.
- **Link grouping:** Login/Account/Logout/Dashboard and the cart are grouped so they stay on one line.
- **Not fixed here:** the navbar was already slightly wider than the screen at some tablet and phone widths. On `main`, it overflows by 2–20px for visitors and 89–138px for admins, and this branch overflows by exactly the same amounts. **Batch E (mobile menu)** replaces this navbar.

## 9. Filters and sort

**Files:**
- `client/src/components/ShopFilters.jsx` (new)
- `client/src/components/ProductGrid.jsx`
- `client/src/utils/shop.js` (new)

- **Filter bar:** above every listing:
  - a **Filters** button with a teal border, like the site's other option buttons
  - a product count, e.g. "4 products"
  - **Sort by**: *Newest*, *Price: low to high*, *Price: high to low*
- **Filters panel:** opens from the Filters button:
  - **Size** and **Colour** buttons with teal borders. A selected button gets the #f8f4f4 background and bold text, like the colour picker on product pages. Choosing several sizes (or colours) shows products in *any* of them.
  - **Price** from/to boxes. The placeholders show the cheapest and dearest price in the listing. Changes apply on Enter or when you leave the box.
  - **Clear all** removes the size, colour and price filters but keeps the search and sort.
- **Button label:** shows how many filters are on, e.g. **Filters (2)**.
- **Options on offer:**
  - The options come from the products in that category or search. Sizes are listed in a sensible order: S, M, L, XL, then numeric sizes such as US 7–11 and 24–30.
  - Options stay listed while filters are on, so you can switch between them.
  - An option chosen from an old link that's no longer stocked still shows, so it can be switched off.
- **Kept in the page address**, e.g. `/men?size=M&color=Black&sort=price-asc`:
  - a filtered page can be shared or bookmarked
  - a refresh keeps the filters, and the panel opens if any are on
  - **Back** undoes the last change
- **While loading:** the current products stay on screen, slightly faded, until the new ones arrive, instead of flashing "Loading".
- **No matches:** "No products match these filters" with a **Clear filters** link.
- **Product grid layout:**
  - Products now line up from the left. Before, they were spread to the page edges, so a filtered row of 2 sat at opposite sides.
  - The grid starts 40px below the header instead of 200px, which leaves room for the filter bar.

## 13. "You may also like"

**Files:**
- `client/src/components/RelatedProducts.jsx` (new)
- `client/src/components/ProductDetails.jsx`
- `client/src/components/ScrollToTop.jsx` (new)

- **What it shows:** up to 4 products under the product details, separated by a light grey line. 4 per row on desktop, 2 on phones, each with photo, name and price.
- **How products are picked:**
  - from the **same category**, never the product itself, and never out-of-stock products
  - ranked by similarity: a shared word in the name (e.g. both "Loafers") counts most, then a shared colour. Ties go to the newest product.
- **When it's hidden:** if there's nothing to suggest, or loading fails.
- **Opening another page starts at the top**, as a normal page load would. This applies to a suggestion, a search result or any other link. Changing filters or sort doesn't scroll.

## Footer payment logos

**Files:**
- `client/src/components/Footer.jsx`
- `client/src/assets/payment/` (new): `visa.svg`, `mastercard.svg`, `amex.svg`, `paynow.svg`, `LICENSE.md`

- **What changed:** the plain-text VISA / Mastercard / AMEX badges from Batch A are replaced by the **official colour logos**: Visa, Mastercard, American Express and **PayNow** (new). They sit after "🔒 Secure checkout" at the standard 38×24 payment-icon size.
- **Where the logos come from:** Shopify's open-source payment icon set (MIT licence), the same icons many online shops use.
  - Each file was checked before use: no scripts and no links to other websites. The PayNow file holds its logo as an embedded image.
  - The licence and a trademark note are in `client/src/assets/payment/LICENSE.md`. The brand names and logos belong to their owners and are shown only to say which payment methods the shop accepts.
- **Hosting:** the logos are built into the site, so nothing loads from other websites.
- **Accessibility:** each logo has its name as alt text, for screen readers.

> **⚠️ Turn PayNow on in Stripe.** Checkout shows whichever payment methods are enabled in your Stripe account; the code doesn't fix a list. Go to the **Stripe Dashboard → Settings → Payment methods** and make sure **PayNow** is on. Otherwise the footer advertises PayNow but checkout won't offer it.
> - PayNow only works with Singapore dollars. That's the default; leave the optional `CURRENCY` setting unset or set to `sgd`.
> - No code changes are needed. The webhook already marks PayNow orders as paid, the same way as card payments.

## Server

**Files:**
- `server/src/shopQuery.js` (new)
- `server/src/routes/products.js`

| Endpoint | What it does |
|----------|--------------|
| `GET /products/shop` | Search, filter and sort. Parameters: `category` (men/ladies), `q`, `size` (repeatable), `color` (repeatable), `min`, `max`, `sort` (`newest`, `price-asc`, `price-desc`), `limit` (max 50, used for suggestions). Returns `{ data, facets }`. `facets` lists the sizes, colours and price range on offer for the category and search, and is left out when `limit` is set. |
| `GET /products/:id/related` | Up to 4 related products (see above). Returns 404 for an unknown product. |

- **Safety:** values from the address can't become database commands. Only plain text is used, so a request like `?size[$ne]=x` is ignored. Search text, sizes and colours are treated as plain text in matches.
- **Older products:** some older products stored several sizes in one entry, e.g. `"S, M"`. Size and colour filters still match these.
- **Old endpoints:** the website now uses `/products/shop` for the Men and Ladies pages. The old `/products/men`, `/products/ladies` and `/products/combined` endpoints are unchanged and still work.
- **No pagination:** results aren't split into pages, as before. With today's catalogue size that isn't needed.

## Tests

**Server** (`server/test/shop.test.js`, 17 new, 98 total):
- reading the address, and ignoring unknown or unsafe values
- size ordering, and how related products are ranked
- search across name, description, colour and category, with every word required
- words match from their start ("men" doesn't match "women")
- special characters in a search match nothing rather than everything
- size filter: any of several sizes, older combined entries, and "S" not matching "US 8"
- colour and price filters, combined with each other
- filter options stay listed while filters are on
- all three sorts, plus the fallback to newest
- the suggestions limit
- `?size[$ne]=` style requests
- empty results
- related products: same category, never itself, never out of stock, at most 4, and 404 for unknown products

**Client** (26 new, 96 total):
- `ProductGrid.test.jsx`:
  - listings and the product count
  - size and colour filters toggling on and off and staying in the address
  - price on Enter, and invalid prices ignored
  - Clear all
  - sorting
  - restoring from a shared link, passing on only the shop's own parameters
  - the no-match message with Clear filters
  - the search results page heading, links and tab title
  - the no-results message, and all products shown with no search
- `SearchBar.test.jsx`:
  - suggestions from 2 letters, and waiting for a pause in typing
  - Enter opens the results page, and an empty search does nothing
  - arrow keys and Enter, including wrapping round to "See all"
  - Esc
  - "No matching products"
  - the current search shown on the results page
- `ProductDetails.test.jsx`: "You may also like" shows linked suggestions, and is hidden when there are none or loading fails
- `ScrollToTop.test.jsx`: scrolls on a page change, not on a filter change
- `Footer.test.jsx`: "Secure checkout" and the four payment logos, in order, with alt text and served by the site
- `utils/shop.test.js`: the address helpers

**Browser check** (Chromium, the real app with an in-memory database and the 8 seeded products):
- **Men page:** 4 products and the filter bar
- **Filters and sort:**
  - Colour = Black narrows it to 2
  - *Price: low to high* reorders them
  - a reload keeps both, with the panel open
  - **Back** undoes the sort
  - adding a minimum price of 100 leaves 1
  - Clear all brings back all 4
- **Suggestions:** typing "jack" suggests the Black Leather Jacket; ↓ then Enter opens it
- **"You may also like":** shows 3 men's products, and opening one starts at the top of the page
- **Search results:** "floral" finds the romper and the dress; "zzzz" shows the no-results message
- **Screen widths:** 1280, 1024, 820, 768, 540 and 375px, logged out and as an admin. Nothing overlaps, and no new overflow compared with `main`.
- **Footer:** the four logos load in colour at 38×24 at 1280, 820 and 375px, and wrap neatly onto their own line on phones
- **Errors:** none on the page (the only console errors were Google Fonts being blocked by the test sandbox).

## Deploying
- **Stripe:** make sure PayNow is turned on (see above).
- **Netlify and Render:** nothing to configure. `/results` works on refresh thanks to the existing `_redirects` file.
- **Data:** no migration needed. Existing products are searchable straight away.
