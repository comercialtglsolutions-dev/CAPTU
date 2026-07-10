const puppeteer = require('puppeteer');
const fs = require('fs');

const paths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
];

async function test() {
    for (const p of paths) {
        if (fs.existsSync(p)) {
            console.log('Testing path:', p);
            try {
                const browser = await puppeteer.launch({
                    headless: true,
                    executablePath: p,
                    args: ['--no-sandbox', '--disable-setuid-sandbox']
                });
                console.log('SUCCESS with:', p);
                await browser.close();
                return p;
            } catch (e) {
                console.log('FAILED with:', p, e.message);
            }
        } else {
            console.log('Path does not exist:', p);
        }
    }
    console.log('No working browser found.');
}

test();
