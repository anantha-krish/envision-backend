import { Request, Response, NextFunction } from "express";
import passport from "passport";

export const authenticateJwt = (
  req: Request,
  res: Response,
  next: NextFunction
) =>
  passport.authenticate(
    "jwt",
    { session: false },
    function (err: Error, payload: any) {
      if (err || !payload)
        return res.status(401).json({ message: "Unauthorized" });
      req.user = payload.user;
      (req as any).token = payload.token;
      next();
    }
  )(req, res, next);
