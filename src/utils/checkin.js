import { sendTokens, hasCheckedIn } from "./xrpl";
import { isCheckedInLocally, saveCheckinLocally, getOrCreateWallet } from "./wallet";

const TOKENS_PER_CHECKIN = 10;

// ─── Main check-in function ────────────────────────────────────
export async function processCheckIn(checkpointId, eventId) {
  // Step 1 — Get or create participant wallet
  const wallet = getOrCreateWallet();

  // Step 2 — Check localStorage first (fast)
  if (isCheckedInLocally(checkpointId)) {
    return {
      success: false,
      reason: "ALREADY_CHECKED_IN",
      message: "You have already checked in at this checkpoint!",
    };
  }

  // Step 3 — Check XRPL transaction history (tamper-proof)
  const alreadyOnChain = await hasCheckedIn(
    wallet.address,
    checkpointId,
    eventId
  );

  if (alreadyOnChain) {
    saveCheckinLocally(checkpointId);
    return {
      success: false,
      reason: "ALREADY_CHECKED_IN",
      message: "You have already checked in at this checkpoint!",
    };
  }

  // Step 4 — Send tokens (funding + trustline handled inside sendTokens)
  const result = await sendTokens(
    wallet.address,
    TOKENS_PER_CHECKIN,
    checkpointId,
    eventId,
    wallet.seed  // ← pass seed so sendTokens can setup trustline
  );

  if (!result.success) {
    return {
      success: false,
      reason: "TRANSFER_FAILED",
      message: "Token transfer failed. Please try again.",
    };
  }

  // Step 5 — Save check-in locally
  saveCheckinLocally(checkpointId);

  return {
    success: true,
    reason: "CHECKED_IN",
    message: `✅ Checked in! You earned ${TOKENS_PER_CHECKIN} BLKPT tokens.`,
    txHash: result.txHash,
    wallet: wallet.address,
    tokensEarned: TOKENS_PER_CHECKIN,
  };
}