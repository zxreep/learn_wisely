import { describe, expect, it } from "vitest";
import app from "./index";

describe("Worker API shell", () => {
  it("reports missing database configuration honestly", async () => {
    const response = await app.request("http://localhost/api/health", {}, {});
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ status: "degraded", database: { configured: false } });
  });

  it("protects authenticated routes and applies security headers", async () => {
    const response = await app.request("http://localhost/api/auth/me", {}, {});
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "UNAUTHENTICATED" } });
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect(response.headers.get("content-security-policy")).toContain("default-src 'self'");
  });

  it("validates signup input before touching external services", async () => {
    const response = await app.request("http://localhost/api/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost" },
      body: JSON.stringify({ email: "not-an-email", password: "short", name: "", handle: "?" }),
    }, {});
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "VALIDATION_ERROR" } });
  });
});
