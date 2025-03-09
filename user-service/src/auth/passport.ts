import dotenv from "dotenv";
import { eq } from "drizzle-orm";
import passport from "passport";
import { ExtractJwt, Strategy as JwtStrategy } from "passport-jwt";
import { DB } from "../db/db.connection";
import { users } from "../db/schema";
import { ACCESS_TOKEN_SECRET } from "../config";
dotenv.config();

var opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: ACCESS_TOKEN_SECRET,
};

passport.use(
  new JwtStrategy(opts, async (jwt_payload, done) => {
    try {
      let user = await DB.query.users.findFirst({
        columns: {
          id: true,
          email: true,
          username: true,
          role: true,
        },
        where: eq(users.id, jwt_payload.user_id),
      });

      if (!user) {
        throw new Error("User not found");
        return;
      }
      return done(null, user);
    } catch (err) {
      return done(err, false);
    }
  })
);
