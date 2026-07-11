import { describe, expect, it } from "vitest";
import { resolveSafeAssetUrl } from "./safe-url";

describe("resolveSafeAssetUrl", () => {
  it("accepts trusted https URLs and same-origin relative paths", () => {
    expect(resolveSafeAssetUrl("https://example.com/file.pdf")).toBe("https://example.com/file.pdf");
    expect(resolveSafeAssetUrl("/uploads/file.pdf", "https://app.example.com/api")).toBe("https://app.example.com/uploads/file.pdf");
  });

  it("rejects javascript, data, and other unsafe schemes", () => {
    expect(resolveSafeAssetUrl("javascript:alert(1)")).toBeNull();
    expect(resolveSafeAssetUrl("data:text/plain,hi")).toBeNull();
    expect(resolveSafeAssetUrl("file:///etc/passwd")).toBeNull();
  });
});
