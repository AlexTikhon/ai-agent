import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env";

type JwtPayload = {
  userId: string;
  email: string;
};

const accessTokenOptions: SignOptions = {
  expiresIn: env.ACCESS_TOKEN_TTL as SignOptions["expiresIn"]
};

const refreshTokenOptions: SignOptions = {
  expiresIn: env.REFRESH_TOKEN_TTL as SignOptions["expiresIn"]
};

// Handles signAccessToken logic.
export const signAccessToken = (payload: JwtPayload): string =>
  jwt.sign(payload, env.JWT_ACCESS_SECRET, accessTokenOptions);

// Handles signRefreshToken logic.
export const signRefreshToken = (payload: JwtPayload): string =>
  jwt.sign(payload, env.JWT_REFRESH_SECRET, refreshTokenOptions);

// Handles verifyAccessToken logic.
export const verifyAccessToken = (token: string): JwtPayload =>
  jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;

// Handles verifyRefreshToken logic.
export const verifyRefreshToken = (token: string): JwtPayload =>
  jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
