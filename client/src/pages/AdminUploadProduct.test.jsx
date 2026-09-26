import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import AdminUploadProduct from "./AdminUploadProduct";
import AdminSearchProduct from "./AdminSearchProduct";

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
  set("inStock", "10");
  const file = new File(["img"], "shoe.png", { type: "image/png" });
  fireEvent.change(container.querySelector("#image"), { target: { files: [file] } });
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
    expect(body.get("image")).toBeInstanceOf(File);

    resolveUpload({
      data: { data: { _id: "p9", title: "Canvas Sneakers", category: ["Men"] } },
    });

    expect(await screen.findByText(/"Canvas Sneakers" was uploaded/)).toBeInTheDocument();
    expect(screen.getByText("View product")).toHaveAttribute("href", "/men/p9");
    for (const id of ["title", "description", "category", "size", "color", "price", "inStock"]) {
      expect(container.querySelector(`#${id}`)).toHaveValue("");
    }
    // (Clearing the file input is checked in a real browser: jsdom can't reset
    // a `files` value set by the test.)
    expect(screen.getByText("Upload Product")).not.toBeDisabled();
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

describe("AdminSearchProduct", () => {
  it("links back to the dashboard", () => {
    render(
      <MemoryRouter>
        <AdminSearchProduct />
      </MemoryRouter>
    );
    expect(screen.getByText("← Back to Dashboard")).toHaveAttribute("href", "/dashboard");
  });
});
