import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import pool from '../config/db';
import { sign } from 'jsonwebtoken';
import dotenv from 'dotenv';
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

        let user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

        if (user.rows.length === 0) {
          user = await pool.query(
            "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *",
            [name, email]
          );
        }

        const token = sign({ id: user.rows[0].id, email }, process.env.JWT_SECRET||"my_secret", { expiresIn: "1h" });

        return done(null, { user: user.rows[0], token });
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
