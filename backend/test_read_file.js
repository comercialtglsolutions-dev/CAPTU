import axios from 'axios';

const test = async () => {
  try {
    const response = await axios.post('http://localhost:3000/api/agent/chat', {
      messages: [{ role: 'user', content: 'leia o arquivo src/App.tsx e exiba como um artefato de código' }],
      provider: 'openai',
      userId: 'test-user-id'
    }, {
      responseType: 'stream'
    });

    console.log('--- REQUISIÇÃO ENVIADA ---');
    console.log('Aguardando SSE stream...');

    response.data.on('data', (chunk) => {
      const text = chunk.toString();
      const lines = text.split('\n');
      for(const line of lines) {
         if (line.startsWith('data: ')) {
           try {
             const data = JSON.parse(line.substring(6));
             if (data.part) {
                process.stdout.write(data.part);
             }
           } catch(e) {}
         }
      }
    });

    response.data.on('end', () => {
      console.log('\n--- FIM DO STREAM ---');
    });

  } catch (error) {
    console.error('Erro na requisição:', error.response?.data || error.message);
  }
};

test();
