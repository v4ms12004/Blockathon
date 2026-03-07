const hre = require("hardhat");

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
  console.log("\n⚠️  Save this address — add it to your .env file as:");
  console.log("VITE_CONTRACT_ADDRESS=" + address);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});