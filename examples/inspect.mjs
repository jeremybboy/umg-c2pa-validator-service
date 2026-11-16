import { inspectFile } from '../src/validator/service.mjs';

const args = process.argv.slice(2);
const file = args.find(a => a !== '--test-mode');
if (!file) { console.error('Usage: npm run inspect -- /path/to/audio.wav [--test-mode]'); process.exitCode = 2; }
else {
  const report = await inspectFile(file, { testMode: args.includes('--test-mode') });
  console.log(JSON.stringify(report, null, 2));
  if (report.status === 'error') process.exitCode = 1;
}
