/**
 * Runs all A5 check scripts and outputs summary table.
 * Run with: node backend/scripts/run-a5.js
 */
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const SCRIPTS = [
    'a5/test-a5-sessions.js',
    'a5/test-a5-earnings-payouts.js',
];

const results = [];
const env = {
    ...process.env,
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/gymapp',
    NODE_PATH: path.join(__dirname, '../node_modules'),
};

for (const rel of SCRIPTS) {
    const fullPath = path.join(__dirname, rel);
    console.log(`\n================ Running ${rel} ================`);
    const r = spawnSync(process.execPath, [fullPath], { stdio: 'inherit', env });
    results.push({ script: rel, result: r.status === 0 ? 'PASS' : 'FAIL' });
}

console.log('\n================ A5 TEST SUMMARY ================');
console.table(results);

process.exit(results.some((r) => r.result === 'FAIL') ? 1 : 0);
