import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  it("aplica padrões seguros para o servidor local", () => {
    const config = loadConfig({
      MONGODB_URI: "mongodb://127.0.0.1/test",
      JWT_SECRET: "a-secret-with-at-least-thirty-two-characters",
    });

    expect(config.HOST).toBe("127.0.0.1");
    expect(config.PORT).toBe(3333);
    expect(config.ACCESS_TOKEN_TTL_SECONDS).toBe(900);
  });

  it("rejeita um segredo JWT curto", () => {
    expect(() =>
      loadConfig({ MONGODB_URI: "mongodb://127.0.0.1/test", JWT_SECRET: "short" }),
    ).toThrow();
  });
});
