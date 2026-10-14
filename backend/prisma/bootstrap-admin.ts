import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import * as argon2 from "argon2";
import { PrismaClient } from "../src/generated/prisma/client";
import { AuditAction, UserRole } from "../src/generated/prisma/enums";

/**
 * Creates or promotes the first administrator.
 *
 * `ADMIN` is deliberately unreachable through the public registration API, so a
 * moderator account can only come from this out-of-band script. Run it once per
 * environment from a trusted shell with the credentials supplied as environment
 * variables, never as command-line arguments (which land in shell history).
 */
async function main() {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) throw new Error("DATABASE_URL is required");
  if (!email || !email.includes("@")) throw new Error("ADMIN_BOOTSTRAP_EMAIL must be a valid address");
  if (!password || password.length < 12) throw new Error("ADMIN_BOOTSTRAP_PASSWORD must be at least 12 characters");
  if (!/^(?=.*[A-Za-z])(?=.*\d).+$/.test(password)) throw new Error("ADMIN_BOOTSTRAP_PASSWORD must contain letters and numbers");

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    const passwordHash = await argon2.hash(password);
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } });
    const admin = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        passwordHash,
        firstName: process.env.ADMIN_BOOTSTRAP_FIRST_NAME?.trim() || "A7",
        lastName: process.env.ADMIN_BOOTSTRAP_LAST_NAME?.trim() || "Admin",
        role: UserRole.ADMIN,
        // Admin routes require a verified email, and there is no inbox to click through here.
        emailVerifiedAt: new Date(),
      },
      // Promoting an existing account rotates its password and invalidates its old tokens.
      update: { role: UserRole.ADMIN, passwordHash, emailVerifiedAt: new Date(), isActive: true, tokenVersion: { increment: 1 } },
      select: { id: true, email: true, role: true },
    });
    await prisma.refreshSession.updateMany({ where: { userId: admin.id, revokedAt: null }, data: { revokedAt: new Date() } });
    await prisma.auditLog.create({
      data: {
        action: existing ? AuditAction.USER_ROLE_CHANGED : AuditAction.USER_REGISTERED,
        actorId: admin.id,
        actorRole: UserRole.ADMIN,
        targetType: "User",
        targetId: admin.id,
        metadata: { via: "bootstrap-admin", previousRole: existing?.role ?? null },
      },
    });
    console.info(`${existing ? "Promoted" : "Created"} administrator ${admin.email}. Sign in and change this password immediately.`);
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
