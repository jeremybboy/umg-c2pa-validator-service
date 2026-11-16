import { inspectFile } from '../validator/service.mjs';

process.parentPort.on('message', async ({ data }) => {
  try {
    const report = await inspectFile(data.file, { testMode: data.testMode });
    process.parentPort.postMessage({ report });
  } catch (error) {
    process.parentPort.postMessage({ error: String(error.message ?? error) });
  }
});
