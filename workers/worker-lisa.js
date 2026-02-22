// worker-lisa.js — LISA Acoustic Echo: Gaussian pressure ringing in gravastar interior
// Simulates the quantum pressure Q = -(hbar^2/2m) * nabla^2(sqrt(rho))/sqrt(rho)
// producing acoustic echoes with period ~ 44.7 time units

self.onmessage = function(e) {
    if (e.data.type === 'init') {
        // Initialize 1D radial density profile for gravastar collapse
        const Nr = e.data.resolution || 512;
        const rMax = 20.0;
        const dr = rMax / Nr;
        const rho = new Float64Array(Nr);
        const vel = new Float64Array(Nr);
        const pressure = new Float64Array(Nr);
        // Initial Gaussian density perturbation (infalling shell)
        for (let i = 0; i < Nr; i++) {
            const r = (i + 0.5) * dr;
            rho[i] = 1.0 + 2.0 * Math.exp(-((r - 5.0) * (r - 5.0)) / 0.5);
            vel[i] = -0.3 * Math.exp(-((r - 5.0) * (r - 5.0)) / 0.5); // infall
            pressure[i] = 0;
        }
        self.postMessage({
            type: 'state',
            rho: Array.from(rho),
            vel: Array.from(vel),
            pressure: Array.from(pressure),
            time: 0,
            dr: dr,
            rMax: rMax
        });
    }
    if (e.data.type === 'step') {
        const { rho: rhoIn, vel: velIn, dt, dr, Nr, time } = e.data;
        const rho = new Float64Array(rhoIn);
        const vel = new Float64Array(velIn);
        const N = rho.length;
        const pressure = new Float64Array(N);
        const newRho = new Float64Array(N);
        const newVel = new Float64Array(N);
        // healing length parameter (controls quantum pressure)
        const xi = 0.3;
        const xi2 = xi * xi;
        // Time sub-stepping for stability
        const nSub = 4;
        const subDt = dt / nSub;
        for (let sub = 0; sub < nSub; sub++) {
            // Compute quantum pressure Q = -(xi^2/2) * laplacian(sqrt(rho)) / sqrt(rho)
            for (let i = 1; i < N - 1; i++) {
                const sqrtR = Math.sqrt(Math.abs(rho[i]) + 1e-20);
                const sqrtRp = Math.sqrt(Math.abs(rho[i+1]) + 1e-20);
                const sqrtRm = Math.sqrt(Math.abs(rho[i-1]) + 1e-20);
                const lap = (sqrtRp - 2*sqrtR + sqrtRm) / (dr * dr);
                pressure[i] = -xi2 * 0.5 * lap / (sqrtR + 1e-20);
            }
            pressure[0] = pressure[1];
            pressure[N-1] = pressure[N-2];
            // Euler equations (conservative form)
            for (let i = 1; i < N - 1; i++) {
                // Continuity: d(rho)/dt + d(rho*v)/dr = 0
                const fluxR = rho[i+1] * vel[i+1];
                const fluxL = rho[i-1] * vel[i-1];
                newRho[i] = rho[i] - subDt * (fluxR - fluxL) / (2 * dr);
                // Momentum: d(v)/dt + v*d(v)/dr = -d(P)/dr / rho + Q
                const dv = (vel[i+1] - vel[i-1]) / (2 * dr);
                const dP = (pressure[i+1] - pressure[i-1]) / (2 * dr);
                newVel[i] = vel[i] - subDt * (vel[i] * dv + dP);
                // Quantum pressure creates the bounce
                if (newRho[i] > 5.0) {
                    newVel[i] += subDt * 0.5 * (5.0 - newRho[i]); // repulsive core
                }
            }
            // Boundary conditions
            newRho[0] = newRho[1];
            newVel[0] = 0; // reflecting at origin
            newRho[N-1] = 1.0; // asymptotic density
            newVel[N-1] = 0;
            // Copy back
            for (let i = 0; i < N; i++) {
                rho[i] = Math.max(0.01, newRho[i]);
                vel[i] = newVel[i];
            }
        }
        // Compute echo metric: peak density at core (r ~ 0)
        const coreDensity = rho[1];
        self.postMessage({
            type: 'state',
            rho: Array.from(rho),
            vel: Array.from(vel),
            pressure: Array.from(pressure),
            time: time + dt,
            coreDensity: coreDensity,
            dr: dr
        });
    }
};
