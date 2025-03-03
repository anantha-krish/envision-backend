import { Request, Response } from 'express';
import pool from '../config/db';
import { sendKafkaUserEvent } from '../config/kafka';
import { hash, compare } from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Create User
const createUser = async (req:Request, res:Response) => {
  const { userName, email, password,role } = req.body;

  try {
    const hashedPassword = await hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (user_name, email, password) VALUES ($1, $2, $3) RETURNING *",
      [userName, email, hashedPassword]
    );

   await sendKafkaUserEvent("USER_CREATED", result.rows[0]);

    res.json(result.rows[0]);
  } catch (err:any) {
    res.status(500).json({ error: err.message });
  }
};

// Get All Users
const getUsers = async (req:Request, res:Response) => {
  try {
    const result = await pool.query("SELECT id, user_name, email FROM users");
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Update User
const updateUser = async (req:Request, res:Response) => {
  const { id } = req.params;
  const { userName, email } = req.body;

  try {
    const result = await pool.query(
      "UPDATE users SET user_name = $1, email = $2 WHERE id = $3 RETURNING *",
      [userName, email, id]
    );

    await sendKafkaUserEvent("USER_UPDATED", result.rows[0]);

    res.json(result.rows[0]);
  } catch (err:any) {
    res.status(500).json({ error: err.message });
  }
};

const loginUser = async (req:Request, res:Response) => {
  const { userName, password } = req.body;
  
  if (!userName || !password) {
     res.status(400).json({ message: "Username and password required" });
     return;
    }

  try {
    const query = `SELECT * FROM users WHERE user_name = $1`;
    const result = await pool.query(query, [userName]);

    if (result.rows.length === 0) {
       res.status(400).json({ message: "Invalid credentials" });
       return;
    }

    const user = result.rows[0];
    const isPasswordValid = await compare(password, user.password);

    if (!isPasswordValid) {
       res.status(400).json({ message: "Invalid credentials" });
       return;
    }

    const token = jwt.sign({ user_id: user.user_id, 
                             user_name: user.user_name,
                             role: user.role,}, 
                            process.env.JWT_SECRET||"my_secret", 
                            { expiresIn: "1h" });

    res.status(200).json({ message: "Login successful", token });
  } catch (error:any) {
    res.status(500).json({ message: "Error logging in", error: error.message });
  }
};


export { createUser, getUsers, updateUser,loginUser };
