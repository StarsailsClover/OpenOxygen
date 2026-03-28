const native = require('./build/Release/openoxygen_native.node');
console.log('Module loaded successfully!');
console.log('Available functions:', Object.keys(native));

// Test mouse get position
const pos = native.mouseGetPosition();
console.log('Mouse position:', pos);

// Test mouse move
console.log('Moving mouse...');
native.mouseMove(100, 100);
console.log('Mouse moved!');
