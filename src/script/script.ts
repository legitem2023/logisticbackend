import { format } from 'date-fns'
import { PrismaClient } from '@prisma/client'


import bcrypt from 'bcrypt';

/**
 * Hashes a plain text password using bcrypt.
 * @param plainPassword - The password to encrypt
 * @param saltRounds - Optional, defaults to 10
 * @returns A bcrypt hash of the password
 */
export async function encryptPassword(plainPassword: string, saltRounds: number = 10): Promise<string> {
  if (!plainPassword) {
    throw new Error("Password is required for encryption.");
  }

  const hashed = await bcrypt.hash(plainPassword, saltRounds);
  return hashed;
}

export async function comparePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  if (!plainPassword || !hashedPassword) {
    throw new Error("Both plain and hashed passwords are required for comparison.");
  }

  return await bcrypt.compare(plainPassword, hashedPassword);
}




const prisma = new PrismaClient()


export async function generateTrackingNumber(): Promise<string> {
  // Get today's date at 00:00:00
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Use this for the tracking number string only
  const dateStr = format(today, 'yyyyMMdd');

  // Use `today` (Date object) directly in the database
  const trackingCounter = await prisma.trackingCounter.upsert({
    where: { date: today },
    update: { counter: { increment: 1 } },
    create: { date: today, counter: 1 }
  });

  const paddedCounter = trackingCounter.counter.toString().padStart(6, '0');

  return `TRK-${dateStr}-${paddedCounter}`;
}
