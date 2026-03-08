require("dotenv").config();
const hre = require("hardhat");

// deploy.cjs is run by Hardhat which reads DEPLOYER_PRIVATE_KEY from
// hardhat.config.js — no direct env reads needed here.
// This script just deploys and tells you what to save.

async function main() {
  console.log("🚀 Deploying BlockBadge contract to Sepolia...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH\n");

  const BlockBadge = await hre.ethers.getContractFactory("BlockBadge");
  const blockBadge = await BlockBadge.deploy();
  await blockBadge.waitForDeployment();

  const address = await blockBadge.getAddress();
  console.log("✅ BlockBadge deployed to:", address);
  console.log("\n⚠️  Save this address in your .env file as TWO separate entries:");
  console.log("\n  # For Node scripts (server-only — never goes to browser):");
  console.log("  CONTRACT_ADDRESS=" + address);
  console.log("\n  # For the frontend (Vite exposes this to the browser):");
  console.log("  VITE_CONTRACT_ADDRESS=" + address);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
