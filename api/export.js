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

        await page.setViewport({
            width: 1200,
            height: 800,
            deviceScaleFactor: 2
        });

        // Inject high-res styles
        const fullHtml = `
            <!DOCTYPE html>
            <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { margin: 0; padding: 20px; background: white; font-family: 'Inter', sans-serif; }
                        #export-target { transform: scale(1); transform-origin: top left; }
                    </style>
                </head>
                <body>
                    ${html}
                </body>
            </html>
        `;

        await page.setContent(fullHtml, { waitUntil: 'networkidle0' });
        await page.evaluateHandle('document.fonts.ready');

        const element = await page.$('#export-target');
        const buffer = element
            ? await element.screenshot({ type: 'png' })
            : await page.screenshot({ type: 'png', fullPage: true });

        res.setHeader('Content-Type', 'image/png');
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
