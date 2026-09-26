# Admin Upload Form, Dashboard Navigation & Product Images

Three problems reported after creating products through the dashboard.

## 1. Upload form stayed filled in after a successful upload

**Before:** after "Upload Product", an alert appeared but every field kept its value, including the photo and the featured box. Failed uploads were only logged to the browser console.

**Now** (`client/src/pages/AdminUploadProduct.jsx`):
- **After a successful upload:**
  - the form is cleared: text fields, the photo and the "Featured on homepage" box
  - a message appears under the button: *"Product name" was uploaded. **View product***
- **While uploading:** the button reads **Uploading…** and is disabled, which prevents double submits.
- **If the upload fails:** the server's message is shown in red, e.g. *Price must be a number greater than 0*, and the form **keeps** its values so you can fix them.

## 2. No way back to the dashboard

**Now:** **← Back to Dashboard** at the top of:
- Upload New Products (`/upload`)
- Search and Edit Products (`/search`)
- the Edit Product page (`/search/:id`), which also has **← Back to search**
- Manage Orders (`/admin/orders`), replacing its old plain link so all admin pages match

It's one shared component, `client/src/components/BackToDashboard.jsx`.

## 3. Product photos didn't display

**Cause:** uploads worked (the product and its image key were saved, and the file reached S3), but the site loaded each photo straight from the bucket's public address:

```
https://desmondecommercesite.s3.ap-southeast-1.amazonaws.com/<key>
```

That address only works if the bucket allows public reads. By default, AWS blocks public access to buckets, so every photo request was refused.

**Fix:** photos now load through the API, and the bucket stays **private**. This is safer than making it public.

```
<img src="https://<render>/products/image/<key>">
        │
        ▼
GET /products/image/:key      (server/src/routes/products.js)
        │  signs a link locally with the IAM key (s3:GetObject), valid 1 hour
        ▼
302 → https://desmondecommercesite.s3…/<key>?X-Amz-Signature=…&X-Amz-Expires=3600
        │  Cache-Control: public, max-age=3300 (browsers reuse it for 55 minutes)
        ▼
S3 returns the photo
```

- `server/src/s3.js`:
  - new `signedImageUrl(key, expiresIn)`
  - new `isValidImageKey(key)`: only plain file names, so arbitrary paths can't be signed
  - `imageUrl()` (the public-URL helper) was **removed**
- `client/src/utils/products.js`: `productImageUrl()` now points at the API route. This covers the homepage, listings, product pages and cart. Setting `VITE_IMAGE_BASE_URL` still switches back to a direct image host if that's ever wanted.
- **Stripe checkout:** the product photos sent to Stripe are signed links valid for 24 hours, the lifetime of a checkout session, instead of public URLs.

**Nothing to change in AWS:** the IAM user already has `s3:GetObject`. Leave **Block all public access** on.

**Troubleshooting:** open `https://<render>/products/image/<key>` directly. `docs/deploying-to-render.md` → "Private bucket, signed image links" explains what each error means.

## Files changed

| File | Change |
|------|--------|
| `server/src/s3.js` | `signedImageUrl()`, `isValidImageKey()`; removed public `imageUrl()` |
| `server/src/routes/products.js` | New `GET /products/image/:key` (302 to a signed link, cached for 55 minutes, 404 for invalid keys) |
| `server/src/routes/checkout.js` | Stripe line-item images use 24-hour signed links |
| `server/test/catalogue.test.js` | Tests for the image route (redirect, signature, expiry, caching, rejected keys) |
| `server/test/checkout.test.js` | Checks Stripe images are signed with a 24-hour expiry |
| `client/src/utils/products.js` | `productImageUrl()` uses the API image route |
| `client/src/components/BackToDashboard.jsx` | **New.** Shared "← Back to Dashboard" link |
| `client/src/pages/AdminUploadProduct.jsx` | Form clears after success, inline success and error messages, "Uploading…" state, back link |
| `client/src/pages/AdminSearchProduct.jsx` | Back link |
| `client/src/pages/AdminEditProduct.jsx` | Back to Dashboard and Back to search links |
| `client/src/pages/AdminOrders.jsx` | Uses the shared back link |
| `client/src/pages/AdminUploadProduct.test.jsx` | **New.** Tests for form reset, success message, "Uploading…", errors keeping values, and back links |
| `client/src/pages/AdminEditProduct.test.jsx`, `client/src/components/ProductDetails.test.jsx` | Back links; image URL now uses the API route |
| `docs/deploying-to-render.md` | Replaced the "make the bucket public" advice with the private-bucket setup and troubleshooting |
| `docs/product-catalogue.md` | Image checklist item updated |

## Verification

| Check | Result |
|-------|--------|
| Server tests | **74 / 74 pass** (2 new, 1 updated) |
| Client tests | **48 / 48 pass** (5 new, 2 updated) |
| Client build | Passes |
| Browser run | **5 / 5 steps pass**, no page errors |

The browser run used the real client and server with an in-memory MongoDB. S3 was replaced by a local HTTPS stand-in that, like a private bucket, only serves requests carrying a valid signature. Steps:
1. Admin uploads a product. The confirmation appears, and every field is empty again (checked in a real browser, including the photo field and featured box).
2. A second product uploads straight away.
3. Back to Dashboard works from Upload and Search. The Edit page's Back to search and Back to Dashboard links work.
4. Homepage photos load through `/products/image/<key>`, redirecting to a signed link valid for 1 hour.
5. The product page photo loads.

The live site hasn't been checked yet: merge, wait for Render and Netlify to redeploy, then reload the homepage.
