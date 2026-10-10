# Product Photos & Sizes: Compression, Multiple Photos, Size Guide, Stock per Size

Batch D of the improvement list (items 7, 10 and 12).

## Summary

| # | Improvement | Why it matters |
|---|-------------|----------------|
| 7 | Photos are resized and compressed automatically on upload, and a script compresses existing ones | Camera photos are often 1–7 MB. Product pages loaded slowly on phones, and slow product pages lose a large share of mobile shoppers. |
| 10 | Up to 8 photos per product, with a gallery on the product page | One photo per product. Fashion shoppers want to see the back, the fabric and the fit, and single photos lead to more returns. |
| 12 | A size guide, and stock tracked per size (one stock box per size in the admin forms) | Stock was one number per product, so a sold-out size could still be bought. Wrong sizes are the biggest cause of returns in fashion. |

## 7. Photo compression

**Files:**
- `server/src/images.js` (new)
- `server/src/s3.js`
- `server/src/routes/products.js`
- `server/scripts/seed-products.js`
- `server/package.json`: adds `sharp`, the standard Node image library

**Every photo uploaded is processed before it's stored:**
- **Size:** resized so its longest side is at most **1600px**. That's sharp on large screens, and smaller photos are never enlarged.
- **Format:** saved as a **JPEG at quality 80**. A typical 5 MB camera photo becomes about **250 KB, roughly 20× smaller**.
- **Rotation:** the camera's rotation is applied, so photos never appear sideways.
- **Privacy:** all metadata is removed, including any **GPS location** in phone photos.
- **Transparency:** transparent areas, e.g. in PNGs, become white.

**Accepted files and limits:**
- JPEG, PNG and WebP are accepted, up to **20 MB each**. Anything else gets a clear message ("That file isn't a supported photo…").
- Every photo is checked before any is uploaded, so one bad file never leaves a half-saved product.
- iPhone HEIC photos: Safari on iPhone converts them to JPEG when uploading. HEIC files copied to a computer may need exporting as JPEG first.

The seed script compresses its photos the same way.

### Compressing photos you've already uploaded

`server/scripts/optimize-photos.js` (new) handles existing photos:

```bash
npm run optimize-photos -w server -- --dry-run   # report the savings, change nothing
npm run optimize-photos -w server                # compress and update products
```

- **Requirements:** `MONGO_URI`, `BUCKET_NAME`, `AWS_REGION`, `AWS_ACCESS_KEY_ID` and `AWS_ACCESS_KEY_SECRET`, e.g. in `server/.env`. The AWS key needs `s3:GetObject` and `s3:PutObject` on the bucket, which the bucket-limited policy from the setup already allows.
- **What it does:** downloads each product photo, compresses it like a new upload, stores it under a new name and points the product at it.
- **Safe to run more than once:** photos that are already small (a JPEG of 1600px or less, under 500 KB) are skipped, and a photo shared by several products is compressed once.
- **Originals stay in the bucket**, because past orders still show them.

## 10. Multiple photos

**Product page** (`client/src/components/ProductGallery.jsx`, new):
- **Gallery:** the main photo with **thumbnails** underneath. The one showing has a teal border.
- **Moving between photos:** **‹ ›** buttons and a **"2 / 4"** counter on the photo, and **swiping** left or right on phones.
- **One photo:** products with one photo look exactly as before.
- **Screen readers:** the buttons are labelled ("Next photo", "Show photo 2 of 4"), and photos after the first are described as "photo 2 of 4".

**Admin forms** (`client/src/components/admin/PhotoManager.jsx`, new; `AdminUploadProduct.jsx`; `AdminEditProduct.jsx`):
- **Adding photos:** choose several at once, up to 8. Previews appear straight away.
- **Arranging:** the first photo is the **main photo**, shown in listings, the cart and orders, and is marked "Main". Each photo has **← / →** to move it, **★** to make it the main photo, and **✕** to remove it.
- **Edit form:** shows the product's saved photos, which can be rearranged, removed or added to, all in one save. A new photo can be made the main photo straight away.
- **Rules:** a product needs at least one photo.

**Server:**
- `Product.images` holds every photo's key, main photo first, and `Product.image` stays as the main photo, so listings, cart, checkout and orders are unchanged.
- **Older products** with only `image` work everywhere.
- **Uploading** takes up to 8 photos in `images`.
- **Editing** takes:
  - new photos in `images`
  - `photoOrder`: the order of saved photos (by key) and new ones (`new:0`, `new:1`, …)
- **Checks:** a product can only use its own photos, and must have between 1 and 8.
- **Older forms:** the single `image` field still works on both routes.

## 12. Size guide and stock per size

### Size guide
**Files:** `client/src/components/SizeGuide.jsx` (new), `client/src/config/sizeGuide.js` (new)

- **Where:** a **"Size guide"** link next to the size picker opens a pop-up chart.
- **Which chart:** chosen from the product's sizes:
  - **Shoes** for US sizes: US, UK, EU and foot length
  - **Jeans** for waist sizes such as 24–32: waist and hips
  - **Men's** or **ladies' clothing** otherwise: chest/bust, waist and hips
- **Highlighting:** your chosen size is highlighted in the chart.
- **Tips:** measuring tips that match the chart.
- **Closing:** with ✕, Esc or a tap outside. While it's open, the page behind can't scroll, and focus moves into the pop-up and back afterwards.

> **⚠️ The measurements are typical sizing placeholders, not this shop's garments.** Replace them with your own in `client/src/config/sizeGuide.js` before going live, the same way as the delivery and returns wording.

### Stock per size
**Files:**
- `server/src/models/Product.js`
- `server/src/productFields.js`
- `server/src/inventory.js`
- `server/src/shopQuery.js`
- `client/src/components/ProductDetails.jsx`
- `client/src/components/admin/SizeStockInputs.jsx` (new)

**Admin forms:**
- **Upload form:** one stock box appears for each size as you type the sizes (e.g. S, M, L → three boxes), with the **total** shown underneath. This replaces the single "Inventory Qty" box.
- **Edit form, products tracked per size:** the boxes show the current stock. Adding a size adds a box; removing a size drops its stock.
- **Edit form, older products:** these keep their single stock number. Filling in a size's box switches the product to stock per size, and then every size needs a number.

**On the product page:**
- **Sold-out sizes** show as "US 7 (sold out)" and can't be chosen. The **first size in stock** is pre-selected.
- **"Only N left"** and the **quantity limit** follow the chosen size, e.g. "Only 1 left in size US 8".
- **Out of Stock** shows only when every size is sold out.
- **Cart:** the cart remembers the chosen size's stock, so its **+** stops there.

**Checkout, payment and cancelling:**
- **Checkout** checks the chosen size, e.g.:
  - "Only 1 left of Suede Loafers in size US 8"
  - "Suede Loafers in size US 7 is out of stock"
- **Payment:** the size's stock and the product total go down together when Stripe confirms payment.
- **Cancelling** an order puts them back.
- **Never below 0:** stock is set to 0 instead, and logged for follow-up.

**Shop filters:** filtering by a size hides products whose stock for that size has run out.

**Products without stock per size** work exactly as before.

## Security fix included
**`proxy-addr`**, which Express uses, had a new critical advisory (IP spoofing). It only matters when Express's "trust proxy" setting is switched on, and this app doesn't use that setting. It's updated to 2.0.8 in both lockfiles, and the server's production dependencies show 0 vulnerabilities again. The remaining advisory (`braces`) only affects a development tool, which isn't installed on Render.

## Tests
**Server** (33 new, 131 total):
- **`test/photos-and-sizes.test.js`:**
  - compression: size, shape, at least 10× smaller, never enlarged, rotation applied, metadata and location removed, transparency to white, non-images rejected
  - stock-per-size rules
  - uploading: several photos compressed in order, the older single field, a non-photo rejected before anything is stored, the 8-photo and 20 MB limits, stock per size and its total
  - editing: reordering, removing, adding, making a new photo the main photo, the older single field, refusing another product's photo, no photos, or too many
  - editing stock per size: when sizes change, the total, and switching back
  - checkout per size: sold out, too many, an unknown size
  - payment and cancelling per size, and never below 0
  - the size filter respecting stock
- **`test/optimize-photos.test.js`:** compresses once per photo, updates every product, keeps originals, skips small photos, the dry run changes nothing, and a second run skips everything.
- **Existing tests now upload real images**, since made-up bytes are rejected.
- **Proof the tests work:** removing the photo rotation, or the never-below-0 check, makes a test fail.

**Client** (23 new, 138 total):
- `ProductGallery.test.jsx`: one photo; thumbnails, arrows and wrapping; swiping; resetting for another product
- `SizeGuide.test.jsx`: which chart is picked, highlighting, tips that match the chart, closing with Esc, ✕ or a tap outside, and returning focus
- `ProductDetails.test.jsx`:
  - the gallery
  - sold-out sizes and pre-selecting a size in stock
  - per-size "Only N left" and limits, with the stock kept in the cart line
  - Out of Stock when every size is sold out
  - the size guide link
- `PhotoManager.test.jsx`: adding, moving, making the main photo, removing (releasing previews), and the 8-photo limit
- `AdminUploadProduct.test.jsx` and `AdminEditProduct.test.jsx`:
  - photos and stock boxes sent
  - a stock box per size as sizes are typed
  - a photo required
  - photo order with new photos
  - editing stock per size
  - switching an older product to stock per size

**Browser check** (Chromium; desktop 1280px and iPhone 15):
- **Gallery:** 3 thumbnails, and the thumbnails and arrows switch photos.
- **Sizes:** sold-out sizes are disabled and the first in-stock size is chosen. "Only 1 left in size US 8" shows and + stops at 1, then at 3 for US 9.
- **Size guide:** the shoe chart, with US 9 highlighted.
- **Cart:** + is disabled at the size's stock.
- **Shop filter:** "US 7" hides the loafers (sold out) and "US 9" shows them.
- **Admin upload:** 2 photos, reordered, and a stock box per size (total 7). Saved, and the form cleared.
- **Admin edit:** made photo 3 the main photo and changed US 9 from 3 to 5 (total 6 → 8). Saved.
- **Phone:** the product page and size guide fit the screen.
- **Errors:** no page errors.
- **Bug caught and fixed:** a server editing mistake had deleted some shared helper code. The browser check caught it, and the full test suite now covers it again.

## Deploying
- **Render:** installs `sharp` automatically with `npm ci`; it needs Node 20.9 or newer, and Render's Node 20 qualifies. Nothing to configure.
- **Netlify:** nothing to configure.
- **After deploying:** run `npm run optimize-photos -w server -- --dry-run` locally to see the savings, then run it without `--dry-run`.
- **Before going live:** replace the size guide's placeholder measurements, and enter stock per size for your products in the edit form.
