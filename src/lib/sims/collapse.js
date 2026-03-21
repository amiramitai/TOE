// Galaxy Formation — Press-Schechter Halo Mass Function (Paper 3)
// UHF: δ_c = 1.15 vs ΛCDM: δ_c = 1.686 → 6× JWST enhancement at z=10
export function init(viewport, controlsEl, hudEl) {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%!important;height:100%!important;';
    viewport.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    let W, H, dpr, raf;
    let redshift = 10;
    let time = 0;

    const dcUHF = 1.15, dcLCDM = 1.686;

    function resize() {
        dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        W = rect.width; H = rect.height;
        canvas.width = W * dpr; canvas.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();

    controlsEl.innerHTML =
        '<div style="flex:0 0 100%;display:flex;flex-direction:column;gap:6px">' +
        '  <div style="display:flex;justify-content:space-between;align-items:center">' +
        '    <span class="ctrl-label">REDSHIFT z</span>' +
        '    <span class="ctrl-value" id="col-z-val" style="color:#fbbf24">10.0</span>' +
        '  </div>' +
        '  <input type="range" class="ctrl-slider" min="0" max="200" step="1" value="100" id="col-z">' +
        '  <div style="display:flex;justify-content:space-between;font:9px JetBrains Mono,monospace;color:rgba(200,200,220,0.5);margin-top:-2px">' +
        '    <span>z=0 (now)</span><span style="color:rgba(251,191,36,0.7)">z=10 (JWST)</span><span>z=20</span>' +
        '  </div>' +
        '</div>';

    const zSlider = controlsEl.querySelector('#col-z');
    const zVal = controlsEl.querySelector('#col-z-val');

    zSlider.oninput = function () {
        redshift = parseInt(this.value) / 10;
        zVal.textContent = redshift.toFixed(1);
    };

    // Complementary error function approximation
    function erfc(x) {
        const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
        const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
        const sign = x < 0 ? -1 : 1;
        x = Math.abs(x);
        const t = 1.0 / (1.0 + p * x);
        const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
        return 1.0 - sign * y;
    }

    // σ(M, z) — variance of density field (simplified model)
    function sigma(logM, z) {
        const growthFactor = 1 / (1 + z);
        const sigma8_0 = 0.81;
        const base = sigma8_0 * Math.pow(10, -(logM - 13) * 0.22);
        return base * growthFactor;
    }

    // Press-Schechter number density
    function nPS(logM, z, dc) {
        const sig = sigma(logM, z);
        const nu = dc / (Math.sqrt(2) * sig);
        return Math.max(1e-15, erfc(nu));
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);
        time += 0.01;

        const pL = 65, pR = W - 30, pT = 65, pB = H - 45;
        const pW = pR - pL, pH = pB - pT;

        const logMMin = 8, logMMax = 14;
        const logNMin = -12, logNMax = 0;

        function toX(logM) { return pL + (logM - logMMin) / (logMMax - logMMin) * pW; }
        function toY(logN) { return pB - (logN - logNMin) / (logNMax - logNMin) * pH; }

        // Axes
        ctx.strokeStyle = 'rgba(200,200,220,0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(pL, pB); ctx.lineTo(pR, pB); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(pL, pB); ctx.lineTo(pL, pT); ctx.stroke();

        // Grid
        ctx.strokeStyle = 'rgba(200,200,220,0.06)';
        for (let m = 9; m <= 13; m++) {
            const x = toX(m);
            ctx.beginPath(); ctx.moveTo(x, pT); ctx.lineTo(x, pB); ctx.stroke();
            ctx.fillStyle = 'rgba(200,200,220,0.3)';
            ctx.font = '9px JetBrains Mono';
            ctx.textAlign = 'center';
            ctx.fillText('10^' + m, x, pB + 14);
        }
        for (let n = -10; n <= 0; n += 2) {
            const y = toY(n);
            ctx.beginPath(); ctx.moveTo(pL, y); ctx.lineTo(pR, y); ctx.stroke();
        }

        ctx.fillStyle = 'rgba(200,200,220,0.5)';
        ctx.font = '10px JetBrains Mono';
        ctx.textAlign = 'center';
        ctx.fillText('halo mass M (M\u2299)', (pL + pR) / 2, pB + 30);
        ctx.save();
        ctx.translate(pL - 32, (pT + pB) / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('n(>M) cumulative', 0, 0);
        ctx.restore();

        // ΛCDM curve
        ctx.strokeStyle = 'rgba(255,80,80,0.7)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        let started = false;
        for (let i = 0; i <= 200; i++) {
            const logM = logMMin + (i / 200) * (logMMax - logMMin);
            const n = nPS(logM, redshift, dcLCDM);
            const logN = Math.log10(Math.max(1e-15, n));
            if (logN < logNMin) continue;
            const x = toX(logM), y = toY(logN);
            if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // UHF curve
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        started = false;
        for (let i = 0; i <= 200; i++) {
            const logM = logMMin + (i / 200) * (logMMax - logMMin);
            const n = nPS(logM, redshift, dcUHF);
            const logN = Math.log10(Math.max(1e-15, n));
            if (logN < logNMin) continue;
            const x = toX(logM), y = toY(logN);
            if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Enhancement arrow at M = 10^10.5
        const refLogM = 10.5;
        const nUHF = nPS(refLogM, redshift, dcUHF);
        const nLCDM = nPS(refLogM, redshift, dcLCDM);
        const ratio = nUHF / Math.max(1e-15, nLCDM);
        const refX = toX(refLogM);
        const refYuhf = toY(Math.log10(Math.max(1e-15, nUHF)));
        const refYlcdm = toY(Math.log10(Math.max(1e-15, nLCDM)));

        if (ratio > 1.1 && ratio < 1e10) {
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([3, 2]);
            ctx.beginPath(); ctx.moveTo(refX, refYuhf); ctx.lineTo(refX, refYlcdm); ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = '#fbbf24';
            ctx.font = 'bold 11px JetBrains Mono';
            ctx.textAlign = 'left';
            ctx.fillText(ratio.toFixed(1) + '\u00D7', refX + 6, (refYuhf + refYlcdm) / 2 + 4);
        }

        // JWST data points (approximate)
        if (redshift > 6) {
            const jwstPoints = [
                { logM: 9.5, logN: -3.2 },
                { logM: 10.0, logN: -4.1 },
                { logM: 10.5, logN: -5.0 },
                { logM: 11.0, logN: -6.5 },
            ];
            for (const jp of jwstPoints) {
                // Scale with redshift
                const adj = -(redshift - 10) * 0.3;
                const y = toY(jp.logN + adj);
                const x = toX(jp.logM);
                if (y < pT || y > pB) continue;
                ctx.beginPath();
                ctx.moveTo(x - 5, y); ctx.lineTo(x + 5, y);
                ctx.moveTo(x, y - 5); ctx.lineTo(x, y + 5);
                ctx.strokeStyle = '#fbbf24';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
            ctx.fillStyle = '#fbbf24';
            ctx.font = '9px JetBrains Mono';
            ctx.textAlign = 'right';
            ctx.fillText('+ JWST (2024)', pR - 5, pT + 14);
        }

        // Legend
        ctx.font = '10px JetBrains Mono';
        const legX = pL + 10, legY = pT + 12;
        ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(legX, legY); ctx.lineTo(legX + 15, legY); ctx.stroke();
        ctx.fillStyle = '#4ade80'; ctx.textAlign = 'left';
        ctx.fillText('UHF (\u03B4_c = 1.15)', legX + 20, legY + 4);

        ctx.strokeStyle = 'rgba(255,80,80,0.7)'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
        ctx.beginPath(); ctx.moveTo(legX, legY + 18); ctx.lineTo(legX + 15, legY + 18); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(255,80,80,0.7)';
        ctx.fillText('\u039BCDM (\u03B4_c = 1.686)', legX + 20, legY + 22);

        // Title
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 14px JetBrains Mono';
        ctx.textAlign = 'center';
        ctx.fillText('EARLY GALAXY FORMATION: PRESS-SCHECHTER', W / 2, 25);
        ctx.fillStyle = 'rgba(200,200,220,0.4)';
        ctx.font = '11px JetBrains Mono';
        ctx.fillText('acoustic pressure lowers collapse threshold \u2192 ' + ratio.toFixed(1) + '\u00D7 more halos at z=' + redshift.toFixed(1), W / 2, 42);

        // HUD
        hudEl.innerHTML =
            '<div class="hud-card"><div class="hud-label">\u03B4_c UHF</div><div class="hud-value" style="color:#4ade80">1.15</div><div class="hud-sub">acoustic-assisted</div></div>' +
            '<div class="hud-card"><div class="hud-label">\u03B4_c \u039BCDM</div><div class="hud-value" style="color:rgba(255,80,80,0.8)">1.686</div><div class="hud-sub">standard threshold</div></div>' +
            '<div class="hud-card"><div class="hud-label">Enhancement</div><div class="hud-value" style="color:#fbbf24">' + ratio.toFixed(1) + '\u00D7</div><div class="hud-sub">at M=10^10.5 M\u2299</div></div>' +
            '<div class="hud-card"><div class="hud-label">Redshift</div><div class="hud-value" style="color:#22d3ee">z = ' + redshift.toFixed(1) + '</div><div class="hud-sub">' + (redshift > 8 ? 'JWST epoch' : redshift > 3 ? 'cosmic noon' : 'local') + '</div></div>';

        raf = requestAnimationFrame(draw);
    }
    draw();

    const onResize = () => resize();
    window.addEventListener('resize', onResize);

    return {
        destroy() {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', onResize);
            canvas.remove();
        }
    };
}
