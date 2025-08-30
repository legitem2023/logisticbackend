import { jwtDecrypt } from 'jose';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const secret = new TextEncoder().encode('QeTh7m3zP0sVrYkLmXw93BtN6uFhLpAz');

const verifyToken = async (token) => {
  try {
    if (!token) return { valid: false };

    // Check if token is blacklisted
    const blacklisted = await prisma.blacklistedToken.findUnique({
      where: { token }
    });

    if (blacklisted) return { valid: false };

    // Decrypt and verify token
    const { payload } = await jwtDecrypt(token, secret);
    
    // Check if user still exists
    const user = await prisma.user.findUnique({
      where: { id: payload.userId }
    });

    if (!user) return { valid: false };

    return { valid: true, payload };
  } catch (error) {
    return { valid: false };
  }
};

const cleanupExpiredTokens = async () => {
  try {
    const result = await prisma.blacklistedToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    });
    
    console.log(`Cleaned up ${result.count} expired tokens`);
    return result.count;
  } catch (error) {
    console.error('Token cleanup error:', error);
    return 0;
  }
};

module.exports = { verifyToken, cleanupExpiredTokens };
