const { ethers } = require("ethers");
const fs = require("fs");

async function check() {
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:7545");
    let out = "Ganache Accounts:\n";
    try {
        const accounts = await provider.listAccounts();
        for (const account of accounts) {
            const bal = await provider.getBalance(account.address);
            out += `${account.address} ${ethers.formatEther(bal)} ETH\n`;
        }
        fs.writeFileSync("balances.txt", out);
    } catch (e) {
        fs.writeFileSync("balances.txt", "Error: " + e.message);
    }
}
check();
