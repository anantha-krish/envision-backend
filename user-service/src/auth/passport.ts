import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { sign } from 'jsonwebtoken';
import dotenv from 'dotenv';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { DB } from '../db/db.connection';
dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID||'',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET||'',
      callbackURL: "/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0].value??"";
        const name = profile.displayName;

          let user = await DB.select().from(users).where(eq(users.email,email)); 
        if (user.length === 0) {
           throw new Error("User not found");
          return;
        }

        const token = sign({ id: user[0].id, email }, process.env.JWT_SECRET||"my_secret", { expiresIn: "1h" });
        return done(null, { user: user[0], token });
      } catch (err) {
        return done(err, false);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user:Express.User, done) => {
  done(null, user);
});
