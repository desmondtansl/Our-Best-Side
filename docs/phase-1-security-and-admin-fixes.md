# Phase 1: Security & Admin Flow Fixes

This is the first of four planned clean-up phases, found during a full repo review. It covers the security holes and the broken admin flow. [Remaining work](#remaining-work) lists what is still to do.

## Summary

| # | Problem | Impact | Fix |
|---|---------|--------|-----|
| 1 | The admin check in `checkAuth` was commented out | **Any** logged-in user could upload or edit products | New `requireAdmin` middleware on both routes |
| 2 | `/auth/user` did not return `isAdmin` | Admins were kicked off admin pages after a page refresh | Endpoint returns `id` and `isAdmin`, and the client stores them |
| 3 | `ProtectedRoutes` read `user.data.isAdmin` while `user.data` was `null` | Logged-out visitors to `/dashboard`, `/upload` or `/search` got a white screen | Optional chaining, so they are redirected home |
| 4 | Edit form sent the file input's `C:\fakepath\...` string as `image` | Editing a product broke its image | Real file upload (multipart); the image is optional and kept if none is chosen |
| 5 | Edit form sent every field, with blank defaults for untouched ones | Changing one field wiped all the others | Only fields the admin actually changed are sent |
| 6 | `PUT /products/:id` did `$set: req.body` | Any field could be overwritten (mass assignment) | Only allowed fields are accepted |
| 7 | Search built a `$regex` from raw user input | `.*` matched everything, `[` errored, and some patterns could cause a ReDoS | Input is escaped and matched literally |
| 8 | Edit showed "successfully edited" before the request finished | A success message appeared even when the save failed | The alert waits for the request, with a failure message on error |

## Server changes

### `server/src/middleware/requireAdmin.js` (new)
- Runs after `checkAuth`, which sets `req.user` to the token's email.
- Looks the user up in MongoDB and returns 403 (same error shape as `checkAuth`) if the user is missing or not an admin.
- It checks the database rather than trusting a token claim for two reasons:
  - signup tokens carry no `isAdmin`
  - removing someone's admin rights takes effect immediately, without waiting for their token to expire

### `server/src/routes/products.js`
- `POST /products/upload` and `PUT /products/:id` share `uploadMiddleware = [checkAuth, requireAdmin, upload.single("image")]`.
- New helper `uploadImageToS3(file)` holds the S3 upload that used to sit inline in the upload route. Both routes use it now.
- `PUT /products/:id`:
  - accepts multipart form data
  - only updates `title, description, category, size, color, price, inStock` (`EDITABLE_FIELDS`)
  - uploads a new image only if a file is sent, and otherwise keeps the existing `image`
  - returns **404** if the product does not exist
  - no longer generates a pointless presigned *PUT* URL or sets `Product.imageUrl`
- `GET /products/search/:query` escapes regex metacharacters (`escapeRegex`) before building the prefix `$regex`.

### `server/src/routes/auth.js`
- `GET /auth/user` now returns `{ id, email, isAdmin }`.

### `server/src/app.js` (new) and `server/src/server.js`
- The Express app setup (middleware and routes) moved into `createApp()` in `app.js`, so tests can build the app without connecting to MongoDB or listening on a port.
- `server.js` still connects to Mongo and listens exactly as before. Runtime behaviour is unchanged.

## Client changes

### `client/src/context/Auth.jsx`
- On page load, the stored token is checked against `/auth/user`. The provider now keeps `id` and `isAdmin` from that response, as well as `email`.

### `client/src/routes/ProtectedRoutes.jsx`
- `user.data?.isAdmin` means logged-out visitors are redirected instead of crashing the page.

### `client/src/pages/AdminEditProduct.jsx`
- Field state starts as `undefined`, and only fields the admin edits are sent.
- The request body is `FormData`:
  - category, size and color are split and appended one entry at a time
  - `image` is appended only if a file was chosen
- The image input is no longer `required` and stores the `File` object.
- The success alert shows only after the request succeeds; failures show "Failed to edit product".

## Tests (new)

The repo had no tests before this phase.

| Workspace | Tooling | Files |
|-----------|---------|-------|
| `server/` | Node's built-in `node:test`, `supertest`, `mongodb-memory-server` (real in-memory MongoDB 6.0), `aws-sdk-client-mock` (S3 is mocked) | `test/auth.test.js`, `test/products.test.js`, `test/helpers.js` |
| `client/` | `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom` (axios is mocked) | `src/context/Auth.test.jsx`, `src/routes/ProtectedRoutes.test.jsx`, `src/pages/AdminEditProduct.test.jsx` |

Running them:

```bash
npm test               # from the repo root: runs server + client
npm test -w server     # server only (18 tests)
npm test -w client     # client only (11 tests)
```

Each fix was checked by running the tests against the original code: 10 of the 18 server tests and 7 of the 11 client tests fail without the fixes.

### Notes
- `mongodb-memory-server` downloads a MongoDB binary from `fastdl.mongodb.org` on the first run, then caches it. In restricted networks, such as Claude Code cloud environments, that domain must be allowed.
- The in-memory MongoDB version is pinned to 6.0 in `server/test/helpers.js`. mongoose 6 ships MongoDB driver 4.x, which does not support newer servers. Override it with `MONGOMS_VERSION` if needed.
- `client/vite.config.js` turns off React fast refresh when running under Vitest. `@vitejs/plugin-react` 3.x otherwise fails with a "can't detect preamble" error.

## Remaining work

These issues were found in the same review but are out of scope for Phase 1.

**Phase 2: Checkout & products API**
- Checkout matches Stripe products by description and trusts price IDs sent by the client. Store `stripePriceId` on `Product` and build line items on the server.
- The Stripe success route (`checkout.js`) has an invalid path and can never match.
- `/men`, `/ladies` and `/combined` share module-level arrays, so concurrent requests can mix up each other's results. `/combined` queries `"Women"` instead of `"Ladies"`.
- `GET /products/:id` crashes on an unknown ID.

**Phase 3: Client UX bugs**
- Colour is never selectable. The ladies page defaults size to an empty string.
- Sizes and colours are split on whitespace as well as commas, so `"US 8"` becomes `["US", "8"]`.
- The cart is not persisted and has no way to remove an item.
- Pages crash on network errors in Login and Auth.
- `MenProducts` renders a literal `0` when there are no products.
- Logout doesn't clear the axios auth header.
- Featured product links are absolute Netlify URLs.
- The announcement and carousel copy is out of date (CNY '23).

**Phase 4: Hygiene**
- Remove unused dependencies (`stripe`, `dotenv` and `react-stripe-checkout` on the client; `react-stripe-checkout` on the server; `nodemon` belongs in dev dependencies) and the orphan Tailwind config.
- Add `.env.example` and ESLint.
- Strip debug `console.log`s, including one that logs decoded JWTs.
- Unify the error response shape.
- Tighten CORS.
- Upgrade dependencies (mongoose 6, stripe 11, vite 4, MUI 5, …).
- Remove the duplicated Men/Ladies pages.
