/**
 * scripts/deploy.js  –  Deploy AcademicSystem contract
 *
 * Usage:
 *   npx hardhat run scripts/deploy.js --network localhost
 */

const hre = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log('Deploying AcademicSystem with account:', deployer.address);

    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log('Account balance:', hre.ethers.formatEther(balance), 'ETH');

    // Deploy
    const Factory = await hre.ethers.getContractFactory('AcademicSystem');
    const contract = await Factory.deploy();
    await contract.waitForDeployment();

    const address = await contract.getAddress();
    console.log('✅ AcademicSystem deployed to:', address);

    // Save deployment info
    const deploymentDir = path.join(__dirname, '..', 'blockchain');
    if (!fs.existsSync(deploymentDir)) {
        fs.mkdirSync(deploymentDir, { recursive: true });
    }

    fs.writeFileSync(
        path.join(deploymentDir, 'deployment.json'),
        JSON.stringify(
            { address, deployer: deployer.address, timestamp: new Date().toISOString() },
            null, 2
        )
    );

    // Extract and save ABI via Hardhat artifacts
    const artifact = await hre.artifacts.readArtifact('AcademicSystem');
    fs.writeFileSync(
        path.join(deploymentDir, 'AcademicSystemABI.json'),
        JSON.stringify(artifact.abi, null, 2)
    );

    console.log('📄 ABI  → blockchain/AcademicSystemABI.json');
    console.log('📄 Info → blockchain/deployment.json');
}

main()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
