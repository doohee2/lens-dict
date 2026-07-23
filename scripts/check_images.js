const fs = require('fs');
const JSZip = require('jszip');

async function checkImages() {
  const data = fs.readFileSync('C:\\Users\\doohe\\OneDrive\\Desktop\\바이브코딩\\lens-dict\\stardict\\Dong-A_Prime_EKKE_Dictionary.zip');
  const zip = await JSZip.loadAsync(data);
  
  let imgCount = 0;
  let totalSize = 0;
  
  for (const [filename, file] of Object.entries(zip.files)) {
    if (filename.startsWith('res/') && !file.dir) {
      imgCount++;
      const buffer = await file.async('uint8array');
      totalSize += buffer.length;
    }
  }
  
  console.log(`Total images: ${imgCount}`);
  console.log(`Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
}

checkImages().catch(console.error);
