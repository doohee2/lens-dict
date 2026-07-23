import JSZip from 'jszip';
import { db, DictionaryEntry } from './db';

// This is necessary to let TypeScript know about the postMessage API in a Web Worker
const ctx: Worker = self as any;

ctx.addEventListener('message', async (event) => {
  if (event.data.type === 'PARSE_DICT') {
    const file: File = event.data.payload;
    try {
      await parseAndStore(file);
      ctx.postMessage({ type: 'COMPLETE' });
    } catch (error: any) {
      ctx.postMessage({ type: 'ERROR', error: error.message });
    }
  }
});

async function parseAndStore(file: File) {
  ctx.postMessage({ type: 'PROGRESS', progress: 0, message: 'Loading ZIP file...' });

  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(file);
  
  let idxFile: JSZip.JSZipObject | undefined;
  let dictFile: JSZip.JSZipObject | undefined;

  for (const filename of Object.keys(loadedZip.files)) {
    if (filename.endsWith('.idx')) {
      idxFile = loadedZip.files[filename];
    } else if (filename.endsWith('.dict')) {
      dictFile = loadedZip.files[filename];
    }
  }

  if (!idxFile || !dictFile) {
    throw new Error('Could not find .idx or .dict file in the ZIP archive.');
  }

  ctx.postMessage({ type: 'PROGRESS', progress: 10, message: 'Decompressing dictionary files...' });
  
  const idxBuffer = await idxFile.async('uint8array');
  const dictBuffer = await dictFile.async('uint8array');

  ctx.postMessage({ type: 'PROGRESS', progress: 30, message: 'Clearing previous dictionary data...' });
  await db.dictionary.clear();
  await db.resources.clear();

  ctx.postMessage({ type: 'PROGRESS', progress: 35, message: 'Extracting resource images...' });
  const resourceEntries: { filename: string; data: string }[] = [];
  
  for (const filename of Object.keys(loadedZip.files)) {
    if (filename.startsWith('res/') && !loadedZip.files[filename].dir) {
      const base64Data = await loadedZip.files[filename].async('base64');
      const name = filename.split('/').pop();
      if (name) {
        resourceEntries.push({ filename: name, data: `data:image/jpeg;base64,${base64Data}` });
      }
    }
  }

  if (resourceEntries.length > 0) {
    await db.resources.bulkPut(resourceEntries);
  }

  ctx.postMessage({ type: 'PROGRESS', progress: 40, message: 'Parsing and storing dictionary data...' });

  const totalBytes = idxBuffer.length;
  let offset = 0;
  
  const CHUNK_SIZE = 10000;
  let entries: DictionaryEntry[] = [];
  
  let lastReportedProgress = 40;
  
  const textDecoder = new TextDecoder('utf-8');
  const dataView = new DataView(idxBuffer.buffer, idxBuffer.byteOffset, idxBuffer.byteLength);

  while (offset < totalBytes) {
    const start = offset;
    // Find null terminator for word
    while (offset < totalBytes && idxBuffer[offset] !== 0) {
      offset++;
    }
    
    if (offset >= totalBytes) break;
    
    const wordBuf = idxBuffer.slice(start, offset);
    const word = textDecoder.decode(wordBuf);
    
    offset++; // Skip null terminator
    
    if (offset + 8 > totalBytes) break;
    
    const dataOffset = dataView.getUint32(offset, false);
    offset += 4;
    
    const dataSize = dataView.getUint32(offset, false);
    offset += 4;
    
    const defBuf = dictBuffer.slice(dataOffset, dataOffset + dataSize);
    const definition = textDecoder.decode(defBuf);
    
    entries.push({ word, definition });
    
    if (entries.length >= CHUNK_SIZE) {
      await db.dictionary.bulkPut(entries);
      entries = [];
      
      const currentProgress = 40 + Math.floor((offset / totalBytes) * 60);
      if (currentProgress > lastReportedProgress) {
        lastReportedProgress = currentProgress;
        ctx.postMessage({ type: 'PROGRESS', progress: currentProgress, message: `Stored... (${Math.round((offset / totalBytes) * 100)}%)` });
      }
    }
  }
  
  if (entries.length > 0) {
    await db.dictionary.bulkPut(entries);
  }
  
  ctx.postMessage({ type: 'PROGRESS', progress: 100, message: 'Dictionary parsing complete!' });
}
