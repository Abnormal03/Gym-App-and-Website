/**
 * Runs all A4 check scripts and outputs summary table.
 * Run with: node backend/scripts/run-a4.js
 */
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const SCRIPTS = [
    'a4/test-a4-core.js',
    'a4/test-a4-badges.js',
    'a4/test-checkin-flow.js',
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

console.log('\n================ A4 TEST SUMMARY ================');
console.table(results);

process.exit(results.some((r) => r.result === 'FAIL') ? 1 : 0);
