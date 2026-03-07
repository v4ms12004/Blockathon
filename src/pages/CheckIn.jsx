import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { checkInOnChain, getParticipantDetails } from "../utils/contract";
import { sendTokens } from "../utils/xrpl";
import { getOrCreateWallet } from "../utils/wallet";
import "./CheckIn.css";

export default function CheckIn() {
  const { eventId, checkpointId } = useParams();
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const [txHash, setTxHash] = useState("");
  const [balance, setBalance] = useState(null);
  const [walletAddress, setWalletAddress] = useState("");

  useEffect(() => {
    async function handleCheckIn() {
      try {
        setStatus("metamask");
        if (!window.ethereum) {
          setStatus("error");
          setMessage("MetaMask not found. Please install MetaMask to check in.");
          return;
        }

        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        const userAddress = accounts[0];
        setWalletAddress(userAddress);

        setStatus("processing");
        const result = await checkInOnChain(eventId, checkpointId);

        if (!result.success) {
          if (result.error?.includes("Already checked in")) {
            setStatus("already");
            setMessage("You have already checked in at this checkpoint!");
          } else {
            setStatus("error");
            setMessage(result.error || "Check-in failed. Please try again.");
          }
          const p = await getParticipantDetails(eventId, userAddress);
          if (p.success) setBalance(p.participant.tokenBalance);
          return;
        }

        setTxHash(result.txHash);

        const wallet = getOrCreateWallet();
        await sendTokens(wallet.address, 10, `checkpoint-${checkpointId}`, eventId);

        const p = await getParticipantDetails(eventId, userAddress);
        if (p.success) setBalance(p.participant.tokenBalance);

        setStatus("success");
        setMessage("✅ Checked in! You earned 10 BLKPT tokens.");
      } catch (err) {
        console.error(err);
        setStatus("error");
        setMessage(err.message || "Something went wrong.");
      }
    }

    handleCheckIn();
  }, [eventId, checkpointId]);

  return (
    <div className="checkin-container">
      {status === "metamask" && (
        <div className="checkin-card">
          <div className="checkin-emoji">🦊</div>
          <h2 className="checkin-title">Connecting MetaMask...</h2>
          <p className="checkin-sub">Please approve the connection in MetaMask</p>
        </div>
      )}

      {status === "loading" && (
        <div className="checkin-card">
          <div className="checkin-emoji">⏳</div>
          <h2 className="checkin-title">Processing Check-in...</h2>
          <p className="checkin-sub">Connecting to blockchain</p>
        </div>
      )}

      {status === "processing" && (
        <div className="checkin-card">
          <div className="checkin-emoji">⛓️</div>
          <h2 className="checkin-title">Recording on Chain...</h2>
          <p className="checkin-sub">Submitting to Sepolia + XRPL. This takes a few seconds.</p>
        </div>
      )}

      {status === "success" && (
        <div className="checkin-card success">
          <div className="checkin-emoji">🎉</div>
          <h2 className="checkin-title success">Checked In!</h2>
          <p className="checkin-sub">{message}</p>
          {balance !== null && (
            <div className="checkin-balance">
              <span className="checkin-balance-label">Total Balance</span>
              <span className="checkin-balance-value">{balance} BLKPT</span>
            </div>
          )}
          {txHash && <p className="checkin-hash">TX: {txHash.slice(0, 8)}...{txHash.slice(-8)}</p>}
          {walletAddress && <p className="checkin-hash">Wallet: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</p>}
        </div>
      )}

      {status === "already" && (
        <div className="checkin-card already">
          <div className="checkin-emoji">⚠️</div>
          <h2 className="checkin-title already">Already Checked In</h2>
          <p className="checkin-sub">{message}</p>
          {balance !== null && (
            <div className="checkin-balance">
              <span className="checkin-balance-label">Current Balance</span>
              <span className="checkin-balance-value">{balance} BLKPT</span>
            </div>
          )}
        </div>
      )}

      {status === "error" && (
        <div className="checkin-card error">
          <div className="checkin-emoji">❌</div>
          <h2 className="checkin-title error">Check-in Failed</h2>
          <p className="checkin-sub">{message}</p>
          <button className="checkin-retry-btn" onClick={() => window.location.reload()}>
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}