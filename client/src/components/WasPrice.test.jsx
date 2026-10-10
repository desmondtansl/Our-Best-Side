import { render, screen } from "@testing-library/react";
import WasPrice, { isOnSale } from "./WasPrice";

describe("WasPrice", () => {
  it("shows the was-price crossed out with a Sale badge", () => {
    render(<WasPrice product={{ price: 60, compareAtPrice: 80 }} />);
    const was = screen.getByText("$80");
    expect(was.tagName).toBe("DEL");
    expect(screen.getByText("Sale")).toBeInTheDocument();
  });

  it("shows nothing when the product isn't on sale", () => {
    const { container } = render(<WasPrice product={{ price: 60, compareAtPrice: null }} />);
    expect(container).toBeEmptyDOMElement();
    expect(isOnSale({ price: 60, compareAtPrice: 50 })).toBe(false);
    expect(isOnSale({ price: 60 })).toBe(false);
  });
});
