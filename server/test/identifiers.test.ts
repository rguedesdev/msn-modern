import { describe, expect, it } from "vitest";
import {
  createRefreshToken,
  directConversationKey,
  hashRefreshToken,
} from "../src/domain/identifiers.js";

describe("identifiers", () => {
  it("gera a mesma chave de conversa independentemente da ordem", () => {
    expect(directConversationKey("b", "a")).toBe("a:b");
    expect(directConversationKey("a", "b")).toBe("a:b");
  });

  it("gera refresh tokens aleatórios e armazena apenas um hash estável", () => {
    const first = createRefreshToken();
    const second = createRefreshToken();

    expect(first).not.toBe(second);
    expect(hashRefreshToken(first)).toHaveLength(64);
    expect(hashRefreshToken(first)).toBe(hashRefreshToken(first));
    expect(hashRefreshToken(first)).not.toBe(hashRefreshToken(second));
  });
});
