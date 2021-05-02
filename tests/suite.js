const { default: baretest } = await import('baretest');

/**
 * First we attempt to import the built version to produce a helpful error message
 * in case of missing build files.
 */
try {
  await import('../build/dscache.js');
} catch (error) {
  console.error('Failed to import DSCache from build folder. The project must be built before running tests!');
  console.error(error);
  process.exit(1);
}

await (await import('./basic-functionality.spec.js')).default.run();
await (await import('./item-ttl.spec.js')).default.run();
