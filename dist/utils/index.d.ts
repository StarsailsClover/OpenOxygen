/**
 * OpenOxygen -Utility Functions
 *
 * ͨ�ù��ߺ���������ȫ��Ŀʹ��?
 */
export declare function generateId(prefix?: string): string;
export declare function generateShortId(length?: number): string;
export declare function generateTimestampId(prefix: string): string;
export declare function resolveUserPath(input: string): string;
export declare function ensureWindowsPath(p: string): string;
export declare function normalizePathSeparators(p: string): string;
/** Strip null bytes from paths to prevent ENOTDIR errors. */
export declare function sanitizePath(s: string): string;
export declare function isTruthyEnv(value: string | undefined): boolean;
export declare function getEnvOrDefault(key: string, defaultValue: string): string;
export declare function nowMs(): number;
export declare function elapsed(startMs: number): number;
export declare function sleep(ms: number): Promise<void>;
export declare function deepClone<T>(obj: T): T;
export declare function truncateString(s: string, maxLen: number, suffix?: string): string;
export declare function isWindows(): boolean;
export declare function assertWindows(context: string): void;
export declare function getMachineDisplayName(): string;
export declare function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label?: string): Promise<T>;
type Listener<T> = (data: T) => void | Promise<void>;
export declare class TypedEventBus<TEventMap extends Record<string, unknown>> {
    private listeners;
    on<K extends keyof TEventMap>(event: K, listener: Listener<TEventMap[K]>): () => void;
    emit<K extends keyof TEventMap>(event: K, data: TEventMap[K]): Promise<void>;
    removeAllListeners(event?: keyof TEventMap): void;
}
export {};
//# sourceMappingURL=index.d.ts.map
