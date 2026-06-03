import { prisma } from "../../db/prisma";

export class AuthRepository {
  // Handles createUser logic.
  createUser(email: string, name: string, passwordHash: string) {
    return prisma.user.create({
      data: { email, name, passwordHash }
    });
  }

  // Handles findByEmail logic.
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  }

  // Handles findById logic.
  findById(userId: string) {
    return prisma.user.findUnique({ where: { id: userId } });
  }

  // Handles updateRefreshToken logic.
  updateRefreshToken(userId: string, refreshToken: string | null) {
    return prisma.user.update({
      where: { id: userId },
      data: { refreshToken }
    });
  }
}
