# Security Settings

General security and vulnerability fixes were made across the site. This page covers the settings and tools that came with them.

## Two-step login

After the password, logging in also asks for a 6-digit code from an authenticator app on the user's phone (Google Authenticator, Microsoft Authenticator, 1Password and similar).

- **Admins must have it.** Admin pages (and Manage Admins) don't open without it. An admin without it is sent to **My Account → Security** to turn it on.
- **Customers can choose** to turn it on in the same place.
- **Turning it on:** **My Account → Security → Set up two-step login**. Enter your password, scan the QR code with the app (or type in the key), then enter the code the app shows.
- **Recovery codes:** 10 one-time codes are shown once, when two-step login is turned on. Keep them away from your phone (printed, or in a password manager). Each code logs in once instead of an app code. The Security tab shows how many are left. To get new ones, turn two-step login off and on again.
- **Turning it off:** needs the password and a code (or a recovery code).
- Turning it on or off logs out the account's other devices.

**If the owner loses both the phone and the recovery codes:** in MongoDB Atlas, open `users`, find the account, set `twoFactor.enabled` to `false`, then log in with the password and set it up again.

## Changing a password

**My Account → Security → Password**: the current password, then the new one twice. The account's other devices are logged out. The current password can be tried 5 times per 15 minutes.

## Logging out

- **Logout** ends that login on the server too, not just in the browser.
- **My Account → Log out of all devices** ends every login for the account.

## Render settings

| Setting | Value | Why |
|---|---|---|
| `NODE_ENV` | `production` | Production mode, set in `render.yaml`. On Render, the server also treats itself as production if this is missing. |
| `BASE_URL` | `https://ourbestside.netlify.app` (no trailing slash) | **Required in production:** the server won't start without it. Only this website may call the API from a browser. If it's wrong, the site can't load products. Change it if the shop moves to its own domain. |
| `ALLOWED_ORIGINS` | *(optional)* | Other website addresses allowed to call the API, comma-separated. |
| `TRUST_PROXY_HOPS` | *(optional, default 1)* | How many proxies sit in front of the server. See "Connection check" below. |
| `PUBLIC_REQUESTS_PER_MINUTE` | *(optional, default 300)* | Page views per visitor address per minute on public pages (products, search, banners). |

## Netlify settings

| Setting | Value | Why |
|---|---|---|
| `VITE_BASE_URL` | The API's address, e.g. `https://ourbestside-api.onrender.com` | **Required:** the build stops without it. It's also written into the website's security headers (below). |
| `VITE_IMAGE_ORIGIN` | *(optional)* | The photo bucket's address. Defaults to the shop's S3 bucket. Only needed if photos move. |

## Website headers

`client/public/_headers` sets security headers for every page on Netlify. Its `Content-Security-Policy` names the API and the photo bucket exactly. `%API_ORIGIN%` and `%IMAGE_ORIGIN%` are filled in from the settings above when the site is built (`client/buildHeaders.js`).

If the site starts loading something from a new address, add that address to the `Content-Security-Policy` line, or browsers will block it.

## Admin tools

- **Manage Admins → Connection check** (owner only): shows the internet address the server sees for you, and whether `TRUST_PROXY_HOPS` looks right.
  - If it isn't right, the check says what to set it to on Render. Check again afterwards.
  - The address should also match the one on whatismyipaddress.com.
  - Run it again after any change on Render.
- **Manage Admins → Admin activity** (owner only): the last 100 actions by admins, with who did what and when.
- **Orders:** if an item sold out while an order was being paid for, a note at the top of the order's internal notes says so. Check the stock before shipping, or refund what can't be sent.

## Checkout

Stripe's checkout page closes 30 minutes after it opens (the shortest time Stripe allows). A shopper who takes longer starts checkout again from the cart.

Stripe's page doesn't show a countdown, so the cart says "You'll have 30 minutes to complete payment." under the Checkout button. The number is `CHECKOUT_MINUTES` in `client/src/config/store.js`: change it there if the server's time (`CHECKOUT_MINUTES` in `server/src/routes/checkout.js`) ever changes.

## Accounts to keep secure

- **MongoDB Atlas password:** long and random.
- **`JWT_SECRET` on Render:** a long random value.
- **Two-step login:** on for the shop (above), and for GitHub, Render, Netlify, Atlas, Stripe and AWS.
