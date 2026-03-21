// Running αs — QCD Coupling Constant (Paper 5/6)
// b₀ = 11 from torsional mode counting on color-locked triad
// αs(μ) runs from Planck scale to hadronic scale across 19 decades
export function init(viewport, controlsEl, hudEl) {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%!important;height:100%!important;';
    viewport.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    let W, H, dpr, raf;
    let time = 0;
    let energyLogGeV = 2.0; // log10(μ/GeV), start at ~100 GeV

    // Physical constants
    const alphaS_MZ = 0.1179; // at M_Z = 91.2 GeV
    const MZ = 91.2;

    // Quark mass thresholds (GeV)
    const thresholds = [
        { mass: 0.003, name: 'u', nf: 1 },
        { mass: 0.005, name: 'd', nf: 2 },
        { mass: 0.095, name: 's', nf: 3 },
        { mass: 1.27,  name: 'c', nf: 4 },
        { mass: 4.18,  name: 'b', nf: 5 },
        { mass: 173.0, name: 't', nf: 6 },
    ];

    function b0(nf) {
        return 11 - 2 * nf / 3; // SU(3) one-loop beta function
    }

    function getNf(mu) {
        let nf = 0;
        for (const t of thresholds) {
            if (mu > t.mass) nf = t.nf;
        }
        return nf;
    }

    // Running coupling: one-loop RG
    function alphaS(logMu) {
        const mu = Math.pow(10, logMu);
        const nf = getNf(mu);
        const b = b0(nf);
        const logRatio = Math.log(mu / MZ);
        const denom = 1 + (b * alphaS_MZ / (2 * Math.PI)) * logRatio;
        if (denom <= 0.05) return 3.0; // Landau pole / confinement
        return alphaS_MZ / denom;
    }

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
        '    <span class="ctrl-label">ENERGY SCALE log\u2081\u2080(\u03BC/GeV)</span>' +
        '    <span class="ctrl-value" id="cp-mu-val" style="color:#22d3ee">2.0 (100 GeV)</span>' +
        '  </div>' +
        '  <input type="range" class="ctrl-slider" min="-10" max="190" step="1" value="20" id="cp-mu">' +
        '  <div style="display:flex;justify-content:space-between;font:9px JetBrains Mono,monospace;color:rgba(200,200,220,0.5);margin-top:-2px">' +
        '    <span>\u039B_QCD</span><span style="color:rgba(34,211,238,0.7)">M_Z</span><span>LHC</span><span>E_Planck</span>' +
        '  </div>' +
        '</div>';

    const muSlider = controlsEl.querySelector('#cp-mu');
    const muVal = controlsEl.querySelector('#cp-mu-val');

    muSlider.oninput = function () {
        energyLogGeV = parseInt(this.value) / 10;
        const mu = Math.pow(10, energyLogGeV);
        let label;
        if (energyLogGeV < 0) label = (mu * 1000).toFixed(0) + ' MeV';
        else if (energyLogGeV < 3) label = mu.toFixed(1) + ' GeV';
        else if (energyLogGeV < 6) label = (mu / 1e3).toFixed(1) + ' TeV';
        else label = '10^' + energyLogGeV.toFixed(0) + ' GeV';
        muVal.textContent = energyLogGeV.toFixed(1) + ' (' + label + ')';
    };

    // Experimental data points (log10(μ/GeV), αs)
    const expData = [
        { logMu: Math.log10(1.78), alpha: 0.326, label: '\u03C4 decay', err: 0.019 },
        { logMu: Math.log10(5.0), alpha: 0.215, label: '\u03A5 decay', err: 0.012 },
        { logMu: Math.log10(10.5), alpha: 0.179, label: 'e+e- jets', err: 0.010 },
        { logMu: Math.log10(34), alpha: 0.145, label: 'PETRA', err: 0.008 },
        { logMu: Math.log10(91.2), alpha: 0.1179, label: 'M_Z (LEP)', err: 0.001 },
        { logMu: Math.log10(133), alpha: 0.110, label: 'LEP 1.5', err: 0.005 },
        { logMu: Math.log10(189), alpha: 0.109, label: 'LEP 2', err: 0.004 },
        { logMu: Math.log10(700), alpha: 0.090, label: 'Tevatron', err: 0.005 },
        { logMu: Math.log10(8000), alpha: 0.075, label: 'LHC 8 TeV', err: 0.003 },
    ];

    function draw() {
        ctx.clearRect(0, 0, W, H);
        time += 0.01;

        // Plot region
        const pL = 60, pR = W - 25, pT = 65, pB = H - 40;
        const pW = pR - pL, pH = pB - pT;
        const logMuMin = -1, logMuMax = 19;
        const alphaMin = 0, alphaMax = 0.5;

        function toX(logMu) { return pL + (logMu - logMuMin) / (logMuMax - logMuMin) * pW; }
        function toY(a) { return pB - (a - alphaMin) / (alphaMax - alphaMin) * pH; }

        // Axes
        ctx.strokeStyle = 'rgba(200,200,220,0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(pL, pB); ctx.lineTo(pR, pB); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(pL, pB); ctx.lineTo(pL, pT); ctx.stroke();

        // Grid
        ctx.strokeStyle = 'rgba(200,200,220,0.06)';
        for (let m = 0; m < 19; m += 2) {
            const x = toX(m);
            ctx.beginPath(); ctx.moveTo(x, pT); ctx.lineTo(x, pB); ctx.stroke();
            if (m % 4 === 0) {
                ctx.fillStyle = 'rgba(200,200,220,0.3)';
                ctx.font = '8px JetBrains Mono';
                ctx.textAlign = 'center';
                ctx.fillText('10^' + m, x, pB + 12);
            }
        }
        for (let a = 0.1; a <= 0.4; a += 0.1) {
            const y = toY(a);
            ctx.beginPath(); ctx.moveTo(pL, y); ctx.lineTo(pR, y); ctx.stroke();
            ctx.fillStyle = 'rgba(200,200,220,0.3)';
            ctx.font = '8px JetBrains Mono';
            ctx.textAlign = 'right';
            ctx.fillText(a.toFixed(1), pL - 5, y + 3);
        }

        // Axis labels
        ctx.fillStyle = 'rgba(200,200,220,0.5)';
        ctx.font = '10px JetBrains Mono';
        ctx.textAlign = 'center';
        ctx.fillText('\u03BC (GeV)', (pL + pR) / 2, pB + 28);
        ctx.save();
        ctx.translate(pL - 35, (pT + pB) / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('\u03B1_s(\u03BC)', 0, 0);
        ctx.restore();

        // NF shading bands
        const nfBands = [
            { logStart: -1, logEnd: Math.log10(1.27), nf: 3, color: 'rgba(74,222,128,0.04)' },
            { logStart: Math.log10(1.27), logEnd: Math.log10(4.18), nf: 4, color: 'rgba(34,211,238,0.04)' },
            { logStart: Math.log10(4.18), logEnd: Math.log10(173), nf: 5, color: 'rgba(167,139,250,0.04)' },
            { logStart: Math.log10(173), logEnd: 19, nf: 6, color: 'rgba(244,114,182,0.04)' },
        ];
        for (const band of nfBands) {
            const x1 = toX(band.logStart), x2 = toX(band.logEnd);
            ctx.fillStyle = band.color;
            ctx.fillRect(x1, pT, x2 - x1, pH);
            ctx.fillStyle = 'rgba(200,200,220,0.15)';
            ctx.font = '8px JetBrains Mono';
            ctx.textAlign = 'center';
            ctx.fillText('N_f=' + band.nf, (x1 + x2) / 2, pT + 10);
        }

        // Running coupling curve
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        let started = false;
        for (let i = 0; i <= 500; i++) {
            const lm = logMuMin + (i / 500) * (logMuMax - logMuMin);
            const a = alphaS(lm);
            if (a > alphaMax || a < alphaMin) continue;
            const x = toX(lm), y = toY(a);
            if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Experimental data points
        for (const d of expData) {
            const x = toX(d.logMu);
            const y = toY(d.alpha);
            const yTop = toY(d.alpha + d.err);
            const yBot = toY(d.alpha - d.err);

            ctx.strokeStyle = 'rgba(200,200,220,0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(x, yTop); ctx.lineTo(x, yBot); ctx.stroke();

            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#fbbf24';
            ctx.fill();
        }

        // Current position marker
        const curAlpha = alphaS(energyLogGeV);
        const curNf = getNf(Math.pow(10, energyLogGeV));
        const curB0 = b0(curNf);
        const curX = toX(energyLogGeV);
        const curY = toY(Math.min(alphaMax, curAlpha));

        ctx.beginPath();
        ctx.arc(curX, curY, 7, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(34,211,238,0.3)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(curX, curY, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#22d3ee';
        ctx.fill();

        // Vertical cursor
        ctx.strokeStyle = 'rgba(34,211,238,0.2)';
        ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(curX, pT); ctx.lineTo(curX, pB); ctx.stroke();
        ctx.setLineDash([]);

        // b₀ = 11 annotation
        ctx.fillStyle = '#06ffa5';
        ctx.font = 'bold 11px JetBrains Mono';
        ctx.textAlign = 'right';
        ctx.fillText('b\u2080 = 11 (torsional modes)', pR - 5, pT + 24);
        ctx.fillStyle = 'rgba(200,200,220,0.3)';
        ctx.font = '9px JetBrains Mono';
        ctx.fillText('12 frame modes \u2212 1 scalar ghost = 11', pR - 5, pT + 36);

        // Title
        ctx.fillStyle = '#4ade80';
        ctx.font = 'bold 14px JetBrains Mono';
        ctx.textAlign = 'center';
        ctx.fillText('RUNNING \u03B1_s: ASYMPTOTIC FREEDOM', W / 2, 25);
        ctx.fillStyle = 'rgba(200,200,220,0.4)';
        ctx.font = '11px JetBrains Mono';
        ctx.fillText('\u03B1_s(\u03BC) = \u03B1_s(M_Z) / [1 + b\u2080\u03B1_s/(2\u03C0) ln(\u03BC/M_Z)]  |  19 decades of energy', W / 2, 42);

        // HUD
        hudEl.innerHTML =
            '<div class="hud-card"><div class="hud-label">\u03B1_s(\u03BC)</div><div class="hud-value" style="color:#4ade80">' + (curAlpha < 3 ? curAlpha.toFixed(4) : '>1 (confined)') + '</div><div class="hud-sub">running coupling</div></div>' +
            '<div class="hud-card"><div class="hud-label">\u03BC</div><div class="hud-value" style="color:#22d3ee">10^' + energyLogGeV.toFixed(1) + ' GeV</div><div class="hud-sub">energy scale</div></div>' +
            '<div class="hud-card"><div class="hud-label">b\u2080</div><div class="hud-value" style="color:#06ffa5">' + curB0.toFixed(2) + '</div><div class="hud-sub">N_f=' + curNf + ' active quarks</div></div>' +
            '<div class="hud-card"><div class="hud-label">Freedom</div><div class="hud-value" style="color:' + (curAlpha < 0.3 ? '#4ade80' : '#f472b6') + '">' + (curAlpha < 0.2 ? 'ASYMPTOTIC' : curAlpha < 1 ? 'STRONG' : 'CONFINED') + '</div><div class="hud-sub">' + (curAlpha < 0.2 ? 'perturbative' : 'non-perturbative') + '</div></div>';

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
