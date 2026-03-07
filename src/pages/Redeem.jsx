import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getTokenBalance, redeemBadge } from "../utils/xrpl";
import { getWallet } from "../utils/wallet";
import { getBadgeTierForEvent, getEvent } from "../utils/eventStore";
import { fetchFromIPFS, getIPFSImageUrl } from "../utils/pinata";

export default function Redeem() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [step, setStep] = useState("loading");
  // loading | eligible | redeeming | success | ineligible | error
  const [balance, setBalance] = useState(0);
  const [tierInfo, setTierInfo] = useState(null);
  const [event, setEvent] = useState(null);
  const [txHash, setTxHash] = useState("");
  const [badgeData, setBadgeData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadEligibility() {
      const wallet = getWallet();
      if (!wallet) {
        setStep("error");
        setError("No wallet found. Please check in at an event first.");
        return;
      }

      const eventData = getEvent(eventId);
      if (!eventData) {
        setStep("error");
        setError("Event not found.");
        return;
      }
      setEvent(eventData);

      const bal = await getTokenBalance(wallet.address);
      setBalance(bal);

      const tier = getBadgeTierForEvent(eventId, bal);
      if (!tier) {
        setStep("ineligible");
        return;
      }

      setTierInfo(tier);
      setStep("eligible");
    }

    loadEligibility();
  }, [eventId]);

  async function handleRedeem() {
    const wallet = getWallet();
    if (!wallet || !tierInfo) return;

    setStep("redeeming");

    const result = await redeemBadge(
      wallet.seed,
      tierInfo.tokensRequired,
      tierInfo.tier,
      eventId
    );

    if (!result.success) {
      setStep("error");
      setError(result.error || "Redemption failed. Please try again.");
      return;
    }

    setTxHash(result.txHash);

    // Fetch badge metadata from IPFS
    if (tierInfo.cid) {
      const ipfsResult = await fetchFromIPFS(tierInfo.cid);
      if (ipfsResult.success) {
        setBadgeData(ipfsResult.data);
      }
    }

    setStep("success");
  }

  return (
    <div style={styles.container}>
      {step === "loading" && (
        <div style={styles.card}>
          <div style={styles.emoji}>⏳</div>
          <h2 style={styles.title}>Checking Eligibility...</h2>
          <p style={styles.sub}>Fetching your token balance from XRPL</p>
        </div>
      )}

      {step === "ineligible" && (
        <div style={{ ...styles.card, borderColor: "#f59e0b" }}>
          <div style={styles.emoji}>😔</div>
          <h2 style={{ ...styles.title, color: "#f59e0b" }}>
            Not Enough Tokens
          </h2>
          <p style={styles.sub}>
            You have {balance} BLKPT. You need at least{" "}
            {event?.thresholds?.bronze || 10} tokens to claim a Bronze badge.
          </p>
          <div style={styles.balance}>
            <span style={styles.balanceLabel}>Your Balance</span>
            <span style={{ ...styles.balanceValue, color: "#f59e0b" }}>
              {balance} BLKPT
            </span>
          </div>
        </div>
      )}

      {step === "eligible" && tierInfo && (
        <div style={styles.card}>
          <div style={styles.emoji}>
            {tierInfo.tier === "gold"
              ? "🥇"
              : tierInfo.tier === "silver"
              ? "🥈"
              : "🥉"}
          </div>
          <h2 style={styles.title}>You Earned {tierInfo.label}!</h2>
          <p style={styles.sub}>
            You have {balance} BLKPT tokens. Redeem{" "}
            {tierInfo.tokensRequired} to claim your badge.
          </p>
          <div style={styles.balance}>
            <span style={styles.balanceLabel}>Your Balance</span>
            <span style={{ ...styles.balanceValue, color: "#00e5ff" }}>
              {balance} BLKPT
            </span>
          </div>
          <button style={styles.redeemBtn} onClick={handleRedeem}>
            Claim {tierInfo.label} Badge
          </button>
        </div>
      )}

      {step === "redeeming" && (
        <div style={styles.card}>
          <div style={styles.emoji}>⛓️</div>
          <h2 style={styles.title}>Minting Your Badge...</h2>
          <p style={styles.sub}>
            Submitting transaction to XRPL. This takes a few seconds.
          </p>
        </div>
      )}

      {step === "success" && (
        <div style={{ ...styles.card, borderColor: "#4ade80" }}>
          <div style={styles.emoji}>🎖️</div>
          <h2 style={{ ...styles.title, color: "#4ade80" }}>
            Badge Claimed!
          </h2>

          {badgeData && (
            <div style={styles.badgePreview}>
              {tierInfo?.imageCid && (
                <img
                  src={getIPFSImageUrl(tierInfo.imageCid)}
                  alt="badge"
                  style={styles.badgeImage}
                />
              )}
              <p style={styles.badgeName}>{badgeData.name}</p>
              <p style={styles.badgeEvent}>{badgeData.eventName}</p>
            </div>
          )}

          <div style={styles.verifyBox}>
            <p style={styles.verifyLabel}>Share your verification link:</p>
            <p style={styles.verifyLink}>
              {window.location.origin}/verify/{txHash}
            </p>
            <button
              style={styles.copyBtn}
              onClick={() =>
                navigator.clipboard.writeText(
                  `${window.location.origin}/verify/${txHash}`
                )
              }
            >
              Copy Link
            </button>
          </div>

          <button
            style={styles.viewBtn}
            onClick={() => navigate(`/verify/${txHash}`)}
          >
            View Badge
          </button>
        </div>
      )}

      {step === "error" && (
        <div style={{ ...styles.card, borderColor: "#f87171" }}>
          <div style={styles.emoji}>❌</div>
          <h2 style={{ ...styles.title, color: "#f87171" }}>
            Something Went Wrong
          </h2>
          <p style={styles.sub}>{error}</p>
          <button
            style={styles.retryBtn}
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "#050810",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    fontFamily: "sans-serif",
  },
  card: {
    background: "#0d1117",
    border: "1px solid #1e2736",
    borderRadius: "20px",
    padding: "40px 32px",
    maxWidth: "380px",
    width: "100%",
    textAlign: "center",
  },
  emoji: { fontSize: "56px", marginBottom: "16px" },
  title: {
    color: "#e2e8f0",
    fontSize: "22px",
    fontWeight: "700",
    marginBottom: "8px",
  },
  sub: { color: "#64748b", fontSize: "14px", marginBottom: "20px" },
  balance: {
    background: "#161b27",
    borderRadius: "12px",
    padding: "16px",
    marginBottom: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  balanceLabel: {
    color: "#64748b",
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "1px",
  },
  balanceValue: {
    color: "#00e5ff",
    fontSize: "28px",
    fontWeight: "700",
  },
  redeemBtn: {
    background: "#00e5ff",
    color: "#050810",
    border: "none",
    borderRadius: "12px",
    padding: "14px 28px",
    fontSize: "15px",
    fontWeight: "700",
    cursor: "pointer",
    width: "100%",
  },
  badgePreview: {
    background: "#161b27",
    borderRadius: "12px",
    padding: "16px",
    marginBottom: "20px",
  },
  badgeImage: {
    width: "80px",
    height: "80px",
    borderRadius: "50%",
    objectFit: "cover",
    marginBottom: "8px",
  },
  badgeName: {
    color: "#e2e8f0",
    fontSize: "16px",
    fontWeight: "700",
    margin: "0 0 4px",
  },
  badgeEvent: { color: "#64748b", fontSize: "13px", margin: 0 },
  verifyBox: {
    background: "#161b27",
    borderRadius: "12px",
    padding: "16px",
    marginBottom: "16px",
  },
  verifyLabel: {
    color: "#64748b",
    fontSize: "12px",
    marginBottom: "6px",
  },
  verifyLink: {
    color: "#00e5ff",
    fontSize: "11px",
    fontFamily: "monospace",
    wordBreak: "break-all",
    marginBottom: "10px",
  },
  copyBtn: {
    background: "#1e2736",
    color: "#e2e8f0",
    border: "none",
    borderRadius: "8px",
    padding: "8px 16px",
    fontSize: "13px",
    cursor: "pointer",
  },
  viewBtn: {
    background: "#4ade80",
    color: "#050810",
    border: "none",
    borderRadius: "12px",
    padding: "14px 28px",
    fontSize: "15px",
    fontWeight: "700",
    cursor: "pointer",
    width: "100%",
  },
  retryBtn: {
    background: "#f87171",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "12px 24px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },
};