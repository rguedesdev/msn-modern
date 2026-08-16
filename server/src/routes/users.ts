import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { parseInput } from "../http.js";
import { UserModel } from "../models/user.js";

const querySchema = z.object({
  email: z.string().email().max(254).transform((value) => value.trim().toLowerCase()),
});

export async function userRoutes(app: FastifyInstance): Promise<void> {
  app.get("/users", { preHandler: app.authenticate }, async (request) => {
    const { email } = parseInput(querySchema, request.query);
    const user = await UserModel.findOne({ email })
      .select("displayName email personalMessage avatarFileId profileFrame nameEffect")
      .lean();
    return {
      user: user
        ? {
            id: user._id.toString(),
            email: user.email,
            displayName: user.displayName,
            personalMessage: user.personalMessage ?? "",
            avatarUrl: user.avatarFileId
              ? `/users/${user._id.toString()}/avatar?v=${user.avatarFileId.toString()}&policy=2`
              : "",
            profileFrame: user.profileFrame ?? "status",
            nameEffect: user.nameEffect ?? "default",
          }
        : null,
    };
  });
}
