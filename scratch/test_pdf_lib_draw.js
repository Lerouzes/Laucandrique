const { PDFDocument } = require('pdf-lib');

async function overlayPdfTemplate(quotePdfBytes, templateBase64) {
    const quoteDoc = await PDFDocument.load(quotePdfBytes);
    const templateBytes = Uint8Array.from(atob(templateBase64), c => c.charCodeAt(0));
    const templateDoc = await PDFDocument.load(templateBytes);
    
    const mergedDoc = await PDFDocument.create();
    
    const quotePages = quoteDoc.getPages();
    const templatePages = templateDoc.getPages();
    
    const embeddedQuotePages = await mergedDoc.embedPages(quotePages);
    const embeddedTemplatePages = await mergedDoc.embedPages(templatePages);
    
    for (let i = 0; i < quotePages.length; i++) {
        const quotePage = quotePages[i];
        const { width, height } = quotePage.getSize();
        
        const newPage = mergedDoc.addPage([width, height]);
        
        if (templatePages.length > 0) {
            const templateIdx = Math.min(i, templatePages.length - 1);
            const backgroundPage = embeddedTemplatePages[templateIdx];
            newPage.drawPage(backgroundPage, {
                x: 0,
                y: 0,
                width: width,
                height: height,
            });
        }
        
        const foregroundPage = embeddedQuotePages[i];
        newPage.drawPage(foregroundPage, {
            x: 0,
            y: 0,
            width: width,
            height: height,
        });
    }
    
    return await mergedDoc.save();
}

async function main() {
    try {
        console.log("Generating dummy quote PDF...");
        const doc1 = await PDFDocument.create();
        const p1 = doc1.addPage([595.28, 841.89]);
        p1.drawText("Quote Content Page 1", { x: 50, y: 700 });
        const p2 = doc1.addPage([595.28, 841.89]);
        p2.drawText("Quote Content Page 2", { x: 50, y: 700 });
        const quotePdfBytes = await doc1.save();
        
        console.log("Generating dummy template PDF...");
        const doc2 = await PDFDocument.create();
        const t1 = doc2.addPage([595.28, 841.89]);
        t1.drawText("Template Background Page 1", { x: 50, y: 800 });
        const t2 = doc2.addPage([595.28, 841.89]);
        t2.drawText("Template Background Page 2", { x: 50, y: 800 });
        const templatePdfBytes = await doc2.save();
        const templateBase64 = Buffer.from(templatePdfBytes).toString('base64');
        
        console.log("Calling overlayPdfTemplate...");
        const mergedBytes = await overlayPdfTemplate(quotePdfBytes, templateBase64);
        console.log("Success! Merged bytes length:", mergedBytes.length);
    } catch (e) {
        console.error("Overlay failed:", e);
    }
}

main();
