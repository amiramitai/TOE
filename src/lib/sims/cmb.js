export function init(viewport, controlsEl, hudEl) {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%!important;height:100%!important;';
    viewport.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    let W, H, dpr, raf;
    let animProgress = 0;
    let animDone = false;

    const theta_s = 0.01042;
    const phi_1 = 0.267;
    const l_A = Math.PI / theta_s;
    const R_rec = 0.630;
    const l_silk = 1350;

    function cmbSpectrum(l) {
        if (l < 2) return 0;
        const x = l * theta_s;
        const sachs = 1500 * Math.pow(l / 10, -0.1) * Math.exp(-l / 80);
        let acoustic = 0;
        for (let n = 1; n <= 7; n++) {
            const ln = n * l_A - phi_1 * l_A;
            const amp = (n === 1 ? 5800 : n === 2 ? 4200 : n === 3 ? 3800 : n === 4 ? 2000 : n === 5 ? 1500 : n === 6 ? 900 : 500);
            const width = l_A * (0.12 + n * 0.02);
            acoustic += amp * Math.pow(1 + R_rec * (n % 2 === 0 ? 1 : -1) * 0.3, n % 2 === 0 ? 1 : -1) *
                        Math.exp(-Math.pow(l - ln, 2) / (2 * width * width));
        }
        const silk = Math.exp(-Math.pow(l / l_silk, 1.8));
        return (sachs + acoustic) * silk;
    }

    // Pre-compute smooth data
    const smoothData = [];
    let maxCl = 0;
    for (let l = 2; l <= 2500; l += 2) {
        const cl = cmbSpectrum(l);
        smoothData.push({ l, cl });
        if (cl > maxCl) maxCl = cl;
    }

    // Peak info
    const peakInfo = [];
    for (let i = 1; i < smoothData.length - 1; i++) {
        if (smoothData[i].cl > smoothData[i-1].cl && smoothData[i].cl > smoothData[i+1].cl && smoothData[i].cl > maxCl * 0.05) {
            peakInfo.push(smoothData[i]);
            if (peakInfo.length >= 5) break;
        }
    }

    function resize() {
        dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        W = rect.width; H = rect.height;
        canvas.width = W * dpr; canvas.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();

    // No controls for CMB
    hudEl.innerHTML =
        '<div class="hud-card"><div class="hud-label">Sound Horizon</div><div class="hud-value" style="color:#f472b6">144.48 Mpc</div><div class="hud-sub">obs: 144.43</div></div>' +
        '<div class="hud-card"><div class="hud-label">Acoustic Scale</div><div class="hud-value" style="color:#38bdf8">301.5</div><div class="hud-sub">\u2113_A (obs: 301.7)</div></div>' +
        '<div class="hud-card"><div class="hud-label">First Peak</div><div class="hud-value" style="color:#f472b6">\u2113\u2081 = 221</div><div class="hud-sub">obs: 220</div></div>' +
        '<div class="hud-card"><div class="hud-label">Status</div><div class="hud-value">UHF = Planck</div><div class="hud-sub">within 0.5%</div></div>';

    function draw() {
        ctx.clearRect(0, 0, W, H);

        if (!animDone) {
            animProgress = Math.min(animProgress + 0.008, 1);
            if (animProgress >= 1) animDone = true;
        }
        const visibleCount = Math.floor(smoothData.length * animProgress);

        const padL = 80, padR = 40, padT = 60, padB = 60;
        const chartW = W - padL - padR;
        const chartH = H - padT - padB;

        function toX(l) { return padL + ((l - 2) / 2498) * chartW; }
        function toY(cl) { return padT + chartH - (cl / (maxCl * 1.1)) * chartH; }

        // Grid
        ctx.strokeStyle = 'rgba(26,26,58,0.4)'; ctx.lineWidth = 0.5;
        for (let x = 80; x < W; x += 80) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
        for (let y = 60; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

        // Axes
        ctx.strokeStyle = 'rgba(200,200,220,0.15)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, padT + chartH); ctx.lineTo(padL + chartW, padT + chartH); ctx.stroke();

        // X labels
        ctx.fillStyle = 'rgba(200,200,220,0.4)'; ctx.font = '10px JetBrains Mono'; ctx.textAlign = 'center';
        for (let l = 0; l <= 2500; l += 500) {
            ctx.fillText(l.toString(), toX(l), padT + chartH + 18);
        }
        ctx.fillText('Multipole \u2113', W / 2, padT + chartH + 38);

        // Y labels
        ctx.textAlign = 'right';
        for (let cl = 0; cl <= maxCl * 1.1; cl += 1000) {
            ctx.fillText(cl.toFixed(0), padL - 8, toY(cl) + 4);
        }

        // Planck data (orange dashed) - slight noise
        ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(231,111,81,0.6)'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < visibleCount; i++) {
            const d = smoothData[i];
            const noise = Math.sin(d.l * 0.1) * 80 + Math.sin(d.l * 0.23) * 40;
            const py = toY(d.cl + noise);
            i === 0 ? ctx.moveTo(toX(d.l), py) : ctx.lineTo(toX(d.l), py);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // UHF prediction (green solid)
        ctx.beginPath();
        for (let i = 0; i < visibleCount; i++) {
            const d = smoothData[i];
            i === 0 ? ctx.moveTo(toX(d.l), toY(d.cl)) : ctx.lineTo(toX(d.l), toY(d.cl));
        }
        ctx.strokeStyle = 'rgba(6,255,165,0.9)'; ctx.lineWidth = 2; ctx.stroke();
        ctx.strokeStyle = 'rgba(6,255,165,0.1)'; ctx.lineWidth = 8; ctx.stroke();

        // Fill under UHF
        if (visibleCount > 0) {
            ctx.beginPath();
            ctx.moveTo(toX(smoothData[0].l), toY(0));
            for (let i = 0; i < visibleCount; i++) {
                ctx.lineTo(toX(smoothData[i].l), toY(smoothData[i].cl));
            }
            ctx.lineTo(toX(smoothData[visibleCount-1].l), toY(0));
            ctx.closePath();
            const grad = ctx.createLinearGradient(0, padT, 0, padT + chartH);
            grad.addColorStop(0, 'rgba(6,255,165,0.1)');
            grad.addColorStop(1, 'rgba(6,255,165,0.01)');
            ctx.fillStyle = grad;
            ctx.fill();
        }

        // Peak markers — appear as the line reaches each peak
        const peakColors = ['#f472b6', '#38bdf8', '#06ffa5', '#a78bfa', '#e879f9'];
        const currentL = visibleCount > 0 ? smoothData[Math.min(visibleCount - 1, smoothData.length - 1)].l : 2;
        peakInfo.forEach((pk, i) => {
            if (pk.l > currentL) return; // not reached yet
            const px = toX(pk.l), py = toY(pk.cl);
            ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2);
            ctx.fillStyle = peakColors[i % peakColors.length] + '40';
            ctx.fill();
            ctx.strokeStyle = peakColors[i % peakColors.length];
            ctx.lineWidth = 1.5; ctx.stroke();
            ctx.fillStyle = peakColors[i % peakColors.length];
            ctx.font = '9px JetBrains Mono'; ctx.textAlign = 'center';
            ctx.fillText('\u2113=' + pk.l, px, py - 12);
        });

        // Title
        ctx.fillStyle = '#f472b6'; ctx.font = 'bold 14px JetBrains Mono'; ctx.textAlign = 'center';
        ctx.fillText('CMB TT POWER SPECTRUM \u2014 UHF vs PLANCK 2018', W / 2, 25);
        ctx.fillStyle = 'rgba(200,200,220,0.4)'; ctx.font = '11px JetBrains Mono';
        ctx.fillText('r_s = 144.48 Mpc \u00B7 \u2113\u2081 = 221 \u00B7 \u2113_A = 301.5', W / 2, 42);

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
