async function testHermes() {
  try {
    const response = await fetch('http://localhost:3000/api/agent/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Olá, quem é você?' }],
        provider: 'hermes',
        chatId: 'test-hermes-session'
      })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      console.log('Chunk:', decoder.decode(value));
    }

    console.log('Stream ended');
  } catch (err) {
    console.error('Error:', err);
  }
}

testHermes();
