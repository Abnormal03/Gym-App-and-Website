/**
 * Runs every A2 and A3 check script one after another and prints a summary.
 *   node scripts/run-a2-a3.js            (all)
 *   node scripts/run-a2-a3.js a3         (only the scripts whose path contains "a3")
 * Each script can also be run alone, e.g.  node scripts/a3/test-profile.js
 */
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const SCRIPTS = [
    'a2/test-staff.js',
    'a2/test-providers.js',
    'a2/test-gym-packages.js',
    'a3/test-profile.js',
    'a3/test-availability.js',
    'a3/test-packages.js',
    'a3/test-clients.js',
];
const filter = process.argv[2];
const results = [];

for (const rel of SCRIPTS.filter((s) => !filter || s.includes(filter))) {
    const r = spawnSync(process.execPath, [path.join(__dirname, rel)], { stdio: 'inherit', env: process.env });
    results.push({ script: rel, result: r.status === 0 ? 'PASS' : 'FAIL' });
}

console.log('\n================ SUMMARY ================');
console.table(results);
process.exit(results.some((r) => r.result === 'FAIL') ? 1 : 0);