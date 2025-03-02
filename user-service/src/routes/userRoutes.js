const { Router } = require('express');
const { authenticateUser } = require('../middleware/auth.js');
const { createUser, getUsers, updateUser,loginUser } = require('../controllers/userController.js');
const router = Router();

router.post("/", createUser);
router.get("/", authenticateUser, getUsers);
router.put("/:id", authenticateUser, updateUser);
router.post("/login", loginUser);

module.exports = router;
