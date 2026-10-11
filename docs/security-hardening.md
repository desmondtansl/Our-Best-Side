# Security Settings

General security and vulnerability fixes were made across the site. This page covers the settings and admin tools that came with them.

## Render settings

| Setting | Value | Why |
|---|---|---|
| `NODE_ENV` | `production` | Production mode, set in `render.yaml`. Confirm it under Render → Environment. |
| `BASE_URL` | `https://ourbestside.netlify.app` (no trailing slash) | In production, only this website may call the API from a browser. If it's wrong, the site can't load products. Change it if the shop moves to its own domain. |
| `ALLOWED_ORIGINS` | *(optional)* | Other website addresses allowed to call the API, comma-separated. |
| `TRUST_PROXY_HOPS` | *(optional, default 1)* | How many proxies sit in front of the server. See "Connection check" below. |

## Website headers

`client/public/_headers` sets security headers for every page on Netlify. If the site starts loading something from a new address, add that address to the `Content-Security-Policy` line, or browsers will block it. For example, if the API moves to its own domain, add that domain.

## Admin tools

- **Manage Admins → Connection check** (owner only): shows the internet address the server sees for you. It should match the one on whatismyipaddress.com. If it doesn't, follow the instructions shown there.
- **Manage Admins → Admin activity** (owner only): the last 100 actions by admins, with who did what and when.
- **My Account → Log out of all devices:** ends every login for the account, on every device.

## Accounts to keep secure

- **MongoDB Atlas password:** long and random.
- **`JWT_SECRET` on Render:** a long random value.
- **Two-step login:** on for GitHub, Render, Netlify, Atlas, Stripe and AWS.
