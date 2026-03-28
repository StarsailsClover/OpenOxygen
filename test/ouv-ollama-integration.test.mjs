/**
 * OUV + Ollama Integration Test
 * 
 * Tests:
 * 1. OUV visual understanding with Ollama LLM
 * 2. Mouse operations
 * 3. Keyboard operations
 * 4. Cross-platform compatibility
 */

import { 
  OUVVisualUnderstandingController,
  ensureOllamaRunning,
  getOllamaStatus,
  InferenceEngine,
  mouseMove,
  mouseClick,
  keyPress,
  typeText
} from '../dist/index.js';

const TESTS = {
  passed: 0,
  failed: 0,
  tests: []
};

function test(name, fn) {
  return { name, fn };
}

async function runTest(name, fn) {
  try {
    console.log(`\n🔄 Testing: ${name}`);
    await fn();
    TESTS.passed++;
    TESTS.tests.push({ name, passed: true });
    console.log(`✅ PASSED: ${name}`);
  } catch (error) {
    TESTS.failed++;
    TESTS.tests.push({ name, passed: false, error: error.message });
    console.error(`❌ FAILED: ${name}`);
    console.error(`   Error: ${error.message}`);
  }
}

// Test 1: Ollama Connection
test('Ollama Connection', async () => {
  const running = await ensureOllamaRunning();
  if (!running) {
    throw new Error('Ollama is not running');
  }
  
  const status = await getOllamaStatus();
  console.log(`   Ollama version: ${status.version}`);
  console.log(`   Available models: ${status.models.join(', ')}`);
});

// Test 2: OUV with Ollama
test('OUV Visual Understanding', async () => {
  const engine = new InferenceEngine({
    inference: {
      defaultModel: { provider: 'ollama', model: 'qwen3:7b' },
    },
  });
  
  const ouv = new OUVVisualUnderstandingController(engine);
  
  // Create a simple test screenshot (base64 encoded 1x1 pixel)
  const testScreenshot = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  
  const understanding = await ouv.understandScreen(testScreenshot, {
    includeScreenshot: false,
    confidenceThreshold: 0.5,
  });
  
  console.log(`   Elements detected: ${understanding.elements.length}`);
  console.log(`   Description: ${understanding.description.substring(0, 100)}...`);
  
  if (understanding.elements.length === 0) {
    console.log('   ⚠️  No elements detected (expected for test screenshot)');
  }
});

// Test 3: Mouse Operations
test('Mouse Operations', async () => {
  // Move mouse to center of screen
  const screenWidth = 1920;
  const screenHeight = 1080;
  const centerX = Math.floor(screenWidth / 2);
  const centerY = Math.floor(screenHeight / 2);
  
  console.log(`   Moving mouse to (${centerX}, ${centerY})`);
  const moved = await mouseMove(centerX, centerY);
  
  if (!moved) {
    console.log('   ⚠️  Mouse move returned false (native module may not be available)');
  }
  
  // Try to click
  console.log('   Attempting mouse click');
  const clicked = await mouseClick('left');
  
  if (!clicked) {
    console.log('   ⚠️  Mouse click returned false (native module may not be available)');
  }
});

// Test 4: Keyboard Operations
test('Keyboard Operations', async () => {
  // Type a test string
  const testString = 'Hello OpenOxygen';
  console.log(`   Typing: "${testString}"`);
  
  const typed = await typeText(testString);
  
  if (!typed) {
    console.log('   ⚠️  Type text returned false (native module may not be available)');
  }
  
  // Press a key
  console.log('   Pressing Escape key');
  const pressed = await keyPress('Escape');
  
  if (!pressed) {
    console.log('   ⚠️  Key press returned false (native module may not be available)');
  }
});

// Test 5: Cross-Platform Check
test('Cross-Platform Compatibility', async () => {
  const platform = process.platform;
  const arch = process.arch;
  
  console.log(`   Platform: ${platform}`);
  console.log(`   Architecture: ${arch}`);
  console.log(`   Node.js: ${process.version}`);
  
  const supportedPlatforms = ['win32', 'darwin', 'linux'];
  if (!supportedPlatforms.includes(platform)) {
    throw new Error(`Unsupported platform: ${platform}`);
  }
  
  console.log('   ✅ Platform is supported');
});

// Test 6: OUV Change Tracking
test('OUV Change Tracking', async () => {
  const engine = new InferenceEngine({
    inference: {
      defaultModel: { provider: 'ollama', model: 'qwen3:7b' },
    },
  });
  
  const ouv = new OUVVisualUnderstandingController(engine);
  
  const testScreenshot = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  
  // First understanding
  await ouv.understandScreen(testScreenshot, { trackChanges: true });
  
  // Second understanding (should track changes)
  await ouv.understandScreen(testScreenshot, { trackChanges: true });
  
  const changes = ouv.getChangeHistory();
  console.log(`   Changes tracked: ${changes.length}`);
  
  // Clear history
  ouv.clearHistory();
  console.log('   History cleared');
});

// Main test runner
async function runAllTests() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  OUV + Ollama Integration Test Suite');
  console.log('═══════════════════════════════════════════════════');
  console.log(`Platform: ${process.platform} (${process.arch})`);
  console.log(`Node.js: ${process.version}`);
  console.log('');
  
  const tests = [
    test('Ollama Connection', async () => {
      const running = await ensureOllamaRunning();
      if (!running) throw new Error('Ollama is not running');
      const status = await getOllamaStatus();
      console.log(`   Ollama: ${status.version}, Models: ${status.models.length}`);
    }),
    test('OUV Visual Understanding', async () => {
      const engine = new InferenceEngine({ inference: { defaultModel: { provider: 'ollama', model: 'qwen3:7b' } } });
      const ouv = new OUVVisualUnderstandingController(engine);
      const screenshot = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const understanding = await ouv.understandScreen(screenshot, { includeScreenshot: false });
      console.log(`   Elements: ${understanding.elements.length}`);
    }),
    test('Mouse Operations', async () => {
      const moved = await mouseMove(960, 540);
      console.log(`   Mouse move: ${moved ? 'OK' : 'N/A (no native module)'}`);
    }),
    test('Keyboard Operations', async () => {
      const typed = await typeText('test');
      console.log(`   Type text: ${typed ? 'OK' : 'N/A (no native module)'}`);
    }),
    test('Cross-Platform Check', async () => {
      const supported = ['win32', 'darwin', 'linux'];
      if (!supported.includes(process.platform)) throw new Error('Unsupported platform');
      console.log(`   Platform ${process.platform}: OK`);
    }),
  ];
  
  for (const t of tests) {
    await runTest(t.name, t.fn);
  }
  
  // Summary
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  Test Summary');
  console.log('═══════════════════════════════════════════════════');
  console.log(`Total: ${TESTS.passed + TESTS.failed}`);
  console.log(`Passed: ${TESTS.passed} ✅`);
  console.log(`Failed: ${TESTS.failed} ❌`);
  console.log('');
  
  if (TESTS.failed === 0) {
    console.log('🎉 All tests passed!');
  } else {
    console.log('⚠️  Some tests failed. Check output above.');
  }
  
  return TESTS.failed === 0;
}

// Run tests
runAllTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test suite error:', error);
  process.exit(1);
});
