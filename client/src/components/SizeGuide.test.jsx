import { render, screen, fireEvent, within } from "@testing-library/react";
import SizeGuide from "./SizeGuide";
import { pickSizeChart } from "../config/sizeGuide";

describe("pickSizeChart", () => {
  it("picks the chart from the sizes and category", () => {
    expect(pickSizeChart({ category: ["Men"] }, ["US 8", "US 9"])).toBe("shoes");
    expect(pickSizeChart({ category: ["Ladies"] }, ["24", "25"])).toBe("jeans");
    expect(pickSizeChart({ category: ["Ladies"] }, ["XS", "S"])).toBe("ladies");
    expect(pickSizeChart({ category: ["Men"] }, ["S", "M"])).toBe("mens");
    expect(pickSizeChart({ category: ["Men"] }, [])).toBeNull();
  });
});

describe("SizeGuide", () => {
  afterEach(() => {
    document.body.style.overflow = "";
  });

  const open = (props) => {
    render(<SizeGuide {...props} />);
    const trigger = screen.getByRole("button", { name: "Size guide" });
    fireEvent.click(trigger);
    return trigger;
  };

  it("shows the product's chart with the chosen size highlighted", () => {
    open({ product: { category: ["Men"] }, sizes: ["US 8", "US 9"], selectedSize: "US 9" });
    const dialog = screen.getByRole("dialog", { name: "Size guide" });
    const table = within(dialog).getByRole("table");
    expect(within(table).getByText(/Shoes/)).toBeInTheDocument();
    const current = table.querySelector("tr[aria-current]");
    expect(within(current).getByRole("rowheader")).toHaveTextContent("9");
    expect(document.activeElement).toBe(within(dialog).getByRole("button", { name: "Close size guide" }));
    expect(document.body.style.overflow).toBe("hidden");
    // Tips match the chart: shoes don't mention chest or waist.
    expect(dialog).toHaveTextContent(/heel to your longest toe/);
    expect(dialog).not.toHaveTextContent(/Chest/);
  });

  it("closes with Esc, the close button or a tap outside, returning focus", () => {
    const trigger = open({ product: { category: ["Ladies"] }, sizes: ["S", "M"], selectedSize: "M" });
    expect(screen.getByText(/Ladies' clothing/)).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: "Close size guide" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("dialog").parentElement);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("isn't offered for products without sizes", () => {
    render(<SizeGuide product={{ category: ["Men"] }} sizes={[]} selectedSize="" />);
    expect(screen.queryByRole("button", { name: "Size guide" })).not.toBeInTheDocument();
  });
});
