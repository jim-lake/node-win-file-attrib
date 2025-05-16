const FileAttrib = require('../dist/index.js');

const path = process.argv[2];
const attributes = parseInt(process.argv[3]);

if (!path || isNaN(attributes)) {
  console.log('Usage: set <path> <atrributes>');
  process.exit(-1);
}

console.log('set:', path, '0x' + attributes.toString(16));
try {
  FileAttrib.setAttributes(path, attributes, (err) => {
    if (err) {
      console.error('failed:', err);
    } else {
      console.log('success');
    }
  });
} catch (e) {
  console.error('threw:', e?.errno, e);
}
