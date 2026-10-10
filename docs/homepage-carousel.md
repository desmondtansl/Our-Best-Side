# Homepage Carousel: Photo Fills the Space Next to the Text

## What was wrong
On computer screens, each carousel slide gave the photo the left half and the text the right half. The photos are portrait (2:3), so the photo only covered part of its half, leaving a white gap before the text:

| Screen | Photo width | Text started at | Gap |
|--------|-------------|-----------------|-----|
| 1920×1080 | 648px | 960px | **312px** |
| 1440×900 | 540px | 720px | **180px** |
| 1025–1280px wide | 614px | 664px | 50px, but the photo was ~920px tall, taller than the screen, which pushed the text down |

## What changed
**File:** `client/src/components/Carousel.jsx`

- **Photo:** fills its whole column, top to bottom and edge to edge. It's trimmed to fit (`object-fit: cover`), keeping the upper part of the photo, where the faces are, in view. The photo column is 45% of the width (48% on screens up to 1280px).
- **Text:** sits right next to the photo, 50–60px from it, vertically centred, on the slide's background colour (light blue / light pink).
- **Height:** each slide is a fixed-height banner, 85% of the screen height (at most 860px, at least 480px), so the whole slide fits on screen at every computer size.
- **Gap now:** 60px at 1920 and 1440, and 50px at 1280 and 1100, which is just the text's margin.
- **Tablets and phones (≤1024px):** unchanged. They show the text without the photo, as before; screenshots before and after are pixel-for-pixel identical.
- **Code:** about 190 lines of repeated per-screen-size rules for the carousel's layout were replaced by a few simple ones. The arrows and slide movement are unchanged.

## Tests
- `client/src/components/Carousel.test.jsx` (new, 2 tests): each slide's photo (from the site's own `/carousel/` folder), heading and Shop Now link; the arrows move between slides and wrap round. Client total: 98, all passing. The site builds without errors.
- **Browser check** (Chromium):
  - measured the photo and text positions at 1920, 1440, 1280, 1100, 1024, 768 and 375px wide
  - looked at all three slides at 1440 and 1100px: faces and outfits stay in view; on the dress slide the bottom of the dress is trimmed at wider sizes
  - compared tablet and phone sizes against the old version: identical

## Deploying
Nothing to configure.
