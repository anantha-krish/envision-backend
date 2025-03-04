import dotenv from "dotenv";
import { eq } from "drizzle-orm";
import { sign, decode } from "jsonwebtoken";
import passport from "passport";
import { ExtractJwt, Strategy as JwtStrategy } from "passport-jwt";
import { JWT_SECRET } from "../config";
import { DB } from "../db/db.connection";
import { users } from "../db/schema";
dotenv.config();

var opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: JWT_SECRET,
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
        where: eq(users.id, jwt_payload.sub),
      });

      if (!user) {
        throw new Error("User not found");
        return;
      }
      const token = sign({ sub: user.id }, JWT_SECRET, { expiresIn: "1h" });

      const payload = {
        user,
        token,
      };
      return done(null, payload);
    } catch (err) {
      return done(err, false);
    }
  })
);
