/**
 * OpenOxygen — Native Mouse Control (26w15aD Phase 1)
 *
 * Windows 原生鼠标控制
 * 使用 Win32 API 实现真实鼠标移动和点击
 */
export declare const MouseButton: {
    readonly LEFT: 1;
    readonly RIGHT: 2;
    readonly MIDDLE: 4;
};
/**
 * Move mouse to absolute coordinates
 * @param x - X coordinate (0 to screen width)
 * @param y - Y coordinate (0 to screen height)
 */
export declare function mouseMove(x: number, y: number): boolean;
/**
 * Click mouse button at current position
 * @param button - Mouse button (LEFT, RIGHT, MIDDLE)
 */
export declare function mouseClick(button?: keyof typeof MouseButton): boolean;
/**
 * Double click mouse button at current position
 * @param button - Mouse button (LEFT, RIGHT, MIDDLE)
 */
export declare function mouseDoubleClick(button?: keyof typeof MouseButton): boolean;
/**
 * Drag mouse from start to end position
 * @param startX - Start X coordinate
 * @param startY - Start Y coordinate
 * @param endX - End X coordinate
 * @param endY - End Y coordinate
 * @param button - Mouse button to hold during drag
 */
export declare function mouseDrag(startX: number, startY: number, endX: number, endY: number, button?: keyof typeof MouseButton): boolean;
/**
 * Scroll mouse wheel
 * @param delta - Scroll amount (positive = up, negative = down)
 */
export declare function mouseScroll(delta: number): boolean;
/**
 * Get current mouse position
 * @returns Object with x and y coordinates
 */
export declare function getMousePosition(): {
    x: number;
    y: number;
} | null;
/**
 * Click at specific coordinates
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param button - Mouse button
 */
export declare function mouseClickAt(x: number, y: number, button?: keyof typeof MouseButton): boolean;
declare const _default: {
    mouseMove: typeof mouseMove;
    mouseClick: typeof mouseClick;
    mouseDoubleClick: typeof mouseDoubleClick;
    mouseDrag: typeof mouseDrag;
    mouseScroll: typeof mouseScroll;
    getMousePosition: typeof getMousePosition;
    mouseClickAt: typeof mouseClickAt;
    MouseButton: {
        readonly LEFT: 1;
        readonly RIGHT: 2;
        readonly MIDDLE: 4;
    };
};
export default _default;
//# sourceMappingURL=mouse.d.ts.map