#!/usr/bin/env node

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const args = process.argv.slice(2);
const filteredArgs = args.filter((arg, index) => !(index === 0 && arg === 'run'));

const jestPath = require.resolve('jest/bin/jest');
const configPath = path.resolve(__dirname, '../../../jest.config.js');

const result = spawnSync(process.execPath, [jestPath, '--config', configPath, ...filteredArgs], {
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
