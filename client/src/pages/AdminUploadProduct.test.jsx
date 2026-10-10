import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import AdminUploadProduct from "./AdminUploadProduct";

vi.mock("axios", () => ({
  default: { get: vi.fn(), post: vi.fn(), defaults: { headers: { common: {} } } },
}));

const renderUpload = () =>
  render(
    <MemoryRouter>
      <AdminUploadProduct />
    </MemoryRouter>
  );

const fillForm = (container) => {
  const set = (id, value) =>
    fireEvent.change(container.querySelector(`#${id}`), { target: { value } });
  set("title", "Canvas Sneakers");
  set("description", "White canvas sneakers");
  set("category", "Men");
  set("size", "US 8, US 9");
  set("color", "White");
  set("price", "120");
  // One stock box appears per size.
  fireEvent.change(screen.getByLabelText("Stock for size US 8"), { target: { value: "4" } });
  fireEvent.change(screen.getByLabelText("Stock for size US 9"), { target: { value: "6" } });
  const front = new File(["img"], "front.png", { type: "image/png" });
  const side = new File(["img"], "side.png", { type: "image/png" });
  fireEvent.change(container.querySelector("#images"), { target: { files: [front, side] } });
};

describe("AdminUploadProduct", () => {
  afterEach(() => vi.clearAllMocks());

  it("links back to the dashboard", () => {
    renderUpload();
    expect(screen.getByText("← Back to Dashboard")).toHaveAttribute("href", "/dashboard");
  });

  it("clears the form and confirms after a successful upload", async () => {
    let resolveUpload;
    axios.post.mockReturnValue(new Promise((resolve) => (resolveUpload = resolve)));
    const { container } = renderUpload();
    fillForm(container);
    fireEvent.submit(screen.getByRole("form", { name: "Product upload form" }));

    expect(await screen.findByText("Uploading…")).toBeDisabled();
    const body = axios.post.mock.calls[0][1];
    expect(body.get("title")).toBe("Canvas Sneakers");
    expect(body.getAll("images").map((f) => f.name)).toEqual(["front.png", "side.png"]);
    expect(JSON.parse(body.get("sizeStock"))).toEqual({ "US 8": 4, "US 9": 6 });
    expect(body.has("inStock")).toBe(false);

    resolveUpload({
      data: { data: { _id: "p9", title: "Canvas Sneakers", category: ["Men"] } },
    });

    expect(await screen.findByText(/"Canvas Sneakers" was uploaded/)).toBeInTheDocument();
    expect(screen.getByText("View product")).toHaveAttribute("href", "/men/p9");
    for (const id of ["title", "description", "category", "size", "color", "price"]) {
      expect(container.querySelector(`#${id}`)).toHaveValue("");
    }
    // The photos and stock boxes are cleared too.
    expect(screen.queryByAltText(/^Photo/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Stock for size/)).not.toBeInTheDocument();
    expect(screen.getByText("Upload Product")).not.toBeDisabled();
  });

  it("shows a stock box for each size as they're typed", () => {
    const { container } = renderUpload();
    expect(screen.getByText(/Enter the sizes above/)).toBeInTheDocument();
    fireEvent.change(container.querySelector("#size"), { target: { value: "S, M, L" } });
    expect(screen.getAllByLabelText(/Stock for size/).map((i) => i.getAttribute("aria-label"))).toEqual([
      "Stock for size S",
      "Stock for size M",
      "Stock for size L",
    ]);
    fireEvent.change(screen.getByLabelText("Stock for size M"), { target: { value: "3" } });
    expect(screen.getByText("Total: 3")).toBeInTheDocument();
  });

  it("asks for at least one photo", async () => {
    const { container } = renderUpload();
    fillForm(container);
    fireEvent.click(screen.getByRole("button", { name: "Remove photo 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove photo 1" }));
    fireEvent.submit(screen.getByRole("form", { name: "Product upload form" }));
    expect(await screen.findByText("Add at least one photo")).toBeInTheDocument();
    expect(axios.post).not.toHaveBeenCalled();
  });

  it("keeps the form filled and shows the server's error when upload fails", async () => {
    axios.post.mockRejectedValue({
      response: { data: { error: "Price must be a number greater than 0" } },
    });
    const { container } = renderUpload();
    fillForm(container);
    fireEvent.submit(screen.getByRole("form", { name: "Product upload form" }));

    expect(
      await screen.findByText("Price must be a number greater than 0")
    ).toBeInTheDocument();
    expect(container.querySelector("#title")).toHaveValue("Canvas Sneakers");
  });
});
