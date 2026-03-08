require("dotenv").config();
const { ethers } = require("ethers");
const fs = require("fs");

const ABI = [
  "function endEvent(uint256 eventId) external",
  "function getEvent(uint256 eventId) external view returns (address, string, uint256, uint256, uint256, uint256, uint256, uint256, bool)",
  "event EventEnded(uint256 indexed eventId)",
];

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const RPC_URL          = process.env.SEPOLIA_RPC_URL;
const PRIVATE_KEY      = process.env.DEPLOYER_PRIVATE_KEY;

async function main() {
  // Read event ID from event-info.json
  let eventId;
  if (fs.existsSync("event-info.json")) {
    const eventInfo = JSON.parse(fs.readFileSync("event-info.json", "utf8"));
    eventId = eventInfo.eventId;
    console.log("📋 Found event-info.json — using Event ID:", eventId);
  } else {
    // Fallback to env
    eventId = process.env.VITE_ACTIVE_EVENT_ID;
    console.log("📋 Using Event ID from .env:", eventId);
  }

  if (!eventId) {
    throw new Error("No event ID found. Run create-event.cjs first.");
  }

  console.log("\n🛑 BlockBadge — End Event Script\n");
  console.log("================================================\n");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

  // ── Check event status first ─────────────────────────────────
  console.log("── Checking event status ───────────────────────────");
  const rawEvent = await provider.call({
    to: CONTRACT_ADDRESS,
    data: contract.interface.encodeFunctionData("getEvent", [eventId])
  });
  const eventData = contract.interface.decodeFunctionResult("getEvent", rawEvent);

  console.log("Event name:", eventData[1]);
  console.log("Is active:", eventData[8]);

  if (!eventData[8]) {
    console.log("\n⚠️  Event is already ended.");
    console.log("Participants can now claim badges at:");
    console.log(`${process.env.VITE_APP_URL || "http://localhost:5173"}/redeem/${eventId}`);
    return;
  }

  // ── End the event ────────────────────────────────────────────
  console.log("\n── Ending event on chain ───────────────────────────");
  const tx = await contract.endEvent(eventId);
  console.log("Waiting for confirmation...");
  const receipt = await tx.wait();
  console.log("✅ Event ended — TX:", receipt.hash);

  // ── Update event-info.json ───────────────────────────────────
  if (fs.existsSync("event-info.json")) {
    const eventInfo = JSON.parse(fs.readFileSync("event-info.json", "utf8"));
    eventInfo.endedAt = new Date().toISOString();
    eventInfo.endTxHash = receipt.hash;
    eventInfo.isActive = false;
    fs.writeFileSync("event-info.json", JSON.stringify(eventInfo, null, 2));
    console.log("✅ event-info.json updated");
  }

  console.log("\n── Summary ─────────────────────────────────────────");
  console.log("✅ Event ID:", eventId, "is now ended");
  console.log("✅ Participants can now claim their badges");
  console.log("\n🎯 Next steps:");
  console.log("   1. Display the redemption QR: qr-codes/redeem-badge.png");
  console.log("   2. Tell participants to scan it to claim their badge");
  console.log(`   3. Verify badges at: /verify/[txHash]`);
}

main().catch(console.error);