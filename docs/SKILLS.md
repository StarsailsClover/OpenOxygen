# OpenOxygen Skills Documentation

## Overview

OpenOxygen provides a comprehensive skill library for automation tasks.

## Skill Categories

### 1. Office Automation

#### Word Operations

```typescript
// Create Word document
const result = await skillRegistry.execute("office.word.create", {
  path: "document.docx",
  content: "Hello World"
});

// Read Word document
const result = await skillRegistry.execute("office.word.read", "document.docx");

// Edit Word document
const result = await skillRegistry.execute("office.word.edit", "document.docx", [
  { find: "old", replace: "new" }
]);
```

#### Excel Operations

```typescript
// Create Excel workbook
const result = await skillRegistry.execute("office.excel.create", {
  path: "data.xlsx",
  sheets: [{ name: "Sheet1", data: [["A", "B"], [1, 2]] }]
});

// Read Excel sheet
const result = await skillRegistry.execute("office.excel.read", "data.xlsx", "Sheet1");

// Write Excel cell
const result = await skillRegistry.execute("office.excel.write", "data.xlsx", "Sheet1", "A1", "Value");
```

#### PowerPoint Operations

```typescript
// Create PowerPoint
const result = await skillRegistry.execute("office.powerpoint.create", {
  path: "presentation.pptx",
  slides: [{ title: "Slide 1", content: ["Point 1", "Point 2"] }]
});
```

#### PDF Operations

```typescript
// Convert to PDF
const result = await skillRegistry.execute("office.pdf.convert", "document.docx", "document.pdf");

// Merge PDFs
const result = await skillRegistry.execute("office.pdf.merge", ["file1.pdf", "file2.pdf"], "merged.pdf");
```

### 2. Browser Automation

```typescript
// Launch browser
const result = await skillRegistry.execute("browser.launch", { headless: false });
const browserId = result.data.browserId;

// Navigate
await skillRegistry.execute("browser.navigate", browserId, "https://example.com");

// Click element
await skillRegistry.execute("browser.click", browserId, { type: "css", value: "#button" });

// Type text
await skillRegistry.execute("browser.type", browserId, { type: "css", value: "#input" }, "Hello");

// Take screenshot
const result = await skillRegistry.execute("browser.screenshot", browserId, { fullPage: true });

// Close browser
await skillRegistry.execute("browser.close", browserId);
```

### 3. System Operations

#### File Operations

```typescript
// List files
const result = await skillRegistry.execute("system.file.list", "/path/to/dir");

// Read file
const result = await skillRegistry.execute("system.file.read", "/path/to/file.txt");

// Write file
await skillRegistry.execute("system.file.write", "/path/to/file.txt", "Content");

// Copy file
await skillRegistry.execute("system.file.copy", "/src/file.txt", "/dst/file.txt");

// Move file
await skillRegistry.execute("system.file.move", "/src/file.txt", "/dst/file.txt");

// Delete file
await skillRegistry.execute("system.file.delete", "/path/to/file.txt");
```

#### Clipboard Operations

```typescript
// Get clipboard
const result = await skillRegistry.execute("system.clipboard.get");

// Set clipboard
await skillRegistry.execute("system.clipboard.set", "Text to copy");

// Clear clipboard
await skillRegistry.execute("system.clipboard.clear");
```

#### Desktop Organization

```typescript
// Organize desktop
await skillRegistry.execute("system.desktop.organize");

// Clean temp files
await skillRegistry.execute("system.temp.clean");

// Get system info
const result = await skillRegistry.execute("system.info");
```

### 4. Multimodal Processing

```typescript
// Transcribe audio
const result = await multimodal.transcribeAudio(audioBuffer, {
  model: "whisper",
  language: "zh"
});

// Text to speech
const result = await multimodal.textToSpeech("Hello", {
  voice: "female",
  speed: 1.0
});

// Analyze image
const result = await multimodal.analyzeImage(imageBuffer, "Describe this image");

// Detect UI elements
const result = await multimodal.detectUIElements(screenshot);
```

## Skill Registration

### Register Custom Skill

```typescript
import { registerSkill } from "./skills/registry";

registerSkill({
  id: "custom.skill",
  name: "Custom Skill",
  description: "My custom automation skill",
  category: "custom",
  handler: async (param1: string, param2: number) => {
    // Implementation
    return {
      success: true,
      data: { result: "success" }
    };
  }
});
```

## Error Handling

All skills return a `ToolResult`:

```typescript
interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  durationMs?: number;
}
```

Example error handling:

```typescript
const result = await skillRegistry.execute("office.word.read", "nonexistent.docx");

if (!result.success) {
  console.error("Failed:", result.error);
  // Handle error
} else {
  console.log("Success:", result.data);
}
```

## Best Practices

1. **Always check success status**
2. **Use appropriate error handling**
3. **Clean up resources** (close browsers, etc.)
4. **Use batch operations** when possible
5. **Cache results** for expensive operations

## Performance Tips

- Reuse browser instances
- Batch file operations
- Use headless mode for automation
- Enable caching where available
