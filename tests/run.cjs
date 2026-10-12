// Runs every tests/cases/*.cjs against the built file. Exit code 1 if any check fails.
const fs = require('fs');
const path = require('path');
const { results } = require('./helpers.cjs');
(async () => {
  const dir = path.join(__dirname, 'cases');
  const only = process.argv[2];
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.cjs') && (!only || f.includes(only))).sort();
  for (const f of files) {
    console.log('\n# ' + f);
    try { await require(path.join(dir, f))(); } catch (e) { results.fail.push(f + ': ' + (e && e.stack || e)); console.log('  CRASH ' + (e && e.message)); }
  }
  console.log(`\n${results.pass} ok, ${results.fail.length} failed`);
  results.fail.forEach(m => console.log('  FAIL ' + m));
  process.exit(results.fail.length ? 1 : 0);
})();
