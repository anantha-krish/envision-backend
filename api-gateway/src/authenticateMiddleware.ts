import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
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
const verifyTokenAndGetRole = async (
  token: string
): Promise<{ valid: boolean; role?: string }> => {
  try {
    const response = await fetch("http://localhost:5000/api/auth/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) return { valid: false };

    const data = await response.json();
    return data.role ? { valid: true, role: data.role } : { valid: false };
  } catch (error) {
    return { valid: false };
  }
};

const authenticateAndAuthorize = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const serviceName = `/${req.path.split("/")[1]}`;

  if (serviceName === "/users") {
    return next(); // Skip authentication for `user-service`
  }

  const token = req.header("Authorization")?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const { valid, role } = await verifyTokenAndGetRole(token);
  if (!valid || !role) return res.status(403).json({ error: "Forbidden" });

  // 🔹 Check if the role has permission for this specific method & path
  /*const allowedMethods = rolePermissions[role]?.[serviceName] || [];
  if (!allowedMethods.includes(req.method)) {
    return res.status(403).json({ error: "Access Denied" });
  }*/

  next();
};

export default authenticateAndAuthorize;
