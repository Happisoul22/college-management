const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🚀 Deploying AcademicRecords contract...\n");

    require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

    const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || "http://127.0.0.1:8545";
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    let keys = [];
    if (process.env.BLOCKCHAIN_KEYS) {
        keys = process.env.BLOCKCHAIN_KEYS.split(',');
    }
    const privateKey = keys[0] || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log("  Deployer address:", wallet.address);

    const balance = await provider.getBalance(wallet.address);
    console.log("  Deployer balance:", ethers.formatEther(balance), "ETH\n");

    const artifactPath = path.join(
        __dirname, "..", "artifacts", "contracts",
        "AcademicRecords.sol", "AcademicRecords.json"
    );

    if (!fs.existsSync(artifactPath)) {
        console.error("❌ Contract artifact not found. Please run 'npx hardhat compile' first.");
        process.exit(1);
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);

    console.log("  Deploying...");
    const contract = await factory.deploy();
    await contract.waitForDeployment();

    const contractAddress = await contract.getAddress();
    console.log("✅ AcademicRecords deployed to:", contractAddress);

    // Save the contract address and ABI for the backend service
    const deploymentInfo = {
        address: contractAddress,
        deployer: wallet.address,
        network: "localhost",
        timestamp: new Date().toISOString()
    };

    const blockchainDir = path.join(__dirname, "..", "blockchain");
    if (!fs.existsSync(blockchainDir)) {
        fs.mkdirSync(blockchainDir, { recursive: true });
    }

    const deploymentPath = path.join(blockchainDir, "deployment.json");
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log("📄 Deployment info saved to blockchain/deployment.json");

    const abiPath = path.join(blockchainDir, "AcademicRecordsABI.json");
    fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2));
    console.log("📄 Contract ABI saved to blockchain/AcademicRecordsABI.json");

    console.log("\n🎉 Deployment complete! Add this to your .env:");
    console.log(`   CONTRACT_ADDRESS=${contractAddress}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });
