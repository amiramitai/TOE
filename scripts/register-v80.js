/**
 * register-v80.js — Register UHF v8.0 (The Submission Series) on Polygon Mainnet
 * Registers all three papers: Part I (Core), Part II (Math Foundations), Part III (SM Extension)
 */
const { ethers } = require("ethers");
const fs = require("fs");
const crypto = require("crypto");
require("dotenv").config();

const CONTRACT_ADDRESS = "0xe0bB4bC3116e19F2c0c183eFf8802C4F707B0054";
const ABI = [
    "function registerPaper(string memory _hash, string memory _author, string memory _version) public",
    "event PaperRegistered(address indexed authorAddress, string documentHash, uint256 timestamp, string author, string version)"
];

const PAPERS = [
    {
        file: "./UHF_Part_I_Core.md",
        version: "8.0-Part-I",
        label: "Part I: The Physical Core",
        expectedHash: "4b6a34d41c56c3ab09988bf7f0efc0ea06846d34e4b18df34987441e02f947ca"
    },
    {
        file: "./UHF_Part_II_Mathematical_Foundations.md",
        version: "8.0-Part-II",
        label: "Part II: Mathematical Foundations",
        expectedHash: "0c6cd0a13c4fed428f02377048af43a7a388e57b9a480908b6ef86b4bd994d14"
    },
    {
        file: "./UHF_Part_III_Standard_Model.md",
        version: "8.0-Part-III",
        label: "Part III: Standard Model Extension",
        expectedHash: "f724035b4d5f3328fa8295ef0345a34fee63104477acc1070e9a2354f28c1836"
    }
];

async function main() {
    // Verify all hashes first
    console.log("Verifying SHA-256 hashes...\n");
    for (const paper of PAPERS) {
        const content = fs.readFileSync(paper.file);
        const hash = crypto.createHash("sha256").update(content).digest("hex");
        console.log(`${paper.label}`);
        console.log(`  SHA-256: ${hash}`);
        if (hash !== paper.expectedHash) {
            console.error(`  ERROR: Hash mismatch!`);
            console.error(`  Expected: ${paper.expectedHash}`);
            console.error(`  Got:      ${hash}`);
            process.exit(1);
        }
        console.log(`  ✓ Hash verified.\n`);
        paper.hash = hash;
    }

    const provider = new ethers.JsonRpcProvider(
        "https://polygon-bor-rpc.publicnode.com", 137, { staticNetwork: true }
    );
    const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

    const results = [];

    for (const paper of PAPERS) {
        console.log(`Registering ${paper.version} on UHFPaperRegistry...`);
        const tx = await contract.registerPaper(paper.hash, "Amir Benjamin Amitay", paper.version);
        console.log(`  TX sent: ${tx.hash}`);

        const receipt = await tx.wait();
        console.log(`  Confirmed in block: ${receipt.blockNumber}\n`);

        results.push({
            version: paper.version,
            label: paper.label,
            hash: paper.hash,
            txHash: tx.hash,
            block: receipt.blockNumber
        });
    }

    console.log("\n" + "=".repeat(70));
    console.log("SUCCESS — UHF v8.0 (ALL 3 PARTS) REGISTERED ON POLYGON MAINNET");
    console.log("=".repeat(70));
    for (const r of results) {
        console.log(`\n  ${r.label} (${r.version})`);
        console.log(`    SHA-256:     ${r.hash}`);
        console.log(`    TX Hash:     ${r.txHash}`);
        console.log(`    Block:       ${r.block}`);
        console.log(`    PolygonScan: https://polygonscan.com/tx/${r.txHash}`);
    }
    console.log("=".repeat(70));

    // Append to on-chain registry log
    for (const r of results) {
        const logEntry = `\n${r.version} | ${new Date().toISOString()} | Block: ${r.block} | TX: ${r.txHash} | Hash: ${r.hash}`;
        fs.appendFileSync("./scripts/on-chain-log.txt", logEntry);
    }
    console.log("\nAppended to on-chain-log.txt");
}

main().catch(e => { console.error(e); process.exit(1); });
