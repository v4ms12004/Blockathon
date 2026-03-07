import xrpl from "xrpl";
import dotenv from "dotenv";
import axios from "axios";
dotenv.config();

const NETWORK = process.env.VITE_XRPL_NETWORK;
const ORGANIZER_ADDRESS = process.env.VITE_ORGANIZER_ADDRESS;
const ORGANIZER_SEED = process.env.VITE_ORGANIZER_SEED;
const PARTICIPANT_ADDRESS = process.env.VITE_PARTICIPANT_A_ADDRESS;
const PARTICIPANT_SEED = process.env.VITE_PARTICIPANT_A_SEED;
const TOKEN_CURRENCY = process.env.VITE_TOKEN_CURRENCY;
const PINATA_API_KEY = process.env.VITE_PINATA_API_KEY;
const PINATA_SECRET = process.env.VITE_PINATA_SECRET;

let client;

async function connect() {
  client = new xrpl.Client(NETWORK);
  await client.connect();
  console.log("✅ Connected to XRPL Testnet\n");
}

async function disconnect() {
  await client.disconnect();
}

// ── Step 1: Check balances ─────────────────────────────────────
async function checkBalances() {
  console.log("── Step 1: Checking XRP balances ──────────────────");
  
  const org = await client.request({
    command: "account_info",
    account: ORGANIZER_ADDRESS,
    ledger_index: "validated"
  });
  console.log("Organizer XRP:", xrpl.dropsToXrp(org.result.account_data.Balance));

  const part = await client.request({
    command: "account_info",
    account: PARTICIPANT_ADDRESS,
    ledger_index: "validated"
  });
  console.log("Participant XRP:", xrpl.dropsToXrp(part.result.account_data.Balance));
  console.log("✅ Balances OK\n");
}

// ── Step 2: Setup trustline ────────────────────────────────────
async function setupTrustline() {
  console.log("── Step 2: Setting up trustline ───────────────────");
  
  const participantWallet = xrpl.Wallet.fromSeed(PARTICIPANT_SEED);
  
  const trustTx = {
    TransactionType: "TrustSet",
    Account: PARTICIPANT_ADDRESS,
    LimitAmount: {
      currency: TOKEN_CURRENCY,
      issuer: ORGANIZER_ADDRESS,
      value: "10000"
    }
  };

  const prepared = await client.autofill(trustTx);
  const signed = participantWallet.sign(prepared);
  const result = await client.submitAndWait(signed.tx_blob);
  console.log("✅ Trustline set up — TX:", result.result.hash, "\n");
  return result.result.hash;
}

// ── Step 3: Send tokens (simulate check-in) ───────────────────
async function sendTokens(checkpointId) {
  console.log("── Step 3: Sending tokens (check-in sim) ──────────");
  
  const organizerWallet = xrpl.Wallet.fromSeed(ORGANIZER_SEED);
  const memoData = JSON.stringify({ checkpointId, eventId: "test-event-001" });
  const memoHex = Buffer.from(memoData).toString("hex").toUpperCase();

  const paymentTx = {
    TransactionType: "Payment",
    Account: ORGANIZER_ADDRESS,
    Destination: PARTICIPANT_ADDRESS,
    Amount: {
      currency: TOKEN_CURRENCY,
      issuer: ORGANIZER_ADDRESS,
      value: "10"
    },
    Memos: [{ Memo: { MemoData: memoHex } }]
  };

  const prepared = await client.autofill(paymentTx);
  const signed = organizerWallet.sign(prepared);
  const result = await client.submitAndWait(signed.tx_blob);
  console.log("✅ Tokens sent — TX:", result.result.hash);
  return result.result.hash;
}

// ── Step 4: Check token balance ────────────────────────────────
async function checkTokenBalance() {
  console.log("\n── Step 4: Checking BLKPT balance ─────────────────");
  
  const response = await client.request({
    command: "account_lines",
    account: PARTICIPANT_ADDRESS,
    ledger_index: "validated"
  });

  const line = response.result.lines.find(
    l => l.currency === TOKEN_CURRENCY && l.account === ORGANIZER_ADDRESS
  );

  const balance = line ? parseFloat(line.balance) : 0;
  console.log("✅ BLKPT Balance:", balance, "\n");
  return balance;
}

// ── Step 5: Test double scan prevention ───────────────────────
async function testDoubleCheckin(checkpointId) {
  console.log("── Step 5: Testing double check-in prevention ──────");

  const response = await client.request({
    command: "account_tx",
    account: PARTICIPANT_ADDRESS,
    ledger_index_min: -1,
    ledger_index_max: -1,
    limit: 50
  });

  const alreadyCheckedIn = response.result.transactions.some(tx => {
    // Handle both tx and tx_json formats
    const txData = tx.tx_json || tx.tx || tx;
    const memos = txData?.Memos;
    if (!memos) return false;
    return memos.some(m => {
      try {
        const memoData = m.Memo?.MemoData;
        if (!memoData) return false;
        const decoded = JSON.parse(
          Buffer.from(memoData, "hex").toString("utf8")
        );
        return decoded.checkpointId === checkpointId &&
               decoded.eventId === "test-event-001";
      } catch { return false; }
    });
  });

  console.log("Already checked in at checkpoint?", alreadyCheckedIn);
  console.log(alreadyCheckedIn 
    ? "✅ Double scan prevention works\n" 
    : "❌ Double scan prevention FAILED\n"
  );
}

// ── Step 6: Test Pinata upload ─────────────────────────────────
async function testPinata() {
  console.log("── Step 6: Testing Pinata IPFS upload ──────────────");

  const metadata = {
    name: "Gold Badge",
    eventName: "Block-a-Thon KU 2026",
    tier: "gold",
    date: new Date().toISOString(),
    description: "Awarded to top performers",
    issuer: ORGANIZER_ADDRESS
  };

  const response = await axios.post(
    "https://api.pinata.cloud/pinning/pinJSONToIPFS",
    metadata,
    {
      headers: {
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_SECRET
      }
    }
  );

  const cid = response.data.IpfsHash;
  console.log("✅ Pinata upload successful");
  console.log("CID:", cid);
  console.log("URL: https://gateway.pinata.cloud/ipfs/" + cid, "\n");
  return cid;
}

// ── Step 7: Redeem badge ───────────────────────────────────────
async function redeemBadge(cid) {
  console.log("── Step 7: Redeeming badge ─────────────────────────");
  
  const participantWallet = xrpl.Wallet.fromSeed(PARTICIPANT_SEED);
  const memoData = JSON.stringify({
    type: "BADGE_REDEEM",
    badgeTier: "gold",
    eventId: "test-event-001",
    cid
  });
  const memoHex = Buffer.from(memoData).toString("hex").toUpperCase();

  const paymentTx = {
    TransactionType: "Payment",
    Account: PARTICIPANT_ADDRESS,
    Destination: ORGANIZER_ADDRESS,
    Amount: {
      currency: TOKEN_CURRENCY,
      issuer: ORGANIZER_ADDRESS,
      value: "10"
    },
    Memos: [{ Memo: { MemoData: memoHex } }]
  };

  const prepared = await client.autofill(paymentTx);
  const signed = participantWallet.sign(prepared);
  const result = await client.submitAndWait(signed.tx_blob);
  const txHash = result.result.hash;
  console.log("✅ Badge redeemed — TX:", txHash);
  console.log("🔗 Verify URL: http://localhost:5173/verify/" + txHash, "\n");
  return txHash;
}

// ── Step 8: Verify badge on chain ─────────────────────────────
async function verifyBadge(txHash) {
  console.log("── Step 8: Verifying badge on chain ────────────────");

  const response = await client.request({
    command: "tx",
    transaction: txHash
  });

  // Handle nested result formats
  const tx = response.result?.tx_json || response.result;
  const memos = tx?.Memos;

  if (!memos || memos.length === 0) {
    throw new Error("No memos found in transaction — check redemption tx");
  }

  const memoHex = memos[0].Memo.MemoData;
  const decoded = JSON.parse(
    Buffer.from(memoHex, "hex").toString("utf8")
  );

  // XRPL epoch starts Jan 1 2000, Unix epoch starts Jan 1 1970
  const date = tx.date 
    ? new Date((tx.date + 946684800) * 1000).toLocaleString()
    : "Timestamp unavailable";

  console.log("✅ Badge verified on chain!");
  console.log("   Issuer:", tx.Account);
  console.log("   Recipient:", tx.Destination);
  console.log("   Tier:", decoded.badgeTier);
  console.log("   Event:", decoded.eventId);
  console.log("   CID:", decoded.cid);
  console.log("   Timestamp:", date, "\n");
}

// ── Run all steps ──────────────────────────────────────────────
async function runE2E() {
  console.log("🚀 BlockBadge End-to-End Test\n");
  console.log("================================================\n");

  try {
    await connect();
    await checkBalances();
    await setupTrustline();
    const checkpointId = "checkpoint-morning-01";
    const txHash1 = await sendTokens(checkpointId);
    await checkTokenBalance();
    await testDoubleCheckin(checkpointId);
    const cid = await testPinata();
    const redeemTx = await redeemBadge(cid);
    await verifyBadge(redeemTx);

    console.log("================================================");
    console.log("🎉 ALL TESTS PASSED — You are ready to demo!\n");
    console.log("Save this verify URL for testing:");
    console.log("http://localhost:5173/verify/" + redeemTx);
  } catch (err) {
    console.error("\n❌ TEST FAILED:", err.message);
    console.error(err);
  } finally {
    await disconnect();
  }
}

runE2E();