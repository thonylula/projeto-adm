import html2canvas from 'html2canvas';
// @ts-ignore
import html2pdf from 'html2pdf.js';

/**
 * Exports an element to PDF directly using html2pdf.
 */
export const exportToPdf = async (elementId: string, fileName: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    const opt = {
        margin: [2, 2] as [number, number],
        filename: `${fileName}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            letterRendering: true,
            logging: true
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' as const },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] as const }
        // Vercel build fix verification
    };

    try {
        await html2pdf().set(opt).from(element).save();
    } catch (error) {
        console.error('PDF generation failed:', error);
        // Fallback to print if library fails
        window.print();
    }
};

/**
 * Exports an element to PNG.
 */
export const exportToPng = async (elementId: string, fileName: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    try {
        console.log('🔄 Sincronizando fontes para alta fidelidade...');
        await checkFonts();
        await document.fonts.ready;
        console.log('✅ Fontes sincronizadas.');

        const canvas = await html2canvas(element, {
            scale: 3, // Ultra-HD Resolution
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            logging: false,
            onclone: (clonedDoc) => {
                const el = clonedDoc.getElementById(elementId);
                if (el) {
                    el.style.visibility = 'visible';
                    el.style.opacity = '1';
                    el.style.position = 'relative';
                    el.style.left = '0';
                    el.style.display = 'block';

                    // Explicitly hide elements marked for exclusion
                    const hiddenElements = clonedDoc.querySelectorAll('.print\\:hidden, .hidden-in-export');
                    hiddenElements.forEach((hiddenEl: any) => {
                        hiddenEl.style.display = 'none';
                        hiddenEl.style.visibility = 'hidden';
                        hiddenEl.style.opacity = '0';
                    });

                    // Remove scroll and ensure full width
                    const scrollable = el.querySelector('.overflow-x-auto');
                    if (scrollable) (scrollable as HTMLElement).style.overflow = 'visible';
                }
            }
        });

        const link = document.createElement('a');
        link.download = `${fileName}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    } catch (error) {
        console.error('❌ PNG export failed:', error);
    }
};

/**
 * Checks if mandatory fonts are loaded.
 */
const checkFonts = async () => {
    const fonts = ['Inter', 'Poppins'];
    const results = await Promise.all(fonts.map(async f => {
        const loaded = document.fonts.check(`1em ${f}`);
        return { name: f, loaded };
    }));

    results.forEach(f => {
        if (f.loaded) console.log(`✅ Fonte ${f.name} carregada.`);
        else console.warn(`⚠️ Fonte ${f.name} não detectada, usando substituta.`);
    });
};

/**
 * Exports an element to PNG using the cloud Puppeteer API.
 */
export const exportToPngPuppeteer = async (elementId: string, fileName: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    try {
        console.log('🚀 Iniciando exportação UI-Mirror (Cloud)...');
        const html = element.innerHTML;

        const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
            .map(s => s.outerHTML)
            .join('\n');

        const response = await fetch('/api/export', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="UTF-8">
                        <script src="https://cdn.tailwindcss.com"></script>
                        ${styles}
                        <style>
                            [data-html2canvas-ignore], .print\\:hidden, .hidden-in-export { 
                                display: none !important; 
                            }
                            body { margin: 0; padding: 0; }
                        </style>
                    </head>
                    <body style="margin:0; padding:0; background: white;">
                        <div id="${elementId}" style="visibility: visible !important; position: relative !important; width: fit-content !important;">
                            ${html}
                        </div>
                    </body>
                    </html>
                `,
                fileName
            })
        });

        if (!response.ok) throw new Error('Falha no serviço de exportação');

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${fileName}.png`;
        link.click();
        console.log('✅ Exportação UI-Mirror concluída!');
    } catch (error) {
        console.error('❌ Erro no Puppeteer Cloud:', error);
        console.log('🔄 Fallback: Capture Local Ultra-HD...');
        return exportToPng(elementId, fileName);
    }
};

/**
 * Exports an element to HTML with basic styles.
 */
export const exportToHtml = (elementId: string, fileName: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map(s => s.outerHTML)
        .join('\n');

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>${fileName}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            ${styles}
            <style>
                [data-html2canvas-ignore], .print\\:hidden, .hidden-in-export { 
                    display: none !important; 
                }
            </style>
        </head>
        <body class="p-8 bg-gray-100">
            <div class="max-w-4xl mx-auto bg-white shadow-lg p-6">
                ${element.innerHTML}
            </div>
        </body>
        </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.html`;
    link.click();
};

/**
 * Captures an element and shares it as an image.
 */
export const shareAsImage = async (elementId: string, fileName: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    try {
        console.log('📱 Iniciando compartilhamento...');

        let blob: Blob;

        try {
            // Attempt high-quality cloud export
            const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
                .map(s => s.outerHTML)
                .join('\n');

            const response = await fetch('/api/export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    html: `
                        <!DOCTYPE HTML>
                        <html>
                        <head>
                            <meta charset="UTF-8">
                            <script src="https://cdn.tailwindcss.com"></script>
                            ${styles}
                            <style>
                                [data-html2canvas-ignore], .print\\:hidden, .hidden-in-export { 
                                    display: none !important; 
                                }
                                body { margin: 0; padding: 0; }
                            </style>
                        </head>
                        <body style="margin:0; padding:0; background: white;">
                            <div id="${elementId}" style="visibility: visible !important; position: relative !important; width: fit-content !important;">
                                ${element.innerHTML}
                            </div>
                        </body>
                        </html>
                    `,
                    fileName
                })
            });

            if (!response.ok) throw new Error('Cloud capture failed');
            blob = await response.blob();
        } catch (fetchError) {
            console.warn('⚠️ Falha no Cloud Capture, tentando captura local...', fetchError);
            // Local fallback using html2canvas
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                onclone: (doc) => {
                    const el = doc.getElementById(elementId);
                    if (el) {
                        el.querySelectorAll('[data-html2canvas-ignore], .print\\:hidden').forEach(node => {
                            (node as HTMLElement).style.display = 'none';
                        });
                    }
                }
            });
            blob = await new Promise((resolve) => canvas.toBlob(b => resolve(b!), 'image/png'));
        }

        const file = new File([blob], `${fileName}.png`, { type: 'image/png' });

        // Step 1: Try Native Share (Best for Mobile WhatsApp)
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({
                    files: [file],
                    title: 'Relatório Mortalidade',
                    text: 'Segue relatório de mortalidade e consumo.'
                });
                return { success: true, method: 'share' };
            } catch (shareErr) {
                console.warn('Share API interrupted:', shareErr);
            }
        }

        // Step 2: Try Clipboard (Best for Desktop WhatsApp Web)
        if (navigator.clipboard && window.ClipboardItem) {
            try {
                await navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': blob })
                ]);
                return { success: true, method: 'clipboard' };
            } catch (clipErr) {
                console.warn('Clipboard failed:', clipErr);
            }
        }

        // Step 3: Last Resort - Manual Download
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${fileName}.png`;
        link.click();
        return { success: true, method: 'download' };

    } catch (error) {
        console.error('❌ Erro fatal no compartilhamento:', error);
        return { success: false, error };
    }
};
