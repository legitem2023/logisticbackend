import { jwtDecrypt } from 'jose';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const secret = new TextEncoder().encode('QeTh7m3zP0sVrYkLmXw93BtN6uFhLpAz');

// Define the expected token payload structure
interface TokenPayload {
  userId: string;
  // Add other expected properties here if needed
  [key: string]: unknown;
}

const verifyToken = async (token: string | undefined) => {
  try {
    if (!token) return { valid: false };

    // Check if token is blacklisted
    const blacklisted = await prisma.blacklistedToken.findUnique({
      where: { token }
    });

    if (blacklisted) return { valid: false };

    // Decrypt and verify token
    const { payload } = await jwtDecrypt(token, secret);
    
    // Type assertion to ensure payload has the expected structure
    const tokenPayload = payload as TokenPayload;
    
    // Check if user still exists
    const user = await prisma.user.findUnique({
      where: { id: tokenPayload.userId }
    });

    if (!user) return { valid: false };

    return { valid: true, payload: tokenPayload };
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

export { verifyToken, cleanupExpiredTokens };
export type { TokenPayload };
