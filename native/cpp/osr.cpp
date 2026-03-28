/**
 * OpenOxygen Native - OSR (OxygenStepRecorder) (C++)
 * 
 * 记录操作并同步截屏
 * 用于训练 OUV
 * 
 * 基于人类规划:
 * - 26w15aB-26w15aHRoadmap.md: "OSR(OxygenStepRecorder,一种记录操作并同步截屏的系统"
 * - 2603141948.md: "训练OxygenUltraVision并教会它反思和重来与试错的能力"
 */

#include <windows.h>
#include <node_api.h>
#include <string>
#include <vector>
#include <chrono>
#include <fstream>

// Step types
enum class StepType {
    MOUSE_MOVE,
    MOUSE_CLICK,
    MOUSE_DRAG,
    KEY_PRESS,
    KEY_COMBINATION,
    TYPE_TEXT,
    WINDOW_FOCUS,
    SCREENSHOT,
    DELAY
};

// Recorded step
struct RecordedStep {
    std::string id;
    StepType type;
    int64_t timestamp;
    std::string data;
    std::string screenshotPath;
};

// Recording session
struct RecordingSession {
    std::string id;
    std::string name;
    int64_t startTime;
    int64_t endTime;
    std::vector<RecordedStep> steps;
    bool isRecording;
    std::string outputDir;
};

// Global session
static RecordingSession g_session;

/**
 * Generate unique ID
 */
std::string GenerateId() {
    static int counter = 0;
    char buffer[32];
    sprintf_s(buffer, "step_%d_%lld", counter++, 
        std::chrono::duration_cast<std::chrono::milliseconds>(
            std::chrono::steady_clock::now().time_since_epoch()).count());
    return std::string(buffer);
}

/**
 * Get current timestamp
 */
int64_t GetTimestamp() {
    return std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::steady_clock::now().time_since_epoch()).count();
}

/**
 * Capture screenshot
 */
BOOL CaptureScreenshot(const std::string& outputPath) {
    // Get screen dimensions
    int screenWidth = GetSystemMetrics(SM_CXSCREEN);
    int screenHeight = GetSystemMetrics(SM_CYSCREEN);
    
    // Create DC
    HDC hScreenDC = GetDC(NULL);
    HDC hMemoryDC = CreateCompatibleDC(hScreenDC);
    
    // Create bitmap
    HBITMAP hBitmap = CreateCompatibleBitmap(hScreenDC, screenWidth, screenHeight);
    HBITMAP hOldBitmap = (HBITMAP)SelectObject(hMemoryDC, hBitmap);
    
    // Copy screen to bitmap
    BitBlt(hMemoryDC, 0, 0, screenWidth, screenHeight, hScreenDC, 0, 0, SRCCOPY);
    
    // Save to file (simplified - would use proper image encoding)
    // For now, just create a placeholder
    std::ofstream file(outputPath + ".raw", std::ios::binary);
    if (file.is_open()) {
        // Write bitmap data
        BITMAPINFOHEADER bi;
        bi.biSize = sizeof(BITMAPINFOHEADER);
        bi.biWidth = screenWidth;
        bi.biHeight = -screenHeight; // Top-down
        bi.biPlanes = 1;
        bi.biBitCount = 32;
        bi.biCompression = BI_RGB;
        bi.biSizeImage = 0;
        bi.biXPelsPerMeter = 0;
        bi.biYPelsPerMeter = 0;
        bi.biClrUsed = 0;
        bi.biClrImportant = 0;
        
        file.write((char*)&bi, sizeof(bi));
        
        // Get bitmap bits
        int size = screenWidth * screenHeight * 4;
        std::vector<BYTE> buffer(size);
        GetDIBits(hMemoryDC, hBitmap, 0, screenHeight, buffer.data(), 
            (BITMAPINFO*)&bi, DIB_RGB_COLORS);
        
        file.write((char*)buffer.data(), size);
        file.close();
    }
    
    // Cleanup
    SelectObject(hMemoryDC, hOldBitmap);
    DeleteObject(hBitmap);
    DeleteDC(hMemoryDC);
    ReleaseDC(NULL, hScreenDC);
    
    return TRUE;
}

/**
 * Start recording
 */
BOOL OSR_StartRecording(const char* name, const char* outputDir) {
    if (g_session.isRecording) {
        return FALSE;
    }
    
    g_session.id = GenerateId();
    g_session.name = name;
    g_session.startTime = GetTimestamp();
    g_session.endTime = 0;
    g_session.steps.clear();
    g_session.isRecording = true;
    g_session.outputDir = outputDir;
    
    // Create output directory
    CreateDirectoryA(outputDir, NULL);
    
    return TRUE;
}

/**
 * Stop recording
 */
BOOL OSR_StopRecording() {
    if (!g_session.isRecording) {
        return FALSE;
    }
    
    g_session.endTime = GetTimestamp();
    g_session.isRecording = false;
    
    // Save recording to file
    std::string filename = g_session.outputDir + "/" + g_session.id + ".osr";
    std::ofstream file(filename);
    if (file.is_open()) {
        file << "OSR Recording\n";
        file << "ID: " << g_session.id << "\n";
        file << "Name: " << g_session.name << "\n";
        file << "Start: " << g_session.startTime << "\n";
        file << "End: " << g_session.endTime << "\n";
        file << "Steps: " << g_session.steps.size() << "\n";
        file << "---\n";
        
        for (const auto& step : g_session.steps) {
            file << step.timestamp << "|" << (int)step.type << "|" << step.data << "\n";
        }
        
        file.close();
    }
    
    return TRUE;
}

/**
 * Record mouse move
 */
BOOL OSR_RecordMouseMove(int x, int y) {
    if (!g_session.isRecording) return FALSE;
    
    RecordedStep step;
    step.id = GenerateId();
    step.type = StepType::MOUSE_MOVE;
    step.timestamp = GetTimestamp();
    char buffer[64];
    sprintf_s(buffer, "x:%d,y:%d", x, y);
    step.data = buffer;
    
    g_session.steps.push_back(step);
    return TRUE;
}

/**
 * Record mouse click
 */
BOOL OSR_RecordMouseClick(int x, int y, int button) {
    if (!g_session.isRecording) return FALSE;
    
    // Capture screenshot
    std::string screenshotPath = g_session.outputDir + "/" + GenerateId();
    CaptureScreenshot(screenshotPath);
    
    RecordedStep step;
    step.id = GenerateId();
    step.type = StepType::MOUSE_CLICK;
    step.timestamp = GetTimestamp();
    char buffer[128];
    sprintf_s(buffer, "x:%d,y:%d,button:%d", x, y, button);
    step.data = buffer;
    step.screenshotPath = screenshotPath;
    
    g_session.steps.push_back(step);
    return TRUE;
}

/**
 * Record key press
 */
BOOL OSR_RecordKeyPress(int keyCode) {
    if (!g_session.isRecording) return FALSE;
    
    RecordedStep step;
    step.id = GenerateId();
    step.type = StepType::KEY_PRESS;
    step.timestamp = GetTimestamp();
    char buffer[32];
    sprintf_s(buffer, "key:%d", keyCode);
    step.data = buffer;
    
    g_session.steps.push_back(step);
    return TRUE;
}

/**
 * Record text input
 */
BOOL OSR_RecordTypeText(const char* text) {
    if (!g_session.isRecording) return FALSE;
    
    RecordedStep step;
    step.id = GenerateId();
    step.type = StepType::TYPE_TEXT;
    step.timestamp = GetTimestamp();
    step.data = text;
    
    g_session.steps.push_back(step);
    return TRUE;
}

/**
 * Record window focus
 */
BOOL OSR_RecordWindowFocus(const char* windowTitle, const char* app) {
    if (!g_session.isRecording) return FALSE;
    
    RecordedStep step;
    step.id = GenerateId();
    step.type = StepType::WINDOW_FOCUS;
    step.timestamp = GetTimestamp();
    char buffer[512];
    sprintf_s(buffer, "title:%s,app:%s", windowTitle, app);
    step.data = buffer;
    
    g_session.steps.push_back(step);
    return TRUE;
}

// Node-API bindings
napi_value OSR_StartRecordingJS(napi_env env, napi_callback_info info) {
    size_t argc = 2;
    napi_value args[2];
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
    
    char name[256], outputDir[512];
    size_t nameLen, dirLen;
    napi_get_value_string_utf8(env, args[0], name, 256, &nameLen);
    napi_get_value_string_utf8(env, args[1], outputDir, 512, &dirLen);
    
    BOOL result = OSR_StartRecording(name, outputDir);
    
    napi_value returnVal;
    napi_get_boolean(env, result, &returnVal);
    return returnVal;
}

napi_value OSR_StopRecordingJS(napi_env env, napi_callback_info info) {
    BOOL result = OSR_StopRecording();
    
    napi_value returnVal;
    napi_get_boolean(env, result, &returnVal);
    return returnVal;
}

napi_value OSR_RecordMouseClickJS(napi_env env, napi_callback_info info) {
    size_t argc = 3;
    napi_value args[3];
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
    
    int32_t x, y, button;
    napi_get_value_int32(env, args[0], &x);
    napi_get_value_int32(env, args[1], &y);
    napi_get_value_int32(env, args[2], &button);
    
    BOOL result = OSR_RecordMouseClick(x, y, button);
    
    napi_value returnVal;
    napi_get_boolean(env, result, &returnVal);
    return returnVal;
}

napi_value Init(napi_env env, napi_value exports) {
    napi_property_descriptor desc[] = {
        { "startRecording", nullptr, OSR_StartRecordingJS, nullptr, nullptr, nullptr, napi_default, nullptr },
        { "stopRecording", nullptr, OSR_StopRecordingJS, nullptr, nullptr, nullptr, napi_default, nullptr },
        { "recordMouseClick", nullptr, OSR_RecordMouseClickJS, nullptr, nullptr, nullptr, napi_default, nullptr },
    };
    
    napi_define_properties(env, exports, 3, desc);
    return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
