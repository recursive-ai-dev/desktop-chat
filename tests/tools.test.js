const { test } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const os = require('os');
const { resolvePath } = require('../src/tools.js');

test('resolvePath throws error if path is not provided', () => {
  assert.throws(() => resolvePath(), { message: 'path is required' });
  assert.throws(() => resolvePath(''), { message: 'path is required' });
  assert.throws(() => resolvePath(null), { message: 'path is required' });
});

test('resolvePath returns absolute path as-is', () => {
  const absPath = process.platform === 'win32' ? 'C:\\some\\abs\\path' : '/some/abs/path';
  assert.strictEqual(resolvePath(absPath), path.resolve(absPath));
});

test('resolvePath resolves relative paths against CWD', () => {
  const relPath = 'some/relative/path';
  assert.strictEqual(resolvePath(relPath), path.resolve(process.cwd(), relPath));
});

test('resolvePath expands ~ to os.homedir()', () => {
  assert.strictEqual(resolvePath('~'), os.homedir());
});

test('resolvePath expands ~/folder to os.homedir()/folder', () => {
  assert.strictEqual(resolvePath('~/folder'), path.join(os.homedir(), '/folder'));
});
