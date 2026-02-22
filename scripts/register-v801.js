/**
 * register-v801.js — UHF Paper Registry v8.0.1
 *
 * Final strict-rigor QFT integration (Proofs M, N, O):
 *   • Part II  — §9.3.5 III-E: Stinespring Scattering Theory (Proof M)
 *                 Stinespring dilation U(t) on H_total = H_phys x H_bath,
 *                 Haag-Ruelle on enlarged space, S_phys = Tr_bath[S_total]
 *   • Part II  — §9.3.5 III-F: Off-Shell BV Master Equation (Proof N)
 *                 (W,W) = 0 off-shell on full field-antifield space,
 *                 Delta W = 0 via Pauli-Villars + Barnich-Brandt-Henneaux
 *   • Part III — §9.3.25: Character Variety Topological Emergence (Proof O)
 *                 d=8 from twisted cohomology, r=2 from peripheral structure,
 *                 kappa < 0 from Chern-Simons Hessian => uniquely su(3)
 *
 * Contract: 0xe0bB4bC3116e19F2c0c183eFf8802C4F707B0054  (Polygon Mainnet)
 */

import { ethers } from "ethers";
import { execSync } from "child_process";
import dotenv from "dotenv";
import fs from "fs";
dotenv.config();

const CONTRACT_ADDRESS = "0xe0bB4bC3116e19F2c0c183eFf8802C4F707B0054";
const ABI = [
    "function registerPaper(string _hash, string _author, string _version) public"
];

const PAPERS = [
    {
        file: "UHF_Part_I_Core.md",
        version: "8.0.1-Part-I",
        label: "UHF Part I — Physical Core",
        expectedHash: "18454ef4e5cd27eee16ae68c09d0eaad48ffd94136d6b3540c61019840a54c82"
    },
    {
        file: "UHF_Part_II_Mathematical_Foundations.md",
        version: "8.0.1-Part-II",
        label: "UHF Part II — Mathematical Foundations",
        expectedHash: "b85b6625dfe1d0916468949780428b40332fb9c71e89c9a953cc0a32f8b4c2d8"
    },
    {
        file: "UHF_Part_III_Standard_Model.md",
        version: "8.0.1-Part-III",
        label: "UHF Part III — Standard Model Extension",
        expectedHash: "9150043af14d6c8065c8448a3b133144e3e863fdafbc55796f937ec39bdd7243"
    }
];

async function main() {
    // 1. Verify SHA-256 hashes
    console.log("Verifying SHA-256 hashes...\n");
    for (const p of PAPERS) {
        const actual = execSync(`shasum -a 256 ${p.file}`).toString().split(" ")[0];
        if (actual !== p.expectedHash) {
            console.error(`HASH MISMATCH for ${p.file}!`);
            console.error(`  Expected: ${p.expectedHash}`);
            console.error(`  Actual:   ${actual}`);
            process.exit(1);
        }
        console.log(`  ✓ ${p.file}  ${actual}`);
    }

    // 2. Connect to Polygon
    const provider = new ethers.JsonRpcProvider("https://polygon-bor-rpc.publicnode.com", 137);
    const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

    console.log(`\nWallet: ${wallet.address}`);
    const balance = await provider.getBalance(wallet.address);
    console.log(`Balance: ${ethers.formatEther(balance)} MATIC\n`);

    // 3. Register each paper
    const results = [];
    for (const p of PAPERS) {
        console.log(`Registering ${p.label} (${p.version})...`);
        const tx = await contract.registerPaper(p.expectedHash, "Amir Benjamin Amitay", p.version);
        console.log(`  TX sent: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(`  Confirmed in block ${receipt.blockNumber}`);
        results.push({
            label: p.label,
            version: p.version,
            hash: p.expectedHash,
            txHash: tx.hash,
            block: receipt.blockNumber
        });
    }

    console.log("\n" + "=".repeat(70));
    console.log("SUCCESS — UHF v8.0.1 (ALL 3 PARTS) REGISTERED ON POLYGON MAINNET");
    console.log("=".repeat(70));
    for (const r of results) {
        console.log(`\n  ${r.label} (${r.version})`);
        console.log(`    SHA-256:     ${r.hash}`);
        console.log(`    TX Hash:     ${r.txHash}`);
        console.log(`    Block:       ${r.block}`);
        console.log(`    PolygonScan: https://polygonscan.com/tx/${r.txHash}`);
    }
    console.log("=".repeat(70));

    for (const r of results) {
        const logEntry = `\n${r.version} | ${new Date().toISOString()} | Block: ${r.block} | TX: ${r.txHash} | Hash: ${r.hash}`;
        fs.appendFileSync("./scripts/on-chain-log.txt", logEntry);
    }
    console.log("\nAppended to on-chain-log.txt");
}

main().catch(e => { console.error(e); process.exit(1); });
