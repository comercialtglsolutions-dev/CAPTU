import mammoth from 'mammoth';
import fs from 'fs/promises';

const filePath = 'c:/Users/TGL Solutions/Desktop/CAPTU/SDR_Sales_Development_Representative.docx';

async function readDoc() {
  try {
    const buffer = await fs.readFile(filePath);
    const result = await mammoth.extractRawText({ buffer });
    console.log('--- CONTENT START ---');
    console.log(result.value);
    console.log('--- CONTENT END ---');
  } catch (e) {
    console.error('Error reading doc:', e.message);
  }
}

readDoc();
