import { ethers } from "ethers";

// ABI — only the functions we need
const ABI = [
  "function createEvent(string memory eventName, uint256 totalParticipants, uint256 totalCheckpoints, uint256 tokensPerCheckin, uint256 goldThreshold, uint256 silverThreshold, uint256 bronzeThreshold) external returns (uint256)",
  "function checkIn(uint256 eventId, uint256 checkpointId) external",
  "function claimBadge(uint256 eventId, string memory badgeCID) external",
  "function endEvent(uint256 eventId) external",
  "function getEvent(uint256 eventId) external view returns (address, string, uint256, uint256, uint256, uint256, uint256, uint256, bool)",
  "function getParticipant(uint256 eventId, address participant) external view returns (uint256, uint256, bool, string, string, uint256)",
  "function hasCheckedIn(uint256 eventId, uint256 checkpointId, address participant) external view returns (bool)",
  "function getParticipants(uint256 eventId) external view returns (address[])",
  "function getNFTTokenURI(uint256 tokenId) external view returns (string)",
  "function tokenURI(uint256 tokenId) external view returns (string)",
  "event EventCreated(uint256 indexed eventId, string eventName, address organizer)",
  "event CheckedIn(uint256 indexed eventId, uint256 checkpointId, address participant, uint256 newBalance)",
  "event BadgeClaimed(uint256 indexed eventId, address participant, string tier, string cid, uint256 tokenId)",
  "event EventEnded(uint256 indexed eventId)"
];

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;

// ── Get provider (read-only) ───────────────────────────────────
export function getProvider() {
  return new ethers.JsonRpcProvider(import.meta.env.VITE_SEPOLIA_RPC_URL);
}

// ── Get signer (for transactions) ─────────────────────────────
export async function getSigner() {
  if (!window.ethereum) {
    throw new Error("MetaMask not found. Please install MetaMask.");
  }
  const provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  return provider.getSigner();
}

// ── Get contract (read-only) ───────────────────────────────────
export function getContract() {
  const provider = getProvider();
  return new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
}

// ── Get contract (with signer for transactions) ────────────────
export async function getSignedContract() {
  const signer = await getSigner();
  return new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
}

// ── Create event on chain ──────────────────────────────────────
export async function createEventOnChain({
  eventName,
  totalParticipants,
  totalCheckpoints,
  tokensPerCheckin,
  goldThreshold,
  silverThreshold,
  bronzeThreshold,
}) {
  try {
    const contract = await getSignedContract();
    const tx = await contract.createEvent(
      eventName,
      totalParticipants,
      totalCheckpoints,
      tokensPerCheckin,
      goldThreshold,
      silverThreshold,
      bronzeThreshold
    );
    const receipt = await tx.wait();

    // Extract eventId from logs
    const event = receipt.logs
      .map(log => {
        try { return contract.interface.parseLog(log); } 
        catch { return null; }
      })
      .find(e => e?.name === "EventCreated");

    const eventId = event ? event.args[0].toString() : null;
    return { success: true, eventId, txHash: receipt.hash };
  } catch (err) {
    console.error("createEvent error:", err);
    return { success: false, error: err.message };
  }
}

// ── Check in at checkpoint ─────────────────────────────────────
export async function checkInOnChain(eventId, checkpointId) {
  try {
    const contract = await getSignedContract();
    const tx = await contract.checkIn(eventId, checkpointId);
    const receipt = await tx.wait();
    return { success: true, txHash: receipt.hash };
  } catch (err) {
    console.error("checkIn error:", err);
    return { 
      success: false, 
      error: err.message.includes("Already checked in") 
        ? "Already checked in at this checkpoint" 
        : err.message 
    };
  }
}

// ── Claim badge ────────────────────────────────────────────────
export async function claimBadgeOnChain(eventId, badgeCID) {
  try {
    const contract = await getSignedContract();
    const tx = await contract.claimBadge(eventId, badgeCID);
    const receipt = await tx.wait();
    return { success: true, txHash: receipt.hash };
  } catch (err) {
    console.error("claimBadge error:", err);
    return { success: false, error: err.message };
  }
}

// ── End event ──────────────────────────────────────────────────
export async function endEventOnChain(eventId) {
  try {
    const contract = await getSignedContract();
    const tx = await contract.endEvent(eventId);
    const receipt = await tx.wait();
    return { success: true, txHash: receipt.hash };
  } catch (err) {
    console.error("endEvent error:", err);
    return { success: false, error: err.message };
  }
}

// ── Get event details ──────────────────────────────────────────
export async function getEventDetails(eventId) {
  try {
    const contract = getContract();
    const result = await contract.getEvent(eventId);
    return {
      success: true,
      event: {
        organizer: result[0],
        eventName: result[1],
        totalParticipants: result[2].toString(),
        totalCheckpoints: result[3].toString(),
        tokensPerCheckin: result[4].toString(),
        goldThreshold: result[5].toString(),
        silverThreshold: result[6].toString(),
        bronzeThreshold: result[7].toString(),
        isActive: result[8],
      }
    };
  } catch (err) {
    console.error("getEvent error:", err);
    return { success: false, error: err.message };
  }
}

// ── Get participant details ────────────────────────────────────
export async function getParticipantDetails(eventId, address) {
  try {
    const contract = getContract();
    const result = await contract.getParticipant(eventId, address);
    return {
      success: true,
      participant: {
        tokenBalance: result[0].toString(),
        checkinCount: result[1].toString(),
        hasClaimedBadge: result[2],
        badgeTier: result[3],
        badgeCID: result[4],
        nftTokenId: result[5].toString(),
      }
    };
  } catch (err) {
    console.error("getParticipant error:", err);
    return { success: false, error: err.message };
  }
}

// ── Check if already checked in ───────────────────────────────
export async function hasCheckedInOnChain(eventId, checkpointId, address) {
  try {
    const contract = getContract();
    return await contract.hasCheckedIn(eventId, checkpointId, address);
  } catch (err) {
    console.error("hasCheckedIn error:", err);
    return false;
  }
}