export function debounce(callback: (...args: any[]) => void, delay: number) {
	let timeout: string | number | NodeJS.Timeout | undefined;
	return (...args: any[]) => {
		clearTimeout(timeout);
		timeout = setTimeout(() => {
			callback(...args);
		}, delay);
	};
} // it's good for autocomplete feature for quering data from database

export function throttle(callback: (...args: any[]) => void, delay: number) {
	let shouldWait = false;
	let waitingArgs: any;
	const timeoutFn = () => {
		if (waitingArgs == null) {
			shouldWait = false;
		} else {
			callback(...waitingArgs);
			waitingArgs = null;
			setTimeout(timeoutFn, delay);
		}
	};

	return (...args: any[]) => {
		if (shouldWait) {
			waitingArgs = args;
			return;
		}

		callback(...args);
		shouldWait = true;
		setTimeout(timeoutFn, delay);
	};
} // no use case here, but good for mouse/scrolling/swiping events to minimize requests to server to within 60 frames/sec --> max fps a human eye can see
// even though our reflexes can surpass that limit greatly and act in much higher fps --> useful in fast-paced games where gamers rely on muscle memory & reflexes
