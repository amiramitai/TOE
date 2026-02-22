// worker-mermin.js — Mermin-Tesla Singularity: compute |M_N| = 2^{(N-1)/2} * 2
// Returns exact Mermin operator eigenvalues for N=2..8 to expose floating-point structure

self.onmessage = function(e) {
    if (e.data.type === 'compute') {
        const results = [];
        for (let N = 2; N <= 8; N++) {
            // Exact quantum maximum: |<M_N>| = 2 * 2^{(N-1)/2}
            const exact = 2 * Math.pow(2, (N - 1) / 2);
            // Classical LHV bound is always 2
            const classical = 2;
            // Violation ratio
            const ratio = exact / classical;
            results.push({
                N: N,
                quantum: exact,
                classical: classical,
                ratio: ratio,
                label: N === 7 ? exact.toFixed(15) : exact.toFixed(10)
            });
        }
        // Also compute the Tesla phase recursion step-by-step
        const recursion = [];
        let M = 2 * Math.SQRT2; // Base: Tsirelson bound |M_2| = 2√2
        recursion.push({ N: 2, value: M });
        for (let N = 3; N <= 8; N++) {
            M = M * Math.SQRT2;  // Each step multiplies by √2
            recursion.push({ N: N, value: M });
        }
        self.postMessage({ type: 'result', results, recursion });
    }
    if (e.data.type === 'animate') {
        // Stream animation frames: exponential growth curve
        const t = e.data.t;
        const points = [];
        for (let i = 0; i <= 100; i++) {
            const N = 2 + (i / 100) * 6; // N from 2 to 8
            const val = 2 * Math.pow(2, (N - 1) / 2);
            const phase = Math.sin(t * 2 + i * 0.1) * 0.02; // subtle oscillation
            points.push({ x: N, y: val * (1 + phase) });
        }
        self.postMessage({ type: 'frame', points, t });
    }
};
