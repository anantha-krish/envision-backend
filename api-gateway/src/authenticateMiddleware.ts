import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers["authorization"];
  if (!token) return res.status(403).json({ message: "Token required" });

  jwt.verify(
    token.split(" ")[1],
    process.env.JWT_SECRET as string,
    (err, user) => {
      if (err) return res.status(401).json({ message: "Invalid token" });
      (req as any).user = user;
      next();
    }
  );
};

export default authenticateToken;
