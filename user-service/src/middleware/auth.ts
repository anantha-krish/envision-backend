import { Request, Response, NextFunction } from 'express';
import { JwtPayload, verify } from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

interface AuthenticatedRequest extends Request {
  user?: string | JwtPayload;
}

export const authenticateUser = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const token = req.header("Authorization")?.split(" ")[1];

  if (!token) {  res.status(401).json({ error: "Access Denied" });
  return;
}

  try {
    const verified = verify(token, process.env.JWT_SECRET || "my_secret") as JwtPayload;
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).json({ error: "Invalid Token" });
  }
};
