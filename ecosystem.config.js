/**
 * PM2 process definitions for the Nexus backend on the VPS.
 *
 * Each environment runs from its OWN checkout. This matters: if all three ran
 * from a single directory and a single dist/, differing only by NODE_ENV and
 * PORT, then `npm run build` for any environment would replace the code all
 * three execute — and prod would pick it up on its next restart for any reason.
 * Separate checkouts mean deploying to dev/preprod is a genuine rehearsal for
 * prod, with code isolation and not just database separation.
 *
 * Each checkout holds its own .env (DATABASE_URL, JWT_SECRET, OTP keys), which
 * is why the env block below only needs NODE_ENV and PORT — dotenv.config()
 * does NOT override already-set vars, so these win.
 *
 * Deploy with scripts/deploy.sh, which targets one environment at a time.
 * Reload after editing this file:  pm2 startOrReload ecosystem.config.js
 */
// Shares the VPS (31.97.61.191) with sonebill-backend, under the same account so
// a single `pm2 list` shows every service. sonebill holds ports 7000-7002; nexus
// uses 6000-6002.
const BASE = '/home/sanskarpandit';

const app = (env, port) => ({
  name: `nexus-backend-${env}`,
  cwd: `${BASE}/nexus-backend-${env}`,
  script: 'dist/main.js',
  exec_mode: 'fork',
  instances: 1,
  env: {
    NODE_ENV: env,
    PORT: port,
  },
});

// Port map on this VPS (31.97.61.191), so nothing collides:
//   3000/3001, 5000/5001, 9000 — other services
//   4000-4002 — sonetaran        7000-7002 — sonebill
//   6000      — gold-rate/prod   <-- taken, which is why nexus-prod is NOT 6000
//   6001-6003 — nexus
module.exports = {
  apps: [
    app('prod', 6003),
    app('dev', 6001),
    app('preprod', 6002),
  ],
};
