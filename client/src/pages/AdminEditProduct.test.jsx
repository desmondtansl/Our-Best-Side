import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import AdminEditProduct from "./AdminEditProduct";

vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
    defaults: { headers: { common: {} } },
  },
}));

const product = {
  _id: "product-1",
  title: "Suede Loafers",
  description: "Brown suede loafers",
  image: "existing-image-key",
  category: ["Men"],
  size: ["S", "M"],
  color: ["Brown"],
  price: 250,
  inStock: 10,
};

const renderPage = async () => {
  const utils = render(
    <MemoryRouter initialEntries={["/search/product-1"]}>
      <Routes>
        <Route path="/search/:params" element={<AdminEditProduct />} />
      </Routes>
    </MemoryRouter>
  );
  await waitFor(() =>
    expect(utils.container.querySelector("#title")).toHaveValue(product.title)
  );
  return utils;
};

const submit = (container) => fireEvent.submit(container.querySelector("form"));

const sentFormData = () => {
  expect(axios.put).toHaveBeenCalledTimes(1);
  const [url, body] = axios.put.mock.calls[0];
  expect(url).toMatch(/\/products\/product-1$/);
  expect(body).toBeInstanceOf(FormData);
  return body;
};

describe("AdminEditProduct", () => {
  beforeEach(() => {
    axios.get.mockResolvedValue({ data: { data: product } });
    vi.spyOn(window, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("sends only edited fields and no image when no file is chosen", async () => {
    axios.put.mockResolvedValue({ data: { data: product } });
    const { container } = await renderPage();

    fireEvent.change(container.querySelector("#title"), {
      target: { value: "Suede Loafers v2" },
    });
    fireEvent.change(container.querySelector("#size"), {
      target: { value: "S, M, L" },
    });
    submit(container);

    await waitFor(() => expect(axios.put).toHaveBeenCalled());
    const body = sentFormData();
    expect(body.get("title")).toBe("Suede Loafers v2");
    expect(body.getAll("size")).toEqual(["S", "M", "L"]);
    expect(body.has("image")).toBe(false);
    // Untouched fields are left out so their saved values are kept.
    expect(body.has("description")).toBe(false);
    expect(body.has("price")).toBe(false);
    expect(body.has("category")).toBe(false);
  });

  it("includes the chosen image file", async () => {
    axios.put.mockResolvedValue({ data: { data: product } });
    const { container } = await renderPage();

    const file = new File(["image bytes"], "new.png", { type: "image/png" });
    fireEvent.change(container.querySelector("#image"), {
      target: { files: [file] },
    });
    submit(container);

    await waitFor(() => expect(axios.put).toHaveBeenCalled());
    const image = sentFormData().get("image");
    expect(image).toBeInstanceOf(File);
    expect(image.name).toBe("new.png");
  });

  it("keeps multi-word sizes intact and shows saved lists as text", async () => {
    axios.put.mockResolvedValue({ data: { data: product } });
    const { container } = await renderPage();
    expect(container.querySelector("#size")).toHaveValue("S, M");

    fireEvent.change(container.querySelector("#size"), {
      target: { value: "US 8, US 9" },
    });
    submit(container);

    await waitFor(() => expect(axios.put).toHaveBeenCalled());
    expect(sentFormData().getAll("size")).toEqual(["US 8", "US 9"]);
  });

  it("sends the featured flag only when it is changed", async () => {
    axios.put.mockResolvedValue({ data: { data: product } });
    const { container } = await renderPage();
    const checkbox = screen.getByLabelText("Featured on homepage");
    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);
    submit(container);

    await waitFor(() => expect(axios.put).toHaveBeenCalled());
    expect(sentFormData().get("featured")).toBe("true");
  });

  it("links back to the dashboard and to search", async () => {
    await renderPage();
    expect(screen.getByText("← Back to Dashboard")).toHaveAttribute("href", "/dashboard");
    expect(screen.getByText("← Back to search")).toHaveAttribute("href", "/search");
  });

  it("does not require an image to submit", async () => {
    const { container } = await renderPage();
    expect(container.querySelector("#image")).not.toBeRequired();
  });

  it("only shows the success alert after the request resolves", async () => {
    let resolvePut;
    axios.put.mockReturnValue(
      new Promise((resolve) => {
        resolvePut = resolve;
      })
    );
    const { container } = await renderPage();

    submit(container);
    await waitFor(() => expect(axios.put).toHaveBeenCalled());
    expect(window.alert).not.toHaveBeenCalled();

    resolvePut({ data: { data: product } });
    await waitFor(() =>
      expect(window.alert).toHaveBeenCalledWith("Product successfully edited")
    );
  });

  it("does not show the success alert when the request fails", async () => {
    axios.put.mockRejectedValue(new Error("Request failed with status 403"));
    const { container } = await renderPage();

    submit(container);

    await waitFor(() =>
      expect(window.alert).toHaveBeenCalledWith("Failed to edit product")
    );
    expect(window.alert).not.toHaveBeenCalledWith("Product successfully edited");
  });
});
