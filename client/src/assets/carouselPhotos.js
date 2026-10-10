// Homepage carousel slides. Images live in client/public/carousel (hosted with
// the site, web-sized). Copy is kept evergreen so it doesn't go out of date;
// edit freely for promotions.
//
// - Add or remove slides freely: the arrows work with any number (1 slide
//   hides them).
// - Photos can be portrait or landscape; the photo column follows each
//   photo's shape (see docs/homepage-carousel.md for recommended sizes).
// - Optional `imagePosition` chooses which part of the photo stays in view
//   when it's trimmed to fit, e.g. "center", "left top", "center 20%".
//   Default: "center 30%" (the upper middle, where faces usually are).
// - Longer titles (over 22 characters) and descriptions (over 90) are shown
//   in a smaller size automatically.
export const carouselPhotos = [
  {
    id: 1,
    img: "/carousel/menswear.jpg",
    alt: "Man in a black leather jacket",
    title: "STAY IN TREND",
    description: "Leather, suede and everyday essentials for him",
    bg: "f5fafd",
    link: "/men",
  },
  {
    id: 2,
    img: "/carousel/dresses.jpg",
    alt: "Woman in a blue floral dress",
    title: "LIGHT & EASY",
    description: "Printed dresses and rompers made for warm days",
    bg: "fcf1ed",
    link: "/ladies",
  },
  {
    id: 3,
    img: "/carousel/essentials.jpg",
    alt: "Man in a white short-sleeve shirt",
    title: "THE ESSENTIALS",
    description: "Crisp shirts and tees that go with everything",
    bg: "f5fafd",
    link: "/men",
  },
];
