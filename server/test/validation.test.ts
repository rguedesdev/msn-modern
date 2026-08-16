import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";

describe("validação das entradas HTTP", () => {
  const config = loadConfig({
    NODE_ENV: "test",
    MONGODB_URI: "mongodb://127.0.0.1/msn-modern-validation-test",
    JWT_SECRET: "validation-test-secret-with-at-least-32-characters",
  });
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    app = await buildApp(config);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("rejeita cadastro inválido com detalhes dos campos", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "email-invalido",
        displayName: "",
        password: "curta",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: "Dados inválidos" });
    expect(response.json().details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "email" }),
        expect.objectContaining({ path: "displayName" }),
        expect.objectContaining({ path: "password" }),
      ]),
    );
  });

  it("rejeita identificador de conversa inválido antes de consultar dados", async () => {
    const accessToken = app.jwt.sign({ sub: "000000000000000000000001" });
    const response = await app.inject({
      method: "GET",
      url: "/conversations/identificador-invalido/messages",
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "Dados inválidos",
      details: [expect.objectContaining({ path: "conversationId" })],
    });
  });

  it("rejeita frase de perfil maior que o limite antes de acessar o banco", async () => {
    const accessToken = app.jwt.sign({ sub: "000000000000000000000001" });
    const response = await app.inject({
      method: "PATCH",
      url: "/me/profile",
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { personalMessage: "x".repeat(161) },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "Dados inválidos",
      details: [expect.objectContaining({ path: "personalMessage" })],
    });
  });

  it("rejeita nova senha curta antes de acessar o banco", async () => {
    const accessToken = app.jwt.sign({ sub: "000000000000000000000001" });
    const response = await app.inject({
      method: "PATCH",
      url: "/me/password",
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { currentPassword: "senha-atual", newPassword: "curta" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "Dados inválidos",
      details: [expect.objectContaining({ path: "newPassword" })],
    });
  });
});
