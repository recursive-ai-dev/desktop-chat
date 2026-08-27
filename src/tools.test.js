const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const os = require('os');
const { resolvePath } = require('./tools.js');

describe('resolvePath', () => {
  it('should throw an error if path is missing', () => {
    assert.throws(() => resolvePath(), {
      message: 'path is required'
    });
    assert.throws(() => resolvePath(''), {
      message: 'path is required'
    });
  });

  it('should expand ~ to home directory', () => {
    const homedir = os.homedir();
    assert.strictEqual(resolvePath('~'), homedir);
  });

  it('should expand ~/path to home directory + /path', () => {
    const homedir = os.homedir();
    assert.strictEqual(resolvePath('~/foo/bar'), path.join(homedir, 'foo/bar'));
  });

  it('should resolve absolute paths correctly', () => {
    const absolutePath = path.resolve('/absolute/path/here');
    assert.strictEqual(resolvePath('/absolute/path/here'), absolutePath);
  });

  it('should resolve relative paths correctly', () => {
    const relativePath = path.resolve('relative/path/here');
    assert.strictEqual(resolvePath('relative/path/here'), relativePath);
  });
});
