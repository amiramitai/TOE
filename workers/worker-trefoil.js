// worker-trefoil.js — Trefoil Reconnection: NAB (Non-Axiomatic Beltrami) evolution
// Computes vortex filament positions and Hamiltonian for the dissolving trefoil

self.onmessage = function(e) {
    if (e.data.type === 'compute') {
        // Generate trefoil knot parametrically
        const N = e.data.resolution || 256;
        const points = [];
        for (let i = 0; i < N; i++) {
            const t = (i / N) * 2 * Math.PI;
            const x = Math.sin(t) + 2 * Math.sin(2 * t);
            const y = Math.cos(t) - 2 * Math.cos(2 * t);
            const z = -Math.sin(3 * t);
            points.push({ x, y, z });
        }
        self.postMessage({ type: 'geometry', points });
    }
    if (e.data.type === 'evolve') {
        const { points, dt, time, dissipation } = e.data;
        const N = points.length;
        const newPoints = [];
        // Biot-Savart LIA (Local Induction Approximation) + dissipation
        // Simulates the trefoil dissolving into acoustic phonons
        const decay = Math.exp(-dissipation * time);
        // Hamiltonian: H = (1/2) * kappa^2 * integral |dr/ds|^2 ds
        let H = 0;
        let H0 = 0;
        for (let i = 0; i < N; i++) {
            const p = points[i];
            const pn = points[(i + 1) % N];
            const pp = points[(i - 1 + N) % N];
            // Tangent vector
            const tx = (pn.x - pp.x) / 2;
            const ty = (pn.y - pp.y) / 2;
            const tz = (pn.z - pp.z) / 2;
            const tLen = Math.sqrt(tx*tx + ty*ty + tz*tz);
            // Binormal (approximate via second derivative)
            const bx = pn.x - 2*p.x + pp.x;
            const by = pn.y - 2*p.y + pp.y;
            const bz = pn.z - 2*p.z + pp.z;
            // LIA velocity: v = kappa * (tangent x binormal) / |tangent|^2
            const vx = (ty * bz - tz * by) / (tLen * tLen + 1e-10);
            const vy = (tz * bx - tx * bz) / (tLen * tLen + 1e-10);
            const vz = (tx * by - ty * bx) / (tLen * tLen + 1e-10);
            // Apply dissipation (trefoil dissolves)
            const noise = (Math.random() - 0.5) * 0.01 * (1 - decay);
            newPoints.push({
                x: p.x + dt * vx * decay + noise,
                y: p.y + dt * vy * decay + noise,
                z: p.z + dt * vz * decay + noise
            });
            // Accumulate Hamiltonian
            const dx = pn.x - p.x, dy = pn.y - p.y, dz = pn.z - p.z;
            H += dx*dx + dy*dy + dz*dz;
            // Initial Hamiltonian (from undissipated trefoil)
            const t0 = (i / N) * 2 * Math.PI;
            const t1 = ((i+1) / N) * 2 * Math.PI;
            const x0 = Math.sin(t0)+2*Math.sin(2*t0), x1 = Math.sin(t1)+2*Math.sin(2*t1);
            const y0 = Math.cos(t0)-2*Math.cos(2*t0), y1 = Math.cos(t1)-2*Math.cos(2*t1);
            const z0 = -Math.sin(3*t0), z1 = -Math.sin(3*t1);
            H0 += (x1-x0)**2 + (y1-y0)**2 + (z1-z0)**2;
        }
        const conservation = ((H - H0) / H0) * 100; // percentage deviation
        self.postMessage({
            type: 'evolved',
            points: newPoints,
            hamiltonian: H * 0.5,
            conservation: conservation,
            decay: decay
        });
    }
};
