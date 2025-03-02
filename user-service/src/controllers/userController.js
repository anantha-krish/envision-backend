const pool = require('../config/db.js');
const { sendUserEvent } = require('../config/kafka.js');
const { hash,compare } = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Create User
const createUser = async (req, res) => {
  const { userName, email, password } = req.body;

  try {
    const hashedPassword = await hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (user_name, email, password) VALUES ($1, $2, $3) RETURNING *",
      [userName, email, hashedPassword]
    );

   await sendUserEvent("USER_CREATED", result.rows[0]);

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get All Users
const getUsers = async (req, res) => {
  try {
    const result = await pool.query("SELECT id, user_name, email FROM users");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update User
const updateUser = async (req, res) => {
  const { id } = req.params;
  const { userName, email } = req.body;

  try {
    const result = await query(
      "UPDATE users SET user_name = $1, email = $2 WHERE id = $3 RETURNING *",
      [userName, email, id]
    );

    await sendUserEvent("USER_UPDATED", result.rows[0]);

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const loginUser = async (req, res) => {
  const { userName, password } = req.body;
  
  if (!userName || !password) {
    return res.status(400).json({ message: "Username and password required" });
  }

  try {
    const query = `SELECT * FROM users WHERE user_name = $1`;
    const result = await pool.query(query, [userName]);

    if (result.rows.length === 0) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const user = result.rows[0];
    const isPasswordValid = await compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ user_id: user.user_id, 
                             user_name: user.user_name,
                             role: user.role,}, 
                            process.env.JWT_SECRET, 
                            { expiresIn: "1h" });

    res.status(200).json({ message: "Login successful", token });
  } catch (error) {
    res.status(500).json({ message: "Error logging in", error: error.message });
  }
};


module.exports = { createUser, getUsers, updateUser,loginUser };
