import { Request, Response } from "express";
import { DB } from "../db/db.connection";
import { sendKafkaUserEvent } from "../config/kafka";
import { hash, compare } from "bcryptjs";
import jwt from "jsonwebtoken";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { userRepo } from "../repository/userRepo";
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
    const result = await userRepo.updateUser(username, email, parseInt(id));

    await sendKafkaUserEvent("USER_UPDATED", result[0]);

    res.json(result[0]);
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

    const token = jwt.sign(
      { sub: user.id },
      process.env.JWT_SECRET || "my_secret",
      { expiresIn: "1h" }
    );

    res.status(200).json({ message: "Login successful", token });
  } catch (error: any) {
    res.status(500).json({ message: "Error logging in", error: error.message });
  }
};

export { createUser, getUsers, updateUser, loginUser };
