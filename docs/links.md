# Links: One Standard Across the Site

Every link on the site now follows one set of rules. Before this change, most links outside the header were the browser's default blue (purple once visited), and similar links looked different from page to page.

## The standard

**Every link is black.** More precisely, a link takes the colour of the text around it, which is black almost everywhere. It's never the browser's blue or purple. There are three kinds of link:

| Kind | Looks like | Used for |
|---|---|---|
| **Text link** | Black and **underlined** | Links in a sentence, or a short action on its own: "Sign up here", "Start shopping", "Manage addresses", "View cart", the 404 page's links, "← Back to Dashboard" |
| **Navigation link** | Black, **no underline**, underlined under a mouse pointer | The desktop header and the admin dashboard menu |
| **Button link** | A **black outlined box** that turns light grey (`#f8f4f4`) under a mouse pointer. The whole box is the link. | SHOP NOW (homepage carousel), Continue Shopping (cart) |

**Why text links stay underlined:** now that links are black, the underline is what shows a link in a sentence is clickable. This also matters for colour-blind shoppers.

**Black elements with their own look (unchanged):**
- the mobile menu's rows, which turn light grey under a mouse pointer
- product cards (photo, name and price)
- the logo
- header icons
- search suggestions

**One exception:** a link inside coloured text takes that colour. "View cart" sits inside the teal "Added to cart" message, so it's teal and underlined.

## How it's built
- **`client/index.html`:** `a { color: inherit; }` makes every link take the colour of the text around it. Any new link gets this automatically.
- **`client/src/styles/links.js`:** the shared styles.
  - `navLink`: navigation links. The underline under a mouse pointer only applies on devices with one (`@media (hover: hover)`), so it doesn't stick after a tap on a phone.
  - `buttonLink`: button links.
- **`BackLink`** (in `components/BackToDashboard.jsx`): the bold "← Back to …" links on admin pages.

### Adding a link later
- **A link in text:** use a plain `<Link>`. It's black and underlined already.
- **A menu or header link:** use `${navLink}` in its styles.
- **A link that looks like a button:** use `${buttonLink}` on a `styled(Link)`. Don't put a `<button>` inside a `<Link>`.

## What changed

| Page | Link | Before | After |
|---|---|---|---|
| Search with no results | "Men", "Ladies" | Blue | Black, underlined |
| Product page | "View cart" | Blue | Teal (the message's colour), underlined |
| Product not found | "Browse Men's/Ladies' products" | Blue | Black, underlined |
| Cart | **Continue Shopping** | Grey browser button inside a link | **Button link**, the same look as SHOP NOW |
| Cart | "Start shopping", "Manage addresses", "Log in" | Blue | Black, underlined |
| Order success | "your account" | Blue | Black, underlined |
| Account | "Start shopping" | Blue | Black, underlined |
| Login | "Sign up here" | Blue, **not underlined** | Black, underlined |
| 404 | "Home", "Shop Men", "Shop Ladies" | Blue | Black, underlined |
| Desktop header | "Dashboard" (admins) | Lighter than the links beside it, with no hover underline | Same weight and hover underline as the others |
| Homepage | SHOP NOW border | The browser's bevelled button edge (grey top and left) | Plain 2px black, light grey under a mouse pointer |
| Admin dashboard | Upload / Search and Edit / Manage Orders / Logout | Blue | Black, underlined under a mouse pointer |
| Admin pages | "← Back to Dashboard" | Blue, bold | Black, bold, underlined |
| Admin edit page | "← Back to search" | Blue, **not bold** | The same as "← Back to Dashboard" |
| Admin upload | "View product" | Blue | Black, underlined |
| Admin search | Product titles in the results | Blue | Black, underlined |

### Also fixed
- **Continue Shopping:** this was a button inside a link, with two keyboard stops where one would do. It's now one link.
- **Admin dashboard Logout:** this had the same bug as the desktop header's Logout (see [header-back-button-and-dark-mode.md](header-back-button-and-dark-mode.md)):
  - pressing Enter on it opened the homepage **without logging out**
  - it added the homepage to the history twice

  It now logs out however it's activated, and adds one history entry.
- **Header "Dashboard" spacing:** the link gets the same text style as the other header links but keeps its current spacing. Giving it the same spacing would make the logo wrap onto 3 lines for admins on screens 1025–1100px wide.

## Tests
**Client: 157 tests in 30 files (6 new in this change).** All pass, and the production build succeeds. The server is unchanged.
- **`test/indexHtml.test.js`** (new): checks the link rule and the light-only colour scheme in `index.html` are still there.
- **`pages/AdminDashboard.test.jsx`** (new):
  - the menu links are black and point to the right pages
  - Logout works when the link itself is activated (as Enter does)
- **`pages/Login.test.jsx`** (new): "Sign up here" links to sign up and nothing turns its underline off.
- **`pages/Cart.test.jsx`:** Continue Shopping is one black link with the button-link border, not a button inside a link.
- **`pages/AdminEditProduct.test.jsx`:** both back links are bold.
- **`components/Carousel.test.jsx`:** SHOP NOW uses the button-link border.

Each new test was run against the old code to confirm it fails.

### Browser check (Chromium, real pages with test data)
**Every link on every page,** at 1280px and 390px wide, logged out and logged in as an admin:
- home and search suggestions
- Men, a search with no results
- a product page after Add to Cart
- product not found
- cart (empty, with an item logged out, with an item logged in)
- Login, Sign up, 404
- Account (orders and addresses)
- the admin dashboard, upload, search, edit and orders pages

**Result:**
- No link is the browser's blue or purple. Every link is black, apart from "View cart" (teal, inside the teal message).
- Text links are underlined.
- Navigation links have no underline until a mouse pointer is over them.
- SHOP NOW and Continue Shopping have the 2px black border and turn `#f8f4f4` under a mouse pointer.
- Tab to the dashboard's Logout + Enter logs out.
- No page errors.

**Order success page:** not rendered in this check, because it needs a completed Stripe payment. Its "your account" link sits in plain text with no colour set, so it follows the same rule.

**Desktop header with an admin logged in,** at 1025, 1100, 1280 and 1440px: no sideways scrolling, and the logo wraps exactly as before.

## Not changed
- **Logo wrapping:** with an admin logged in, the desktop logo already wrapped onto 2 lines between 1025 and about 1100px wide, because the header has more links for admins. That's unchanged.
- **Footer:** the Facebook and Instagram icons aren't links.

## Deploying
Nothing to configure.
