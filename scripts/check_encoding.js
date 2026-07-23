const fs = require('fs');
const JSZip = require('jszip');

async function checkEncoding() {
  const data = fs.readFileSync('C:\\Users\\doohe\\OneDrive\\Desktop\\바이브코딩\\lens-dict\\stardict\\Dong-A_Prime_EKKE_Dictionary.zip');
  const zip = await JSZip.loadAsync(data);
  
  const idxFile = zip.files['Dong-A_Prime_EKKE_Dictionary.idx'];
  const dictFile = zip.files['Dong-A_Prime_EKKE_Dictionary.dict'];
  
  const idxBuffer = await idxFile.async('uint8array');
  const dictBuffer = await dictFile.async('uint8array');
  
  // Find a word with non-ascii characters
  let offset = 0;
  let found = 0;
  
  while (offset < idxBuffer.length && found < 5) {
    const start = offset;
    let hasNonAscii = false;
    while(idxBuffer[offset] !== 0) {
      if (idxBuffer[offset] > 127) {
        hasNonAscii = true;
      }
      offset++;
    }
    const wordBuf = idxBuffer.slice(start, offset);
    offset++; // skip \0
    
    const dataView = new DataView(idxBuffer.buffer, idxBuffer.byteOffset, idxBuffer.byteLength);
    const dataOffset = dataView.getUint32(offset, false); // big endian
    offset += 4;
    const dataSize = dataView.getUint32(offset, false);
    offset += 4;
    
    if (hasNonAscii || found > 0) {
      if (hasNonAscii) {
        found++;
        console.log('--- Non-ASCII Word found ---');
        const wordUtf8 = new TextDecoder('utf-8').decode(wordBuf);
        const wordEucKr = new TextDecoder('euc-kr').decode(wordBuf);
        console.log(`Word (UTF-8): ${wordUtf8}`);
        console.log(`Word (EUC-KR): ${wordEucKr}`);
        
        const defBuf = dictBuffer.slice(dataOffset, dataOffset + dataSize);
        const defUtf8 = new TextDecoder('utf-8').decode(defBuf);
        const defEucKr = new TextDecoder('euc-kr').decode(defBuf);
        console.log(`Def snippet (UTF-8): ${defUtf8.substring(100, 200)}`);
        console.log(`Def snippet (EUC-KR): ${defEucKr.substring(100, 200)}`);
      }
    }
  }
}

checkEncoding().catch(console.error);
