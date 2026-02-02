import html2canvas from 'html2canvas';
// @ts-ignore
import html2pdf from 'html2pdf.js';
// @ts-ignore
import jsPDF from 'jspdf';

/**
 * Preload all images in an element to ensure they're ready for export
 */
const preloadImages = async (element: HTMLElement): Promise<void> => {
    const images = element.querySelectorAll('img');
    await Promise.all(
        Array.from(images).map((img) => {
            return new Promise<void>((resolve) => {
                if (img.complete && img.naturalHeight !== 0) {
                    resolve();
                } else {
                    img.onload = () => resolve();
                    img.onerror = () => resolve();
                    // Timeout fallback
                    setTimeout(resolve, 2000);
                }
            });
        })
    );
};

/**
 * Exports an element to PDF using html2canvas + jsPDF for reliable rendering
 */
export const exportToPdf = async (elementId: string, fileName: string, customOptions: any = {}) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    console.log('🔄 Preparing PDF export...');

    // Preload all images and fonts
    await Promise.all([
        preloadImages(element),
        document.fonts.ready
    ]);

    console.log('✅ Assets loaded, generating PDF...');

    try {
        // First, capture the element as a canvas using html2canvas
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            letterRendering: true,
            logging: false,
            backgroundColor: '#ffffff',
            onclone: (clonedDoc: any) => {
                // Remove margins and padding from the cloned element
                const clonedElement = clonedDoc.getElementById(elementId);
                if (clonedElement) {
                    clonedElement.style.margin = '0';
                    clonedElement.style.marginTop = '0';
                    clonedElement.style.paddingBottom = '0';
                    clonedElement.style.WebkitPrintColorAdjust = 'exact';
                    clonedElement.style.printColorAdjust = 'exact';
                }

                // Hide elements that should not appear in export
                const hiddenElements = clonedDoc.querySelectorAll('.print\\:hidden, .hidden-in-export');
                hiddenElements.forEach((hiddenEl: any) => {
                    hiddenEl.style.display = 'none';
                });
            }
        });

        // Get canvas dimensions
        const imgWidth = 287; // A4 landscape width in mm (with small margin)
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const pageHeight = 200; // A4 landscape height in mm

        // Create PDF
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        // Convert canvas to image data
        const imgData = canvas.toDataURL('image/jpeg', 0.98);

        // If content fits on one page, add it directly
        if (imgHeight <= pageHeight) {
            pdf.addImage(imgData, 'JPEG', 5, 5, imgWidth, imgHeight);
        } else {
            // Multi-page: split the image across pages
            let heightLeft = imgHeight;
            let position = 5;
            let page = 0;

            while (heightLeft > 0) {
                if (page > 0) {
                    pdf.addPage();
                }

                pdf.addImage(imgData, 'JPEG', 5, position - (page * pageHeight), imgWidth, imgHeight);
                heightLeft -= pageHeight;
                page++;
            }
        }

        pdf.save(`${fileName}.pdf`);
        console.log('✅ PDF exported successfully!');
    } catch (error) {
        console.error('❌ PDF generation failed:', error);
        // Fallback to html2pdf
        const fallbackOpt = {
            margin: [5, 5],
            filename: `${fileName}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
        };
        await html2pdf().set(fallbackOpt).from(element).save();
    }
};

/**
 * Exports an element to PNG.
 */
export const exportToPng = async (elementId: string, fileName: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    try {
        console.log('🔄 Preparing PNG export...');

        // Preload all images and wait for fonts
        await Promise.all([
            preloadImages(element),
            checkFonts(),
            document.fonts.ready
        ]);

        console.log('✅ Assets loaded, generating PNG...');

        const canvas = await html2canvas(element, {
            scale: 3, // Ultra-HD Resolution
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            logging: false,
            imageTimeout: 5000,
            onclone: (clonedDoc) => {
                const el = clonedDoc.getElementById(elementId);
                if (el) {
                    // Ensure visibility
                    el.style.visibility = 'visible';
                    el.style.opacity = '1';
                    el.style.position = 'relative';
                    el.style.left = '0';
                    el.style.display = 'block';

                    // Apply print color adjust
                    (el.style as any).WebkitPrintColorAdjust = 'exact';
                    (el.style as any).printColorAdjust = 'exact';

                    // Hide elements marked for exclusion
                    const hiddenElements = clonedDoc.querySelectorAll('.print\\:hidden, .hidden-in-export');
                    hiddenElements.forEach((hiddenEl: any) => {
                        hiddenEl.style.display = 'none';
                        hiddenEl.style.visibility = 'hidden';
                        hiddenEl.style.opacity = '0';
                    });

                    // Remove scroll containers
                    const scrollable = el.querySelector('.overflow-x-auto');
                    if (scrollable) (scrollable as HTMLElement).style.overflow = 'visible';
                }
            }
        });

        const link = document.createElement('a');
        link.download = `${fileName}.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();

        console.log('✅ PNG exported successfully!');
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
