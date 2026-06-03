import bcrypt from "bcryptjs";
import { AuthRepository } from "./auth.repository";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken
} from "../../lib/jwt";

export class AuthService {
  // Handles constructor logic.
  constructor(private readonly repo: AuthRepository) {}

  // Handles register logic.
  async register(email: string, name: string, password: string) {
    const exists = await this.repo.findByEmail(email);
    if (exists) throw new Error("Email already exists");

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.repo.createUser(email, name, passwordHash);
    const tokens = this.buildTokens(user.id, user.email);
    await this.repo.updateRefreshToken(user.id, tokens.refreshToken);
    return {
      user: { id: user.id, email: user.email, name: user.name },
      ...tokens
    };
  }

  // Handles login logic.
  async login(email: string, password: string) {
    const user = await this.repo.findByEmail(email);
    if (!user) throw new Error("Invalid credentials");

    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) throw new Error("Invalid credentials");

    const tokens = this.buildTokens(user.id, user.email);
    await this.repo.updateRefreshToken(user.id, tokens.refreshToken);
    return {
      user: { id: user.id, email: user.email, name: user.name },
      ...tokens
    };
  }

  // Handles refresh logic.
  async refresh(refreshToken: string) {
    const payload = verifyRefreshToken(refreshToken);
    const user = await this.repo.findById(payload.userId);
    if (!user || user.refreshToken !== refreshToken) throw new Error("Invalid refresh token");

    const tokens = this.buildTokens(user.id, user.email);
    await this.repo.updateRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  // Handles me logic.
  async me(userId: string) {
    const user = await this.repo.findById(userId);
    if (!user) throw new Error("User not found");
    return { id: user.id, email: user.email, name: user.name };
  }

  // Handles buildTokens logic.
  private buildTokens(userId: string, email: string) {
    const accessToken = signAccessToken({ userId, email });
    const refreshToken = signRefreshToken({ userId, email });
    return { accessToken, refreshToken };
  }
}
