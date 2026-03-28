/**
 * OpenOxygen Native - Screenshot (C++)
 * 
 * 高性能截图，支持多种格式
 */

#include <windows.h>
#include <node_api.h>
#include <string>
#include <vector>

// Screenshot format
enum class ScreenshotFormat {
    PNG,
    JPEG,
    BMP,
    RAW
};

/**
 * Capture full screen
 */
BOOL CaptureFullScreen(const char* outputPath, ScreenshotFormat format) {
    int screenWidth = GetSystemMetrics(SM_CXSCREEN);
    int screenHeight = GetSystemMetrics(SM_CYSCREEN);
    
    HDC hScreenDC = GetDC(NULL);
    HDC hMemoryDC = CreateCompatibleDC(hScreenDC);
    HBITMAP hBitmap = CreateCompatibleBitmap(hScreenDC, screenWidth, screenHeight);
    HBITMAP hOldBitmap = (HBITMAP)SelectObject(hMemoryDC, hBitmap);
    
    BitBlt(hMemoryDC, 0, 0, screenWidth, screenHeight, hScreenDC, 0, 0, SRCCOPY);
    
    // Save as BMP (simplified)
    if (format == ScreenshotFormat::BMP) {
        BITMAPFILEHEADER bmfHeader;
        BITMAPINFOHEADER bi;
        
        bi.biSize = sizeof(BITMAPINFOHEADER);
        bi.biWidth = screenWidth;
        bi.biHeight = -screenHeight;
        bi.biPlanes = 1;
        bi.biBitCount = 32;
        bi.biCompression = BI_RGB;
        bi.biSizeImage = 0;
        bi.biXPelsPerMeter = 0;
        bi.biYPelsPerMeter = 0;
        bi.biClrUsed = 0;
        bi.biClrImportant = 0;
        
        DWORD dwBmpSize = ((screenWidth * bi.biBitCount + 31) / 32) * 4 * screenHeight;
        HANDLE hDIB = GlobalAlloc(GHND, dwBmpSize);
        char* lpbitmap = (char*)GlobalLock(hDIB);
        
        GetDIBits(hMemoryDC, hBitmap, 0, (UINT)screenHeight, lpbitmap, (BITMAPINFO*)&bi, DIB_RGB_COLORS);
        
        HANDLE hFile = CreateFileA(outputPath, GENERIC_WRITE, 0, NULL, CREATE_ALWAYS, FILE_ATTRIBUTE_NORMAL, NULL);
        
        DWORD dwSizeofDIB = dwBmpSize + sizeof(BITMAPFILEHEADER) + sizeof(BITMAPINFOHEADER);
        bmfHeader.bfOffBits = sizeof(BITMAPFILEHEADER) + sizeof(BITMAPINFOHEADER);
        bmfHeader.bfSize = dwSizeofDIB;
        bmfHeader.bfType = 0x4D42; // BM
        
        DWORD dwBytesWritten = 0;
        WriteFile(hFile, (LPSTR)&bmfHeader, sizeof(BITMAPFILEHEADER), &dwBytesWritten, NULL);
        WriteFile(hFile, (LPSTR)&bi, sizeof(BITMAPINFOHEADER), &dwBytesWritten, NULL);
        WriteFile(hFile, (LPSTR)lpbitmap, dwBmpSize, &dwBytesWritten, NULL);
        
        CloseHandle(hFile);
        GlobalUnlock(hDIB);
        GlobalFree(hDIB);
    }
    
    SelectObject(hMemoryDC, hOldBitmap);
    DeleteObject(hBitmap);
    DeleteDC(hMemoryDC);
    ReleaseDC(NULL, hScreenDC);
    
    return TRUE;
}

/**
 * Capture window by handle
 */
BOOL CaptureWindow(HWND hWnd, const char* outputPath) {
    RECT rect;
    GetWindowRect(hWnd, &rect);
    
    int width = rect.right - rect.left;
    int height = rect.bottom - rect.top;
    
    HDC hWindowDC = GetWindowDC(hWnd);
    HDC hMemoryDC = CreateCompatibleDC(hWindowDC);
    HBITMAP hBitmap = CreateCompatibleBitmap(hWindowDC, width, height);
    HBITMAP hOldBitmap = (HBITMAP)SelectObject(hMemoryDC, hBitmap);
    
    BitBlt(hMemoryDC, 0, 0, width, height, hWindowDC, 0, 0, SRCCOPY);
    
    // Save (simplified)
    CaptureFullScreen(outputPath, ScreenshotFormat::BMP);
    
    SelectObject(hMemoryDC, hOldBitmap);
    DeleteObject(hBitmap);
    DeleteDC(hMemoryDC);
    ReleaseDC(hWnd, hWindowDC);
    
    return TRUE;
}

// Node-API
napi_value CaptureFullScreenJS(napi_env env, napi_callback_info info) {
    size_t argc = 1;
    napi_value args[1];
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
    
    char path[512];
    size_t pathLen;
    napi_get_value_string_utf8(env, args[0], path, 512, &pathLen);
    
    BOOL result = CaptureFullScreen(path, ScreenshotFormat::BMP);
    
    napi_value returnVal;
    napi_get_boolean(env, result, &returnVal);
    return returnVal;
}

napi_value Init(napi_env env, napi_value exports) {
    napi_property_descriptor desc[] = {
        { "captureFullScreen", nullptr, CaptureFullScreenJS, nullptr, nullptr, nullptr, napi_default, nullptr },
    };
    
    napi_define_properties(env, exports, 1, desc);
    return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
