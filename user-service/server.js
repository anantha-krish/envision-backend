const express = require('express');
const passport = require('passport');
require('./src/auth/passport.js');
const userRoutes = require('./src/routes/userRoutes.js');
const {sendUserEvent}= require('./src/config/kafka.js');

const app = express();
const PORT = process.env.PORT || 3000;
async function test(){
  await sendUserEvent("USER_CREATED", "test");
}

test();
/**
 app.use(express.json());
app.use('/', userRoutes);

app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get(
  '/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    res.json({ user: req.user.user, token: req.user.token });
  }
);
**/
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));