const test = require('node:test');
const assert = require('node:assert');
const { chatCompletionsUrl } = require('./llm');

test('chatCompletionsUrl', async (t) => {
  await t.test('handles standard base URLs', () => {
    assert.strictEqual(chatCompletionsUrl('https://api.openai.com/v1'), 'https://api.openai.com/v1/chat/completions');
    assert.strictEqual(chatCompletionsUrl('http://localhost:11434/v1'), 'http://localhost:11434/v1/chat/completions');
  });

  await t.test('handles URLs that already end with /chat/completions', () => {
    assert.strictEqual(chatCompletionsUrl('https://api.openai.com/v1/chat/completions'), 'https://api.openai.com/v1/chat/completions');
  });

  await t.test('handles URLs with trailing slashes', () => {
    assert.strictEqual(chatCompletionsUrl('https://api.openai.com/v1/'), 'https://api.openai.com/v1/chat/completions');
    assert.strictEqual(chatCompletionsUrl('https://api.openai.com/v1//'), 'https://api.openai.com/v1/chat/completions');
    assert.strictEqual(chatCompletionsUrl('https://api.openai.com/v1/chat/completions/'), 'https://api.openai.com/v1/chat/completions');
  });

  await t.test('handles null, undefined, and empty string inputs', () => {
    assert.strictEqual(chatCompletionsUrl(null), '/chat/completions');
    assert.strictEqual(chatCompletionsUrl(undefined), '/chat/completions');
    assert.strictEqual(chatCompletionsUrl(''), '/chat/completions');
  });

  await t.test('handles strings with leading/trailing whitespaces', () => {
    assert.strictEqual(chatCompletionsUrl('  https://api.openai.com/v1  '), 'https://api.openai.com/v1/chat/completions');
    assert.strictEqual(chatCompletionsUrl(' \thttps://api.openai.com/v1\n '), 'https://api.openai.com/v1/chat/completions');
  });
});
