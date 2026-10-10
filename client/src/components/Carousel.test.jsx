import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Carousel from "./Carousel";

// Tests can swap in their own slides; otherwise the real ones are used.
const slides = vi.hoisted(() => ({ list: null }));
vi.mock("../assets/carouselPhotos.js", async (importOriginal) => {
  const real = await importOriginal();
  return {
    get carouselPhotos() {
      return slides.list ?? real.carouselPhotos;
    },
  };
});

const makeSlides = (count) =>
  Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    img: `/carousel/slide-${i + 1}.jpg`,
    alt: `Slide photo ${i + 1}`,
    title: `SLIDE ${i + 1}`,
    description: "Short text",
    bg: "f5fafd",
    link: "/men",
  }));

const renderCarousel = () =>
  render(
    <MemoryRouter>
      <Carousel />
    </MemoryRouter>,
  );

// The slide track's position: translateX(-100vw) is the second slide.
const position = () =>
  getComputedStyle(
    screen.getAllByRole("heading")[0].closest("div").parentElement
      .parentElement,
  ).transform;

// The CSS styled-components generated for an element (jsdom can't compute
// modern rules such as clamp(), so tests read the rules themselves).
const cssFor = (element) => {
  const css = [...document.querySelectorAll("style")]
    .map((s) => s.textContent)
    .join("\n");
  return [...element.classList]
    .flatMap(
      (name) => css.match(new RegExp(`\\.${name}\\{[^}]*\\}`, "g")) || [],
    )
    .join("\n");
};

const loadPhoto = (img, width, height) => {
  Object.defineProperty(img, "naturalWidth", {
    value: width,
    configurable: true,
  });
  Object.defineProperty(img, "naturalHeight", {
    value: height,
    configurable: true,
  });
  fireEvent.load(img);
};

describe("Carousel", () => {
  afterEach(() => {
    slides.list = null;
  });

  it("shows each slide's photo, heading and Shop Now link", () => {
    renderCarousel();
    const expected = [
      ["Man in a black leather jacket", "STAY IN TREND", "/men"],
      ["Woman in a blue floral dress", "LIGHT & EASY", "/ladies"],
      ["Man in a white short-sleeve shirt", "THE ESSENTIALS", "/men"],
    ];
    const links = screen.getAllByRole("link", { name: "SHOP NOW" });
    expected.forEach(([alt, title, link], index) => {
      expect(screen.getByAltText(alt).getAttribute("src")).toMatch(
        /^\/carousel\//,
      );
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
      expect(links[index]).toHaveAttribute("href", link);
    });
  });

  it("makes the whole Shop Now box one black link, not a link inside a button", () => {
    renderCarousel();
    const [link] = screen.getAllByRole("link", { name: "SHOP NOW" });
    expect(link.closest("button")).toBeNull();
    expect(screen.queryByRole("button", { name: "SHOP NOW" })).not.toBeInTheDocument();
    expect(getComputedStyle(link).color).toBe("rgb(0, 0, 0)");
    expect(cssFor(link)).toMatch(/border:2px solid black/);
  });

  it.each([2, 3, 5])(
    "moves through %i slides with the arrows, wrapping round",
    (count) => {
      slides.list = makeSlides(count);
      renderCarousel();
      const next = screen.getByRole("button", { name: "Next slide" });
      const previous = screen.getByRole("button", { name: "Previous slide" });

      expect(position()).toBe("translateX(0vw)");
      for (let i = 1; i < count; i++) {
        fireEvent.click(next);
        expect(position()).toBe(`translateX(${i * -100}vw)`);
      }
      fireEvent.click(next); // past the last slide, back to the first
      expect(position()).toBe("translateX(0vw)");
      fireEvent.click(previous); // before the first, round to the last
      expect(position()).toBe(`translateX(${(count - 1) * -100}vw)`);
    },
  );

  it("hides the arrows when there's only one slide", () => {
    slides.list = makeSlides(1);
    renderCarousel();
    expect(
      screen.getByRole("heading", { name: "SLIDE 1" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /slide/ }),
    ).not.toBeInTheDocument();
  });

  it("sizes each photo's column to the photo's shape once it loads", () => {
    slides.list = makeSlides(2);
    renderCarousel();
    const [landscape, portrait] = [1, 2].map((n) =>
      screen.getByAltText(`Slide photo ${n}`),
    );

    // Until a photo loads, its column assumes portrait (2:3).
    expect(cssFor(landscape.parentElement)).toMatch(/\* 0\.666/);

    loadPhoto(landscape, 1500, 1000);
    loadPhoto(portrait, 800, 1200);
    expect(cssFor(landscape.parentElement)).toMatch(
      /clamp\(45%,calc\(.*\* 1\.5\),60%\)/,
    );
    expect(cssFor(portrait.parentElement)).toMatch(/\* 0\.666/);
  });

  it("keeps the upper part of photos in view unless a slide says otherwise", () => {
    slides.list = makeSlides(2);
    slides.list[1].imagePosition = "left center";
    renderCarousel();
    expect(cssFor(screen.getByAltText("Slide photo 1"))).toMatch(
      /object-position:center 30%/,
    );
    expect(cssFor(screen.getByAltText("Slide photo 2"))).toMatch(
      /object-position:left center/,
    );
  });

  it("uses smaller text for long headings and descriptions", () => {
    slides.list = makeSlides(2);
    slides.list[1].title = "THE BIG SUMMER EDIT IS HERE";
    slides.list[1].description =
      "Linen shirts, relaxed chinos, printed dresses and easy layers for warm days and cool evenings.";
    renderCarousel();

    const [shortTitle, longTitle] = screen.getAllByRole("heading");
    expect(cssFor(shortTitle)).toMatch(/clamp\(36px,11cqi,70px\)/);
    expect(cssFor(longTitle)).toMatch(/clamp\(30px,8cqi,56px\)/);

    const shortText = screen.getAllByText("Short text")[0];
    const longText = screen.getByText(/Linen shirts/);
    expect(cssFor(shortText)).toMatch(/font-size:20px/);
    expect(cssFor(longText)).toMatch(/font-size:17px/);
  });
});
