import { readFileSync } from "node:fs";
import { join } from "node:path";

// Site-wide rules in client/index.html that the components rely on. Tests
// run from the client folder.
const html = readFileSync(join(process.cwd(), "index.html"), "utf8");

describe("index.html", () => {
  it("makes links take the colour of the text around them, never browser blue", () => {
    expect(html).toMatch(/\ba\s*\{\s*color:\s*inherit;\s*\}/);
  });

  it("keeps the site light when a browser darkens websites automatically", () => {
    expect(html).toContain('<meta name="color-scheme" content="only light" />');
    expect(html).toMatch(/color-scheme:\s*only light;/);
  });
});
