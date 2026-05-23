const { PDFDocument } = require('pdf-lib');

async function main() {
    try {
        const doc1 = await PDFDocument.create();
        const page1 = doc1.addPage([200, 300]);
        page1.drawText("Doc 1 Page 1");
        
        const doc2 = await PDFDocument.create();
        const page2 = doc2.addPage([200, 300]);
        page2.drawText("Doc 2 Page 1");
        
        const mergedDoc = await PDFDocument.create();
        
        // Test embedPages
        console.log("Calling embedPages...");
        const embeddedPages = await mergedDoc.embedPages([page1, page2]);
        console.log("embedPages success! Embedded count:", embeddedPages.length);
        
        const newPage = mergedDoc.addPage([200, 300]);
        newPage.drawPage(embeddedPages[0], { x: 0, y: 0, width: 200, height: 300 });
        
        const bytes = await mergedDoc.save();
        console.log("Merged document saved successfully! Bytes length:", bytes.length);
    } catch (e) {
        console.error("Error occurred:", e);
    }
}

main();
