# Link Colours, Back Button and Dark Mode

The three optional extras from the mobile layout work (Batch E):
- the desktop header matches the mobile header's colours
- the phone's Back button closes pop-ups
- the site stays light when a phone's browser darkens websites automatically

It also:
- turns the homepage's last blue links black (section 5)
- fixes a desktop Logout bug found while testing these (section 4)

## 1. Desktop header colours (`Navbar.jsx`)

| | Before | After |
|---|---|---|
| Home, Men, Ladies, Account, Logout, Dashboard | Browser-default blue links | **Black**, underlined when the mouse is over them |
| Cart count | Small plain blue number | **Teal badge with white number**, the same as the mobile header |

The teal badge style is shared from `MobileNav.jsx` (`CART_BADGE`), so both headers stay in step. Nothing else in the desktop layout moved.

## 2. The phone's Back button closes pop-ups

**Before:** with the mobile menu or the size guide open, Android's Back button or gesture left the page. Most shoppers expect it to close the pop-up, as it does in apps.

**After:** with the menu or size guide open, **Back closes it and stays on the page**. Focus returns to ☰ or "Size guide", and the page can scroll again. iPhone's swipe-back gesture and a computer's Back button use the same browser history, so they behave the same way.

**Rest of the browsing history:**

| You do this | Then Back goes to |
|---|---|
| Open the menu, press Back | Closes the menu (still on the same page) |
| Close the menu with ✕, Esc or a tap outside | The previous page, as normal: one press, no extra step |
| Open the menu on page A, choose page B | Page A (the page the menu was opened on) |
| Open the menu, choose the page you're already on | The menu just closes, and Back goes to the previous page as normal |
| Open the menu on page A, Logout | Page A |
| Open the size guide, press Back | Closes the guide (still on the product) |
| Close the size guide with ✕, Esc or a tap outside | The previous page, as normal |

**How it works** (`client/src/hooks/useCloseOnBack.js`):
- Opening a pop-up adds an entry to the browser history (the URL doesn't change).
- **Back** removes that entry, and the pop-up closes.
- **✕, Esc and tapping outside** close the pop-up and remove the entry themselves, so it doesn't leave an extra Back step behind.
- **Links inside the menu** open the new page in the menu's place in the history. This is why Back afterwards returns to the page the menu was opened on.

The same hook can be used for any future pop-up.

## 3. Staying light in automatic dark mode (`client/index.html`)

**Before:** some phone browsers repaint websites dark when the phone is in dark mode. Chrome's "Auto Dark Theme" did this to the site: black header and page, light grey text, and recoloured buttons and borders. The site is designed light-only (white, `#f8f4f4`, teal, `#e1d7c6`), so the result didn't look like the brand.

**After:** the page declares that it's light-only, in two places, both read by browsers:
- `<meta name="color-scheme" content="only light">`
- `color-scheme: only light` on the page's root element

Chrome's automatic dark mode now leaves it light, and so do other browsers built on Chrome's engine that use the same feature. The setting also keeps text boxes, drop-downs and scrollbars light when the phone or computer is in dark mode.

**Checked** in Chromium with its automatic dark mode switched on, phone-sized, on the homepage and the Men page:

| | Header colour | Average page brightness (0–255) |
|---|---|---|
| `main`, homepage | rgb(18, 18, 18): darkened | 88 |
| `main`, Men | rgb(18, 18, 18): darkened | 23 |
| This branch, homepage | rgb(255, 255, 255): white | 173 (the carousel photo is darker) |
| This branch, Men | rgb(255, 255, 255): white | 250 |

**Samsung Internet:** it has its own "dark mode for websites", and developers report that it can still darken pages that ask to stay light. If a Samsung shopper sees the site dark, they can switch it off in either place:
- Samsung Internet → Settings → Labs → turn on **Use website dark theme**
- or turn off the browser's dark mode

The site can't override this setting.

## 4. Desktop Logout fix (found while testing)

| Problem | Effect | Fixed |
|---|---|---|
| Logout added the homepage to the history twice | Pressing Back right after logging out seemed to do nothing the first time | Logout now opens the homepage once, so one Back press returns to the page you were on |
| Logout only worked when clicked with a mouse | Pressing Enter on the focused Logout link opened the homepage **without logging out** | Logging out now happens when the link is followed, however it's activated |

## 5. Homepage: SHOP NOW and Featured Products in black

| | Before | After |
|---|---|---|
| Carousel **SHOP NOW** | Blue text | **Black text**. Same border, size and position. |
| **Featured Products** names and prices on computers | Blue | **Black**, as on phones and tablets and in the product listings |

**SHOP NOW was also fixed:** it used to be a link inside a button, which caused two problems:
- **Clicking:** only the words opened the shop. Clicking the button's border or padding did nothing.
- **Keyboard:** the button and the link were two separate stops. The first one did nothing.

It's now one link with the same padding and font sizes as the old button. Its border was the browser's standard bevelled button edge, grey on the top and left. With the site-wide link standard ([links.md](links.md)), it's now a plain 2px black border, and the box turns light grey under a mouse pointer.

**Checked against `main`** at 1920, 1440, 1280, 1024, 768 and 390px wide:
- **Size and position:** the SHOP NOW box has the same size and position at every width.
- **Changed pixels** (before the link standard): only the SHOP NOW text, the desktop Featured Products names and prices, and (on desktop) the header from section 1.
- **Clicking:** on `main`, clicking just inside the box's corner did nothing. Now it opens the shop.
- **Keyboard:** Enter on the focused SHOP NOW opens the shop.

The other links that were still browser blue (on the Cart, Account, Login, 404 and admin pages) are covered by the site-wide link standard in [links.md](links.md).

## Code
- **New:** `client/src/hooks/useCloseOnBack.js`. It returns `close()` (for ✕, Esc and tap outside) and `closeForLink()` (for links that replace the pop-up's history entry).
- **`MobileNav.jsx`:**
  - uses the hook
  - menu links navigate with `replace`
  - a link to the page that's already open just closes the menu
  - Logout passes `{ replace: true }`
  - exports `CART_BADGE`
- **`SizeGuide.jsx`:** uses the hook.
- **`Navbar.jsx`:**
  - black desktop links with a hover underline
  - teal cart badge
  - `logOut()` runs on the desktop Logout link itself
  - `handleLogout(options)` for the mobile menu
- **`client/index.html`:** the `color-scheme` meta tag and CSS.
- **`Carousel.jsx`:** SHOP NOW is one styled link (`styled(NavLink)`) instead of a link inside a button.
- **`SingleFeaturedProduct.jsx`:** the name and price are black at every screen size.

## Tests
**Client: 151 tests in 27 files (13 new).** All pass, and the production build succeeds. The server is unchanged.
- **`hooks/useCloseOnBack.test.jsx`** (new):
  - opening adds one history entry and Back closes the pop-up
  - ✕ removes the entry
  - a link leaves the entry for the new page
  - Back while closed does nothing
  - reopening adds a fresh entry
- **`MobileNav.test.jsx`:**
  - Back closes the menu, returns focus to ☰, unlocks the page and stays on the page
  - ✕, Esc and tap outside each remove the menu's entry
  - a menu link replaces the entry instead of adding one
  - a link to the open page just closes the menu
  - Logout from the menu replaces the entry
  - the desktop links are black and the badge is teal
  - desktop Logout works when the link itself is activated (as Enter does)
- **`SizeGuide.test.jsx`:** Back closes the guide and returns focus, and ✕ removes its history entry.
- **`Carousel.test.jsx`:** SHOP NOW is one black link with the button border, not a link inside a button.
- **`FeaturedProductsList.test.jsx`:** names and prices are black.

Each new test was run against the old code to confirm it fails without the change.

### Browser check (Chromium, phone-sized with an Android identity, real browser history)
- **Menu:**
  - open + Back: menu closes and you stay on /men; the next Back goes to the previous page
  - ✕, Esc and tap outside: Back afterwards goes to the previous page in one step
  - menu → Ladies, then Back → /men, then Back → the page before
  - menu → Men while on /men: just closes the menu, with no extra entry left behind
  - logged in: menu → Logout opens the homepage, then Back → /men
  - logged in on the homepage: menu → Logout logs out and stays on the homepage, then one Back → /men
- **Size guide:** Back closes it and you stay on the product. After ✕, Back goes to /men.
- **Desktop:**
  - the header links are black on this branch and blue on `main`
  - the badge is teal
  - one Back after Logout returns to /men
  - Tab to Logout + Enter logs out
- **Automatic dark mode:** see the table in section 3.
- **Homepage colours:** see section 5.
- No page errors.

## Deploying
Nothing to configure.
