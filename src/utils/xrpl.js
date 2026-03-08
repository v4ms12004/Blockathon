// ─── XRPL Utility Functions ─────────────────────────────────────
import * as xrpl from "xrpl";

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
export async function sendTokens(participantAddress, amount, checkpointId, eventId, participantSeed) {
  console.log("sendTokens called:", { participantAddress, amount, checkpointId, eventId });
  console.log("ORGANIZER_ADDRESS:", ORGANIZER_ADDRESS);
  console.log("ORGANIZER_SEED:", ORGANIZER_SEED ? "loaded" : "MISSING");
  console.log("TOKEN_CURRENCY:", TOKEN_CURRENCY);

  const client = await getClient();

  // Fund participant account if it doesn't exist
  try {
    await client.request({ command: "account_info", account: participantAddress });
  } catch {
    const fundWallet = xrpl.Wallet.fromSeed(ORGANIZER_SEED);
    const fundTx = await client.submitAndWait({
      TransactionType: "Payment",
      Account: fundWallet.address,
      Destination: participantAddress,
      Amount: "10000000", // 10 XRP in drops
    }, { wallet: fundWallet });
    console.log("Funded participant wallet:", fundTx.result.meta.TransactionResult);
  }

  // Setup trustline if participant seed provided
  if (participantSeed) {
    try {
      const participantWallet = xrpl.Wallet.fromSeed(participantSeed);
      const lines = await client.request({
        command: "account_lines",
        account: participantAddress,
        limit: 50
      });
      const hasTrustline = lines.result.lines.some(
        l => l.currency === TOKEN_CURRENCY && l.account === ORGANIZER_ADDRESS
      );
      if (!hasTrustline) {
        console.log("Setting up trustline...");
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
        const trustResult = await client.submitAndWait(signed.tx_blob);
        console.log("Trustline result:", trustResult.result.meta.TransactionResult);
      }
    } catch (err) {
      console.warn("Trustline setup failed:", err.message);
    }
  }

  try {
    const organizerWallet = walletFromSeed(ORGANIZER_SEED);
    const memoData = JSON.stringify({ checkpointId, eventId });
    const memoHex = Array.from(new TextEncoder().encode(memoData))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();

    const paymentTx = {
      TransactionType: "Payment",
      Account: ORGANIZER_ADDRESS,
      Destination: participantAddress,
      Amount: {
        currency: TOKEN_CURRENCY,
        issuer: ORGANIZER_ADDRESS,
        value: amount.toString(),
      },
      Memos: [{ Memo: { MemoData: memoHex } }],
    };
    const prepared = await client.autofill(paymentTx);
    const signed = organizerWallet.sign(prepared);
    const result = await client.submitAndWait(signed.tx_blob);
    console.log("XRPL submit result:", result.result.meta.TransactionResult);
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
    return txList.some((item) => {
      const tx = item.tx_json || item.tx || item;
      const memos = tx.Memos;
      if (!memos) return false;
      return memos.some((m) => {
        try {
          const hex = m.Memo.MemoData;
          const bytes = new Uint8Array(hex.match(/.{1,2}/g).map(b => parseInt(b, 16)));
          const decoded = JSON.parse(new TextDecoder().decode(bytes));
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
    const memoHex = Array.from(new TextEncoder().encode(memoData))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();

    const paymentTx = {
      TransactionType: "Payment",
      Account: participantWallet.address,
      Destination: ORGANIZER_ADDRESS,
      Amount: {
        currency: TOKEN_CURRENCY,
        issuer: ORGANIZER_ADDRESS,
        value: amount.toString(),
      },
      Memos: [{ Memo: { MemoData: memoHex } }],
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

// ─── Ledger Stats ─────────────────────────────────────────────
export async function getLedgerStats(eventId) {
  const client = await getClient();
  try {
    const response = await client.request({
      command: "account_tx",
      account: ORGANIZER_ADDRESS,
      limit: 200,
    });

    const transactions = response.result.transactions || [];

    console.log("Total XRPL txs fetched:", transactions.length);

    const tokenTxs = transactions.filter((item) => {
      const tx = item.tx_json || item.tx || item;
      const amount = tx.Amount || tx.DeliverMax;
      return (
        tx.TransactionType === "Payment" &&
        tx.Account === ORGANIZER_ADDRESS &&
        typeof amount === "object" &&
        amount?.currency === TOKEN_CURRENCY
      );
    });

    const eventTxs = tokenTxs.filter((item) => {
      const tx = item.tx_json || item.tx || item;
      if (!tx.Memos) return false;
      try {
        const memoHex = tx.Memos[0]?.Memo?.MemoData || "";
        const bytes = new Uint8Array(memoHex.match(/.{1,2}/g).map(b => parseInt(b, 16)));
        const memoStr = new TextDecoder().decode(bytes);
        const memo = JSON.parse(memoStr);
        return String(memo.eventId) === String(eventId);
      } catch {
        return false;
      }
    });

    console.log("tokenTxs count:", tokenTxs.length);
    console.log("eventTxs count:", eventTxs.length);
    tokenTxs.forEach((item, i) => {
      const tx = item.tx_json || item.tx || item;
      if (tx.Memos) {
        const hex = tx.Memos[0]?.Memo?.MemoData || "";
        try {
          const bytes = new Uint8Array(hex.match(/.{1,2}/g).map(b => parseInt(b, 16)));
          console.log(`tx ${i} memo:`, new TextDecoder().decode(bytes));
        } catch {
          console.log(`tx ${i} memo hex:`, hex);
        }
      }
    });
    console.log("Filtering for eventId:", eventId, typeof eventId);

    const uniqueParticipants = new Set(
      eventTxs.map((item) => (item.tx_json || item.tx || item).Destination)
    );

    const checkpointMap = {};
    eventTxs.forEach((item) => {
      const tx = item.tx_json || item.tx || item;
      try {
        const memoHex = tx.Memos[0]?.Memo?.MemoData || "";
        const bytes = new Uint8Array(memoHex.match(/.{1,2}/g).map(b => parseInt(b, 16)));
        const memoStr = new TextDecoder().decode(bytes);
        const memo = JSON.parse(memoStr);
        const cpId = memo.checkpointId || "unknown";
        if (!checkpointMap[cpId]) {
          checkpointMap[cpId] = { count: 0, tokens: 0 };
        }
        checkpointMap[cpId].count += 1;
        const amount = tx.Amount || tx.DeliverMax;
        checkpointMap[cpId].tokens += parseFloat(amount?.value || 0);
      } catch {}
    });

    let organizerBalance = "0";
    try {
      const accountLines = await client.request({
        command: "account_lines",
        account: ORGANIZER_ADDRESS,
        limit: 50,
      });
      const blkLine = accountLines.result.lines.find(
        l => l.currency === TOKEN_CURRENCY
      );
      organizerBalance = blkLine ? blkLine.balance : "0";
    } catch {}

    const totalTokens = eventTxs.reduce((sum, item) => {
      const tx = item.tx_json || item.tx || item;
      const amount = tx.Amount || tx.DeliverMax;
      return sum + parseFloat(amount?.value || 0);
    }, 0);

    return {
      success: true,
      stats: {
        totalTokensDistributed: totalTokens,
        uniqueParticipants: uniqueParticipants.size,
        totalTransactions: eventTxs.length,
        checkpointBreakdown: checkpointMap,
        organizerBalance,
      }
    };
  } catch (err) {
    console.error("getLedgerStats error:", err);
    return { success: false, error: err.message };
  } finally {
    await client.disconnect();
  }
}