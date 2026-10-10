import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import PhotoManager, { savedPhotoItems } from "./PhotoManager";

function Harness({ initial = [] }) {
  const [items, setItems] = useState(initial);
  return (
    <>
      <PhotoManager items={items} onChange={setItems} />
      <p data-testid="order">{items.map((item) => item.key || item.file.name).join(",")}</p>
    </>
  );
}

const order = () => screen.getByTestId("order").textContent;
const files = (...names) => names.map((name) => new File(["x"], name, { type: "image/png" }));
const add = (container, list) =>
  fireEvent.change(container.querySelector("#images"), { target: { files: list } });

describe("PhotoManager", () => {
  it("adds photos, labelling the first as the main photo", () => {
    const { container } = render(<Harness />);
    add(container, files("a.png", "b.png"));
    expect(order()).toBe("a.png,b.png");
    expect(screen.getByAltText("Photo 1 (main)")).toHaveAttribute("src", "blob:a.png");
    expect(screen.getByText("Main")).toBeInTheDocument();
  });

  it("moves photos and makes one the main photo", () => {
    render(<Harness initial={savedPhotoItems(["a", "b", "c"])} />);
    fireEvent.click(screen.getByRole("button", { name: "Move photo 1 later" }));
    expect(order()).toBe("b,a,c");
    fireEvent.click(screen.getByRole("button", { name: "Move photo 3 earlier" }));
    expect(order()).toBe("b,c,a");
    fireEvent.click(screen.getByRole("button", { name: "Make photo 3 the main photo" }));
    expect(order()).toBe("a,b,c");
    expect(screen.getByRole("button", { name: "Move photo 1 earlier" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move photo 3 later" })).toBeDisabled();
  });

  it("removes photos and releases their previews", () => {
    const revoke = vi.spyOn(URL, "revokeObjectURL");
    const { container } = render(<Harness />);
    add(container, files("a.png", "b.png"));
    fireEvent.click(screen.getByRole("button", { name: "Remove photo 1" }));
    expect(order()).toBe("b.png");
    expect(revoke).toHaveBeenCalledWith("blob:a.png");
    revoke.mockRestore();
  });

  it("stops at 8 photos and says so", () => {
    const { container } = render(<Harness initial={savedPhotoItems(["a", "b", "c", "d", "e", "f"])} />);
    add(container, files("g.png", "h.png", "i.png"));
    expect(order().split(",")).toHaveLength(8);
    expect(screen.getByRole("alert")).toHaveTextContent("at most 8 photos");
    expect(container.querySelector("#images")).toBeDisabled();
  });
});
