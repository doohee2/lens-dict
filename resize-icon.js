const sharp = require('sharp');

async function processIcon() {
  const input = 'lens-dict-design/lens_dictionary_pwa_icon/screen.png';
  
  try {
    // 512x512 icon (Standard PWA / iOS)
    await sharp(input)
      .resize(512, 512, { 
        fit: 'cover',
        position: 'center'
      })
      // Optional: Add a rounded corner mask if the original has jagged edges or if user wants it refined
      .composite([{
        input: Buffer.from(
          `<svg><rect x="0" y="0" width="512" height="512" rx="100" ry="100"/></svg>`
        ),
        blend: 'dest-in'
      }])
      .png()
      .toFile('public/icon-512x512.png');
      
    // 192x192 icon (Android)
    await sharp(input)
      .resize(192, 192, { 
        fit: 'cover',
        position: 'center'
      })
      .composite([{
        input: Buffer.from(
          `<svg><rect x="0" y="0" width="192" height="192" rx="38" ry="38"/></svg>`
        ),
        blend: 'dest-in'
      }])
      .png()
      .toFile('public/icon-192x192.png');
      
    console.log('Successfully generated resized and edge-refined PWA icons!');
  } catch (err) {
    console.error('Error processing image:', err);
  }
}

processIcon();
