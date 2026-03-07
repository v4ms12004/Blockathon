import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getTokenBalance, redeemBadge } from "../utils/xrpl";
import { getWallet } from "../utils/wallet";
import { getBadgeTierForEvent, getEvent } from "../utils/eventStore";
import { fetchFromIPFS, getIPFSImageUrl } from "../utils/pinata";
import "./Redeem.css";

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
    <div className="redeem-container">
      {step === "loading" && (
        <div className="redeem-card">
          <div className="redeem-emoji">⏳</div>
          <h2 className="redeem-title">Checking Eligibility...</h2>
          <p className="redeem-sub">Fetching your token balance from XRPL</p>
        </div>
      )}

      {step === "ineligible" && (
        <div className="redeem-card redeem-card--ineligible">
          <div className="redeem-emoji">😔</div>
          <h2 className="redeem-title redeem-title--ineligible">
            Not Enough Tokens
          </h2>
          <p className="redeem-sub">
            You have {balance} BLKPT. You need at least{" "}
            {event?.thresholds?.bronze || 10} tokens to claim a Bronze badge.
          </p>
          <div className="redeem-balance">
            <span className="redeem-balance-label">Your Balance</span>
            <span className="redeem-balance-value redeem-balance-value--ineligible">
              {balance} BLKPT
            </span>
          </div>
        </div>
      )}

      {step === "eligible" && tierInfo && (
        <div className="redeem-card">
          <div className="redeem-emoji">
            {tierInfo.tier === "gold"
              ? "🥇"
              : tierInfo.tier === "silver"
              ? "🥈"
              : "🥉"}
          </div>
          <h2 className="redeem-title">You Earned {tierInfo.label}!</h2>
          <p className="redeem-sub">
            You have {balance} BLKPT tokens. Redeem{" "}
            {tierInfo.tokensRequired} to claim your badge.
          </p>
          <div className="redeem-balance">
            <span className="redeem-balance-label">Your Balance</span>
            <span className="redeem-balance-value">
              {balance} BLKPT
            </span>
          </div>
          <button className="redeem-redeem-btn" onClick={handleRedeem}>
            Claim {tierInfo.label} Badge
          </button>
        </div>
      )}

      {step === "redeeming" && (
        <div className="redeem-card">
          <div className="redeem-emoji">⛓️</div>
          <h2 className="redeem-title">Minting Your Badge...</h2>
          <p className="redeem-sub">
            Submitting transaction to XRPL. This takes a few seconds.
          </p>
        </div>
      )}

      {step === "success" && (
        <div className="redeem-card redeem-card--success">
          <div className="redeem-emoji">🎖️</div>
          <h2 className="redeem-title redeem-title--success">
            Badge Claimed!
          </h2>

          {badgeData && (
            <div className="redeem-badge-preview">
              {tierInfo?.imageCid && (
                <img
                  src={getIPFSImageUrl(tierInfo.imageCid)}
                  alt="badge"
                  className="redeem-badge-image"
                />
              )}
              <p className="redeem-badge-name">{badgeData.name}</p>
              <p className="redeem-badge-event">{badgeData.eventName}</p>
            </div>
          )}

          <div className="redeem-verify-box">
            <p className="redeem-verify-label">Share your verification link:</p>
            <p className="redeem-verify-link">
              {window.location.origin}/verify/{txHash}
            </p>
            <button
              className="redeem-copy-btn"
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
            className="redeem-view-btn"
            onClick={() => navigate(`/verify/${txHash}`)}
          >
            View Badge
          </button>
        </div>
      )}

      {step === "error" && (
        <div className="redeem-card redeem-card--error">
          <div className="redeem-emoji">❌</div>
          <h2 className="redeem-title redeem-title--error">
            Something Went Wrong
          </h2>
          <p className="redeem-sub">{error}</p>
          <button
            className="redeem-retry-btn"
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}

