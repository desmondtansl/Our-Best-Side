# Mobile Layout: Compact Header, Menu, and Every Page on Phones

Batch E of the improvement list (item 11, mobile menu and sticky header), widened to fix how every shopper-facing page looks on phones and tablets.

## What was wrong (iPhone 15, 393×852)

| Area | Problem |
|------|---------|
| Header | Four stacked rows of plain links: Home/Men/Ladies, the logo, Login and cart, then search. It took **197px**, about a quarter of the screen (30% on an iPhone SE). When logged in, the **cart icon was pushed off the screen**. The header scrolled away with the page. |
| Homepage carousel | No photo on phones, just a large heading in white space, with the arrows covering the text |
| Featured products | Small thumbnails (about 95px wide) with wide gaps, and awkwardly wrapping blue titles |
| Men / Ladies / search results | One product per row at about half the screen width. 4 products needed **2,074px** of scrolling, and "Sort by" sat on its own line. |
| Product page | Photo and details squeezed side by side. "Add to Cart" wrapped onto two lines inside a small box. |
| Newsletter, footer | The heading touched the screen edge, with oversized spacing |
| Forms | iPhones zoom the page in when a text box with text under 16px is tapped. The search, price and sort boxes used 14px. |

## What changed

**Breakpoints** (in `client/src/config/breakpoints.js`):
- **Tablets and phones:** 1024px wide or less
- **Phones:** 600px wide or less (768px for the product page layout)
- **Desktop (wider than 1024px) is unchanged.** Screenshots of 7 pages at 1280, 1440 and 1920px are pixel-for-pixel identical to `main`.

### Header (`MobileNav.jsx`, `Navbar.jsx`, `hooks/useMediaQuery.js`)
- **One slim bar, 57px tall,** that **stays at the top while you scroll**. It contains:
  - **☰** to open the menu
  - **🔍** to open a full-width search box below the bar. The keyboard opens straight away, suggestions work as on desktop, and choosing a result closes the box.
  - **Our Best Side**, which links home
  - **👤**, which goes to **Log in** or **My account**
  - **🛒** with a **teal count badge**
- **Slide-out menu:**
  - Home, Men, Ladies, then Log in / Sign up, or My account / Dashboard (admins only) / Logout, then Cart (n)
  - It closes with ✕, Esc, a tap outside, or by choosing a page
  - While it's open, the page behind can't scroll
  - Keyboard and screen readers: focus moves into the menu and stays there (Tab cycles round), then returns to ☰ when it closes. The menu is announced as a dialog.
- **Tap targets:** all icons are 44×44px, Apple's minimum comfortable size. On the very narrowest screens (320px or less, e.g. a folded Galaxy Z Fold's 280px cover screen) they're 40px so everything fits.
- **Logo size:** the logo takes the space between the icon groups and stays centred. Its text shrinks slightly on narrow phones (20px down to 15px at 280px wide), so the icons are never pushed off the screen.
- **Icon colour:** icons and menu text are black, matching the product titles. The desktop header now matches (see [header-back-button-and-dark-mode.md](header-back-button-and-dark-mode.md)).
- **Old overflow fixed:** the desktop header used to be wider than the screen at tablet widths (up to 138px for admins). Tablets now get the compact bar instead, so nothing overflows.

### Homepage
- **Carousel** (`Carousel.jsx`):
  - The photo now shows on phones and tablets, full width, with the text below it on the slide's colour.
  - The photo's height follows its shape: very tall photos are trimmed to 4:5. It's capped at 65% of the screen height.
  - The arrows sit halfway down the photo.
  - Headings are 30px on phones (36px on tablets).
- **Featured Products** (`FeaturedProductsList.jsx`, `SingleFeaturedProduct.jsx`, `FeaturedProductsHeader.jsx`):
  - 2 per row on phones and 3 on tablets
  - photos fill the card in a 3:4 shape
  - name and price in black underneath
  - the heading is 28px on phones

### Product listings (`ProductGrid.jsx`, `ShopFilters.jsx`)
- **Grid:** 2 per row on phones and 3 on tablets, with 3:4 photos and the name and price stacked underneath. The Men page went from 2,074px to **966px** of scrolling.
- **Filter bar:** Filters and the sort menu share one row, with the product count underneath. The words "Sort by" are hidden on phones, but screen readers still read them.

### Product page (`ProductDetails.jsx`, `RelatedProducts.jsx`)
- **Layout on phones:** the photo is full width (4:5, at most 75% of the screen height), with the details underneath.
- **Text sizes:** title 26px, price 24px, comfortable description text.
- **Colour and size:** stacked, with taller (40px) buttons and dropdown.
- **Quantity and Add to Cart:** larger − and + buttons, and **Add to Cart fills the rest of the row**.
- **"You may also like":** its margins line up with the details (16px).

### Newsletter, footer, cart
- **Newsletter:**
  - the heading is centred, with 16px side margins
  - the email box is full width (up to 420px), 48px tall, with lightgray borders and rounded corners
- **Footer:** stacked and centred on tablets and phones, with a thin top line, smaller logo text and tighter spacing.
- **Cart:** the "Order Summary" heading is 26px on phones.

### Site-wide (`client/index.html`)
- On phones and tablets, text boxes and dropdowns use **16px text**, so iPhones no longer zoom in when one is tapped.
- Text no longer grows when the phone is turned sideways.

### Code
The old per-device rules (separate rules for 280, 360, 375, 390, 393, 414, 540, 768 and 820px) were replaced by the two shared breakpoints. This removes about 900 lines of repeated CSS.

## Tests
- **New `MobileNav.test.jsx`** (9 tests):
  - the bar's buttons and links, including the cart count
  - the menu's links, with focus moving inside and the page locked
  - closing with Esc, ✕ or a tap outside, with focus returning to ☰
  - Tab staying inside the menu
  - choosing a page closes the menu
  - admin and customer menus, and logging out
  - the search box opening ready to type, with search results closing it
  - the desktop header still showing on computers
- **New `useMediaQuery.test.jsx`** (2 tests).
- **Proof the tests work:** removing the "focus returns to ☰" code makes a test fail.
- **Totals:** client 115, all passing. The site builds without errors.
- **Browser check** (Chromium emulating an iPhone 15 and an iPhone SE, touch screen, logged out and logged in):
  - **Pages:** home, Men, product page, cart with 2 items, search results, Log in, Sign up, 404 and My account. None scroll sideways and there are no page errors.
  - **Header:** 197px → 57px on every page.
  - **Menu:** opens with focus inside, Esc closes it and returns focus, Tab stays inside, a tap outside closes it, and a link opens its page.
  - **Header stays at the top** while scrolling the homepage and a product page.
  - **Search:** the keyboard opens straight away, suggestions show, choosing one opens the product (at the top of the page), and Enter opens the results.
  - **Cart and account:** the cart icon reads "Cart, 1 item". When logged in, the menu shows My account, Dashboard and Logout, and Logout works.
  - **Other widths:** landscape phone (852×393), iPad (768×1024 and 1024×768), 1025px and 1280px. The compact header shows at 1024px and below and the desktop header above, with no sideways scrolling.
  - **Desktop** (1280/1440/1920px): home, Men, results, cart, Log in, 404 and product pages are identical to `main`.

### Android
- **Engine:** Android phones use Chrome or Samsung Internet. Both run on the same engine (Chromium) as the browser used for these checks.
- **Pages checked:** the same 9 pages, logged out and logged in, with an Android Chrome browser identity, at:
  - Galaxy S23: 360×780
  - Pixel 7: 412×915
  - Galaxy Z Fold folded cover screen: 280×653
- **Results:** no sideways scrolling and no page errors.
- **Header fit:** checked at every common width from 280 to 1024px. Every icon is on screen and the logo is never cut off.
- **Bug found and fixed:** at 280px wide the cart icon was being pushed off the screen.

## Not covered
- **Real devices:** the iPhone check used Chrome emulating an iPhone, not Safari on a real device. Please give it a quick look on your phone after deploying. Android checks use the same engine as Android's browsers, so they're a closer match.
- **Android Back button:** now closes the open menu instead of leaving the page (see [header-back-button-and-dark-mode.md](header-back-button-and-dark-mode.md)).
- **Admin pages:** these get the new header on phones, but their forms weren't redesigned for phones.

## Deploying
Nothing to configure.
