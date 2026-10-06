import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./auth";

describe("password hashing", () => {
  it("verifies only the original password", async () => {
    const password = await hashPassword("a-long-passphrase");
    await expect(verifyPassword("a-long-passphrase", password.salt, password.hash)).resolves.toBe(true);
    await expect(verifyPassword("not-the-password", password.salt, password.hash)).resolves.toBe(false);
  }, 20_000);
});
