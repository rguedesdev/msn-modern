import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Informe o e-mail")
  .max(254, "O e-mail deve ter no máximo 254 caracteres")
  .email("Informe um e-mail válido")
  .transform((value) => value.toLowerCase());

export const passwordSchema = z
  .string()
  .min(10, "A senha deve ter pelo menos 10 caracteres")
  .max(128, "A senha deve ter no máximo 128 caracteres");

export const authFormSchema = z
  .object({
    isRegistering: z.boolean(),
    rememberMe: z.boolean(),
    email: emailSchema,
    displayName: z
      .string()
      .trim()
      .max(80, "O nome deve ter no máximo 80 caracteres"),
    password: passwordSchema,
  })
  .superRefine((data, context) => {
    if (data.isRegistering && data.displayName.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["displayName"],
        message: "Informe o nome de exibição",
      });
    }
  });

export type AuthFormInput = z.input<typeof authFormSchema>;
export type AuthFormData = z.output<typeof authFormSchema>;

export const addContactFormSchema = z.object({ email: emailSchema });
export type AddContactFormInput = z.input<typeof addContactFormSchema>;
export type AddContactFormData = z.output<typeof addContactFormSchema>;

export const personalMessageFormSchema = z.object({
  personalMessage: z
    .string()
    .trim()
    .max(160, "A frase de perfil deve ter no máximo 160 caracteres"),
});
export type PersonalMessageFormInput = z.input<typeof personalMessageFormSchema>;
export type PersonalMessageFormData = z.output<typeof personalMessageFormSchema>;

export const chatMessageSchema = z
  .string()
  .trim()
  .min(1, "Digite uma mensagem")
  .max(4_000, "A mensagem deve ter no máximo 4.000 caracteres");
