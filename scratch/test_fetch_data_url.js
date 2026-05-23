async function main() {
    try {
        const base64Pdf = "JVBERi0xLjQKMSAwIG9iagogIDw8IC9UeXBlIC9DYXRhbG9nCiAgICAgL1BhZ2VzIDIgMCBSCiAgPj4KZW5kb2JqCjIgMCBvYmoKICA8PCAvVHlwZSAvUGFnZXMKICAgICAvS2lkcyBbIDMgMCBSIF0KICAgICAvQ291bnQgMQogID4+CmVuZG9iagozIDAgb2JqCiAgPDwgL1R5cGUgL1BhZ2UKICAgICAvUGFyZW50IDIgMCBSCiAgICAgL01lZGlhQm94IFsgMCAwIDYxMiA3OTIgXQogID4+CmVuZG9iagp4cmVmCjAgNAowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMDkgMDAwMDAgbiAKMDAwMDAwMDA2NCAwMDAwMCBuIAowMDAwMDAwMTIxIDAwMDAwIG4gCnRyYWlsZXIKICA8PCAvU2l6ZSA0CiAgICAgL1Jvb3QgMSAwIFIKICA+PgpzdGFydHhyZWYKMTc4CiUlRU9GCg==";
        const dataUrl = "data:application/pdf;base64," + base64Pdf;
        
        console.log("Fetching data URL...");
        const res = await fetch(dataUrl);
        const buffer = await res.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        console.log("Fetch success! Decoded bytes length:", bytes.length);
        console.log("First 5 bytes:", bytes.slice(0, 5));
    } catch (e) {
        console.error("Fetch failed:", e);
    }
}

main();
