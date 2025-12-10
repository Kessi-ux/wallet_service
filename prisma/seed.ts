// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding DB...");

  // create user
  const user = await prisma.user.upsert({
    where: { email: "alice@example.com" },
    update: {},
    create: {
      email: "alice@example.com",
      name: "Alice Example",
      googleId: "google-uid-alice",
    },
  });

  // create wallet for user
  const wallet = await prisma.wallet.upsert({
    where: { walletNumber: "WAL-0000001" },
    update: {},
    create: {
      userId: user.id,
      walletNumber: "WAL-0000001",
      balance: BigInt(0),
      currency: 'NGN',
    },
  });

  // create a second user & wallet for transfers
  const bob = await prisma.user.upsert({
    where: { email: "bob@example.com" },
    update: {},
    create: {
      email: "bob@example.com",
      name: "Bob Receiver",
      googleId: "google-uid-bob",
    },
  });
  const bobWallet = await prisma.wallet.upsert({
    where: { walletNumber: "WAL-0000002" },
    update: {},
    create: {
      userId: bob.id,
      walletNumber: "WAL-0000002",
      balance: BigInt(0),
      currency: 'NGN',
    },
  });

  // create an API key (we store hash only)
  const rawKey = "sk_test_" + randomBytes(16).toString("hex");
  const keyHash = await bcrypt.hash(rawKey, 10);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 1 day

  await prisma.apiKey.create({
    data: {
      userId: user.id,
      name: "seed-key",
      keyHash,
      permissions: ["deposit", "transfer", "read"],
      expiresAt,
    },
  });

  console.log("Seed complete. Raw API key for testing:", rawKey);
  console.log("User/Alice wallet:", wallet.walletNumber);
  console.log("Bob wallet:", bobWallet.walletNumber);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
