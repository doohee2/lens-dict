const fs = require('fs');
const JSZip = require('jszip');

async function testIdx() {
  const data = fs.readFileSync(require('path').join(__dirname, '../stardict/Dong-A_Prime_EKKE_Dictionary.zip'));
  const zip = await JSZip.loadAsync(data);
  
  const idxFile = zip.files['Dong-A_Prime_EKKE_Dictionary.idx'];
  const dictFile = zip.files['Dong-A_Prime_EKKE_Dictionary.dict'];
  
  const idxBuffer = await idxFile.async('uint8array');
  const dictBuffer = await dictFile.async('uint8array');
  
  console.log('Idx size:', idxBuffer.length);
  console.log('Dict size:', dictBuffer.length);
  
  // Parse first 5 entries
  let offset = 0;
  for (let i = 0; i < 5; i++) {
    const start = offset;
    while(idxBuffer[offset] !== 0) {
      offset++;
    }
    const wordBuf = idxBuffer.slice(start, offset);
    const word = new TextDecoder('utf-8').decode(wordBuf);
    offset++; // skip \0
    
    const dataView = new DataView(idxBuffer.buffer, idxBuffer.byteOffset, idxBuffer.byteLength);
    const dataOffset = dataView.getUint32(offset, false); // big endian
    offset += 4;
    const dataSize = dataView.getUint32(offset, false);
    offset += 4;
    
    console.log(`Word: ${word}, Offset: ${dataOffset}, Size: ${dataSize}`);
    
    // Read definition
    const defBuf = dictBuffer.slice(dataOffset, dataOffset + dataSize);
    const defUtf8 = new TextDecoder('utf-8').decode(defBuf);
    
    console.log(`Def (UTF-8): ${defUtf8.substring(0, 100)}...`);
  }
}

testIdx().catch(console.error);
