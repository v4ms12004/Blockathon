// ─── XRPL Utility Functions ─────────────────────────────────────
// THIS FILE CONTAINS ALL THE FUNCTIONS TO INTERACT WITH THE XRPL, SUCH AS CONNECTING TO THE NETWORK, GENERATING WALLETS, CHECKING BALANCES, SENDING PAYMENTS, AND CHECKING TRANSACTIONS.
import xrpl from "xrpl";

const NETWORK = import.meta.env.VITE_XRPL_NETWORK;
const TOKEN_CURRENCY = import.meta.env.VITE_TOKEN_CURRENCY;
const ORGANIZER_ADDRESS = import.meta.env.VITE_ORGANIZER_ADDRESS;
const ORGANIZER_SEED = import.meta.env.VITE_ORGANIZER_SEED;

// ─── Connect to XRPL ───────────────────────────────────────────
export async function getClient() {
  const client = new xrpl.Client(NETWORK);
  await client.connect();
  return client;
}

// ─── Generate a new wallet for participant ─────────────────────
export function generateWallet() {
  const wallet = xrpl.Wallet.generate();
  return {
    address: wallet.address,
    seed: wallet.seed,
  };
}

// ─── Load wallet from seed ─────────────────────────────────────
export function walletFromSeed(seed) {
  return xrpl.Wallet.fromSeed(seed);
}

// ─── Get token balance for a participant ──────────────────────
export async function getTokenBalance(participantAddress) {
  const client = await getClient();
  try {
    const response = await client.request({
      command: "account_lines",
      account: participantAddress,
      ledger_index: "validated",
    });
    const line = response.result.lines.find(
      (l) => l.currency === TOKEN_CURRENCY && l.account === ORGANIZER_ADDRESS
    );
    return line ? parseFloat(line.balance) : 0;
  } catch (err) {
    return 0;
  } finally {
    await client.disconnect();
  }
}

// ─── Set up trustline from participant to organizer ───────────
export async function setupTrustline(participantSeed) {
  const client = await getClient();
  try {
    const participantWallet = walletFromSeed(participantSeed);
    const trustTx = {
      TransactionType: "TrustSet",
      Account: participantWallet.address,
      LimitAmount: {
        currency: TOKEN_CURRENCY,
        issuer: ORGANIZER_ADDRESS,
        value: "10000",
      },
    };
    const prepared = await client.autofill(trustTx);
    const signed = participantWallet.sign(prepared);
    await client.submitAndWait(signed.tx_blob);
    return true;
  } catch (err) {
    console.error("Trustline error:", err);
    return false;
  } finally {
    await client.disconnect();
  }
}

// ─── Send tokens to participant (check-in) ────────────────────
export async function sendTokens(participantAddress, amount, checkpointId, eventId) {
  const client = await getClient();
  try {
    const organizerWallet = walletFromSeed(ORGANIZER_SEED);
    const memoData = JSON.stringify({ checkpointId, eventId });
    const memoHex = Buffer.from(memoData).toString("hex").toUpperCase();

    const paymentTx = {
      TransactionType: "Payment",
      Account: ORGANIZER_ADDRESS,
      Destination: participantAddress,
      Amount: {
        currency: TOKEN_CURRENCY,
        issuer: ORGANIZER_ADDRESS,
        value: amount.toString(),
      },
      Memos: [
        {
          Memo: {
            MemoData: memoHex,
          },
        },
      ],
    };
    const prepared = await client.autofill(paymentTx);
    const signed = organizerWallet.sign(prepared);
    const result = await client.submitAndWait(signed.tx_blob);
    return { success: true, txHash: result.result.hash };
  } catch (err) {
    console.error("Send tokens error:", err);
    return { success: false, error: err.message };
  } finally {
    await client.disconnect();
  }
}

// ─── Check if participant already checked in ──────────────────
export async function hasCheckedIn(participantAddress, checkpointId, eventId) {
  const client = await getClient();
  try {
    const response = await client.request({
      command: "account_tx",
      account: participantAddress,
      ledger_index_min: -1,
      ledger_index_max: -1,
      limit: 50,
    });
    const txList = response.result.transactions;
    return txList.some((tx) => {
      const memos = tx.tx?.Memos;
      if (!memos) return false;
      return memos.some((m) => {
        try {
          const decoded = JSON.parse(
            Buffer.from(m.Memo.MemoData, "hex").toString("utf8")
          );
          return decoded.checkpointId === checkpointId && decoded.eventId === eventId;
        } catch {
          return false;
        }
      });
    });
  } catch (err) {
    return false;
  } finally {
    await client.disconnect();
  }
}

// ─── Redeem badge (participant sends tokens back) ─────────────
export async function redeemBadge(participantSeed, amount, badgeTier, eventId) {
  const client = await getClient();
  try {
    const participantWallet = walletFromSeed(participantSeed);
    const memoData = JSON.stringify({ type: "BADGE_REDEEM", badgeTier, eventId });
    const memoHex = Buffer.from(memoData).toString("hex").toUpperCase();

    const paymentTx = {
      TransactionType: "Payment",
      Account: participantWallet.address,
      Destination: ORGANIZER_ADDRESS,
      Amount: {
        currency: TOKEN_CURRENCY,
        issuer: ORGANIZER_ADDRESS,
        value: amount.toString(),
      },
      Memos: [
        {
          Memo: {
            MemoData: memoHex,
          },
        },
      ],
    };
    const prepared = await client.autofill(paymentTx);
    const signed = participantWallet.sign(prepared);
    const result = await client.submitAndWait(signed.tx_blob);
    return { success: true, txHash: result.result.hash };
  } catch (err) {
    console.error("Redeem error:", err);
    return { success: false, error: err.message };
  } finally {
    await client.disconnect();
  }
}