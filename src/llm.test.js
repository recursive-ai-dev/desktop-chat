const test = require('node:test');
const assert = require('node:assert');
const { chatCompletionsUrl, trimHistory } = require('./llm');

test('chatCompletionsUrl correctly formats endpoints', () => {
  assert.strictEqual(
    chatCompletionsUrl('https://api.openai.com/v1'),
    'https://api.openai.com/v1/chat/completions',
    'appends /chat/completions to base URL'
  );

  assert.strictEqual(
    chatCompletionsUrl('https://api.openai.com/v1/chat/completions'),
    'https://api.openai.com/v1/chat/completions',
    'does not append /chat/completions if already present'
  );

  assert.strictEqual(
    chatCompletionsUrl('https://api.openai.com/v1/'),
    'https://api.openai.com/v1/chat/completions',
    'handles trailing slashes on base URL'
  );

  assert.strictEqual(
    chatCompletionsUrl('  https://api.openai.com/v1  '),
    'https://api.openai.com/v1/chat/completions',
    'trims whitespace from endpoint'
  );

  assert.strictEqual(
    chatCompletionsUrl(''),
    '/chat/completions',
    'handles empty string'
  );

  assert.strictEqual(
    chatCompletionsUrl(null),
    '/chat/completions',
    'handles null'
  );
});

test('trimHistory handles budget and slicing correctly', () => {
  // Mock message array
  // Index 0: system
  // Index 1: user
  // Index 2: assistant (with tool_calls)
  // Index 3: tool (result)
  // Index 4: user
  // Index 5: assistant

  const generateMessages = () => [
    { role: 'system', content: 'You are a helpful assistant.' }, // 56 chars
    { role: 'user', content: 'Hello' }, // 34 chars
    { role: 'assistant', tool_calls: [{id: '1', type: 'function', function: {name: 'test', arguments: '{}'}}] }, // 106 chars
    { role: 'tool', tool_call_id: '1', content: 'Result' }, // 55 chars
    { role: 'user', content: 'Long message to exceed budget'.repeat(10) }, // 330 chars
    { role: 'assistant', content: 'Response' } // 37 chars
  ];

  let messages = generateMessages();
  let totalInitialLength = JSON.stringify(messages).length;

  // Trim with a budget that allows keeping everything
  trimHistory(messages, totalInitialLength + 100);
  assert.strictEqual(messages.length, 6, 'Should not trim if under budget');

  // Trim with a budget that forces removing the first turn (user + assistant + tool)
  // The first turn (index 1 to 3) is 34 + 106 + 55 = 195 chars plus commas and brackets
  // We want to force it to drop elements 1, 2, and 3, stopping before the user message at index 4.
  // The new length would be system (56) + user(330) + assistant(37) + array brackets and commas ~ 430 chars.
  // Let's set the budget to 500 chars, which is less than the total initial length (~630 chars).
  messages = generateMessages();
  trimHistory(messages, 500);

  assert.strictEqual(messages.length, 3, 'Should remove the first conversation turn');
  assert.strictEqual(messages[0].role, 'system', 'Should preserve system prompt');
  assert.strictEqual(messages[1].role, 'user', 'Next message should be user');
  assert.ok(messages[1].content.startsWith('Long message'), 'Should keep the most recent user message');

  // Test with extreme low budget (e.g. 0 chars)
  // Even with 0 budget, the loop condition messages.length > 4 means it will stop
  // when length becomes <= 4. In our case, starting with 6, one cut brings it to 3,
  // so it won't cut again, meaning it keeps system, user, assistant.
  messages = generateMessages();
  trimHistory(messages, 0);
  assert.strictEqual(messages.length, 3, 'Should stop trimming when length <= 4');
});
