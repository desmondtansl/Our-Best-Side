# Order Management: Order Page, Tracking, Notes, Search, Refunds

Batch G. Emails to customers are left for a later batch, and couriers aren't fixed yet, so the courier is a free-text field.

## Summary

| # | Improvement | Why it matters |
|---|-------------|----------------|
| 1 | An **order page** for each order | The list showed only a summary. Now everything about an order is in one place: items, customer, address, payment, refunds, tracking, notes and the history of status changes. |
| 2 | **Tracking** asked for when an order is marked Shipped, and shown to the customer | Customers had no way to follow their parcel. |
| 3 | **Internal notes** on each order | There was nowhere to write things like "asked for gift wrap". Customers never see these notes. |
| 4 | **Search** by order number or email, **date range**, and **Load more** | Only the 200 newest orders could be seen, with no way to find a particular one. |
| 5 | **Refunds through Stripe** from the order page, in full or in part, and **cancel and refund in one step** | Refunds meant going to the Stripe Dashboard separately, which was easy to forget. |

## Before going live: one Stripe setting

Add the **`charge.refunded`** event to your Stripe webhook:
1. In Stripe, go to Developers → Webhooks → your endpoint → **⋯** → **Update details**.
2. Under **Select events**, tick `charge.refunded`, then click **Update endpoint**.

Do it in test mode now, and again in live mode when you switch. Without it, refunds made **in the Stripe Dashboard** don't show on the site. Refunds made from the site always show. The steps are also in `deploying-to-render.md`.

## 1. Order page

**Where it is:** `/admin/orders/<id>`. Open it by clicking the order number in Manage Orders, or under Recent orders on the dashboard.

**File:** `client/src/pages/AdminOrderDetail.jsx` (new)

**Sections:**
- **Status:**
  - The same status dropdown as in the list, with the same pop-ups for cancelling and shipping.
  - **History** of every change: when it was placed, when Stripe confirmed payment, and each change made afterwards, with the admin's email.
  - Orders from before this update only show "Placed" and their current status, since earlier changes weren't recorded.
- **Customer:** their email, whether they have an account or checked out as a guest, and the delivery address.
- **Items:**
  - Each item with size and colour, quantity, price and line total, linking to the product's edit page.
  - The total paid, and when there are refunds, the amount refunded and the amount kept.
- **Payment and refunds:**
  - The card used, and a link to the payment in Stripe.
  - Every refund, with its date and who made it ("in Stripe" for refunds made in the Stripe Dashboard).
  - A form to refund more (see 5).
- **Tracking:** shows the details, with **Add tracking** or **Edit tracking** to add them after shipping or correct them.
- **Internal notes:** a text box with **Save notes**, up to 2,000 characters. Only admins see these notes.

## 2. Tracking

**Files:**
- `client/src/components/admin/ShipOrderDialog.jsx` (new)
- `client/src/components/admin/TrackingFields.jsx` (new)

**When you choose Shipped**, a pop-up asks for:
- **Courier:** free text. It suggests SingPost, Ninja Van, J&T Express, Qxpress, DHL and Lalamove, but any name works.
- **Tracking number**
- **Tracking link:** must start with `https://` or `http://`. Other links are refused, so a link can never run code when someone clicks it.

All three are optional. **Mark as shipped** saves them with the new status. **Back** changes nothing. If saving fails, the pop-up stays open with the reason.

**What customers see:** under My Account → Orders, "Shipped with Ninja Van · Tracking number NVSG12345 · Track your parcel ↗".

## 3. Internal notes

- **Who sees them:** admins only.
- **Customers:** the customer's order history leaves out the notes, and also the status history (which names admins) and the refund details. It shows only the total refunded.

## 4. Finding orders

On **Manage Orders**:
- **Order number or email:**
  - Type an order number (with or without `#`, in any case) or part of an email, then press **Search**.
  - A full order number finds that order. A partial number like `0612` finds orders whose number ends with it.
- **Show:** the status filter, as before.
- **From / To:** dates, in Singapore time, both days included.
- **Clear filters:** appears when any filter is set.
- **Kept in the address:** all filters are in the page address, so Back returns to the previous search.
- **Load more orders:** loads the next 50. The list used to stop at 200.

## 5. Refunds

**Files:**
- `server/src/refunds.js` (new)
- `server/src/routes/adminOrders.js`
- `server/src/routes/webhook.js`
- `client/src/components/admin/RefundDialog.jsx` (new)
- `client/src/components/admin/CancelOrderDialog.jsx`
- `client/src/components/admin/CancelNotice.jsx` (new)

**Who can refund:** any admin.

**From the order page:**
1. Enter the amount (it starts at the full amount still refundable) and press **Refund…**.
2. A pop-up asks you to confirm:
   - **Warning:** "**This action cannot be undone.**" in the same red box as the cancel pop-up.
   - **Details:** where the money goes (e.g. "the VISA ending 4242"), and that it takes 5–10 working days.
   - **Status:** the order's status doesn't change.
3. **No, go back** has focus when the pop-up opens. **Yes, refund $X** makes the refund.
4. **If Stripe refuses** (e.g. a disputed charge), the pop-up stays open with Stripe's reason.

**When cancelling:**
- **The pop-up:** if the order can be refunded, the cancel pop-up has a ticked box, **Also refund $X to the customer now, through Stripe**, and the button reads **Yes, cancel and refund**.
- **Afterwards:**
  - A teal notice says it's done.
  - If the refund fails, a red notice gives the reason and where to refund instead.
  - If you unticked the box, the red reminder from before appears.

**Rules:**
- **Amount:** more than 0, at most 2 decimal places, and no more than what's left to refund.
- **No Stripe payment saved** (older orders): the page says so, and the refund has to be made in the Stripe Dashboard.
- **Double-clicks make one refund.** The site sends Stripe an idempotency key, so a repeated request returns the first refund instead of making a second.
- **Refunds made in the Stripe Dashboard** reach the site through the `charge.refunded` webhook event (see the setting above).
  - Each refund is recorded once, by its Stripe id, however many times Stripe reports it.
  - Failed refunds aren't counted.
- **Refunding never changes the status.** A refund can be for a return after delivery, so cancel separately if the order won't be sent.

**On the dashboard:** revenue is now what the shop kept, i.e. the order totals less refunds. A fully refunded order still counts as an order, with $0 revenue.

## API

All routes need an admin token.

| Method | Path | Body / query | Does |
|---|---|---|---|
| GET | `/admin/orders` | `status`, `q`, `from`, `to` (YYYY-MM-DD), `page` | Lists 50 orders per page, with `hasMore`. 400 for an unknown status or a badly formed date. |
| GET | `/admin/orders/:id` | | Returns one order |
| PATCH | `/admin/orders/:id` | `{ status, tracking? }` | Changes the status and records it in `statusHistory`. `tracking` is saved when the status is `shipped`. |
| PUT | `/admin/orders/:id/tracking` | `{ courier, number, url }` | Adds or corrects tracking. All empty removes it. |
| PUT | `/admin/orders/:id/notes` | `{ notes }` | Saves internal notes (up to 2,000 characters) |
| POST | `/admin/orders/:id/refund` | `{ amount }` | Refunds through Stripe. 400 for a bad amount or no saved payment, 502 when Stripe refuses (with Stripe's reason). |

**Every order returned includes:**
- `stripeUrl`
- `refundable`: what's left to refund through the site, or 0 without a saved Stripe payment
- `refunds`
- `refundedTotal`
- `statusHistory`
- `tracking`
- `notes`

**New order fields** (`server/src/models/Order.js`):
- `statusHistory`: `[{ status, at, by }]`
- `tracking`: `{ courier, number, url }`
- `notes`
- `refunds`: `[{ stripeRefundId, amount, at, by }]`
- `refundedTotal`

## Tests

**Server** (`npm test -w server`, 171 tests). The new `test/orderManagement.test.js` covers:
- **Search:**
  - By order number, with `#` or in lowercase.
  - By part of an email.
  - Regex characters are searched for literally.
- **Dates:** Singapore day boundaries at both ends, and badly formed dates refused.
- **Paging:** 50 per page.
- **Order detail:**
  - Admins only.
  - Unpaid checkouts are hidden.
  - The refundable amount.
- **Status history:** payment confirmed by Stripe, then each admin change with their email. Setting the same status again doesn't add an entry.
- **Tracking:**
  - Saved when shipping, and added or corrected later.
  - Non-web links refused.
  - Length limits.
- **Notes:**
  - Saved, up to 2,000 characters.
  - **Never shown to customers.** Their order history has no notes, status history, refund details or admin emails.
- **Refunds:**
  - Part, then the rest, sent to Stripe in cents with the admin's email.
  - Bad amounts refused without calling Stripe.
  - Stripe's reason passed on, with nothing recorded.
  - Two presses at once make one refund.
  - Refunds made in Stripe recorded once from the webhook, even when it's sent twice, and failed ones ignored.
  - Dashboard revenue less refunds.

**Client** (`npm test -w client`, 199 tests):
- **`AdminOrderDetail.test.jsx`** (new):
  - Every section.
  - "Order not found".
  - A status change added to the history.
  - A partial refund, after confirming, with the warning and focus.
  - Amounts that are too large refused.
  - Stripe errors shown in the pop-up.
  - Fully refunded orders.
  - Adding tracking.
  - Saving notes.
- **`AdminOrders.test.jsx`:**
  - Links to the order page.
  - Search and dates kept in the address.
  - Clear filters.
  - Load more, without showing an order twice.
  - The shipping pop-up: saving, errors, Back.
  - Cancel and refund, cancel without refunding, and a failed refund.
- **`Account.test.jsx`:** customers see tracking and refunds.
- **`AdminDashboard.test.jsx`:** recent orders link to their pages.

**In a real browser** (Chromium, desktop 1280px and phone 390px, with sample orders and Stripe faked):
- **Search:** by email and by order number each found the right order.
- **Shipping:** an order was shipped with Ninja Van tracking.
- **Cancel and refund:** cancelled and refunded $117.00 in one step, and the teal notice appeared.
- **Refunds:** a partial refund of $20.00 was made from the order page after confirming. "No, go back" had focus.
- **Notes:** saved.
- **The customer's view:** their account showed "Shipped with SingPost · Tracking number RR123SG" and "Refunded $20.00", and not the notes.
- **Phones:** no sideways scrolling on the order page or the list.

## Not included (possible follow-ups)

- **Emails:** order confirmation, shipping notice with tracking, and an alert to you about new orders. These need an email service (Batch B).
- **Fixed couriers with automatic tracking links,** once you've chosen your couriers.
- **Packing slips and invoices to print, and CSV export.**
