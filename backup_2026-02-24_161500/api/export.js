import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    const { html, fileName } = req.body;

    if (!html) {
        return res.status(400).send('HTML content is required');
    }

    let browser = null;
    try {
        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        });

        const page = await browser.newPage();

        // Define viewport para A4 Landscape em HQ (Scale 2)
        await page.setViewport({
            width: 1200,
            height: 900,
            deviceScaleFactor: 2,
            isLandscape: true
        });

        // HTML base com reset e fontes injetadas
        const fullHtml = `
            <!DOCTYPE html>
            <html lang="pt-BR">
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { 
                            margin: 0; 
                            background: white; 
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        /* Reset de escala para garantir captura 1:1 */
                        #export-target { 
                            transform: scale(1) !important;
                        }
                    </style>
                </head>
                <body>
                    ${html}
                </body>
            </html>
        `;

        await page.setContent(fullHtml, { waitUntil: 'networkidle0' });

        // BLOQUEIO OBRIGATÓRIO: Aguarda fontes
        await page.evaluate(async () => {
            await document.fonts.ready;
        });

        const element = await page.$('#export-target');
        const buffer = element
            ? await element.screenshot({ type: 'png', omitBackground: false })
            : await page.screenshot({ type: 'png', fullPage: true });

        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'no-cache');
        res.send(buffer);

    } catch (error) {
        console.error('Puppeteer Error:', error);
        res.status(500).send(error.message);
    } finally {
        if (browser !== null) {
            await browser.close();
        }
    }
}
