import { compare, hash } from "bcryptjs";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { sendUserUpdateEvent } from "../config/kafka";
import {
  blacklistToken,
  deleteRefreshToken,
  getRefreshToken,
  saveRefreshToken,
} from "../redis_client";
import { userRepo } from "../repository/userRepo";

import {
  ACCESS_TOKEN_EXPIRY_IN_MINS,
  ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_EXPIRY_IN_DAYS,
  REFRESH_TOKEN_SECRET,
} from "../config";
// Create User
const createUser = async (req: Request, res: Response) => {
  const {
    username,
    email,
    password,
    firstName,
    lastName,
    role,
    designation,
    managerId,
  } = req.body;

  try {
    const hashedPassword = await hash(password, 10);
    const result = await userRepo.createUser(
      username,
      email,
      hashedPassword,
      firstName,
      lastName,
      role,
      designation,
      managerId
    );

    /* await sendKafkaUserEvent("USER_CREATED", {
      userId: user.id,
      userName: user.username,
    });
*/
    res.json(result);
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
  const { username, email, firstName, lastName, role, designation, managerId } =
    req.body;
  const userId = parseInt(id);
  try {
    const updatedUser = await userRepo.updateUser(
      userId,
      username,
      email,
      firstName,
      lastName,
      role,
      designation,
      managerId
    );
    /*
    await sendUserUpdateEvent({
      actorId: parseInt(id),
      recipients: [userId],
      ideaId: -1,
      messageText: `User: ${username} profile details updated.`,
    });
*/
    res.json(updatedUser[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

const deleteUser = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await userRepo.deleteUser(parseInt(id));
    res.status(result.status).json(result.message);
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

    const accessToken = jwt.sign(
      { user_id: user.id, role: user.roleCode },
      ACCESS_TOKEN_SECRET,
      {
        expiresIn: ACCESS_TOKEN_EXPIRY_IN_MINS,
      }
    );
    const refreshToken = jwt.sign(
      { user_id: user.id, role: user.roleCode },
      REFRESH_TOKEN_SECRET,
      {
        expiresIn: REFRESH_TOKEN_EXPIRY_IN_DAYS,
      }
    );
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
    const { user_id, role } = jwt.verify(
      refreshToken,
      REFRESH_TOKEN_SECRET
    ) as any;

    const storedToken = await getRefreshToken(user_id);

    if (!storedToken || storedToken !== refreshToken) {
      res.sendStatus(403); // Token mismatch or expired
      return;
    }

    // Generate new access token
    const newAccessToken = jwt.sign(
      { user_id: user_id, role: role },
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

const filtersUsers = async (req: Request, res: Response) => {
  try {
    const roleCode = req.query.roleCode as string;
    let userIds = req.query.userIds as string[];
    if (userIds && !Array.isArray(userIds)) {
      userIds = [userIds];
    } else {
      userIds = [];
    }

    let results;
    if (userIds.length > 0) {
      results = await userRepo.getAllUsersByUserId(userIds.map(Number));
    } else if (roleCode && userIds.length == 0) {
      results = await userRepo.getAllUsersByRoleCode(roleCode);
    } else {
      results = await userRepo.getAllUsers();
    }
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

const getAllRoles = async (req: Request, res: Response) => {
  try {
    const results = await userRepo.getAllRoles();
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
const getAllDesignations = async (req: Request, res: Response) => {
  try {
    const results = await userRepo.getAllDesignations();
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export {
  createUser,
  deleteUser,
  getUsers,
  loginUser,
  logOut,
  refreshAccessToken,
  updateUser,
  filtersUsers as getAllUsersByRoleCode,
  getAllRoles,
  getAllDesignations,
};
