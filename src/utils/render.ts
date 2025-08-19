// Debounce function
export function debounce(func: Function, delay: number) {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    return function (this: any, ...args: any[]) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

// Lightweight WebGL capability check with override support
export function isWebGLAvailable(): boolean {
    try {
        // Allow force-enable via global for tests/debug
        if (typeof (globalThis as any).__MAPLUMI_FORCE_WEBGL__ === 'boolean') {
            return !!(globalThis as any).__MAPLUMI_FORCE_WEBGL__;
        }
        if (typeof document === 'undefined') return false;
        const canvas = document.createElement('canvas');
        // Try WebGL2 first, then WebGL1
        const gl2 = (canvas.getContext('webgl2') as any);
        if (gl2 && typeof gl2.getParameter === 'function') return true;
        const gl = (canvas.getContext('webgl') || (canvas as any).getContext('experimental-webgl')) as any;
        return !!(gl && typeof gl.getParameter === 'function');
    } catch {
        return false;
    }
}