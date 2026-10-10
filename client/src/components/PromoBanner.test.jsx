import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import PromoBanner from "./PromoBanner";

vi.mock("axios", () => ({
  default: { get: vi.fn(), defaults: { headers: { common: {} } } },
}));

const xmas = {
  code: "XMAS20",
  percentOff: 20,
  endDate: "2026-12-31",
  text: "Use promo code XMAS20 for the festive season!",
};
const welcome = { code: "WELCOME10", percentOff: 10, endDate: null, text: "Use promo code WELCOME10 for 10% off!" };

describe("PromoBanner", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.clearAllMocks());

  it("announces each running promotion with its code and end date", async () => {
    axios.get.mockResolvedValue({ data: { data: [xmas, welcome] } });
    render(<PromoBanner />);
    const banner = await screen.findByRole("region", { name: "Promotion XMAS20" });
    expect(banner).toHaveTextContent("Use promo code XMAS20 for the festive season!");
    expect(banner).toHaveTextContent("Ends 31 Dec 2026");
    expect(screen.getByRole("region", { name: "Promotion WELCOME10" })).not.toHaveTextContent("Ends");
    expect(axios.get).toHaveBeenCalledWith(expect.stringMatching(/\/promotions\/banners$/));
  });

  it("shows nothing when no promotion is running, or when it can't load", async () => {
    axios.get.mockResolvedValue({ data: { data: [] } });
    const { container } = render(<PromoBanner />);
    await waitFor(() => expect(axios.get).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();

    axios.get.mockRejectedValue(new Error("offline"));
    const other = render(<PromoBanner />);
    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(2));
    expect(other.container).toBeEmptyDOMElement();
  });

  it("copies the code", async () => {
    const writeText = vi.fn().mockResolvedValue();
    Object.assign(navigator, { clipboard: { writeText } });
    axios.get.mockResolvedValue({ data: { data: [xmas] } });
    render(<PromoBanner />);
    fireEvent.click(await screen.findByRole("button", { name: "Copy code XMAS20" }));
    expect(writeText).toHaveBeenCalledWith("XMAS20");
    expect(await screen.findByText("Copied!")).toBeInTheDocument();
  });

  it("stays closed once a shopper closes it, in this browser", async () => {
    axios.get.mockResolvedValue({ data: { data: [xmas] } });
    const first = render(<PromoBanner />);
    fireEvent.click(await screen.findByRole("button", { name: "Close this promotion" }));
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
    first.unmount();

    render(<PromoBanner />);
    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });
});
