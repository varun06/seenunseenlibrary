const fs = require('fs');
const path = require('path');

// Create necessary directories if they don't exist
const dirs = [
  path.join(__dirname, '../public/data'),
  path.join(__dirname, '../public/images/covers'),
];

console.log('📁 Creating necessary directories...\n');

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created: ${dir}`);
  } else {
    console.log(`✓ Already exists: ${dir}`);
  }
});

console.log('\n✅ All directories ready!\n');

