# BlockBadge 🎖️

> **Campus credential and engagement system powered by Ethereum Sepolia + XRPL**  
> Built for KU Block-a-Thon 2026

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black?style=for-the-badge&logo=vercel)](https://blockathon.vercel.app)
[![Ethereum](https://img.shields.io/badge/Ethereum-Sepolia-627EEA?style=for-the-badge&logo=ethereum)](https://sepolia.etherscan.io)
[![XRPL](https://img.shields.io/badge/XRPL-Testnet-0085D7?style=for-the-badge)](https://testnet.xrpl.org)
[![Pinata](https://img.shields.io/badge/Storage-IPFS%20%2F%20Pinata-E4177C?style=for-the-badge)](https://pinata.cloud)

---

## 📖 What is BlockBadge?

BlockBadge is a decentralized application (dApp) that transforms campus events into verifiable, on-chain credential experiences. Participants scan QR codes at event checkpoints to earn **BLKPT tokens** on the XRP Ledger, and upon event completion they claim **ERC-721 NFT badges** permanently recorded on Ethereum Sepolia.

Organizers deploy events with a single click, generate printable QR codes, monitor real-time XRPL token distribution, and end events with a double-confirmation safety flow. Participants receive tiered badges (Gold / Silver / Bronze) based on engagement, each with metadata stored on IPFS via Pinata.

---

## 🏆 Hackathon Prize Tracks

| Track | Prize | Status |
|---|---|---|
| Track 1 — General DApp | $1,000 | ✅ Submitted |
| Track 4 — XRPL Real-World Impact | $1,500 | ✅ Submitted |
| Track 5 — Pinata Builder | $1,000 (team) | ✅ Submitted |

---

## ✨ Features

### For Organizers
- **One-click event deployment** to Ethereum Sepolia via MetaMask
- **Auto-calculated badge thresholds** (Gold / Silver / Bronze) based on checkpoint count
- **Printable QR codes** for each checkpoint + badge redemption QR
- **Double-confirmation end event** flow to prevent accidental termination
- **XRPL Transaction Ledger** showing real-time token distribution stats per checkpoint

### For Participants
- **QR code check-in** at each checkpoint — no app install required
- **BLKPT token rewards** sent instantly on XRPL Testnet
- **Live dashboard** showing token balance, check-in progress, and badge eligibility
- **NFT badge claiming** once the event ends
- **Immutable verification** — any badge can be verified on-chain via a shareable link

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     React + Vite Frontend                │
│  /organizer  /participant  /checkin  /redeem  /verify    │
└──────────┬──────────────────────────┬───────────────────┘
           │                          │
           ▼                          ▼
┌─────────────────────┐   ┌──────────────────────────────┐
│  Ethereum Sepolia   │   │         XRPL Testnet          │
│                     │   │                               │
│  BlockBadge.sol     │   │  BLK Token (issued by org)    │
│  ERC-721 NFT Badges │   │  Token transfers on check-in  │
│  Event management   │   │  Trustline auto-setup         │
│  On-chain check-ins │   │  Transaction ledger           │
└─────────────────────┘   └──────────────────────────────┘
           │
           ▼
┌─────────────────────┐
│   Pinata / IPFS     │
│                     │
│  Badge images       │
│  Badge metadata     │
│  ipfs:// URIs       │
└─────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Smart Contract | Solidity 0.8.28 — ERC-721URIStorage + Ownable |
| Blockchain | Ethereum Sepolia Testnet |
| Token Economy | XRPL Testnet — BLK custom token |
| Storage | Pinata + IPFS |
| Frontend | React 18 + Vite |
| Wallet | MetaMask (ethers.js v6) |
| Dev Tools | Hardhat v2.28+ (cancun EVM) |

---

## 📁 Project Structure

```
blockbadge/
├── contracts/
│   └── BlockBadge.sol          # ERC-721 smart contract
├── scripts/
│   ├── deploy.cjs              # Deploy contract to Sepolia
│   ├── create-event.cjs        # Create event + generate QR codes
│   ├── end-event.cjs           # End active event
│   └── test-contract.cjs       # 8-step contract test suite
├── src/
│   ├── pages/
│   │   ├── Organizer.jsx       # Create event form
│   │   ├── ManageEvent.jsx     # Dashboard + XRPL Ledger tabs
│   │   ├── CheckIn.jsx         # QR scan check-in page
│   │   ├── Participant.jsx     # Participant dashboard
│   │   ├── Redeem.jsx          # Badge claiming page
│   │   └── Verify.jsx          # Badge verification page
│   └── utils/
│       ├── contract.js         # Ethers.js contract interactions
│       ├── xrpl.js             # XRPL client + token transfers
│       ├── wallet.js           # Participant wallet management
│       ├── pinata.js           # IPFS badge storage
│       ├── activeEvent.js      # Active event ID resolution
│       ├── checkin.js          # Check-in orchestration
│       └── qr.js               # QR code generation/parsing
├── public/
│   └── event-info.json         # Active event cache (git-ignored)
├── qr-codes/                   # Generated QR PNGs (git-ignored)
├── vercel.json                 # SPA routing config
└── hardhat.config.cjs          # Hardhat config (cancun EVM)
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MetaMask browser extension
- Sepolia ETH (get from [sepoliafaucet.com](https://sepoliafaucet.com))
- Pinata account ([pinata.cloud](https://pinata.cloud))

### Installation

```bash
git clone https://github.com/v4ms12004/Blockathon.git
cd Blockathon
npm install
```

### Environment Variables

Create a `.env` file in the root directory:

```env
# XRPL
VITE_XRPL_NETWORK=wss://s.altnet.rippletest.net:51233
VITE_ORGANIZER_ADDRESS=your_xrpl_organizer_address
VITE_ORGANIZER_SEED=your_xrpl_organizer_seed
VITE_TOKEN_CURRENCY=BLK

# Ethereum
VITE_SEPOLIA_RPC_URL=https://rpc.ankr.com/eth_sepolia
VITE_DEPLOYER_PRIVATE_KEY=your_deployer_private_key
VITE_CONTRACT_ADDRESS=0x0C3FbA240538f196f775B75735bd4119eac755af

# Pinata
VITE_PINATA_API_KEY=your_pinata_api_key
VITE_PINATA_SECRET=your_pinata_secret

# App
VITE_ACTIVE_EVENT_ID=1
VITE_APP_URL=http://localhost:5173

# Badge Thresholds (optional overrides)
VITE_GOLD_THRESHOLD=30
VITE_SILVER_THRESHOLD=20
VITE_BRONZE_THRESHOLD=10
```

### Run Locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## 📋 Smart Contract

**Contract Address (Sepolia):** `0x0C3FbA240538f196f775B75735bd4119eac755af`

### Key Functions

```solidity
// Create a new event
createEvent(name, totalParticipants, totalCheckpoints, tokensPerCheckin,
            goldThreshold, silverThreshold, bronzeThreshold) → eventId

// Participant checks in at a checkpoint
checkIn(eventId, checkpointId)

// Participant claims their NFT badge after event ends
claimBadge(eventId, badgeCID)

// Organizer ends the event
endEvent(eventId)

// Read event details
getEvent(eventId) → (organizer, name, participants, checkpoints, tokens, thresholds, isActive)

// Read participant details
getParticipant(eventId, address) → (tokenBalance, checkinCount, hasClaimedBadge, tier, cid, nftTokenId)
```

### Deploy Your Own Contract

```bash
node scripts/deploy.cjs
```

Update `VITE_CONTRACT_ADDRESS` in your `.env` with the new address.

---

## 🎮 Organizer Workflow

### Option A — Browser (Recommended for demos)
1. Go to `/organizer`
2. Fill in event details and click **Deploy Event to Blockchain**
3. Approve MetaMask transaction
4. Auto-navigated to `/organizer/event/:eventId`
5. Print or display checkpoint QR codes
6. When event is over, click **End Event** (double confirmation required)
7. Share the redemption QR code with participants

### Option B — Terminal
```bash
# Create event + generate QR code PNGs
node scripts/create-event.cjs

# End active event
node scripts/end-event.cjs
```

---

## 👤 Participant Workflow

1. **Scan** checkpoint QR code → opens `/checkin/:eventId/:checkpointId`
2. **Approve** MetaMask transaction to record check-in on Ethereum
3. **Receive** BLKPT tokens on XRPL automatically
4. **View** progress at `/participant`
5. After event ends → **Claim** NFT badge at `/redeem/:eventId`
6. **Share** verification link at `/verify/:txHash`

---

## 📊 XRPL Ledger

The organizer dashboard includes a real-time XRPL transaction ledger showing:

- **Total BLK tokens distributed** across all participants
- **Unique participant wallets** that received tokens
- **Total on-chain transactions** recorded on XRPL
- **Average tokens per participant** engagement metric
- **Per-checkpoint breakdown** with visual progress bars

---

## 🔍 Badge Verification

Every claimed badge generates a permanent verification URL:

```
https://your-app.vercel.app/verify/:txHash
```

The verification page shows:
- ✅ Verified on Ethereum Sepolia
- Badge tier (Gold / Silver / Bronze)
- Badge image from IPFS
- Recipient address
- Timestamp + block number
- Contract address
- Etherscan link

---

## 🧪 Running Tests

```bash
# Run all 8 contract tests
node scripts/test-contract.cjs
```

Test coverage:
1. ✅ Create event
2. ✅ Check-in at checkpoint
3. ✅ Prevent duplicate check-ins
4. ✅ Token balance tracking
5. ✅ End event
6. ✅ Claim badge (mint NFT)
7. ✅ Prevent double badge claims
8. ✅ NFT Token URI verification

---

## 🌐 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import repo at [vercel.com](https://vercel.com)
3. Set all `.env` variables in Vercel dashboard
4. Set build settings:
   - **Framework:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Deploy

The `vercel.json` file handles SPA routing automatically.

---

## 👥 Team

| Role | Responsibilities |
|---|---|
| Dev-1 | Smart contracts, blockchain utils, XRPL integration, organizer flow |
| Dev-2 | Frontend UI, participant dashboard, landing page |

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">
  <strong>Built with ❤️ at KU Block-a-Thon 2026</strong><br/>
  <sub>Ethereum Sepolia · XRPL Testnet · Pinata IPFS</sub>
</div>
