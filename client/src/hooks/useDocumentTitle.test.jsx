import { render } from "@testing-library/react";
import useDocumentTitle from "./useDocumentTitle";

function Page({ title, description }) {
  useDocumentTitle(title, description);
  return null;
}

const description = () =>
  document.querySelector('meta[name="description"]').getAttribute("content");

describe("useDocumentTitle", () => {
  it("sets the tab title and meta description", () => {
    const { rerender } = render(<Page title="Suede Loafers" description="Tan suede loafers" />);
    expect(document.title).toBe("Suede Loafers | Our Best Side");
    expect(description()).toBe("Tan suede loafers");

    rerender(<Page />);
    expect(document.title).toBe("Our Best Side");
    expect(description()).toMatch(/menswear and ladieswear/);
    expect(document.querySelectorAll('meta[name="description"]')).toHaveLength(1);
  });
});
