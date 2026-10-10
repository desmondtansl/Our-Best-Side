import { render, fireEvent, screen } from "@testing-library/react";
import { MemoryRouter, Link } from "react-router-dom";
import ScrollToTop from "./ScrollToTop";

describe("ScrollToTop", () => {
  it("scrolls up when the page changes, but not when only filters change", () => {
    const scrollTo = vi.spyOn(window, "scrollTo");
    render(
      <MemoryRouter initialEntries={["/men/p1"]}>
        <ScrollToTop />
        <Link to="/men/p2">Next product</Link>
        <Link to="/men/p2?size=M">Filter</Link>
      </MemoryRouter>
    );
    expect(scrollTo).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText("Next product"));
    expect(scrollTo).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByText("Filter"));
    expect(scrollTo).toHaveBeenCalledTimes(2);
    scrollTo.mockRestore();
  });
});
