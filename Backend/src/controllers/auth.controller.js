const userModel = require("../models/user.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const tokenBlacklistModel = require("../models/blacklist.model");

const authCookieOptions = {
  path: "/",
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
};
const legacyAuthCookieOptions = {
  ...authCookieOptions,
  path: "/api/auth",
};

async function registerUserController(req, res) {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({
      message: "Please provide username, email and password",
    });
  }

  const isUserAlreadyExists = await userModel.findOne({
    $or: [{ username }, { email }],
  });

  if (isUserAlreadyExists) {
    return res.status(400).json({
      message: "Account already exists with this email address or username",
    });
  }

  const hash = await bcrypt.hash(password, 10);

  const user = await userModel.create({
    username,
    email,
    password: hash,
  });

  const token = jwt.sign(
    { id: user._id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: "1d" },
  );

  res.clearCookie("token", legacyAuthCookieOptions);
  res.cookie("token", token, authCookieOptions);

  res.status(201).json({
    message: "User registered successfully",
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
    },
  });
}

async function loginUserController(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message: "Please provide email and password.",
    });
  }

  const user = await userModel.findOne({ email });

  if (!user) {
    return res.status(400).json({
      message: "Invalid email or password",
    });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    return res.status(400).json({
      message: "Invalid email or password",
    });
  }

  const token = jwt.sign(
    { id: user._id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: "1d" },
  );

  res.clearCookie("token", legacyAuthCookieOptions);
  res.cookie("token", token, authCookieOptions);
  res.status(200).json({
    message: "User loggedIn successfully.",
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
    },
  });
}

async function logoutUserController(req, res) {
  const token = req.cookies.token;

  if (token) {
    await tokenBlacklistModel.create({ token });
  }

  res.clearCookie("token", legacyAuthCookieOptions);
  res.clearCookie("token", authCookieOptions);

  res.status(200).json({
    message: "User logged out successfully",
  });
}

async function getMeController(req, res) {
  const user = await userModel.findById(req.user.id);

  if (!user) {
    return res.status(401).json({
      message: "User session is no longer valid.",
    });
  }

  res.status(200).json({
    message: "User details fetched successfully",
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
    },
  });
}

module.exports = {
  registerUserController,
  loginUserController,
  logoutUserController,
  getMeController,
};
