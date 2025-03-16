import dotenv from "dotenv";
import { eq } from "drizzle-orm";
import passport from "passport";
import { ExtractJwt, Strategy as JwtStrategy } from "passport-jwt";
import { ACCESS_TOKEN_SECRET } from "../config";
import { db } from "../db/db.connection";
import { users } from "../db/schema";
import { userRepo } from "../repository/userRepo";
dotenv.config();

var opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: ACCESS_TOKEN_SECRET,
};

passport.use(
  new JwtStrategy(opts, async (jwt_payload, done) => {
    try {
      let user = await userRepo.getUserByIdForJwtAuth(jwt_payload.user_id);

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
