import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getParticipantDetails, getEventDetails, claimBadgeOnChain } from "../utils/contract";
import { pinBadgeMetadata } from "../utils/pinata";
import "./Redeem.css";

export default function Redeem() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [step, setStep] = useState("loading");
  const [balance, setBalance] = useState(0);
  const [tierInfo, setTierInfo] = useState(null);
  const [event, setEvent] = useState(null);
  const [txHash, setTxHash] = useState("");
  const [badgeCID, setBadgeCID] = useState("");
  const [error, setError] = useState("");
  const [userAddress, setUserAddress] = useState("");

  const tierColor = {
    gold: "#f59e0b",
    silver: "#94a3b8",
    bronze: "#b45309",
  };

  useEffect(() => {
    async function loadEligibility() {
      try {
        if (!window.ethereum) {
          setStep("error");
          setError("MetaMask not found. Please install MetaMask.");
          return;
        }

        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        const address = accounts[0];
        setUserAddress(address);

        const eventResult = await getEventDetails(eventId);
        if (!eventResult.success) {
          setStep("error");
          setError("Event not found on chain.");
          return;
        }

        const ev = eventResult.event;
        setEvent(ev);

        if (ev.isActive) {
          setStep("error");
          setError("Event is still active. Wait for the organizer to end the event.");
          return;
        }

        const pResult = await getParticipantDetails(eventId, address);
        if (!pResult.success) {
          setStep("error");
          setError("Could not fetch your participation data.");
          return;
        }

        const p = pResult.participant;

        if (p.hasClaimedBadge) {
          setStep("success");
          setTxHash("already-claimed");
          setBadgeCID(p.badgeCID);
          setTierInfo({ tier: p.badgeTier });
          return;
        }

        const bal = parseInt(p.tokenBalance);
        setBalance(bal);

        const gold = parseInt(ev.goldThreshold);
        const silver = parseInt(ev.silverThreshold);
        const bronze = parseInt(ev.bronzeThreshold);

        if (bal >= gold) {
          setTierInfo({ tier: "gold", label: "🥇 Gold", tokensRequired: gold });
        } else if (bal >= silver) {
          setTierInfo({ tier: "silver", label: "🥈 Silver", tokensRequired: silver });
        } else if (bal >= bronze) {
          setTierInfo({ tier: "bronze", label: "🥉 Bronze", tokensRequired: bronze });
        } else {
          setStep("ineligible");
          return;
        }

        setStep("eligible");
      } catch (err) {
        console.error(err);
        setStep("error");
        setError(err.message || "Something went wrong.");
      }
    }

    loadEligibility();
  }, [eventId]);

  async function handleRedeem() {
    if (!tierInfo) return;
    setStep("redeeming");

    try {
      const metadata = {
        name: `${tierInfo.tier.charAt(0).toUpperCase() + tierInfo.tier.slice(1)} Badge`,
        eventName: event?.eventName || "BlockBadge Event",
        tier: tierInfo.tier,
        date: new Date().toISOString(),
        description: "Awarded for outstanding participation",
        recipient: userAddress,
        eventId: eventId,
      };

      const pinResult = await pinBadgeMetadata(metadata);
      if (!pinResult.success) {
        setStep("error");
        setError("Failed to pin badge to IPFS. Please try again.");
        return;
      }

      const cid = pinResult.cid;
      setBadgeCID(cid);

      const claimResult = await claimBadgeOnChain(eventId, cid);
      if (!claimResult.success) {
        setStep("error");
        setError(claimResult.error || "Badge claim failed.");
        return;
      }

      setTxHash(claimResult.txHash);
      setStep("success");
    } catch (err) {
      console.error(err);
      setStep("error");
      setError(err.message || "Something went wrong.");
    }
  }

  return (
    <div className="redeem-container">
      {step === "loading" && (
        <div className="redeem-card">
          <div className="redeem-emoji">⏳</div>
          <h2 className="redeem-title">Checking Eligibility...</h2>
          <p className="redeem-sub">Reading your data from Sepolia</p>
        </div>
      )}

      {step === "ineligible" && (
        <div className="redeem-card warning">
          <div className="redeem-emoji">😔</div>
          <h2 className="redeem-title warning">Not Enough Tokens</h2>
          <p className="redeem-sub">
            You have {balance} BLKPT. You need at least{" "}
            {event?.bronzeThreshold || 10} tokens for a Bronze badge.
          </p>
          <div className="redeem-balance">
            <span className="redeem-balance-label">Your Balance</span>
            <span className="redeem-balance-value warning">{balance} BLKPT</span>
          </div>
        </div>
      )}

      {step === "eligible" && tierInfo && (
        <div className="redeem-card">
          <div className="redeem-emoji">
            {tierInfo.tier === "gold" ? "🥇" : tierInfo.tier === "silver" ? "🥈" : "🥉"}
          </div>
          <h2 className="redeem-title">You Earned {tierInfo.label}!</h2>
          <p className="redeem-sub">
            You have {balance} BLKPT tokens. Click below to claim your badge on chain.
          </p>
          <div className="redeem-balance">
            <span className="redeem-balance-label">Your Balance</span>
            <span className="redeem-balance-value">{balance} BLKPT</span>
          </div>
          <button className="redeem-btn" onClick={handleRedeem}>
            Claim {tierInfo.label} Badge
          </button>
        </div>
      )}

      {step === "redeeming" && (
        <div className="redeem-card">
          <div className="redeem-emoji">⛓️</div>
          <h2 className="redeem-title">Minting Your Badge...</h2>
          <p className="redeem-sub">
            Pinning to IPFS → recording on Sepolia. This takes a few seconds.
          </p>
        </div>
      )}

      {step === "success" && (
        <div className="redeem-card success">
          <div className="redeem-emoji">🎖️</div>
          <h2 className="redeem-title success">
            {txHash === "already-claimed" ? "Badge Already Claimed!" : "Badge Claimed!"}
          </h2>

          {tierInfo && (
            <div
              className="redeem-tier-badge"
              style={{
                background: `${tierColor[tierInfo.tier]}22`,
                color: tierColor[tierInfo.tier],
                borderColor: tierColor[tierInfo.tier],
              }}
            >
              {tierInfo.tier === "gold"
                ? "🥇 Gold Badge"
                : tierInfo.tier === "silver"
                ? "🥈 Silver Badge"
                : "🥉 Bronze Badge"}
            </div>
          )}

          {badgeCID && (
            <div className="redeem-cid-box">
              <p className="redeem-cid-label">IPFS CID</p>
              <p className="redeem-cid-value">
                {badgeCID.slice(0, 10)}...{badgeCID.slice(-8)}
              </p>
              <a
                href={`https://gateway.pinata.cloud/ipfs/${badgeCID}`}
                target="_blank"
                rel="noreferrer"
                className="redeem-ipfs-link"
              >
                View on IPFS ↗
              </a>
            </div>
          )}

          {txHash && txHash !== "already-claimed" && (
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
          )}

          <button
            className="redeem-view-btn"
            onClick={() => navigate(`/verify/${txHash}`)}
          >
            View Badge
          </button>
        </div>
      )}

      {step === "error" && (
        <div className="redeem-card error">
          <div className="redeem-emoji">❌</div>
          <h2 className="redeem-title error">Something Went Wrong</h2>
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