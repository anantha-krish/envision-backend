import { NextFunction, Request, Response } from "express";
import passport from "passport";
import { isTokenBlacklisted } from "../redis_client";

export const authenticateJwt = (
  req: Request,
  res: Response,
  next: NextFunction
) =>
  passport.authenticate(
    "jwt",
    { session: false },
    async function (err: Error, payload: any) {
      var token = req.headers["authorization"]?.split(" ")[1];
      if (err || !payload || !token)
        return res.status(401).json({ message: "Unauthorized" });
      // Check if token is blacklisted using Redis Set
      const isBlacklisted = (await isTokenBlacklisted(token)) > 0;
      if (isBlacklisted)
        return res.status(401).json({ message: "Unauthorized: Token revoked" });
      req.user = { ...payload, token };
      next();
    }
  )(req, res, next);
