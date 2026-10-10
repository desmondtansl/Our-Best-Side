import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Carousel from "./Carousel";

const renderCarousel = () =>
  render(
    <MemoryRouter>
      <Carousel />
    </MemoryRouter>
  );

describe("Carousel", () => {
  it("shows each slide's photo, heading and Shop Now link", () => {
    renderCarousel();
    const slides = [
      ["Man in a black leather jacket", "STAY IN TREND", "/men"],
      ["Woman in a blue floral dress", "LIGHT & EASY", "/ladies"],
      ["Man in a white short-sleeve shirt", "THE ESSENTIALS", "/men"],
    ];
    const links = screen.getAllByRole("link", { name: "SHOP NOW" });
    slides.forEach(([alt, title, link], index) => {
      expect(screen.getByAltText(alt).getAttribute("src")).toMatch(/^\/carousel\//);
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
      expect(links[index]).toHaveAttribute("href", link);
    });
  });

  it("moves between slides with the arrows, wrapping round", () => {
    const { container } = renderCarousel();
    const track = () => screen.getByAltText("Man in a black leather jacket").closest("div").parentElement.parentElement;
    const right = within(container).getByTestId("KeyboardArrowRightIcon");
    const left = within(container).getByTestId("KeyboardArrowLeftIcon");

    expect(getComputedStyle(track()).transform).toBe("translateX(0vw)");
    fireEvent.click(right);
    expect(getComputedStyle(track()).transform).toBe("translateX(-100vw)");
    fireEvent.click(left);
    fireEvent.click(left);
    expect(getComputedStyle(track()).transform).toBe("translateX(-200vw)");
  });
});
