import { NextFunction, Request, Response } from "express";

declare global {
  namespace Express {
    interface User {
      role: string;
      id: string;
    }
  }
}

// Middleware to restrict access based on role
export const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.role || !allowedRoles.includes(req.user.role)) {
      res
        .status(403)
        .json({ message: "Access denied: Insufficient permissions" });
      return;
    }
    next();
  };
};
