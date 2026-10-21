const jwt = require("jsonwebtoken");
const tokenBlacklistModel = require("../models/blacklist.model");
const { logRequestFailure } = require("../utils/requestDiagnostics");

async function authUser(req, res, next) {
  req.failureStage = "authentication";
  const token = req.cookies.token;

  if (!token) {
    logRequestFailure(req, {
      stage: "authentication",
      status: 401,
      code: "AUTHENTICATION_REQUIRED",
    });
    return res.status(401).json({
      message: "Token not provided.",
    });
  }

  const isTokenBlacklisted = await tokenBlacklistModel.findOne({
    token,
  });

  if (isTokenBlacklisted) {
    logRequestFailure(req, {
      stage: "authentication",
      status: 401,
      code: "SESSION_REVOKED",
    });
    return res.status(401).json({
      message: "token is invalid",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;

    next();
  } catch (err) {
    logRequestFailure(req, {
      stage: "authentication",
      status: 401,
      code: "INVALID_SESSION",
    });
    return res.status(401).json({
      message: "Invalid token.",
    });
  }
}

module.exports = { authUser };
