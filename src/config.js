const fs = require('fs');
const path = require('path');
const { app, safeStorage } = require('electron');

const DEFAULTS = {
  endpoint: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
  apiKeyPlain: '',
  apiKeyEncrypted: '',
  confirmDestructive: true,
  hotkey: 'CommandOrControl+Shift+T'
};

function configPath() {
  return path.join(app.getPath('userData'), 'config.json');
}

function load() {
  const p = configPath();
  let raw = {};
  if (fs.existsSync(p)) {
    try {
      raw = JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch (e) {
      raw = {};
    }
  }
  const cfg = { ...DEFAULTS, ...raw };

  let apiKey = '';
  if (cfg.apiKeyEncrypted && safeStorage.isEncryptionAvailable()) {
    try {
      apiKey = safeStorage.decryptString(Buffer.from(cfg.apiKeyEncrypted, 'base64'));
    } catch (e) {
      apiKey = '';
    }
  } else if (cfg.apiKeyPlain) {
    apiKey = cfg.apiKeyPlain;
  }

  return {
    endpoint: cfg.endpoint,
    model: cfg.model,
    apiKey,
    confirmDestructive: cfg.confirmDestructive,
    hotkey: cfg.hotkey,
    keyStorage: safeStorage.isEncryptionAvailable() ? 'encrypted' : 'plaintext'
  };
}

function save(settings) {
  const existingRaw = fs.existsSync(configPath())
    ? JSON.parse(fs.readFileSync(configPath(), 'utf8') || '{}')
    : {};

  const out = {
    ...existingRaw,
    endpoint: settings.endpoint,
    model: settings.model,
    confirmDestructive: settings.confirmDestructive,
    hotkey: settings.hotkey
  };

  if (typeof settings.apiKey === 'string') {
    if (safeStorage.isEncryptionAvailable()) {
      out.apiKeyEncrypted = safeStorage.encryptString(settings.apiKey).toString('base64');
      out.apiKeyPlain = '';
    } else {
      out.apiKeyPlain = settings.apiKey;
      out.apiKeyEncrypted = '';
    }
  }

  fs.writeFileSync(configPath(), JSON.stringify(out, null, 2), { mode: 0o600 });
  return load();
}

module.exports = { load, save, configPath };
