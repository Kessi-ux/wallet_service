// scripts/test-db.ts
import { PrismaClient, TransactionStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const aliceWallet = await prisma.wallet.findUnique({ where: { walletNumber: "WAL-0000001" } });
  const bobWallet = await prisma.wallet.findUnique({ where: { walletNumber: "WAL-0000002" } });

  if (!aliceWallet || !bobWallet) {
    throw new Error("Seed wallets not found; run prisma seed first.");
  }

  // 1) Simulate webhook processing (idempotent)
  const ref = "PSK_REF_123456"; // pretend paystack reference
  const amount = BigInt(5000); // 50.00 Naira if smallest unit kobo

  // try to create transaction; if unique constraint fails, treat as duplicate webhook
  try {
    await prisma.$transaction(async (tx) => {
      // create transaction record (PENDING -> SUCCESS)
      await tx.transaction.create({
        data: {
          reference: ref,
          type: "DEPOSIT",
          amount,
          status: TransactionStatus.SUCCESS,
          toWalletId: aliceWallet.id,
        },
      });

      // credit wallet balance
      await tx.wallet.update({
        where: { id: aliceWallet.id },
        data: {
          balance: { increment: amount },
        },
      });

      console.log("Webhook processed and wallet credited.");
    });
  } catch (e: any) {
    // if constraint failed because reference exists -> idempotent no-op
    if (e.code === "P2002") {
      console.log("Transaction with this reference already exists — idempotent skip.");
    } else {
      console.error("Error processing deposit:", e);
      throw e;
    }
  }

  // 2) Simulate a transfer of 3,000 units from Alice -> Bob atomically
  const transferAmount = BigInt(3000);
  if (aliceWallet.balance < transferAmount) {
    console.log("Insufficient balance for transfer test. Current:", aliceWallet.balance.toString());
  } else {
    await prisma.$transaction(async (tx) => {
      // debit Alice
      await tx.wallet.update({
        where: { id: aliceWallet.id },
        data: { balance: { decrement: transferAmount } },
      });

      // credit Bob
      await tx.wallet.update({
        where: { id: bobWallet.id },
        data: { balance: { increment: transferAmount } },
      });

      // create transaction record
      await tx.transaction.create({
        data: {
          reference: `TX-${Date.now()}`,
          type: "TRANSFER",
          amount: transferAmount,
          status: TransactionStatus.SUCCESS,
          fromWalletId: aliceWallet.id,
          toWalletId: bobWallet.id,
        },
      });
    });

    console.log("Transfer complete.");
  }

  // show balances
  const updatedAlice = await prisma.wallet.findUnique({ where: { id: aliceWallet.id } });
  const updatedBob = await prisma.wallet.findUnique({ where: { id: bobWallet.id } });
  console.log("Alice balance:", updatedAlice?.balance.toString());
  console.log("Bob balance:", updatedBob?.balance.toString());
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
