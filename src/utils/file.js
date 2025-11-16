const fs = require('fs');
const path = require('path');

function saveMediaFile(buffer, mediaType = 'file') {
  const extMap = {
    imageMessage: '.jpg',
    videoMessage: '.mp4',
    documentMessage: '.pdf',
    audioMessage: '.mp3'
  };

  const extension = extMap[mediaType] || '.bin';
  const timestamp = Date.now();
  const fileName = `${mediaType}_${timestamp}${extension}`;
  const dir = path.resolve(__dirname, '../../media');

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const filePath = path.join(dir, fileName);
  fs.writeFileSync(filePath, buffer);

  return filePath;
}

module.exports = {
  saveMediaFile
};
