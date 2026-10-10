# Cancelling Orders: Confirmation Pop-up, Cancelling Is Final

## Summary

| Improvement | Why it matters |
|-------------|----------------|
| Choosing **Cancelled** in Manage Orders opens a pop-up that must be confirmed, with **"This action cannot be undone."** in large red text | Cancelling was one tap in a dropdown, and easy to do by mistake. |
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
  - **The customer is not refunded automatically.** The pop-up shows the amount to refund in Stripe → Payments.
- **Buttons:** **No, keep order** (beige) and **Yes, cancel order** (red).

**Ways to back out without cancelling:**
- **No, keep order**
- **Esc**
- Tapping outside the pop-up
- The phone's **Back** button

**Keyboard:** the pop-up opens with **No, keep order** focused, so pressing Enter straight away never cancels an order. Tab stays inside the pop-up.

Once cancelled, the order shows a red **Cancelled** label instead of the dropdown. Choosing any other status still changes it straight away, with no pop-up.

## The server

**File:** `server/src/routes/adminOrders.js`

- **Changing a cancelled order:** `PATCH /admin/orders/:id` refuses it, whatever the new status, with 400 and "This order has been cancelled. Cancelled orders can't be changed." This holds even for requests made outside the admin page.
- **Stock:** cancelling puts the items back in stock once. The update only matches orders that aren't already cancelled, so two admins cancelling the same order at the same moment can't restock it twice. One of them gets the 400.
- **Removed:** taking stock back out when an order was un-cancelled, since un-cancelling is no longer possible.

## Tests

- **Server** (`npm test -w server`, 150 tests):
  - Every status change on a cancelled order is refused, and the order stays cancelled.
  - Two cancels at the same moment restock only once.
  - The stock test covers cancelling once, then attempts to cancel again or un-cancel.
- **Client** (`npm test -w client`, 179 tests):
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
