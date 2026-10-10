# Homepage Carousel: Photo Fills the Space, Any Photo Shape, Longer Text, Any Number of Slides

## What was wrong
1. **White gap between photo and text.** On computer screens each slide gave the photo the left half and the text the right half. The photos are portrait (2:3), so the photo only covered part of its half, leaving a white gap before the text:

   | Screen | Photo width | Text started at | Gap |
   |--------|-------------|-----------------|-----|
   | 1920×1080 | 648px | 960px | **312px** |
   | 1440×900 | 540px | 720px | **180px** |
   | 1025–1280px wide | 614px | 664px | 50px, but the photo was ~920px tall, taller than the screen, which pushed the text down |

2. **Only portrait photos and short text worked.** A landscape photo would have been squeezed into the portrait-sized column and heavily trimmed. Long text had no room to grow.
3. **Exactly 3 slides.** The arrows were hard-coded for 3 slides. A 4th slide could never be reached, and with 2 slides the arrows moved to an empty slide.
4. **Arrows covered the text on tablets and phones**, e.g. the "L" of "Leather".

## What changed
**Files:**
- `client/src/components/Carousel.jsx`
- `client/src/assets/carouselPhotos.js` (comments on the new options)

### Photo fills its column, beside the text
- **Photo:** fills its whole column, top to bottom and edge to edge. It's trimmed to fit rather than stretched (`object-fit: cover`).
- **Text:** sits right next to the photo, 50–60px from it, vertically centred, on the slide's background colour.
- **Banner height:** each slide is 85% of the screen height, at most 860px and at least 480px, so it fits on screen at every computer size. The photo's own size never makes the slide taller.

### Any photo shape
- **The column follows the photo's shape**, which the carousel measures when the photo loads:
  - portrait photos get 45% of the width (48% on screens up to 1280px), as before
  - landscape photos get up to 60%, so they're trimmed as little as possible
- **How much of each photo shows** (from the browser check):

  | Photo shape | 1920×1080 | 1100–1440px wide |
  |-------------|-----------|------------------|
  | Landscape 3:2 | 89% of its width (full height) | 74–75% of its width |
  | Very wide 2:1 | 66% of its width | 55–56% of its width |
  | Portrait 2:3 (current photos) | 66% of its height | 74–80% of its height |

- **Choosing what stays in view:** by default the upper middle of the photo, where faces usually are. A slide can set `imagePosition` to keep a different part, e.g. `"center"`, `"left top"` or `"center 20%"`.

### Longer text
- **Headings** are sized to the width of the text column, so they fit next to both narrow and wide photos. Headings over 22 characters use a smaller size, and very long words wrap rather than overflow.
- **Descriptions** over 90 characters use slightly smaller text with tighter spacing. Lines are limited to a comfortable reading width (about 70–80 characters).
- **No cutting off:** if the text needs more room than the banner, the slide grows taller. In the browser check, a 9-word heading with a 3-line description fitted inside the normal banner at every computer size, down to 1100×700.

### Any number of slides
- The arrows work with however many slides there are, wrapping round at either end.
- With only 1 slide, the arrows are hidden.
- The arrows are now real buttons, labelled "Previous slide" and "Next slide" for screen readers and keyboards.

### Tablets and phones (≤1024px)
- They still show the text without the photo, as before.
- The text now has 70px of space on each side (56px on phones), so the arrows no longer cover it.

## Choosing carousel photos
- **Shape:** portrait or landscape both work. Landscape up to 3:2 works best; wider panoramas lose more of their sides.
- **Size:** at least 1200px on the long side, so photos stay sharp on large screens.
- **File size:** compress to about 100–250 KB (JPEG quality around 80).
- **Subject:** keep the person or product near the middle. If it isn't, set `imagePosition`.
- **Where things go:**
  - photos: `client/public/carousel/`
  - slide wording, links and colours: `client/src/assets/carouselPhotos.js`

## Tests
- `client/src/components/Carousel.test.jsx` (8 tests):
  - each slide's photo, heading and Shop Now link
  - the arrows with **2, 3 and 5 slides**, wrapping round both ways
  - the arrows hidden with 1 slide
  - each photo column sized to its photo's shape once it loads (landscape 3:2 and portrait 2:3)
  - the default and custom `imagePosition`
  - smaller text for long headings and descriptions
- **Proof the tests work:** putting the hard-coded slide count back makes the 2- and 5-slide tests fail.
- **Totals:** client 104, all passing. The site builds without errors.
- **Browser check** (Chromium), with a 4-slide carousel: a landscape 3:2 test card with marked edges, a portrait photo with a very long heading and description, a 2:1 wide photo, and a regular portrait photo:
  - screen sizes: 1920×1080, 1440×900, 1280×800, 1100×700, 768×1024 and 375×800
  - slides stay at the banner height, text always fits, and text never sits under the arrows
  - the arrows reach all 4 slides and wrap back to the first
  - no page errors
  - the current 3 slides: photos are in exactly the same place as before; only the text area moved slightly

## Deploying
Nothing to configure.
