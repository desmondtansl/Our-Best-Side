import { render, screen, within } from "@testing-library/react";
import Footer from "./Footer";

describe("Footer", () => {
  it("shows secure checkout with the accepted payment logos", () => {
    render(<Footer />);
    const payments = screen.getByLabelText("Accepted payment methods");
    expect(within(payments).getByText("Secure checkout")).toBeInTheDocument();
    const logos = within(payments).getAllByRole("img");
    expect(logos.map((logo) => logo.getAttribute("alt"))).toEqual([
      "Visa",
      "Mastercard",
      "American Express",
      "PayNow",
    ]);
    // Served with the site, not hot-linked from another website.
    logos.forEach((logo) => expect(logo.getAttribute("src")).not.toMatch(/^https?:/));
  });
});
