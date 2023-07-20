export function debounce(callback, delay) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            callback(...args);
        }, delay);
    };
}
export function throttle(callback, delay) {
    let shouldWait = false;
    let waitingArgs;
    const timeoutFn = () => {
        if (waitingArgs == null) {
            shouldWait = false;
        }
        else {
            callback(...waitingArgs);
            waitingArgs = null;
            setTimeout(timeoutFn, delay);
        }
    };
    return (...args) => {
        if (shouldWait) {
            waitingArgs = args;
            return;
        }
        callback(...args);
        shouldWait = true;
        setTimeout(timeoutFn, delay);
    };
}
