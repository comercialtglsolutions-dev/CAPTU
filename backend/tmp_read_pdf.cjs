const { PDFParse } = require('pdf-parse');
const fs = require('fs');

const buffer = fs.readFileSync('c:/Users/TGL Solutions/Desktop/CAPTU/contextos-humanos-para-ai.pdf');

const parser = new PDFParse();
parser.parse(buffer).then(data => {
  console.log('--- PDF START ---');
  console.log(data.text.substring(0, 8000));
  console.log('--- PDF END ---');
}).catch(e => console.error('Error:', e.message, e));
