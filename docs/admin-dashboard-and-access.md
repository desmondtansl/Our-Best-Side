# Admin Dashboard & Admin Access: Shop Summary, Owner, Manage Admins

Batch F of the improvement list: the admin dashboard becomes a summary of the shop, and the shop owner can give or remove admin access from the site.

## Summary

| # | Improvement | Why it matters |
|---|-------------|----------------|
| 1 | The dashboard shows sales, orders waiting to ship, low stock, best sellers and recent orders | The dashboard was a menu of links. You couldn't see how the shop was doing, or what needed doing, without going through every order and product. |
| 2 | A shop **owner**, who can grant and remove admin access from **Manage Admins** | Making someone an admin meant editing the database in Atlas, and taking access away again was easy to forget. Now the owner does both from the site, with a record of every change. |

## Before you use it: make yourself the owner

This is a one-off step in **MongoDB Atlas**:

1. Open **Browse Collections** → `users`, and find your own account.
2. Add the field `isOwner` with the value `true` (a Boolean), and save.
3. Log out of the site and log in again.
4. Turn on two-step login: **My Account → Security** (see [security-hardening.md](security-hardening.md)). Admin pages need it. **Manage Admins** then appears on the dashboard.

Every admin needs two-step login. Someone you grant access to is sent to **My Account → Security** to turn it on the first time they open the dashboard.

An owner is always an admin, even without `isAdmin`. After this, you never need Atlas to change who is an admin.

## 1. Dashboard summary

**Files:**
- `server/src/routes/adminStats.js` (new): `GET /admin/stats`, admins only
- `server/src/inventory.js`: `LOW_STOCK_THRESHOLD = 3`
- `server/src/routes/adminOrders.js`: the order list accepts several statuses at once
- `client/src/pages/AdminDashboard.jsx`: rewritten
- `client/src/pages/AdminOrders.jsx`: the filter is kept in the address, and gets a **Waiting to ship** option

**The page, top to bottom:**
- **Menu:** Upload New Products, Search and Edit Products, Manage Orders, **Manage Admins** (owner only) and Logout, as a row of buttons. A **Refresh** button reloads the summary.
- **Sales:** three tiles for **Today**, **Last 7 days** and **Last 30 days**, each with revenue, number of orders and average order value.
- **Waiting to ship:** how many orders are *Paid* or *Processing*, and how long ago the oldest was placed. **View orders waiting to ship** opens Manage Orders already filtered to them.
- **Low stock:** products, or single sizes, with **3 or fewer** left, sold out first in red. Each name opens that product's edit page. Up to 10 are listed, then "and N more".
- **Best sellers:** the top 5 products by units sold in the last 30 days, with the revenue from each. Each name opens the product's edit page.
- **Recent orders:** the last 5, with order number, date, customer, total and status. **All orders** opens Manage Orders.

When there's nothing to show (a new shop, say), each section says so ("Nothing is running low.", "No orders yet.").

**How the numbers are worked out:**
- **What counts as a sale:** orders that are *Paid*, *Processing*, *Shipped* or *Delivered*. *Cancelled* orders and unfinished checkouts (*Awaiting payment*) never count.
- **Days run midnight to midnight Singapore time,** not UTC, so an order at 1am counts towards today. "Last 7 days" and "Last 30 days" include today.
- **Revenue** is the order subtotal: delivery is free, and refunds aren't tracked yet.
- **Low stock:** products whose stock isn't tracked (no stock number) are never listed. Products with stock per size are checked size by size.
- **Best sellers** are worked out from the items in past orders, so they still count a product whose name or price has since changed.
- **The low-stock limit** is `LOW_STOCK_THRESHOLD` in `server/src/inventory.js`. It's the same number at which product pages start showing "Only N left" (`client/src/config/store.js`), so change both together.

**Manage Orders** keeps its filter in the address, e.g. `/admin/orders?status=paid,processing`. That's how the dashboard opens it filtered, and the phone's Back button now returns to the previous filter.

### API

`GET /admin/stats` (admin token required) returns:

```json
{
  "currency": "sgd",
  "sales": {
    "today": { "revenue": 287, "orders": 2, "average": 143.5 },
    "week":  { "revenue": 929, "orders": 5, "average": 185.8 },
    "month": { "revenue": 1302, "orders": 7, "average": 186 }
  },
  "toShip": { "count": 3, "oldest": "2026-10-09T03:12:00.000Z" },
  "lowStock": {
    "threshold": 3,
    "items": [{ "productId": "…", "title": "Linen Shirt", "size": "L", "inStock": 0 }]
  },
  "bestSellers": [{ "productId": "…", "title": "Organic Tee", "units": 10, "revenue": 390 }],
  "recentOrders": [{ "_id": "…", "email": "…", "subtotal": 120, "currency": "sgd", "status": "paid", "createdAt": "…" }]
}
```

`GET /admin/orders?status=paid,processing` now accepts several statuses separated by commas. An unknown status anywhere in the list is still refused (400).

## 2. Owner and Manage Admins

**Files:**
- `server/src/models/User.js`: new `isOwner` field, and an `isAdmin()` helper that treats an owner as an admin
- `server/src/models/AdminAccessLog.js` (new): one entry each time access is granted or removed
- `server/src/middleware/requireOwner.js` (new)
- `server/src/middleware/requireAdmin.js`: lets owners in
- `server/src/routes/adminUsers.js` (new): `/admin/users`, owner only
- `server/src/routes/auth.js`: login and `/auth/user` also return `isOwner`
- `client/src/pages/AdminUsers.jsx` (new): the Manage Admins page, at `/admin/users`
- `client/src/routes/OwnerRoutes.jsx` (new): sends other admins back to the dashboard
- `client/src/context/Auth.jsx`, `client/src/pages/Login.jsx`: keep `isOwner`

**Who can do what:**

| | Shopper | Admin | Owner |
|---|---|---|---|
| Upload and edit products, manage orders, see the dashboard | | ✓ | ✓ |
| See Manage Admins, grant and remove admin access | | | ✓ |

**The Manage Admins page:**
- **Add an admin:** enter the email of an **existing account** and choose **Grant access**. The person must sign up on the site first, so nobody can create an admin account from this page. If no account uses that email, the page says so.
- **Admins:** everyone with access. The owner is marked **Owner**, and your own row **You**. Every other admin has **Remove access**.
- **Recent changes:** the last 10 grants and removals, with who made them and when.
- **Confirmation:** both actions ask "Are you sure?" first ("Give … admin access?", "Remove admin access from …?").

**Safeguards:**
1. **You can't remove your own access.** There's no Remove button on your row, and the server refuses it too.
2. **Owners can't be removed from the site,** only in Atlas, so one owner can never lock out another. Together with (1), this means the shop always has at least one admin: the owner.
3. **Removal takes effect straight away.** Admin pages and the admin API check the database on every request, not the login token. A removed admin is refused immediately, even while still logged in, and their next page load sends them to the homepage.
4. **Only the owner can see the page.** Other admins don't see the link, are sent back to the dashboard if they open `/admin/users`, and get 403 from the API.
5. **Every change is recorded** in the `adminaccesslogs` collection: the action, whose access changed, who changed it, and when.

### API

All three routes need the owner's token. Anyone else gets 403.

| Route | Body | Does |
|---|---|---|
| `GET /admin/users` | | Lists admins (`email`, `isOwner`), owner first, and the last 10 changes |
| `POST /admin/users/grant` | `{ "email": "…" }` | Makes an existing account an admin. 404 if no account uses the email, 400 if they're already an admin. |
| `POST /admin/users/revoke` | `{ "email": "…" }` | Removes admin access. 400 for your own access or an owner's, 404 if they aren't an admin. |

Grant and revoke reply with the updated list and changes, in the same shape as `GET`. Emails are trimmed and lower-cased.

## Tests

**Server** (`npm test -w server`, 148 tests):
- `test/adminStats.test.js` (new):
  - Singapore day boundaries.
  - Sales totals and averages, leaving out pending, cancelled and older orders.
  - Orders waiting to ship, and the oldest one.
  - Low stock, by size and by product, ignoring products whose stock isn't tracked.
  - Best-seller ranking.
  - Recent orders.
  - An empty shop.
  - Admins only.
- `test/adminUsers.test.js` (new):
  - Owner only: other admins and shoppers get 403.
  - Grant and remove, both recorded in the log.
  - Unknown emails, and people who are already admins.
  - A removed admin refused straight away on every admin route.
  - No removing yourself or another owner.
  - The log keeps the last 10.
- `test/auth.test.js`:
  - An owner without `isAdmin` is still treated as an admin, at login, in `/auth/user` and on admin routes.
- `test/adminOrders.test.js`:
  - Filtering by several statuses.

**Client** (`npm test -w client`, 174 tests):
- `AdminDashboard.test.jsx`:
  - Every section, with links to Manage Orders and product edit pages.
  - Manage Admins shown to the owner only.
  - The messages for an empty shop.
  - Error and Refresh.
  - Logout.
- `AdminUsers.test.jsx` (new):
  - Owner and You marks.
  - Grant and remove, after confirming.
  - Cancelling a confirmation does nothing.
  - The server's messages are shown.
- `OwnerRoutes.test.jsx` (new):
  - The owner gets in, other admins go to the dashboard, shoppers go home.
- `AdminOrders.test.jsx`:
  - Opening from the dashboard's "Waiting to ship" link.

**In a real browser** (Chromium, desktop 1280px and phone 390px, with sample orders and products):
- **Dashboard:** the totals matched the sample data, and it made one request on load.
- **Waiting to ship:** the link opened Manage Orders filtered to the 3 orders waiting.
- **Manage Admins:**
  - Granted and removed access.
  - An unknown email showed its message.
  - A staff admin saw no Manage Admins link and was sent back from `/admin/users`.
  - After their access was removed, the staff admin was sent to the homepage on their next page load.
- **Phones:** no sideways scrolling on either page.

## Not included (possible follow-ups)

- **Email alerts** for low stock or new orders: these need email sending (Batch B).
- **A history of all admin actions** (order and product changes). Only access changes are recorded for now.
- **Charts of sales over time.** The tiles show totals only.
