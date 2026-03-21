// Born Rule Relaxation — UHF Part II
// Non-equilibrium ρ relaxes to |Ψ|² via sub-Planckian turbulent mixing
// H[ρ||Ψ²] = ∫ ρ ln(ρ/|Ψ|²) dx ≥ 0, monotonically decreasing
// τ_Born ≈ 0.205 ms (Rb-87 BEC)
export function init(viewport, controlsEl, hudEl) {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%!important;height:100%!important;';
    viewport.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    let W, H, dpr, raf;
    let time = 0;
    let speciesIdx = 0;
    let running = true;
    let speed = 1;

    const species = [
        { name: 'Rb-87', tau: 0.205, cs: 3.0, xi: 0.2, color: '#4ade80' },
        { name: 'K-39', tau: 0.38, cs: 1.8, xi: 0.35, color: '#22d3ee' },
        { name: 'Li-6', tau: 0.12, cs: 5.5, xi: 0.13, color: '#a78bfa' },
    ];

    // Quantum wavefunction |Ψ|²: double-well potential
    const N = 200;
    const psiSq = new Float64Array(N);
    let rho = new Float64Array(N);
    const hHistory = [];
    const maxHistory = 400;

    function initDistributions() {
        // |Ψ|² = double Gaussian (quantum ground state of double well)
        for (let i = 0; i < N; i++) {
            const x = (i / N - 0.5) * 4;
            psiSq[i] = 0.4 * Math.exp(-((x - 0.8) * (x - 0.8)) / 0.3) +
                        0.6 * Math.exp(-((x + 0.7) * (x + 0.7)) / 0.25);
        }
        // Normalize
        let sum = 0;
        for (let i = 0; i < N; i++) sum += psiSq[i];
        for (let i = 0; i < N; i++) psiSq[i] /= sum;

        // Initial ρ: very different from |Ψ|² (non-equilibrium)
        for (let i = 0; i < N; i++) {
            const x = (i / N - 0.5) * 4;
            rho[i] = 0.7 * Math.exp(-((x + 1.5) * (x + 1.5)) / 0.5) +
                     0.3 * Math.exp(-((x - 1.2) * (x - 1.2)) / 0.15) +
                     0.1 * (1 + 0.5 * Math.sin(x * 8));
        }
        sum = 0;
        for (let i = 0; i < N; i++) sum += rho[i];
        for (let i = 0; i < N; i++) rho[i] /= sum;

        hHistory.length = 0;
        time = 0;
    }
    initDistributions();

    function computeH() {
        let h = 0;
        for (let i = 0; i < N; i++) {
            if (rho[i] > 1e-12 && psiSq[i] > 1e-12) {
                h += rho[i] * Math.log(rho[i] / psiSq[i]);
            }
        }
        return h;
    }

    function stepRelaxation(dt) {
        const sp = species[speciesIdx];
        const rate = dt / (sp.tau * 0.15); // scaled for visual speed
        for (let i = 0; i < N; i++) {
            rho[i] += (psiSq[i] - rho[i]) * rate;
        }
        // Normalize
        let sum = 0;
        for (let i = 0; i < N; i++) sum += Math.max(0, rho[i]);
        if (sum > 0) for (let i = 0; i < N; i++) rho[i] = Math.max(0, rho[i]) / sum;
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
        '    <span class="ctrl-label">BEC SPECIES</span>' +
        '    <span class="ctrl-value" id="br-sp-val" style="color:#4ade80">Rb-87</span>' +
        '  </div>' +
        '  <input type="range" class="ctrl-slider" min="0" max="2" step="1" value="0" id="br-sp">' +
        '  <div style="display:flex;justify-content:space-between;font:9px JetBrains Mono,monospace;color:rgba(200,200,220,0.5);margin-top:-2px">' +
        '    <span>Rb-87 (0.205ms)</span><span>K-39 (0.38ms)</span><span>Li-6 (0.12ms)</span>' +
        '  </div>' +
        '  <div style="display:flex;gap:8px;margin-top:6px">' +
        '    <button class="ctrl-btn" id="br-reset" style="flex:1;padding:4px 8px;font:10px JetBrains Mono,monospace;background:rgba(167,139,250,0.15);border:1px solid rgba(167,139,250,0.3);color:#a78bfa;border-radius:6px;cursor:pointer">RESET</button>' +
        '    <button class="ctrl-btn" id="br-speed" style="flex:1;padding:4px 8px;font:10px JetBrains Mono,monospace;background:rgba(34,211,238,0.15);border:1px solid rgba(34,211,238,0.3);color:#22d3ee;border-radius:6px;cursor:pointer">SPEED: 1\u00D7</button>' +
        '  </div>' +
        '</div>';

    const spSlider = controlsEl.querySelector('#br-sp');
    const spVal = controlsEl.querySelector('#br-sp-val');
    const resetBtn = controlsEl.querySelector('#br-reset');
    const speedBtn = controlsEl.querySelector('#br-speed');

    spSlider.oninput = function () {
        speciesIdx = parseInt(this.value);
        const sp = species[speciesIdx];
        spVal.textContent = sp.name;
        spVal.style.color = sp.color;
        initDistributions();
    };
    resetBtn.onclick = function () { initDistributions(); };
    speedBtn.onclick = function () {
        speed = speed === 1 ? 2 : speed === 2 ? 4 : 1;
        this.textContent = 'SPEED: ' + speed + '\u00D7';
    };

    function draw() {
        ctx.clearRect(0, 0, W, H);
        const sp = species[speciesIdx];

        // Step physics
        if (running) {
            for (let s = 0; s < speed; s++) {
                stepRelaxation(0.016);
                time += 0.016;
            }
            const h = computeH();
            if (hHistory.length < maxHistory) hHistory.push(h);
        }

        // === TOP: Distribution plot ===
        const distL = 50, distR = W - 20, distT = 60, distB = H * 0.5;
        const distW = distR - distL, distH = distB - distT;

        ctx.strokeStyle = 'rgba(200,200,220,0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(distL, distB); ctx.lineTo(distR, distB); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(distL, distB); ctx.lineTo(distL, distT); ctx.stroke();

        ctx.fillStyle = 'rgba(200,200,220,0.4)';
        ctx.font = '9px JetBrains Mono';
        ctx.textAlign = 'center';
        ctx.fillText('position x', (distL + distR) / 2, distB + 16);
        ctx.save();
        ctx.translate(distL - 18, (distT + distB) / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('probability', 0, 0);
        ctx.restore();

        // Find max for scaling
        let maxVal = 0;
        for (let i = 0; i < N; i++) maxVal = Math.max(maxVal, psiSq[i], rho[i]);
        const yScale = distH * 0.85 / maxVal;

        // |Ψ|² (target, filled)
        ctx.fillStyle = 'rgba(34,211,238,0.1)';
        ctx.strokeStyle = 'rgba(34,211,238,0.6)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(distL, distB);
        for (let i = 0; i < N; i++) {
            ctx.lineTo(distL + (i / N) * distW, distB - psiSq[i] * yScale);
        }
        ctx.lineTo(distR, distB);
        ctx.fill();
        ctx.beginPath();
        for (let i = 0; i < N; i++) {
            const x = distL + (i / N) * distW;
            const y = distB - psiSq[i] * yScale;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // ρ (current, solid)
        ctx.fillStyle = sp.color.replace(')', ',0.08)').replace('#4ade80', 'rgba(74,222,128,0.08)').replace('#22d3ee', 'rgba(34,211,238,0.08)').replace('#a78bfa', 'rgba(167,139,250,0.08)');
        ctx.strokeStyle = sp.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(distL, distB);
        for (let i = 0; i < N; i++) {
            ctx.lineTo(distL + (i / N) * distW, distB - rho[i] * yScale);
        }
        ctx.lineTo(distR, distB);
        ctx.fill();
        ctx.beginPath();
        for (let i = 0; i < N; i++) {
            const x = distL + (i / N) * distW;
            const y = distB - rho[i] * yScale;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Legend
        ctx.font = '10px JetBrains Mono';
        ctx.textAlign = 'left';
        ctx.strokeStyle = sp.color; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(distL + 5, distT + 10); ctx.lineTo(distL + 20, distT + 10); ctx.stroke();
        ctx.fillStyle = sp.color;
        ctx.fillText('\u03C1(x,t)', distL + 25, distT + 14);
        ctx.strokeStyle = 'rgba(34,211,238,0.6)'; ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.moveTo(distL + 5, distT + 26); ctx.lineTo(distL + 20, distT + 26); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(34,211,238,0.6)';
        ctx.fillText('|\u03A8|\u00B2 (target)', distL + 25, distT + 30);

        // === BOTTOM: H-function plot ===
        const hL = 50, hR = W - 20, hT = H * 0.57, hB = H - 30;
        const hW = hR - hL, hH = hB - hT;

        ctx.strokeStyle = 'rgba(200,200,220,0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(hL, hB); ctx.lineTo(hR, hB); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(hL, hB); ctx.lineTo(hL, hT); ctx.stroke();

        ctx.fillStyle = 'rgba(200,200,220,0.4)';
        ctx.font = '9px JetBrains Mono';
        ctx.textAlign = 'center';
        ctx.fillText('time t / \u03C4_Born', (hL + hR) / 2, hB + 14);
        ctx.save();
        ctx.translate(hL - 16, (hT + hB) / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('H[\u03C1||\u03A8\u00B2]', 0, 0);
        ctx.restore();

        // Zero line
        ctx.strokeStyle = 'rgba(200,200,220,0.15)';
        ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(hL, hB); ctx.lineTo(hR, hB); ctx.stroke();
        ctx.setLineDash([]);

        if (hHistory.length > 1) {
            const hMax = Math.max(0.01, hHistory[0] * 1.2);
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let i = 0; i < hHistory.length; i++) {
                const x = hL + (i / maxHistory) * hW;
                const y = hB - (hHistory[i] / hMax) * hH * 0.9;
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();

            // Current H value badge
            const curH = hHistory[hHistory.length - 1];
            if (curH < 0.01) {
                ctx.fillStyle = '#06ffa5';
                ctx.font = 'bold 11px JetBrains Mono';
                ctx.textAlign = 'right';
                ctx.fillText('EQUILIBRIUM: \u03C1 \u2248 |\u03A8|\u00B2', hR - 5, hT + 14);
            }
        }

        // H ≥ 0 annotation
        ctx.fillStyle = 'rgba(251,191,36,0.5)';
        ctx.font = '9px JetBrains Mono';
        ctx.textAlign = 'left';
        ctx.fillText('H \u2265 0 (Valentini)', hL + 5, hT + 12);
        ctx.fillText('monotonic decrease \u2192 Born rule emerges', hL + 5, hT + 24);

        // Title
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 14px JetBrains Mono';
        ctx.textAlign = 'center';
        ctx.fillText('BORN RULE RELAXATION: \u03C1 \u2192 |\u03A8|\u00B2', W / 2, 25);
        ctx.fillStyle = 'rgba(200,200,220,0.4)';
        ctx.font = '11px JetBrains Mono';
        ctx.fillText('quantum probability not axiom \u2014 emerges from sub-Planckian turbulent mixing', W / 2, 42);

        // HUD
        const curH = hHistory.length > 0 ? hHistory[hHistory.length - 1] : 1;
        const equilibrium = curH < 0.01;
        hudEl.innerHTML =
            '<div class="hud-card"><div class="hud-label">H[\u03C1||\u03A8\u00B2]</div><div class="hud-value" style="color:#fbbf24">' + curH.toFixed(4) + '</div><div class="hud-sub">' + (equilibrium ? 'equilibrium' : 'relaxing') + '</div></div>' +
            '<div class="hud-card"><div class="hud-label">\u03C4_Born</div><div class="hud-value" style="color:' + sp.color + '">' + sp.tau.toFixed(3) + ' ms</div><div class="hud-sub">' + sp.name + ' BEC</div></div>' +
            '<div class="hud-card"><div class="hud-label">c_s</div><div class="hud-value" style="color:#22d3ee">' + sp.cs.toFixed(1) + ' mm/s</div><div class="hud-sub">sound speed</div></div>' +
            '<div class="hud-card"><div class="hud-label">Status</div><div class="hud-value" style="color:' + (equilibrium ? '#06ffa5' : '#f472b6') + '">' + (equilibrium ? 'BORN RULE' : 'RELAXING') + '</div><div class="hud-sub">' + (equilibrium ? 'P = |\u03A8|\u00B2 emerged' : 'H decreasing') + '</div></div>';

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
