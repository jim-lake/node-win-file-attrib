const FileAttrib = require('../dist/index.js');

const path = process.argv[2];

if (!path) {
  console.log('Usage: get <path>');
  process.exit(-1);
}
if (FileAttrib._slowApi()) {
  console.log('slow get:', path);
} else {
  console.log('fast get:', path);
}

try {
  FileAttrib.getAttributes(path, (err, result) => {
    if (err) {
      console.error('failed:', err);
    } else {
      console.log('success:', result);
    }
  });
} catch (e) {
  console.error('threw:', e?.errno, e);
}
