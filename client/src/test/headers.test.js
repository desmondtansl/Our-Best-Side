import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fillHeaders, DEFAULT_IMAGE_ORIGIN } from "../../buildHeaders.js";

// public/_headers, as Netlify gets it after the build fills in the addresses.
const template = readFileSync(join(process.cwd(), "public/_headers"), "utf8");
const csp = (text) => text.split("\n").find((line) => line.includes("Content-Security-Policy:"));

describe("security headers", () => {
  it("allow the shop's own API and photo bucket, not every site on Render or AWS", () => {
    const policy = csp(fillHeaders(template, { apiUrl: "https://ourbestside-api.onrender.com/" }));
    expect(policy).toContain("connect-src 'self' https://ourbestside-api.onrender.com;");
    expect(policy).toContain(`img-src 'self' data: blob: https://ourbestside-api.onrender.com ${DEFAULT_IMAGE_ORIGIN};`);
    expect(policy).not.toContain("*");
  });

  it("can use another photo address", () => {
    const policy = csp(
      fillHeaders(template, { apiUrl: "https://api.example.com", imageOrigin: "https://photos.example.com/x" })
    );
    expect(policy).toContain("https://photos.example.com;");
  });

  it("stops the build without a usable API address", () => {
    expect(() => fillHeaders(template, {})).toThrow(/VITE_BASE_URL/);
    expect(() => fillHeaders(template, { apiUrl: "javascript:alert(1)" })).toThrow(/VITE_BASE_URL/);
  });
});
