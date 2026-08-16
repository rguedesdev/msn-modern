import { z, type ZodType } from "zod";

export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

export function parseInput<T>(schema: ZodType<T>, input: unknown): T {
  return schema.parse(input);
}

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Identificador inválido");
export const deviceIdSchema = z.string().uuid();
export const opaqueBase64Schema = z
  .string()
  .min(1)
  .max(1_000_000)
  .regex(/^[A-Za-z0-9+/_=-]+$/, "O valor deve usar uma codificação base64");
