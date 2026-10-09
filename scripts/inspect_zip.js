const fs = require('fs');
const JSZip = require('jszip');

async function inspectZip() {
  const data = fs.readFileSync(require('path').join(__dirname, '../stardict/Dong-A_Prime_EKKE_Dictionary.zip'));
  const zip = await JSZip.loadAsync(data);
  
  console.log('Files in zip:');
  const files = Object.keys(zip.files);
  console.log(files);
  
  for (const filename of files) {
    if (filename.endsWith('.ifo')) {
      const ifoContent = await zip.files[filename].async('string');
      console.log('\n--- IFO Content ---');
      console.log(ifoContent);
    }
  }
}

inspectZip().catch(console.error);
