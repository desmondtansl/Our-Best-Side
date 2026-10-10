import { render, screen, act } from "@testing-library/react";
import useMediaQuery from "./useMediaQuery";

function Show({ query }) {
  return <p>{useMediaQuery(query) ? "match" : "no match"}</p>;
}

describe("useMediaQuery", () => {
  const original = window.matchMedia;
  afterEach(() => {
    window.matchMedia = original;
  });

  it("is false where the browser can't tell (e.g. tests)", () => {
    window.matchMedia = undefined;
    render(<Show query="(max-width: 1024px)" />);
    expect(screen.getByText("no match")).toBeInTheDocument();
  });

  it("follows the screen as it changes, and stops listening when unmounted", () => {
    const listeners = new Set();
    const list = {
      matches: true,
      addEventListener: (_, fn) => listeners.add(fn),
      removeEventListener: (_, fn) => listeners.delete(fn),
    };
    window.matchMedia = vi.fn(() => list);
    const { unmount } = render(<Show query="(max-width: 1024px)" />);
    expect(window.matchMedia).toHaveBeenCalledWith("(max-width: 1024px)");
    expect(screen.getByText("match")).toBeInTheDocument();

    act(() => {
      list.matches = false;
      listeners.forEach((fn) => fn());
    });
    expect(screen.getByText("no match")).toBeInTheDocument();

    unmount();
    expect(listeners.size).toBe(0);
  });
});
