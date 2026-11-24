import jwt from "jsonwebtoken";

export const signAuthToken = (userId) =>
  jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

export const verifyAuthToken = (value) =>
  jwt.verify(value, process.env.JWT_SECRET);
