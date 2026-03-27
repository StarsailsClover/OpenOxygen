/**
 * OpenOxygen — Native Keyboard Control (26w15aD Phase 1)
 *
 * Windows 原生键盘控制
 * 使用 Win32 API 实现真实键盘输入
 */
export declare const VirtualKey: {
    readonly A: 65;
    readonly B: 66;
    readonly C: 67;
    readonly D: 68;
    readonly E: 69;
    readonly F: 70;
    readonly G: 71;
    readonly H: 72;
    readonly I: 73;
    readonly J: 74;
    readonly K: 75;
    readonly L: 76;
    readonly M: 77;
    readonly N: 78;
    readonly O: 79;
    readonly P: 80;
    readonly Q: 81;
    readonly R: 82;
    readonly S: 83;
    readonly T: 84;
    readonly U: 85;
    readonly V: 86;
    readonly W: 87;
    readonly X: 88;
    readonly Y: 89;
    readonly Z: 90;
    readonly NUM0: 48;
    readonly NUM1: 49;
    readonly NUM2: 50;
    readonly NUM3: 51;
    readonly NUM4: 52;
    readonly NUM5: 53;
    readonly NUM6: 54;
    readonly NUM7: 55;
    readonly NUM8: 56;
    readonly NUM9: 57;
    readonly F1: 112;
    readonly F2: 113;
    readonly F3: 114;
    readonly F4: 115;
    readonly F5: 116;
    readonly F6: 117;
    readonly F7: 118;
    readonly F8: 119;
    readonly F9: 120;
    readonly F10: 121;
    readonly F11: 122;
    readonly F12: 123;
    readonly ENTER: 13;
    readonly ESCAPE: 27;
    readonly SPACE: 32;
    readonly TAB: 9;
    readonly BACKSPACE: 8;
    readonly DELETE: 46;
    readonly INSERT: 45;
    readonly HOME: 36;
    readonly END: 35;
    readonly PAGEUP: 33;
    readonly PAGEDOWN: 34;
    readonly UP: 38;
    readonly DOWN: 40;
    readonly LEFT: 37;
    readonly RIGHT: 39;
    readonly SHIFT: 16;
    readonly CONTROL: 17;
    readonly ALT: 18;
    readonly LWIN: 91;
    readonly RWIN: 92;
};
/**
 * Press a single key
 * @param key - Virtual key code or key name
 */
export declare function keyPress(key: keyof typeof VirtualKey | number): boolean;
/**
 * Press a key combination
 * @param keys - Array of keys to press together
 */
export declare function keyCombination(keys: (keyof typeof VirtualKey)[]): boolean;
/**
 * Type text string
 * @param text - Text to type
 */
export declare function typeText(text: string): boolean;
/**
 * Send a special key
 * @param key - Special key name
 */
export declare function sendSpecialKey(key: keyof typeof VirtualKey): boolean;
/**
 * Press Ctrl+C (Copy)
 */
export declare function ctrlC(): boolean;
/**
 * Press Ctrl+V (Paste)
 */
export declare function ctrlV(): boolean;
/**
 * Press Ctrl+X (Cut)
 */
export declare function ctrlX(): boolean;
/**
 * Press Ctrl+A (Select All)
 */
export declare function ctrlA(): boolean;
/**
 * Press Ctrl+Z (Undo)
 */
export declare function ctrlZ(): boolean;
/**
 * Press Ctrl+Y (Redo)
 */
export declare function ctrlY(): boolean;
/**
 * Press Ctrl+S (Save)
 */
export declare function ctrlS(): boolean;
/**
 * Press Alt+Tab (Switch Window)
 */
export declare function altTab(): boolean;
/**
 * Press Win+D (Show Desktop)
 */
export declare function winD(): boolean;
/**
 * Press Escape key
 */
export declare function pressEscape(): boolean;
/**
 * Press Enter key
 */
export declare function pressEnter(): boolean;
/**
 * Press Tab key
 */
export declare function pressTab(): boolean;
/**
 * Press Space key
 */
export declare function pressSpace(): boolean;
/**
 * Press Backspace key
 */
export declare function pressBackspace(): boolean;
/**
 * Press Delete key
 */
export declare function pressDelete(): boolean;
declare const _default: {
    keyPress: typeof keyPress;
    keyCombination: typeof keyCombination;
    typeText: typeof typeText;
    sendSpecialKey: typeof sendSpecialKey;
    ctrlC: typeof ctrlC;
    ctrlV: typeof ctrlV;
    ctrlX: typeof ctrlX;
    ctrlA: typeof ctrlA;
    ctrlZ: typeof ctrlZ;
    ctrlY: typeof ctrlY;
    ctrlS: typeof ctrlS;
    altTab: typeof altTab;
    winD: typeof winD;
    pressEscape: typeof pressEscape;
    pressEnter: typeof pressEnter;
    pressTab: typeof pressTab;
    pressSpace: typeof pressSpace;
    pressBackspace: typeof pressBackspace;
    pressDelete: typeof pressDelete;
    VirtualKey: {
        readonly A: 65;
        readonly B: 66;
        readonly C: 67;
        readonly D: 68;
        readonly E: 69;
        readonly F: 70;
        readonly G: 71;
        readonly H: 72;
        readonly I: 73;
        readonly J: 74;
        readonly K: 75;
        readonly L: 76;
        readonly M: 77;
        readonly N: 78;
        readonly O: 79;
        readonly P: 80;
        readonly Q: 81;
        readonly R: 82;
        readonly S: 83;
        readonly T: 84;
        readonly U: 85;
        readonly V: 86;
        readonly W: 87;
        readonly X: 88;
        readonly Y: 89;
        readonly Z: 90;
        readonly NUM0: 48;
        readonly NUM1: 49;
        readonly NUM2: 50;
        readonly NUM3: 51;
        readonly NUM4: 52;
        readonly NUM5: 53;
        readonly NUM6: 54;
        readonly NUM7: 55;
        readonly NUM8: 56;
        readonly NUM9: 57;
        readonly F1: 112;
        readonly F2: 113;
        readonly F3: 114;
        readonly F4: 115;
        readonly F5: 116;
        readonly F6: 117;
        readonly F7: 118;
        readonly F8: 119;
        readonly F9: 120;
        readonly F10: 121;
        readonly F11: 122;
        readonly F12: 123;
        readonly ENTER: 13;
        readonly ESCAPE: 27;
        readonly SPACE: 32;
        readonly TAB: 9;
        readonly BACKSPACE: 8;
        readonly DELETE: 46;
        readonly INSERT: 45;
        readonly HOME: 36;
        readonly END: 35;
        readonly PAGEUP: 33;
        readonly PAGEDOWN: 34;
        readonly UP: 38;
        readonly DOWN: 40;
        readonly LEFT: 37;
        readonly RIGHT: 39;
        readonly SHIFT: 16;
        readonly CONTROL: 17;
        readonly ALT: 18;
        readonly LWIN: 91;
        readonly RWIN: 92;
    };
};
export default _default;
//# sourceMappingURL=keyboard.d.ts.map