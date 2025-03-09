import dotnenv from "dotenv";
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
dotnenv.configDotenv();
export const ACCESS_TOKEN_SECRET =
  process.env.ACCESS_TOKEN_SECRET || "my_secret";
/*
const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers["authorization"];

  const serviceName = `/${req.path.split("/")[1]}`;
  const isPublicRoute = serviceName == "/users";

  if (isPublicRoute) {
    return next(); // Skip authentication for public routes
  }
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  jwt.verify(
    token.split(" ")[1],
    process.env.JWT_SECRET as string,
    (err, user) => {
      if (err) return res.status(403).json({ error: "Forbidden" });
      (req as any).user = user;
      next();
    }
  );
};
*/

// 🔹 Role-Based Access Control (RBAC) - Define permissions per role
/*
const rolePermissions: { [role: string]: { [path: string]: string[] } } = {
  admin: {
    "/ideas": ["GET", "POST", "PUT", "DELETE"],
    "/notifications": ["GET", "POST", "PUT", "DELETE"],
    "/users": ["GET", "POST", "PUT", "DELETE"],
  },
  manager: {
    "/ideas": ["GET", "POST", "PUT", "DELETE"],
    "/notifications": ["GET", "POST", "PUT", "DELETE"],
    "/users": ["GET", "POST", "PUT", "DELETE"],
  },
  user: {
    "/ideas": ["GET", "POST", "PUT", "DELETE"],
    "/notifications": ["GET", "POST", "PUT", "DELETE"],
    "/users": ["GET", "POST", "PUT", "DELETE"],
  },
};
*/
export const authenticateAndAuthorize = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const serviceName = `/${req.path.split("/")[1]}`;
  const token = req.header("Authorization")?.split(" ")[1];
  const { user_id, role } = jwt.verify(token!, ACCESS_TOKEN_SECRET) as any;
  if (!user_id || !role) return res.status(403).json({ error: "Forbidden" });

  if (!token) return res.status(401).json({ error: "Unauthorized" });

  //const { user_id, role } = jwt.verify(token, ACCESS_TOKEN_SECRET) as any;
  if (!user_id || !role) return res.status(403).json({ error: "Forbidden" });

  // 🔹 Check if the role has permission for this specific method & path
  /*const allowedMethods = rolePermissions[role]?.[serviceName] || [];
  if (!allowedMethods.includes(req.method)) {
    return res.status(403).json({ error: "Access Denied" });
  }*/
  req.headers.role = role;
  req.headers.user_id = user_id;
  next();
};
