import { Request, Response } from "express";
import { DB } from "../db/db.connection";
import { sendKafkaUserEvent } from "../config/kafka";
import { hash, compare } from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { userRepo } from "../repository/userRepo";
import {
  blacklistToken,
  deleteRefreshToken,
  getRefreshToken,
  saveRefreshToken,
} from "../redis_client";

import {
  ACCESS_TOKEN_EXPIRY_IN_MINS,
  ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_EXPIRY_IN_DAYS,
  REFRESH_TOKEN_SECRET,
} from "../config";
import { error } from "console";
// Create User
const createUser = async (req: Request, res: Response) => {
  const { username, email, password, role } = req.body;

  try {
    const hashedPassword = await hash(password, 10);
    const result = await userRepo.createUser(
      username,
      email,
      hashedPassword,
      role
    );
    var user = result[0];
    await sendKafkaUserEvent("USER_CREATED", {
      userId: user.id,
      userName: user.username,
    });

    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Get All Users
const getUsers = async (req: Request, res: Response) => {
  try {
    const results = await userRepo.getAllUsers();

    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Update User
const updateUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { username, email } = req.body;

  try {
    const result = await userRepo.updateUser(parseInt(id), username, email);

    await sendKafkaUserEvent("USER_UPDATED", result[0]);

    res.json(result[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

const getUserRole = async (req: Request, res: Response) => {
  var role = req?.user?.role ?? "";
  if (!role) {
    res.status(404).json({ error: "No roles found" });
    return;
  } else {
    res.status(200).json({ role });
  }
};

const deleteUser = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await userRepo.deleteUser(parseInt(id));

    if (result.length === 0) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    await sendKafkaUserEvent("USER_DELETED", { userId: id });

    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

const loginUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ message: "Email and password required" });
    return;
  }

  try {
    const result = await userRepo.getUserByEmail(email);
    if (result.length === 0) {
      res.status(400).json({ message: "Invalid credentials" });
      return;
    }

    const user = result[0];
    const isPasswordValid = await compare(password, user.password);

    if (!isPasswordValid) {
      res.status(400).json({ message: "Invalid credentials" });
      return;
    }

    const accessToken = jwt.sign({ sub: user.id }, ACCESS_TOKEN_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY_IN_MINS,
    });
    const refreshToken = jwt.sign({ sub: user.id }, REFRESH_TOKEN_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRY_IN_DAYS,
    });
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
    });
    await saveRefreshToken(user.id, refreshToken);
    res.status(200).json({ message: "Login successful", accessToken });
  } catch (error: any) {
    res.status(500).json({ message: "Error logging in", error: error.message });
  }
};

const logOut = async (req: Request, res: Response) => {
  const token = req?.user?.token ?? "";
  if (token.length == 0) {
    res.status(401).json({ message: "Unauthorised" });
    return;
  }
  // Blacklist token in Redis
  await blacklistToken(token);
  // Remove from Redis
  await deleteRefreshToken(req.user?.id ?? "");

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
  });

  res.json({ message: "Successfully logged out" });
};

const refreshAccessToken = async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken; // Read from cookie
  if (!refreshToken) {
    res.sendStatus(401);
    return;
  }

  try {
    const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);

    const storedToken = await getRefreshToken((decoded as any).sub);

    if (!storedToken || storedToken !== refreshToken) {
      res.sendStatus(403); // Token mismatch or expired
      return;
    }

    // Generate new access token
    const newAccessToken = jwt.sign(
      { id: (decoded as any).sub },
      ACCESS_TOKEN_SECRET,
      {
        expiresIn: ACCESS_TOKEN_EXPIRY_IN_MINS,
      }
    );

    res.json({ accessToken: newAccessToken });
  } catch (error) {
    res.sendStatus(403);
  }
};

export {
  createUser,
  getUsers,
  updateUser,
  loginUser,
  deleteUser,
  logOut,
  refreshAccessToken,
  getUserRole,
};
