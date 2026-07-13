#!/usr/bin/env node

/**
 * Keep postinstall stable in environments where the old UUID updater file was missing.
 * We do not mutate package.json here; this script intentionally acts as a no-op guard.
 */
process.exit(0);
