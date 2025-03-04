import { DB } from "../db/db.connection"; // Your Drizzle DB instance
import { refreshTokens } from "../db/schema";

export const saveRefreshToken = async (
  userId: string,
  token: string,
  expiresInDays = 7
) => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);
  await DB.insert(refreshTokens).values({
    userId,
    token,
    expiresAt,
  });
};
