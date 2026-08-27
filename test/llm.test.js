const { test } = require('node:test');
const assert = require('node:assert');
const { trimHistory } = require('../src/llm.js');

test('trimHistory does not trim if under budget', () => {
  const messages = [
    { role: 'system', content: 'You are a bot.' },
    { role: 'user', content: 'Hi' },
    { role: 'assistant', content: 'Hello' }
  ];
  const clone = JSON.parse(JSON.stringify(messages));

  trimHistory(messages, 10000);
  assert.deepStrictEqual(messages, clone);
});

test('trimHistory trims oldest complete turns if over budget', () => {
  const messages = [
    { role: 'system', content: 'You are a bot.' },
    { role: 'user', content: 'Hi' },
    { role: 'assistant', content: 'Hello' },
    { role: 'user', content: 'How are you?' },
    { role: 'assistant', content: 'I am fine.' }
  ];

  const currentLen = JSON.stringify(messages).length;
  trimHistory(messages, currentLen - 1);

  assert.deepStrictEqual(messages, [
    { role: 'system', content: 'You are a bot.' },
    { role: 'user', content: 'How are you?' },
    { role: 'assistant', content: 'I am fine.' }
  ]);
});

test('trimHistory stops if messages.length <= 4', () => {
  const messages = [
    { role: 'system', content: 'You are a bot.' },
    { role: 'user', content: 'Hi' },
    { role: 'assistant', content: 'Hello' },
    { role: 'user', content: 'How are you?' }
  ];

  const clone = JSON.parse(JSON.stringify(messages));
  trimHistory(messages, 0);
  assert.deepStrictEqual(messages, clone);
});

test('trimHistory keeps tool clusters together', () => {
  const messages = [
    { role: 'system', content: 'bot' },
    { role: 'user', content: 'turn 1' },
    { role: 'assistant', tool_calls: [{id: 't1'}] },
    { role: 'tool', tool_call_id: 't1', content: 'tool res' },
    { role: 'assistant', content: 'turn 1 done' },
    { role: 'user', content: 'turn 2' },
    { role: 'assistant', content: 'turn 2 done' }
  ];

  trimHistory(messages, JSON.stringify(messages).length - 1);

  assert.deepStrictEqual(messages, [
    { role: 'system', content: 'bot' },
    { role: 'user', content: 'turn 2' },
    { role: 'assistant', content: 'turn 2 done' }
  ]);
});

test('trimHistory handles multiple turn trimming', () => {
  const messages = [
    { role: 'system', content: 'sys' },
    { role: 'user', content: 'u1' },
    { role: 'assistant', content: 'a1' },
    { role: 'user', content: 'u2' },
    { role: 'assistant', content: 'a2' },
    { role: 'user', content: 'u3' },
    { role: 'assistant', content: 'a3' },
    { role: 'user', content: 'u4' },
    { role: 'assistant', content: 'a4' }
  ];

  trimHistory(messages, 0);

  assert.deepStrictEqual(messages, [
    { role: 'system', content: 'sys' },
    { role: 'user', content: 'u4' },
    { role: 'assistant', content: 'a4' }
  ]);
});
