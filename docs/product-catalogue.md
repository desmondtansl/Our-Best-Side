# Product Catalogue: Product Pages, Listings, Featured Products & Seeding

## Why

After the move to a new MongoDB Atlas cluster, the database had **no products** (`GET /products/men` returned `[]`). Every product page was blank, with no image, details or sizes, and the homepage's Featured Products linked to IDs from the old database.

This build:
- restores the catalogue
- makes Featured Products come from the database
- fixes the product page, listing and admin-form bugs that were already on the roadmap

## What changed for shoppers

| Area | Before | Now |
|------|--------|-----|
| Product page | Blank while loading, and blank forever for unknown products | "Loading product…", and "Sorry, we couldn't find this product" with a link back to the category |
| Colour | One button showing all colours joined; selection could be empty | One button per colour; the first is pre-selected and the chosen one is highlighted |
| Size | Men defaulted to "S" even if the product had no S; Ladies defaulted to blank | Defaults to the product's first size |
| Sizes like "US 8" | Split into "US" and "8" | Kept intact, including older data saved as "US 7, US 8" |
| Quantity | Unlimited | Capped at stock. Out-of-stock products show a disabled "Out of Stock" button. |
| Add to Cart | No feedback | "Added to cart. View cart" |
| Men / Ladies listings | Men page showed a stray `0` when empty; no loading state | "Loading products…", "No products here yet", and an error message if loading fails |
| Featured Products (homepage) | Hard-coded list pointing at old database IDs on `ourbestside.netlify.app` (full page reload, broken links) | Loaded from the database. Links stay in the site, so the cart is kept. The section is hidden when nothing is featured. |

## What changed for admins

- **"Featured on homepage"** checkbox on **Upload New Products** and **Edit Product**. Up to 8 featured products are shown, newest first.
- **Sizes and colours** typed as `S, M, L` or `US 8, US 9` are saved as separate options. They're split on commas only, with spaces trimmed and duplicates removed. The edit form shows saved lists the same way, e.g. `S, M, L`.
- **Category** accepts `Men` / `Ladies` in any case, including `women`, which becomes `Ladies`.
- **Validation messages:**
  - upload needs an image, a title, a price above 0 and a category
  - inventory must be a whole number

## Restoring the catalogue (seed script)

`server/scripts/seed-products.js` recreates the 8 original featured products. Their data is in `server/scripts/seed-data.js`: titles, prices, sizes, colours, descriptions and stock. Their photos are the images already in `client/public/`.

| Product | Category | Price | Sizes | Colour |
|---------|----------|-------|-------|--------|
| Suede Loafers | Men | $250 | US 7 – US 11 | Tan |
| Black Leather Jacket | Men | $300 | S – XL | Black |
| Long Sleeve Tee | Men | $60 | S – XL | Black |
| White Casual Shirt | Men | $60 | S – XL | White |
| Ladies Black Romper | Ladies | $80 | XS – L | Black Floral |
| Ladies Blue Dress | Ladies | $80 | XS – L | Blue Floral |
| Ladies Slim Cut Jeans | Ladies | $180 | 24 – 30 | Light Wash |
| Ladies Round-Neck Vintage Tee | Ladies | $180 | XS – L | White |

Titles and prices come from the old homepage. Colours were read from the photos. Descriptions, sizes and stock are placeholders; review and edit `seed-data.js` before running, or edit the products afterwards from the dashboard.

### Running it

The script runs on your computer and writes to the live database and S3 bucket:

```bash
# 1. In server/.env, set (same values as on Render):
#    MONGO_URI, BUCKET_NAME, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_ACCESS_KEY_SECRET
# 2. From the repo root:
npm install
npm run seed -w server -- --dry-run   # preview: lists what would be created, changes nothing
npm run seed -w server                # uploads the photos to S3 and creates the products
```

- **Safe to re-run:** products whose title already exists are skipped, whatever the letter case.
- **Checks photos first:** it stops before writing anything for a product whose photo is missing.
- **Keeps the homepage order:** Featured Products appear in the same order as the list above.

## API changes (`server/src/routes/products.js`)

| Route | Change |
|-------|--------|
| `GET /products/men`, `/ladies`, `/combined` | Each request builds its own result. Before, module-level arrays were shared across requests, so simultaneous visitors could get mixed-up lists. Sorted newest first. `/combined` now includes Ladies (it queried `"Women"`). The unused signed image URLs, which the client never received, are no longer computed. |
| `GET /products/featured` | **New.** Up to 8 featured products, newest first. |
| `GET /products/men/:id`, `/ladies/:id`, `/:id` | **404** "Product not found" for unknown or malformed IDs, or the wrong category. Before, they returned `data: null`, or crashed in the case of `/:id`. |
| `POST /products/upload`, `PUT /products/:id` | Parse and validate fields with `src/productFields.js`, and accept `featured`. |

Supporting modules:
- `server/src/s3.js`: a shared S3 client (created on first use), `uploadImageToS3()` and `imageUrl()`. Used by the product routes, checkout and the seed script.
- `server/src/productFields.js`: `parseList`, `parseCategories` and `parseProductFields`.
- `Product` model: new `featured` field (Boolean, indexed, default `false`).

## Client code structure

The Men and Ladies pages were near-identical copies, so each bug had to be fixed twice. They now share components:

| File | Role |
|------|------|
| `client/src/components/ProductDetails.jsx` | Product page used by `/men/:id` and `/ladies/:id` |
| `client/src/components/ProductGrid.jsx` | Listing used by `/men` and `/ladies` |
| `client/src/pages/IndividualMenProduct.jsx`, `IndividualLadiesProduct.jsx`, `MenProducts.jsx`, `LadiesProducts.jsx` | Wrappers of 7 lines each |
| `client/src/components/FeaturedProductsList.jsx` | Loads `/products/featured`, renders the header only when there are products |
| `client/src/utils/products.js` | `productImageUrl()`, which replaces the S3 URL that was hard-coded in 5 places (override with `VITE_IMAGE_BASE_URL`); `toOptions()`; `productPath()` |
| `client/src/assets/featuredProductsPhotos.js` | **Removed** (the hard-coded list) |

**Styling:** the shared components reuse the existing styled-components unchanged, so fonts, teal borders, `#f8f4f4` hovers and spacing are the same as before. Three things differ:
- the colour button grows to fit longer names like "Black Floral", and the selected one uses the existing `#f8f4f4` highlight
- disabled buttons are dimmed
- the Ladies pages now use the Men pages' sizes, which were slightly different before: product title 40px instead of 32px, and description 20px instead of 16px

## Verification

| Check | Result |
|-------|--------|
| Server tests | **72 / 72 pass** (19 new) |
| Client tests | **43 / 43 pass** (14 new) |
| Client build | Passes |
| Browser run | **9 / 9 steps pass**, no page errors |

- **Server tests** cover:
  - `test/catalogue.test.js`: listings, concurrent requests, `/combined`, featured, 404s, list parsing, validation, the featured toggle
  - `test/seed.test.js`: creates all 8 as featured, homepage order, idempotency, dry run, missing photo
- **Client tests** cover:
  - `ProductDetails.test.jsx`: loading, pre-selection, colour and size choice, add to cart, "US 8", stock cap, out of stock, not found, error
  - `ProductGrid.test.jsx`: listing, empty state with no "0", error
  - `FeaturedProductsList.test.jsx`: database-driven, in-site links, hidden when empty
  - `AdminEditProduct.test.jsx`: comma-only sizes, featured toggle
- **Browser run:** real server and client in Chromium, in-memory MongoDB filled by the **real seed script**, S3 mocked, product photos served locally. Steps:
  1. Homepage shows the 8 featured products with photos, in the original order
  2. A featured link opens the product page inside the site; size is pre-selected; US 9 is chosen and added
  3. Ladies listing shows 4 products; "XS" and "Black Floral" are pre-selected
  4. Men listing shows 4 products
  5. An unknown product shows "not found"
  6. The cart shows the chosen size and colour
  7. An admin upload with `US 8, US 9, US 10` / `White, Navy` / `men` / featured saves 3 sizes, 2 colours, `Men`, featured
  8. The edit form shows `US 8, US 9, US 10`, and un-featuring works
  9. The mobile product page renders

## Files changed

**Server**
| File | Change |
|------|--------|
| `src/routes/products.js` | Rewritten listings (no shared arrays; `/combined` includes Ladies); new `GET /products/featured`; 404s for missing products; upload and edit use the shared parsing and S3 helper; upload requires an image |
| `src/productFields.js` | **New.** Parses and validates product form fields (lists split on commas, category aliases, price and stock checks, `featured`) |
| `src/s3.js` | **New.** Shared S3 client created on first use, `uploadImageToS3()`, `imageUrl()` |
| `src/models/Product.js` | Added `featured` (Boolean, indexed, default `false`) |
| `src/routes/checkout.js` | Uses the shared `imageUrl()` from `src/s3.js` (no behaviour change) |
| `scripts/seed-products.js` | **New.** Seed script (`npm run seed`, `--dry-run`, idempotent, keeps homepage order) |
| `scripts/seed-data.js` | **New.** The 8 products to restore; edit before running |
| `package.json` | Added the `seed` script |
| `test/catalogue.test.js`, `test/seed.test.js` | **New** tests |

**Client**
| File | Change |
|------|--------|
| `src/components/ProductDetails.jsx` | **New.** Shared product page: loading, not found and error states; colour buttons; pre-selected size and colour; stock cap; "Added to cart" |
| `src/components/ProductGrid.jsx` | **New.** Shared Men and Ladies listing: loading, empty and error states; no stray "0" |
| `src/pages/IndividualMenProduct.jsx`, `IndividualLadiesProduct.jsx`, `MenProducts.jsx`, `LadiesProducts.jsx` | Now thin wrappers around the shared components |
| `src/components/FeaturedProductsList.jsx` | Loads featured products from the API, links inside the site, and shows its header only when there are products |
| `src/components/SingleFeaturedProduct.jsx` | Image `alt` text |
| `src/pages/Homepage.jsx` | Header now rendered by `FeaturedProductsList` |
| `src/pages/AdminUploadProduct.jsx` | "Featured on homepage" checkbox |
| `src/pages/AdminEditProduct.jsx` | "Featured on homepage" checkbox; sizes and colours split on commas only; saved lists shown as `S, M, L` |
| `src/pages/Cart.jsx` | Uses `productImageUrl()` instead of a hard-coded S3 URL |
| `src/utils/products.js` | **New.** `productImageUrl()`, `toOptions()`, `productPath()` |
| `src/assets/featuredProductsPhotos.js` | **Removed** (hard-coded featured list with old database IDs) |
| `src/components/*.test.jsx`, `src/pages/AdminEditProduct.test.jsx` | **New** and updated tests |

**Docs:** this file; `docs/deploying-to-render.md` (new "Products and images (S3)" section: key policy, public-read setting, seeding, costs); `docs/phase-1-security-and-admin-fixes.md` (8 roadmap items marked done).

## Deployment checklist

- [ ] Review and edit `server/scripts/seed-data.js` (descriptions, sizes, stock; the vintage tee is $180, as on the old homepage).
- [ ] Merge this PR. Render and Netlify redeploy.
- [ ] Put the Render values for `MONGO_URI`, `BUCKET_NAME`, `AWS_REGION`, `AWS_ACCESS_KEY_ID` and `AWS_ACCESS_KEY_SECRET` in `server/.env` on your computer.
- [ ] Run `npm run seed -w server -- --dry-run`, then `npm run seed -w server`.
- [ ] Open the site. The homepage should show 8 featured products, and the product pages should show photos, sizes and colours.
- [ ] Check the S3 bucket still allows public reads. Product images are loaded straight from `https://desmondecommercesite.s3.ap-southeast-1.amazonaws.com/<key>`. If images don't appear, see the note in `docs/deploying-to-render.md`.

## Known limitations

- **Large images.** The photos are the original 1–7 MB images. They load slowly on mobile. Resizing on upload (or using a CDN) would be a good follow-up.
- **External images the sandbox couldn't check.** The footer's payment logo (`i.ibb.co`) and the carousel photos (`images.pexels.com`) are hot-linked from other websites. I couldn't check them here, since this environment blocks both hosts. If they're broken on the live site too, move them into `client/public`.
- **Old S3 images.** Images uploaded in 2023 are still in the bucket but no longer linked to any product. They can be deleted to save space.
