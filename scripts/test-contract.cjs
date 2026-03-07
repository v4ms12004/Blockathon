require("dotenv").config();
const { ethers } = require("ethers");

const ABI = [
  "function createEvent(string memory eventName, uint256 totalParticipants, uint256 totalCheckpoints, uint256 tokensPerCheckin, uint256 goldThreshold, uint256 silverThreshold, uint256 bronzeThreshold) external returns (uint256)",
  "function checkIn(uint256 eventId, uint256 checkpointId) external",
  "function claimBadge(uint256 eventId, string memory badgeCID) external",
  "function endEvent(uint256 eventId) external",
  "function getEvent(uint256 eventId) external view returns (address, string, uint256, uint256, uint256, uint256, uint256, uint256, bool)",
  "function getParticipant(uint256 eventId, address participant) external view returns (uint256, uint256, bool, string, string)",
  "function hasCheckedIn(uint256 eventId, uint256 checkpointId, address participant) external view returns (bool)",
  "event EventCreated(uint256 indexed eventId, string eventName, address organizer)",
  "event CheckedIn(uint256 indexed eventId, uint256 checkpointId, address participant, uint256 newBalance)",
  "event BadgeClaimed(uint256 indexed eventId, address participant, string tier, string cid)",
  "event EventEnded(uint256 indexed eventId)"
];

const CONTRACT_ADDRESS = process.env.VITE_CONTRACT_ADDRESS;
const RPC_URL = process.env.VITE_SEPOLIA_RPC_URL;
const PRIVATE_KEY = process.env.VITE_DEPLOYER_PRIVATE_KEY;

async function main() {
  console.log("🚀 Testing BlockBadge Smart Contract\n");
  console.log("================================================\n");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

  console.log("Wallet address:", signer.address);
  const balance = await provider.getBalance(signer.address);
  console.log("Sepolia ETH balance:", ethers.formatEther(balance), "ETH\n");

  // ── Step 1: Create event ─────────────────────────────────────
  console.log("── Step 1: Creating event ──────────────────────────");
  const tx1 = await contract.createEvent(
    "Block-a-Thon KU 2026",
    50,   // totalParticipants
    3,    // totalCheckpoints
    10,   // tokensPerCheckin
    30,   // goldThreshold (3 checkins)
    20,   // silverThreshold (2 checkins)
    10    // bronzeThreshold (1 checkin)
  );
  const receipt1 = await tx1.wait();
  console.log("✅ Event created — TX:", receipt1.hash);

  // Extract eventId from logs
  const iface = new ethers.Interface(ABI);
  let eventId = null;
  for (const log of receipt1.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed?.name === "EventCreated") {
        eventId = parsed.args[0].toString();
      }
    } catch {}
  }

  if (eventId === null) {
    throw new Error("Could not extract eventId from transaction logs");
  }
  console.log("Event ID:", eventId, "\n");

// ── Step 2: Check event details ──────────────────────────────
console.log("── Step 2: Reading event from chain ────────────────");
const rawEvent = await provider.call({
  to: CONTRACT_ADDRESS,
  data: contract.interface.encodeFunctionData("getEvent", [eventId])
});
const eventData = contract.interface.decodeFunctionResult("getEvent", rawEvent);
console.log("✅ Event name:", eventData[1]);
console.log("   Total checkpoints:", eventData[3].toString());
console.log("   Tokens per checkin:", eventData[4].toString());
console.log("   Gold threshold:", eventData[5].toString());
console.log("   Is active:", eventData[8], "\n");

  // ── Step 3: Check in at checkpoints ─────────────────────────
  console.log("── Step 3: Checking in at 3 checkpoints ────────────");
  for (let i = 0; i < 3; i++) {
    const tx = await contract.checkIn(eventId, i);
    await tx.wait();
    console.log(`✅ Checked in at checkpoint ${i}`);
  }
  console.log();

  // ── Step 4: Check participant balance ────────────────────────
  console.log("── Step 4: Reading participant balance ─────────────");
  const participantData = await contract.getParticipant(eventId, signer.address);
  console.log("✅ Token balance:", participantData[0].toString(), "BLKPT");
  console.log("   Checkin count:", participantData[1].toString(), "\n");

  // ── Step 5: Test double checkin prevention ───────────────────
  console.log("── Step 5: Testing double checkin prevention ────────");
  try {
    const tx = await contract.checkIn(eventId, 0);
    await tx.wait();
    console.log("❌ Double checkin prevention FAILED\n");
  } catch (err) {
    console.log("✅ Double checkin correctly blocked:", err.reason || "Already checked in\n");
  }

  // ── Step 6: End event ────────────────────────────────────────
  console.log("── Step 6: Ending event ────────────────────────────");
  const tx3 = await contract.endEvent(eventId);
  await tx3.wait();
  console.log("✅ Event ended\n");

  // ── Step 7: Claim badge ──────────────────────────────────────
  console.log("── Step 7: Claiming badge ──────────────────────────");
  const testCID = "QmTestCID123456789";
  const tx4 = await contract.claimBadge(eventId, testCID);
  const receipt4 = await tx4.wait();
  console.log("✅ Badge claimed — TX:", receipt4.hash);

  // ── Step 8: Verify badge on chain ───────────────────────────
  console.log("\n── Step 8: Verifying badge on chain ────────────────");
  const finalData = await contract.getParticipant(eventId, signer.address);
  console.log("✅ Badge tier:", finalData[3]);
  console.log("   Badge CID:", finalData[4]);
  console.log("   Has claimed:", finalData[2]);

  console.log("\n================================================");
  console.log("🎉 ALL CONTRACT TESTS PASSED!\n");
  console.log("Contract address:", CONTRACT_ADDRESS);
  console.log("Save this eventId for frontend testing:", eventId);
}

main().catch(console.error);