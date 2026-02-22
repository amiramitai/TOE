export function init(viewport, controlsEl, hudEl) {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%!important;height:100%!important;';
    viewport.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    let W, H, dpr, raf;
    let currentMass = 2.1; // meV
    const bubbles = [];
    const maxBubbles = 80;

    // Constants
    const G = 6.674e-11, c = 3e8, hbar = 1.055e-34, eV = 1.602e-19;
    const Lambda_obs = 1.1056e-52;
    const Lambda_QFT = 8.99e70; // naive QFT cutoff

    function computeLambda(m_meV) {
        const m_kg = m_meV * 1e-3 * eV / (c * c);
        return 8 * Math.PI * G * Math.pow(m_kg, 4) * c / Math.pow(hbar, 3);
    }

    function resize() {
        dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        W = rect.width; H = rect.height;
        canvas.width = W * dpr; canvas.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();

    // Controls
    controlsEl.innerHTML =
        '<div style="flex:0 0 100%;display:flex;flex-direction:column;gap:4px">' +
        '  <div style="display:flex;justify-content:space-between;align-items:center">' +
        '    <span class="ctrl-label">BOSON MASS</span>' +
        '    <span class="ctrl-value" id="vac-val">2.10 meV/c\u00B2</span>' +
        '  </div>' +
        '  <input type="range" class="ctrl-slider" min="-2" max="2" step="0.01" value="0.322" id="vac-slider">' +
        '  <div style="position:relative;width:100%;height:28px">' +
        '<style>.vac-tick{position:absolute;transform:translateX(-50%);font:9px JetBrains Mono,monospace;color:rgba(200,200,220,0.5);text-align:center;white-space:nowrap;top:2px;line-height:1.3}</style>' +
        '    <span class="vac-tick" style="left:0%">10\u207B\u00B2<br><span style="font-size:8px;opacity:0.7">meV</span></span>' +
        '    <span class="vac-tick" style="left:25%">0.1<br><span style="font-size:8px;opacity:0.7">meV</span></span>' +
        '    <span class="vac-tick" style="left:58%;color:rgba(6,255,165,0.8)">2.1 meV<br><span style="font-size:8px">(\u2713 observed)</span></span>' +
        '    <span class="vac-tick" style="left:75%">10<br><span style="font-size:8px;opacity:0.7">meV</span></span>' +
        '    <span class="vac-tick" style="left:100%">100<br><span style="font-size:8px;opacity:0.7">meV</span></span>' +
        '  </div>' +
        '</div>';

    const slider = controlsEl.querySelector('#vac-slider');
    const valEl = controlsEl.querySelector('#vac-val');
    slider.oninput = function() {
        const logVal = parseFloat(this.value);
        currentMass = Math.pow(10, logVal);
        let label;
        if (currentMass < 0.001) label = (currentMass * 1e3).toFixed(1) + ' \u00B5eV/c\u00B2';
        else if (currentMass < 1) label = (currentMass * 1e3).toFixed(0) + ' \u00B5eV/c\u00B2';
        else if (currentMass < 1000) label = currentMass.toFixed(2) + ' meV/c\u00B2';
        else label = (currentMass / 1000).toFixed(1) + ' eV/c\u00B2';
        valEl.textContent = label;
        updateHUD();
    };

    function updateHUD() {
        const lambda = computeLambda(currentMass);
        const ratio = lambda / Lambda_obs;
        const logLam = Math.log10(Math.max(lambda, 1e-300));
        hudEl.innerHTML =
            '<div class="hud-card"><div class="hud-label">\u039B_UHF</div><div class="hud-value">' + lambda.toExponential(2) + '</div><div class="hud-sub">m\u207B\u00B2</div></div>' +
            '<div class="hud-card"><div class="hud-label">\u039B_UHF / \u039B_obs</div><div class="hud-value">' + ratio.toFixed(2) + '\u00D7</div><div class="hud-sub">target: ~1\u00D7</div></div>' +
            '<div class="hud-card"><div class="hud-label">log\u2081\u2080 \u039B</div><div class="hud-value">' + logLam.toFixed(1) + '</div><div class="hud-sub">order of magnitude</div></div>' +
            '<div class="hud-card"><div class="hud-label">Catastrophe?</div><div class="hud-value" style="color:' + (ratio < 10 ? '#06ffa5' : '#f472b6') + '">' + (ratio < 10 ? 'RESOLVED' : 'NO') + '</div><div class="hud-sub">' + (ratio < 10 ? 'within O(1)' : 'still divergent') + '</div></div>';
    }
    updateHUD();

    function spawnBubble() {
        if (bubbles.length >= maxBubbles) return;
        const lambda = computeLambda(currentMass);
        const ratio = lambda / Lambda_obs;
        const isResolved = ratio < 10;
        // Visually distinct: resolved = calm green rising bubbles; catastrophic = fast chaotic pink
        bubbles.push({
            x: Math.random() * W,
            y: H + 10,
            r: isResolved ? (2 + Math.random() * 5) : (4 + Math.random() * 12),
            speed: isResolved ? (0.4 + Math.random() * 0.6) : (1.5 + Math.random() * 3),
            alpha: isResolved ? (0.15 + Math.random() * 0.35) : (0.3 + Math.random() * 0.5),
            drift: (Math.random()-0.5) * (isResolved ? 0.3 : 1.5),
            color: isResolved ? [6,255,165] : [244,114,182],
        });
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);
        const lambda = computeLambda(currentMass);
        const ratio = lambda / Lambda_obs;
        const isResolved = ratio < 10;

        // Spawn bubbles — catastrophic: many fast; resolved: few calm
        const spawnRate = isResolved
            ? 0.15
            : Math.min(0.9, 0.3 + Math.log10(ratio) * 0.1);
        if (Math.random() < spawnRate) spawnBubble();

        // Update & draw bubbles
        for (let i = bubbles.length - 1; i >= 0; i--) {
            const b = bubbles[i];
            b.y -= b.speed;
            b.x += b.drift || 0;
            b.alpha *= 0.997;
            if (b.y < -10 || b.alpha < 0.01) { bubbles.splice(i, 1); continue; }
            const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r * 2);
            grad.addColorStop(0, `rgba(${b.color[0]},${b.color[1]},${b.color[2]},${b.alpha})`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.fillRect(b.x - b.r * 2, b.y - b.r * 2, b.r * 4, b.r * 4);
        }

        // Log scale bar
        const barY = H * 0.5;
        const barH = 16;
        const padL = 60, padR = 60;
        const barW = W - padL - padR;
        const logMin = -60, logMax = 80;

        function logToX(logV) { return padL + ((logV - logMin) / (logMax - logMin)) * barW; }

        // Scale bar background
        ctx.fillStyle = 'rgba(26,26,58,0.4)';
        ctx.fillRect(padL, barY - barH/2, barW, barH);

        // QFT catastrophe region (red shading)
        const xObs = logToX(Math.log10(Lambda_obs));
        const xQFT = logToX(Math.log10(Lambda_QFT));
        ctx.fillStyle = 'rgba(244,114,182,0.08)';
        ctx.fillRect(xObs, barY - 40, xQFT - xObs, 80);

        // Markers
        const logLam = Math.log10(Math.max(lambda, 1e-300));

        // Observed
        ctx.fillStyle = '#06ffa5';
        ctx.fillRect(xObs - 1, barY - 25, 2, 50);
        ctx.font = '9px JetBrains Mono'; ctx.textAlign = 'center';
        ctx.fillText('\u039B_obs', xObs, barY - 30);

        // UHF
        const xUHF = logToX(logLam);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(xUHF - 1, barY - 25, 2, 50);
        ctx.fillText('\u039B_UHF', xUHF, barY + 42);

        // QFT
        ctx.fillStyle = '#f472b6';
        ctx.fillRect(xQFT - 1, barY - 25, 2, 50);
        ctx.fillText('\u039B_QFT', xQFT, barY - 30);

        // Scale labels
        ctx.fillStyle = 'rgba(200,200,220,0.3)'; ctx.font = '8px JetBrains Mono';
        for (let e = -60; e <= 80; e += 20) {
            const x = logToX(e);
            ctx.textAlign = 'center';
            ctx.fillText('10^' + e, x, barY + 32);
            ctx.fillRect(x, barY - barH/2, 1, barH);
        }

        // Discrepancy label
        if (logLam > Math.log10(Lambda_obs) + 5) {
            ctx.fillStyle = '#f472b6'; ctx.font = 'bold 12px JetBrains Mono'; ctx.textAlign = 'center';
            ctx.fillText('\u0394 = 10^' + Math.log10(ratio).toFixed(0) + '\u00D7', (xObs + xUHF) / 2, barY - 50);
        }

        // Title
        ctx.fillStyle = '#06ffa5'; ctx.font = 'bold 14px JetBrains Mono'; ctx.textAlign = 'center';
        ctx.fillText('VACUUM ENERGY: THE 10\u00B9\u00B2\u00B2 CATASTROPHE \u2014 RESOLVED', W / 2, 30);
        ctx.fillStyle = 'rgba(200,200,220,0.4)'; ctx.font = '11px JetBrains Mono';
        ctx.fillText('\u039B = 8\u03C0G m\u2074c / \u0127\u00B3  \u2014  ratio: ' + ratio.toFixed(2) + '\u00D7', W / 2, 48);

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
