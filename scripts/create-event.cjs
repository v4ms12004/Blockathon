require("dotenv").config();
const { ethers } = require("ethers");
const QRCode = require("qrcode");
const fs = require("fs");
const path = require("path");

const ABI = [
  "function createEvent(string memory eventName, uint256 totalParticipants, uint256 totalCheckpoints, uint256 tokensPerCheckin, uint256 goldThreshold, uint256 silverThreshold, uint256 bronzeThreshold) external returns (uint256)",
  "event EventCreated(uint256 indexed eventId, string eventName, address organizer)",
  "event CheckpointCreated(uint256 indexed eventId, uint256 checkpointId)",
];

const CONTRACT_ADDRESS = process.env.VITE_CONTRACT_ADDRESS;
const RPC_URL = process.env.VITE_SEPOLIA_RPC_URL;
const PRIVATE_KEY = process.env.VITE_DEPLOYER_PRIVATE_KEY;
const APP_URL = process.env.VITE_APP_URL || "http://localhost:5173";

// ── Event configuration — edit these before demo day ──────────
const EVENT_CONFIG = {
  eventName: "Block-a-Thon KU 2026",
  totalParticipants: 50,
  totalCheckpoints: 3,
  tokensPerCheckin: 10,
  goldThreshold: 30,    // all 3 checkpoints
  silverThreshold: 20,  // 2 checkpoints
  bronzeThreshold: 10,  // 1 checkpoint
};

async function main() {
  console.log("🚀 BlockBadge — Create Event Script\n");
  console.log("================================================\n");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
  const iface = new ethers.Interface(ABI);

  console.log("Organizer wallet:", signer.address);
  const balance = await provider.getBalance(signer.address);
  console.log("Sepolia ETH balance:", ethers.formatEther(balance), "ETH\n");

  // ── Step 1: Create event on chain ───────────────────────────
  console.log("── Creating event on chain ─────────────────────────");
  console.log("Event name:", EVENT_CONFIG.eventName);
  console.log("Checkpoints:", EVENT_CONFIG.totalCheckpoints);
  console.log("Tokens per checkin:", EVENT_CONFIG.tokensPerCheckin);
  console.log("Gold threshold:", EVENT_CONFIG.goldThreshold, "tokens");
  console.log("Silver threshold:", EVENT_CONFIG.silverThreshold, "tokens");
  console.log("Bronze threshold:", EVENT_CONFIG.bronzeThreshold, "tokens\n");

  const tx = await contract.createEvent(
    EVENT_CONFIG.eventName,
    EVENT_CONFIG.totalParticipants,
    EVENT_CONFIG.totalCheckpoints,
    EVENT_CONFIG.tokensPerCheckin,
    EVENT_CONFIG.goldThreshold,
    EVENT_CONFIG.silverThreshold,
    EVENT_CONFIG.bronzeThreshold
  );

  console.log("Waiting for confirmation...");
  const receipt = await tx.wait();
  console.log("✅ TX confirmed:", receipt.hash, "\n");

  // ── Step 2: Extract event ID ─────────────────────────────────
  let eventId = null;
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed?.name === "EventCreated") {
        eventId = parsed.args[0].toString();
      }
    } catch {}
  }

  if (!eventId) throw new Error("Could not extract event ID from logs");
  console.log("🎉 Event created! Event ID:", eventId, "\n");

  // ── Step 3: Generate QR codes ────────────────────────────────
  console.log("── Generating QR codes ─────────────────────────────");

  const qrDir = path.join("qr-codes");
  if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir);

  const checkpointUrls = [];

  for (let i = 0; i < EVENT_CONFIG.totalCheckpoints; i++) {
    const url = `${APP_URL}/checkin/${eventId}/${i}`;
    checkpointUrls.push(url);

    const filename = path.join(qrDir, `checkpoint-${i}.png`);
    await QRCode.toFile(filename, url, {
      width: 400,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    });

    console.log(`✅ Checkpoint ${i} QR saved → ${filename}`);
    console.log(`   URL: ${url}`);
  }

  // ── Step 4: Generate participant redemption QR ───────────────
  console.log("\n── Generating redemption QR ────────────────────────");
  const redeemUrl = `${APP_URL}/redeem/${eventId}`;
  const redeemFile = path.join(qrDir, "redeem-badge.png");
  await QRCode.toFile(redeemFile, redeemUrl, {
    width: 400,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });
  console.log(`✅ Redemption QR saved → ${redeemFile}`);
  console.log(`   URL: ${redeemUrl}`);

  // ── Step 5: Save event info to file ─────────────────────────
  const eventInfo = {
    eventId,
    eventName: EVENT_CONFIG.eventName,
    contractAddress: CONTRACT_ADDRESS,
    txHash: receipt.hash,
    checkpoints: checkpointUrls.map((url, i) => ({
      checkpointId: i,
      url,
      qrFile: `qr-codes/checkpoint-${i}.png`,
    })),
    redeemUrl,
    redeemQrFile: "qr-codes/redeem-badge.png",
    thresholds: {
      gold: EVENT_CONFIG.goldThreshold,
      silver: EVENT_CONFIG.silverThreshold,
      bronze: EVENT_CONFIG.bronzeThreshold,
    },
    createdAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    "event-info.json",
    JSON.stringify(eventInfo, null, 2)
  );

  console.log("\n── Summary ─────────────────────────────────────────");
  console.log("✅ Event ID:", eventId);
  console.log("✅ Contract:", CONTRACT_ADDRESS);
  console.log("✅ QR codes saved to: qr-codes/");
  console.log("✅ Event info saved to: event-info.json");
  console.log("\n📋 Add this to your .env for frontend testing:");
  console.log("VITE_ACTIVE_EVENT_ID=" + eventId);
  console.log("\n🎯 Demo day checklist:");
  console.log("   1. Print or display QR codes from qr-codes/ folder");
  console.log("   2. Share redeemUrl with participants after event ends");
  console.log("   3. Run end-event.cjs when event is over");
  console.log("   4. Participants visit /redeem/" + eventId + " to claim badges");
}

main().catch(console.error);