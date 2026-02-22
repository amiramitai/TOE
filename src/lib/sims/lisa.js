export function init(viewport, controlsEl, hudEl) {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%!important;height:100%!important;';
    viewport.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    let W, H, dpr, raf;

    const worker = new Worker('/workers/worker-lisa.js');

    let frames = null;
    let currentFrame = 0;
    let playing = false;
    let playSpeed = 1;
    let totalTime = 0;
    let rMax = 20;
    let echoTimes = [];
    let frameCounter = 0; // throttle base speed by /4
    const peakThreshold = 1.5;

    function resize() {
        dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        W = rect.width; H = rect.height;
        canvas.width = W * dpr; canvas.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();

    // Loading HUD
    hudEl.innerHTML =
        '<div class="hud-card"><div class="hud-label">Status</div><div class="hud-value" style="color:#e879f9">COMPUTING\u2026</div><div class="hud-sub">pre-computing echo sequence</div></div>';

    worker.postMessage({ type: 'precompute', resolution: 200, frames: 400, stepsPerFrame: 8 });

    worker.onmessage = function(e) {
        if (e.data.type === 'precomputed') {
            frames = e.data.frames;
            totalTime = e.data.totalTime;
            rMax = e.data.rMax;

            // Detect echo peaks
            let lastPeak = false;
            for (let i = 0; i < frames.length; i++) {
                const isPeak = frames[i].coreDensity > peakThreshold;
                if (isPeak && !lastPeak) echoTimes.push(frames[i].time);
                lastPeak = isPeak;
            }

            setupControls();
            updateHUD();
        }
    };

    function setupControls() {
        controlsEl.innerHTML =
            '<button class="ctrl-btn" id="lisa-play">\u25B6 PLAY</button>' +
            '<span class="ctrl-label">TIME</span>' +
            '<input type="range" class="ctrl-slider" min="0" max="' + (frames.length - 1) + '" step="1" value="0" id="lisa-time">' +
            '<span class="ctrl-value" id="lisa-time-val" style="color:#e879f9">0.0 \u03C4</span>' +
            '<span class="ctrl-sep"></span>' +
            '<button class="ctrl-btn" id="lisa-speed">1\u00D7</button>';

        controlsEl.querySelector('#lisa-play').onclick = function() {
            if (playing) {
                playing = false;
                frameCounter = 0;
                this.textContent = '\u25B6 PLAY';
                this.classList.remove('active');
            } else {
                currentFrame = 0;
                frameCounter = 0;
                syncDisplay();
                playing = true;
                this.textContent = '\u275A\u275A PAUSE';
                this.classList.add('active');
            }
        };
        controlsEl.querySelector('#lisa-time').oninput = function() {
            currentFrame = parseInt(this.value);
            playing = false;
            const pb = controlsEl.querySelector('#lisa-play');
            if (pb) { pb.textContent = '\u25B6 PLAY'; pb.classList.remove('active'); }
            syncDisplay();
            updateHUD();
        };
        controlsEl.querySelector('#lisa-speed').onclick = function() {
            playSpeed = playSpeed === 1 ? 2 : playSpeed === 2 ? 4 : 1;
            this.textContent = playSpeed + '\u00D7';
        };
    }

    function syncDisplay() {
        if (!frames) return;
        const tv = controlsEl.querySelector('#lisa-time-val');
        const ts = controlsEl.querySelector('#lisa-time');
        if (tv) tv.textContent = frames[currentFrame].time.toFixed(1) + ' \u03C4';
        if (ts) ts.value = currentFrame;
    }

    function updateHUD() {
        if (!frames) return;
        const f = frames[currentFrame];
        let echoCount = 0;
        for (let i = 0; i < echoTimes.length; i++) { if (echoTimes[i] <= f.time) echoCount++; }
        let echoPeriod = 0;
        if (echoTimes.length >= 2) {
            const p = [];
            for (let i = 1; i < echoTimes.length; i++) p.push(echoTimes[i] - echoTimes[i-1]);
            echoPeriod = p.reduce((a,b) => a+b, 0) / p.length;
        }
        hudEl.innerHTML =
            '<div class="hud-card"><div class="hud-label">Echo Period</div><div class="hud-value" style="color:#e879f9">' + (echoPeriod > 0 ? echoPeriod.toFixed(1) : '\u2014') + '</div><div class="hud-sub">target: 44.7 \u03C4</div></div>' +
            '<div class="hud-card"><div class="hud-label">Echoes Observed</div><div class="hud-value" style="color:#e879f9">' + Math.max(0, echoCount - 1) + '</div><div class="hud-sub">pressure bounces</div></div>' +
            '<div class="hud-card"><div class="hud-label">Core \u03C1(0)</div><div class="hud-value" style="color:#e879f9">' + f.coreDensity.toFixed(3) + '</div><div class="hud-sub">\u03C1\u2080 units</div></div>' +
            '<div class="hud-card"><div class="hud-label">Sim Time</div><div class="hud-value" style="color:#e879f9">' + f.time.toFixed(1) + '</div><div class="hud-sub">\u03C4_M units</div></div>';
    }

    function draw() {
        if (!frames) { raf = requestAnimationFrame(draw); return; }

        // Auto-advance if playing — base speed is 1×/4 of a frame per draw
        if (playing) {
            frameCounter++;
            const advanceEvery = Math.max(1, Math.round(4 / playSpeed)); // 1×→every4, 2×→every2, 4×→every1
            if (frameCounter >= advanceEvery) {
                frameCounter = 0;
                currentFrame = Math.min(currentFrame + 1, frames.length - 1);
                if (currentFrame >= frames.length - 1) {
                    playing = false;
                    const pb = controlsEl.querySelector('#lisa-play');
                    if (pb) { pb.textContent = '\u25B6 PLAY'; pb.classList.remove('active'); }
                }
                syncDisplay();
                if (currentFrame % 4 === 0) updateHUD();
            }
        }

        const f = frames[currentFrame];
        ctx.clearRect(0, 0, W, H);

        // Grid
        ctx.strokeStyle = 'rgba(26,26,58,0.4)'; ctx.lineWidth = 0.5;
        for (let x = 80; x < W; x += 80) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
        for (let y = 60; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

        // ── TOP: density profile ──
        const splitY = H * 0.55;
        const padL = 80, padR = 40, padT = 50, padB = 30;
        const chartW = W - padL - padR;
        const chartH = splitY - padT - padB;
        const rhoMax = 5;
        const dr = rMax / f.rho.length;

        function toX(r) { return padL + (r / rMax) * chartW; }
        function toYrho(v) { return padT + chartH - (Math.min(v, rhoMax) / rhoMax) * chartH; }

        ctx.strokeStyle = 'rgba(200,200,220,0.15)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, padT + chartH); ctx.lineTo(padL + chartW, padT + chartH); ctx.stroke();

        // Labels
        ctx.fillStyle = 'rgba(200,200,220,0.4)'; ctx.font = '10px JetBrains Mono'; ctx.textAlign = 'right';
        for (let v = 0; v <= rhoMax; v++) ctx.fillText(v.toFixed(0), padL - 8, toYrho(v) + 4);
        ctx.textAlign = 'center';
        for (let r = 0; r <= rMax; r += 5) ctx.fillText(r.toFixed(0), toX(r), padT + chartH + 16);

        // Density fill
        ctx.beginPath(); ctx.moveTo(toX(0), toYrho(0));
        for (let i = 0; i < f.rho.length; i++) ctx.lineTo(toX((i+0.5)*dr), toYrho(f.rho[i]));
        ctx.lineTo(toX(rMax), toYrho(0)); ctx.closePath();
        const grad = ctx.createLinearGradient(0, padT, 0, padT + chartH);
        grad.addColorStop(0, 'rgba(232,121,249,0.3)'); grad.addColorStop(1, 'rgba(232,121,249,0.02)');
        ctx.fillStyle = grad; ctx.fill();

        // Density line
        ctx.beginPath();
        for (let i = 0; i < f.rho.length; i++) {
            const px = toX((i+0.5)*dr), py = toYrho(f.rho[i]);
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.strokeStyle = '#e879f9'; ctx.lineWidth = 2; ctx.stroke();
        ctx.strokeStyle = 'rgba(232,121,249,0.2)'; ctx.lineWidth = 6; ctx.stroke();

        // Title
        ctx.fillStyle = '#e879f9'; ctx.font = 'bold 14px JetBrains Mono'; ctx.textAlign = 'center';
        ctx.fillText('GRAVASTAR DENSITY PROFILE \u2014 \u03C1(r, t)', W / 2, 28);
        ctx.fillStyle = 'rgba(200,200,220,0.3)'; ctx.font = '10px JetBrains Mono';
        ctx.fillText('t = ' + f.time.toFixed(1) + ' \u03C4_M', W / 2, 42);

        // ── BOTTOM: echo timeline ──
        const echoPadT = splitY + 20, echoPadB = 40;
        const echoChartH = H - echoPadT - echoPadB;
        const rhoHistMax = 5;

        function toXt(t) { return padL + (t / totalTime) * chartW; }
        function toYecho(v) { return echoPadT + echoChartH - (Math.min(v, rhoHistMax) / rhoHistMax) * echoChartH; }

        ctx.strokeStyle = 'rgba(200,200,220,0.15)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(padL, echoPadT); ctx.lineTo(padL, echoPadT + echoChartH); ctx.lineTo(padL + chartW, echoPadT + echoChartH); ctx.stroke();

        ctx.fillStyle = 'rgba(200,200,220,0.3)'; ctx.font = '10px JetBrains Mono'; ctx.textAlign = 'center';
        ctx.fillText('CORE DENSITY \u03C1(0, t) \u2014 ECHO RINGING', W / 2, echoPadT - 6);
        const tickInt = totalTime <= 60 ? 10 : totalTime <= 150 ? 25 : 50;
        for (let tt = 0; tt <= totalTime; tt += tickInt) ctx.fillText(tt.toFixed(0), toXt(tt), echoPadT + echoChartH + 16);

        // Full history (dimmed)
        ctx.beginPath();
        for (let i = 0; i < frames.length; i++) {
            const px = toXt(frames[i].time), py = toYecho(frames[i].coreDensity);
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.strokeStyle = 'rgba(232,121,249,0.1)'; ctx.lineWidth = 1; ctx.stroke();

        // History up to cursor (bright)
        ctx.beginPath();
        for (let i = 0; i <= currentFrame; i++) {
            const px = toXt(frames[i].time), py = toYecho(frames[i].coreDensity);
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.strokeStyle = '#e879f9'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.strokeStyle = 'rgba(232,121,249,0.12)'; ctx.lineWidth = 5; ctx.stroke();

        // Playhead cursor
        const cursorX = toXt(f.time);
        ctx.strokeStyle = 'rgba(232,121,249,0.8)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(cursorX, echoPadT); ctx.lineTo(cursorX, echoPadT + echoChartH); ctx.stroke();

        // Echo markers
        ctx.setLineDash([3,3]); ctx.strokeStyle = 'rgba(6,255,165,0.3)'; ctx.lineWidth = 1;
        for (let i = 0; i < echoTimes.length; i++) {
            const ex = toXt(echoTimes[i]);
            ctx.beginPath(); ctx.moveTo(ex, echoPadT); ctx.lineTo(ex, echoPadT + echoChartH); ctx.stroke();
        }
        ctx.setLineDash([]);

        // X axis label
        ctx.fillStyle = 'rgba(200,200,220,0.3)'; ctx.font = '10px JetBrains Mono'; ctx.textAlign = 'center';
        ctx.fillText('t (\u03C4_M units)', W / 2, H - 10);

        raf = requestAnimationFrame(draw);
    }
    draw();

    const onResize = () => resize();
    window.addEventListener('resize', onResize);

    return {
        destroy() {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', onResize);
            worker.terminate();
            canvas.remove();
        }
    };
}
