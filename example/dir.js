const FileAttrib = require('../dist/index.js');

const path = process.argv[2];

if (!path) {
  console.log('Usage: dir <path>');
  process.exit(-1);
}

console.log('dir:', path);
try {
  FileAttrib.queryDirectory(path, (err, list) => {
    if (err) {
      console.error('failed:', err, err?.errno?.toString?.(16));
    } else {
      console.log('success:', list.length, 'items');
      console.log(list);
    }
  });
} catch (e) {
  console.error('threw:', e?.errno?.toString?.(16), e);
}
