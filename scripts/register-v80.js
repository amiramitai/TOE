/**
 * register-v80.js — Register UHF v8.0 FINAL (Sealed) on Polygon Mainnet
 * Registers all three papers: Part I (Core), Part II (Math Foundations), Part III (SM Extension)
 * Sealed version includes: Vortex Mermin Scaling, Milnor 3090 verification, N=2 Atom axiom
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
        expectedHash: "0ece4c394e2fc0672f8de5ec08adcc46939b26b877a16314bff4b623f37f77d0"
    },
    {
        file: "./UHF_Part_II_Mathematical_Foundations.md",
        version: "8.0-Part-II",
        label: "Part II: Mathematical Foundations",
        expectedHash: "36c52c58ca9217a6db841ca04e710eb1a2ed90fafe79c176fda4e13836c134d5"
    },
    {
        file: "./UHF_Part_III_Standard_Model.md",
        version: "8.0-Part-III",
        label: "Part III: Standard Model Extension",
        expectedHash: "90f55a74ea5a59e1aa5f6c98ac6369104122e161984f48694632900c8e347979"
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
