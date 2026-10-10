# Cancelling Orders: Confirmation Pop-up, Cancelling Is Final

## Summary

| Improvement | Why it matters |
|-------------|----------------|
| Choosing **Cancelled** in Manage Orders opens a pop-up that must be confirmed, with **"This action cannot be undone."** in large red text | Cancelling was one tap in a dropdown, and easy to do by mistake. |
| Links to the order's payment in the **Stripe Dashboard**: in the pop-up, in a reminder after cancelling, and next to every cancelled order | Cancelling doesn't refund the customer. The refund is done in Stripe, and it's easy to forget once the order is marked Cancelled. |
| A cancelled order can never have its status changed again | Before, a cancelled order could be moved back to Paid. Cancelling doesn't refund the customer, and the items have already gone back on sale, so un-cancelling could leave an order marked Paid whose money was refunded, or take stock that another shopper had since bought. Most shop systems treat cancelling as final for these reasons. |

## The pop-up

**Files:**
- `client/src/components/admin/CancelOrderDialog.jsx` (new)
- `client/src/pages/AdminOrders.jsx`

When an admin chooses **Cancelled** for an order, nothing changes yet. The dropdown keeps showing the current status, and a pop-up opens:

- **Title:** "Cancel order #ABCD1234?"
- **Warning, straight under the title:** a red box with a ⚠ sign and **"This action cannot be undone."** in large bold red text. Screen readers announce it as the pop-up's description.
- **What happens:**
  - The status can never be changed again. If the order was cancelled by mistake, the customer needs to order again.
  - The items go back in stock straight away.
- **Refund box:** "**The customer is not refunded automatically.** Refund $78.00 in Stripe." with an **Open this payment in Stripe ↗** link (see below).
- **Buttons:** **No, keep order** (beige) and **Yes, cancel order** (red).

**Ways to back out without cancelling:**
- **No, keep order**
- **Esc**
- Tapping outside the pop-up
- The phone's **Back** button

**Keyboard:** the pop-up opens with **No, keep order** focused (the Stripe link comes before it on the page, but doesn't take focus), so pressing Enter straight away never cancels an order. Tab stays inside the pop-up.

Once cancelled, the order shows a red **Cancelled** label instead of the dropdown, with a small **Payment in Stripe ↗** link under it. Choosing any other status still changes it straight away, with no pop-up.

## Links to Stripe for the refund

**Where they appear:**
1. **In the pop-up:** **Open this payment in Stripe ↗**. It opens in a new tab, so the pop-up stays open behind it and nothing is cancelled until you choose **Yes, cancel order**.
2. **After cancelling:** a red-bordered reminder at the top of Manage Orders: "**Order #ABCD1234 is cancelled.** Don't forget to refund $78.00 to the customer: Open this payment in Stripe ↗". It stays until you close it with ✕ or leave the page. If cancelling fails, it isn't shown.
3. **Next to every cancelled order:** **Payment in Stripe ↗**, for checking later whether a refund was made.

**Where they go:**
- **To the order's own payment** in the Stripe Dashboard, where the **Refund** button is. Every paid order stores its Stripe payment id, saved when Stripe confirms payment.
- **Test or live mode:** with a test key (`sk_test_…`) on Render, links open Stripe's test mode. With a live key, they open live mode.
- **Older orders:** an order with no payment id saved opens the Stripe **Payments** list instead. Search there by customer email or amount.
- **Signing in:** you need to be logged in to Stripe in that browser. If you aren't, Stripe asks you to log in first.

The site still doesn't refund automatically. A one-click refund from Manage Orders, through the Stripe API, is a possible follow-up.

## The server

**File:** `server/src/routes/adminOrders.js`

- **Changing a cancelled order:** `PATCH /admin/orders/:id` refuses it, whatever the new status, with 400 and "This order has been cancelled. Cancelled orders can't be changed." This holds even for requests made outside the admin page.
- **Stock:** cancelling puts the items back in stock once. The update only matches orders that aren't already cancelled, so two admins cancelling the same order at the same moment can't restock it twice. One of them gets the 400.
- **Removed:** taking stock back out when an order was un-cancelled, since un-cancelling is no longer possible.
- **Stripe links:** each order in `GET /admin/orders`, and in the reply to `PATCH`, includes `stripeUrl`. It's built by `stripePaymentUrl()` in `server/src/stripe.js`.

## Tests

- **Server** (`npm test -w server`, 152 tests):
  - Orders link to their payment in Stripe's test mode with a test key, and live mode with a live key. Orders with no payment id link to the Payments list.
  - Every status change on a cancelled order is refused, and the order stays cancelled.
  - Two cancels at the same moment restock only once.
  - The stock test covers cancelling once, then attempts to cancel again or un-cancel.
- **Client** (`npm test -w client`, 180 tests):
  - The pop-up's Stripe link goes to the payment and opens in a new tab.
  - The reminder appears after cancelling, with the link, and closes with ✕. It doesn't appear if cancelling fails.
  - Cancelled rows link to their payment.
  - Choosing Cancelled opens the pop-up. The warning is red and bold, and the refund note is shown.
  - **No, keep order** has focus, and nothing is sent until the admin confirms.
  - No, Esc and tapping outside all keep the order.
  - Confirming cancels the order and replaces the dropdown with the Cancelled label.
  - Other statuses don't ask.
  - Cancelled orders show no dropdown.
- **In a real browser** (Chromium, desktop and a 390px phone screen):
  - The pop-up opened with **No, keep order** focused, and the dropdown stayed on Paid.
  - The phone's Back button closed the pop-up and stayed on Manage Orders.
  - Confirming cancelled the order.
  - A direct request to change the cancelled order was refused.
  - The pop-up's Stripe link opened the order's test-mode payment page in a new tab. The pop-up stayed open and the order stayed Paid.
  - After confirming, the reminder appeared with the same link.

## Later: cancel and refund in one step (Batch G)

When the order can be refunded through Stripe, the pop-up now has a ticked box, **Also refund $X to the customer now, through Stripe**, and the red button reads **Yes, cancel and refund**. Untick it to cancel only, and the refund reminder appears as before. See `order-management.md`.
