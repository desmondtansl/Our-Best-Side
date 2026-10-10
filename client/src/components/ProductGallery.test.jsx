import { render, screen, fireEvent } from "@testing-library/react";
import ProductGallery from "./ProductGallery";

const mainPhoto = () => screen.getAllByRole("img").find((img) => img.alt);
const src = (img) => img.getAttribute("src").split("/").pop();

describe("ProductGallery", () => {
  it("shows a single photo without arrows or thumbnails", () => {
    render(<ProductGallery photos={["front"]} title="Linen Shirt" />);
    expect(screen.getByAltText("Linen Shirt")).toHaveAttribute("src", expect.stringMatching(/front$/));
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("switches photos with thumbnails and arrows, wrapping round", () => {
    render(<ProductGallery photos={["front", "back", "detail"]} title="Linen Shirt" />);
    const thumbs = screen.getAllByRole("button", { name: /Show photo/ });
    expect(thumbs).toHaveLength(3);
    expect(thumbs[0]).toHaveAttribute("aria-current", "true");

    fireEvent.click(thumbs[2]);
    expect(src(mainPhoto())).toBe("detail");
    expect(mainPhoto()).toHaveAttribute("alt", "Linen Shirt, photo 3 of 3");
    expect(thumbs[2]).toHaveAttribute("aria-current", "true");

    fireEvent.click(screen.getByRole("button", { name: "Next photo" }));
    expect(src(mainPhoto())).toBe("front");
    fireEvent.click(screen.getByRole("button", { name: "Previous photo" }));
    expect(src(mainPhoto())).toBe("detail");
  });

  it("changes photo when swiped, but not for small movements", () => {
    render(<ProductGallery photos={["front", "back"]} title="Tee" />);
    const photo = mainPhoto().parentElement;
    const swipe = (from, to) => {
      fireEvent.touchStart(photo, { touches: [{ clientX: from }] });
      fireEvent.touchEnd(photo, { changedTouches: [{ clientX: to }] });
    };
    swipe(300, 100); // swipe left: next
    expect(src(mainPhoto())).toBe("back");
    swipe(100, 120); // a tap or tiny drag
    expect(src(mainPhoto())).toBe("back");
    swipe(100, 300); // swipe right: previous
    expect(src(mainPhoto())).toBe("front");
  });

  it("starts from the main photo when showing another product", () => {
    const { rerender } = render(<ProductGallery photos={["a", "b"]} title="One" />);
    fireEvent.click(screen.getByRole("button", { name: "Next photo" }));
    rerender(<ProductGallery photos={["c", "d"]} title="Two" />);
    expect(src(mainPhoto())).toBe("c");
  });
});
