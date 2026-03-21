// Hawking Pairs — Sonic Horizon & Cross-Horizon Entanglement (Paper 4)
// Acoustic Klein-Gordon on supersonic flow: mode pairs created at horizon
export function init(viewport, controlsEl, hudEl) {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%!important;height:100%!important;';
    viewport.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    let W, H, dpr, raf;
    let time = 0;
    let horizonWidth = 50; // δ parameter
    let showCorrelation = true;
    const cs = 1.0;   // speed of sound
    const vMax = -1.2; // max flow velocity (supersonic)

    // Wave mode pairs
    const modes = [];
    const maxModes = 30;

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
        '    <span class="ctrl-label">HORIZON WIDTH \u03B4</span>' +
        '    <span class="ctrl-value" id="hw-val" style="color:#f472b6">50</span>' +
        '  </div>' +
        '  <input type="range" class="ctrl-slider" min="10" max="120" step="1" value="50" id="hw-slider">' +
        '  <div style="display:flex;gap:8px;margin-top:4px">' +
        '    <button class="ctrl-btn" id="hw-corr" style="flex:1;padding:4px 8px;font:10px JetBrains Mono,monospace;background:rgba(244,114,182,0.15);border:1px solid rgba(244,114,182,0.3);color:#f472b6;border-radius:6px;cursor:pointer">CORRELATIONS: ON</button>' +
        '  </div>' +
        '</div>';

    const hwSlider = controlsEl.querySelector('#hw-slider');
    const hwVal = controlsEl.querySelector('#hw-val');
    const corrBtn = controlsEl.querySelector('#hw-corr');

    hwSlider.oninput = function () {
        horizonWidth = parseInt(this.value);
        hwVal.textContent = horizonWidth;
    };
    corrBtn.onclick = function () {
        showCorrelation = !showCorrelation;
        this.textContent = 'CORRELATIONS: ' + (showCorrelation ? 'ON' : 'OFF');
        this.style.background = showCorrelation ? 'rgba(244,114,182,0.15)' : 'rgba(90,94,106,0.15)';
    };

    // Velocity profile: v(x) = vMax * (1 + tanh(x/δ))/2
    function vFlow(xNorm) {
        return vMax * (1 + Math.tanh((xNorm - 0.5) * 6 / (horizonWidth / 50))) / 2;
    }

    function spawnMode() {
        if (modes.length >= maxModes) modes.shift();
        const freq = 0.5 + Math.random() * 3;
        modes.push({
            born: time,
            freq,
            // Outgoing (escaped) partner
            xOut: 0.5,
            // Ingoing (trapped) partner
            xIn: 0.5,
            amp: 0.5 + Math.random() * 0.5,
            color: Math.random() > 0.5 ? '#4ade80' : '#22d3ee'
        });
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);
        time += 0.016;

        // Spawn modes periodically
        if (Math.random() < 0.08) spawnMode();

        // Layout
        const stL = 50, stR = W - 20, stT = 60, stB = H * (showCorrelation ? 0.48 : 0.85);
        const stW = stR - stL, stH = stB - stT;
        const horizonX = stL + stW * 0.5;

        // === VELOCITY PROFILE (top strip) ===
        ctx.strokeStyle = 'rgba(200,200,220,0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(stL, stB); ctx.lineTo(stR, stB); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(stL, stB); ctx.lineTo(stL, stT); ctx.stroke();

        // Velocity curve
        ctx.strokeStyle = '#a78bfa';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i <= 200; i++) {
            const xN = i / 200;
            const v = vFlow(xN);
            const x = stL + xN * stW;
            const y = stB - ((-v / 1.3) * stH * 0.3 + stH * 0.1);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // c_s line
        ctx.strokeStyle = 'rgba(200,200,220,0.3)';
        ctx.setLineDash([4, 3]);
        const csY = stB - (cs / 1.3 * stH * 0.3 + stH * 0.1);
        ctx.beginPath(); ctx.moveTo(stL, csY); ctx.lineTo(stR, csY); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(200,200,220,0.4)';
        ctx.font = '9px JetBrains Mono';
        ctx.textAlign = 'left';
        ctx.fillText('c_s', stL + 3, csY - 4);

        // Horizon line
        ctx.strokeStyle = 'rgba(244,114,182,0.6)';
        ctx.setLineDash([6, 4]);
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(horizonX, stT); ctx.lineTo(horizonX, stB); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#f472b6';
        ctx.font = 'bold 10px JetBrains Mono';
        ctx.textAlign = 'center';
        ctx.fillText('SONIC HORIZON', horizonX, stT - 5);

        // Region labels
        ctx.fillStyle = 'rgba(74,222,128,0.3)';
        ctx.font = '10px JetBrains Mono';
        ctx.textAlign = 'center';
        ctx.fillText('SUBSONIC (|v| < c_s)', stL + stW * 0.25, stT + 14);
        ctx.fillStyle = 'rgba(244,114,182,0.3)';
        ctx.fillText('SUPERSONIC (|v| > c_s)', stL + stW * 0.75, stT + 14);

        // Animate mode pairs
        for (const m of modes) {
            const age = time - m.born;
            const decay = Math.exp(-age * 0.3);
            if (decay < 0.02) continue;

            // Outgoing partner escapes left (subsonic region)
            m.xOut = 0.5 - age * 0.04;
            // Ingoing partner trapped right (supersonic region)
            m.xIn = 0.5 + age * 0.015; // slows down, gets trapped

            if (m.xOut > 0.02 && m.xOut < 0.98) {
                const px = stL + m.xOut * stW;
                const py = stB - stH * (0.3 + 0.4 * Math.sin(m.freq * age * 4) * decay);
                ctx.beginPath();
                ctx.arc(px, py, 3 * decay + 1, 0, Math.PI * 2);
                ctx.fillStyle = '#4ade80';
                ctx.globalAlpha = decay * 0.8;
                ctx.fill();
                ctx.globalAlpha = 1;

                // Entanglement line
                if (m.xIn < 0.98 && showCorrelation) {
                    const px2 = stL + m.xIn * stW;
                    const py2 = stB - stH * (0.3 + 0.4 * Math.sin(m.freq * age * 4 + Math.PI) * decay);
                    ctx.strokeStyle = 'rgba(167,139,250,' + (decay * 0.25).toFixed(2) + ')';
                    ctx.lineWidth = 1;
                    ctx.setLineDash([2, 3]);
                    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px2, py2); ctx.stroke();
                    ctx.setLineDash([]);
                }
            }

            if (m.xIn > 0.02 && m.xIn < 0.98) {
                const px = stL + m.xIn * stW;
                const py = stB - stH * (0.3 + 0.4 * Math.sin(m.freq * age * 4 + Math.PI) * decay);
                ctx.beginPath();
                ctx.arc(px, py, 3 * decay + 1, 0, Math.PI * 2);
                ctx.fillStyle = '#f472b6';
                ctx.globalAlpha = decay * 0.8;
                ctx.fill();
                ctx.globalAlpha = 1;
            }
        }

        // === CROSS-HORIZON CORRELATION HEATMAP (bottom panel) ===
        if (showCorrelation) {
            const corrT = H * 0.55, corrB = H - 25;
            const corrL = stL, corrR = stR;
            const corrW = corrR - corrL, corrH = corrB - corrT;

            ctx.strokeStyle = 'rgba(200,200,220,0.15)';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(corrL, corrB); ctx.lineTo(corrR, corrB); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(corrL, corrB); ctx.lineTo(corrL, corrT); ctx.stroke();

            ctx.fillStyle = 'rgba(200,200,220,0.4)';
            ctx.font = '9px JetBrains Mono';
            ctx.textAlign = 'center';
            ctx.fillText('x\u2081 (outside)', (corrL + corrR) / 2, corrB + 14);
            ctx.save();
            ctx.translate(corrL - 14, (corrT + corrB) / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.fillText('x\u2082 (inside)', 0, 0);
            ctx.restore();

            // Generate correlation heatmap
            const res = 40;
            const cw = corrW / res, ch = corrH / res;
            for (let i = 0; i < res; i++) {
                for (let j = 0; j < res; j++) {
                    const x1 = (i / res - 0.5) * 2;
                    const x2 = (j / res - 0.5) * 2;
                    // Anti-correlation across horizon (negative values)
                    const crossHorizon = x1 * x2 < 0;
                    const dist = Math.abs(x1) + Math.abs(x2);
                    let corr;
                    if (crossHorizon) {
                        corr = -0.8 * Math.exp(-dist * 1.5) * Math.cos(dist * 4 + time * 0.5);
                    } else {
                        corr = 0.3 * Math.exp(-dist * 2);
                    }
                    // Map to color: negative = pink, positive = green
                    if (Math.abs(corr) < 0.03) continue;
                    const r = corr < 0 ? Math.floor(200 + Math.abs(corr) * 55) : 50;
                    const g = corr > 0 ? Math.floor(180 + corr * 75) : 50;
                    const b = corr < 0 ? Math.floor(150 + Math.abs(corr) * 60) : 80;
                    ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + (Math.abs(corr) * 0.7).toFixed(2) + ')';
                    ctx.fillRect(corrL + i * cw, corrT + (res - 1 - j) * ch, cw + 0.5, ch + 0.5);
                }
            }

            // Diagonal marker
            ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            ctx.setLineDash([3, 3]);
            ctx.beginPath(); ctx.moveTo(corrL, corrB); ctx.lineTo(corrR, corrT); ctx.stroke();
            ctx.setLineDash([]);

            // Labels
            ctx.fillStyle = '#f472b6';
            ctx.font = 'bold 10px JetBrains Mono';
            ctx.textAlign = 'left';
            ctx.fillText('ANTI-CORRELATED (entangled)', corrL + 5, corrT + 12);
            ctx.fillStyle = 'rgba(200,200,220,0.4)';
            ctx.font = '9px JetBrains Mono';
            ctx.fillText('SNR = 4.71 | negative = unitarity preserved', corrL + 5, corrT + 24);
        }

        // Title
        ctx.fillStyle = '#f472b6';
        ctx.font = 'bold 14px JetBrains Mono';
        ctx.textAlign = 'center';
        ctx.fillText('HAWKING PAIR CREATION AT SONIC HORIZON', W / 2, 25);
        ctx.fillStyle = 'rgba(200,200,220,0.4)';
        ctx.font = '11px JetBrains Mono';
        ctx.fillText('mode pairs: \u2190 escaped (green) | trapped (pink) \u2192  \u00B7  information preserved', W / 2, 42);

        // HUD
        const activePairs = modes.filter(m => Math.exp(-(time - m.born) * 0.3) > 0.05).length;
        hudEl.innerHTML =
            '<div class="hud-card"><div class="hud-label">SNR</div><div class="hud-value" style="color:#f472b6">4.71</div><div class="hud-sub">128 ensemble avg</div></div>' +
            '<div class="hud-card"><div class="hud-label">Active Pairs</div><div class="hud-value" style="color:#4ade80">' + activePairs + '</div><div class="hud-sub">entangled modes</div></div>' +
            '<div class="hud-card"><div class="hud-label">Horizon \u03B4</div><div class="hud-value" style="color:#a78bfa">' + horizonWidth + '</div><div class="hud-sub">transition width</div></div>' +
            '<div class="hud-card"><div class="hud-label">Unitarity</div><div class="hud-value" style="color:#06ffa5">PRESERVED</div><div class="hud-sub">negative cross-corr</div></div>';

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
