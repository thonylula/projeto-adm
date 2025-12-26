import fs from 'fs';
import https from 'https';

const fonts = [
    { name: 'Inter-Regular', url: 'https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZg.ttf' },
    { name: 'Inter-Bold', url: 'https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYMZg.ttf' },
    { name: 'Montserrat-Regular', url: 'https://fonts.gstatic.com/s/montserrat/v31/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCtr6Ew-.ttf' },
    { name: 'Montserrat-Bold', url: 'https://fonts.gstatic.com/s/montserrat/v31/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCuM70w-.ttf' },
    { name: 'Poppins-Bold', url: 'https://fonts.gstatic.com/s/poppins/v24/pxiByp8kv8JHgFVrLCz7V1s.ttf' }
];

async function downloadAndBase64(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => {
                const buffer = Buffer.concat(chunks);
                resolve(buffer.toString('base64'));
            });
            res.on('error', reject);
        });
    });
}

async function run() {
    let css = '';
    for (const font of fonts) {
        console.log(`Downloading ${font.name}...`);
        const base64 = await downloadAndBase64(font.url);
        const family = font.name.split('-')[0];
        const weight = font.name.includes('Bold') ? '700' : '400';
        css += `@font-face {\n  font-family: '${family}';\n  src: url(data:font/ttf;base64,${base64}) format('truetype');\n  font-weight: ${weight};\n  font-style: normal;\n  font-display: block;\n}\n\n`;
    }
    fs.writeFileSync('fonts_embedded.css', css);
    console.log('✅ fonts_embedded.css created!');
}

run().catch(console.error);
