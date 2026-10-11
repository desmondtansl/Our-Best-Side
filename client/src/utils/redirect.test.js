import { isSafeRedirect } from "./redirect";

describe("isSafeRedirect", () => {
  it("only allows Stripe's checkout pages over HTTPS", () => {
    expect(isSafeRedirect("https://checkout.stripe.com/c/pay/cs_test_1")).toBe(true);
    expect(isSafeRedirect("http://checkout.stripe.com/c/pay/cs_test_1")).toBe(false);
    expect(isSafeRedirect("https://checkout.stripe.com.evil.example/c/pay")).toBe(false);
    expect(isSafeRedirect("https://evil.example/?checkout.stripe.com")).toBe(false);
    expect(isSafeRedirect("javascript:alert(1)")).toBe(false);
    expect(isSafeRedirect("/relative")).toBe(false);
    expect(isSafeRedirect(undefined)).toBe(false);
  });
});
