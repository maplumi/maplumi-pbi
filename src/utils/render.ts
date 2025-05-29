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