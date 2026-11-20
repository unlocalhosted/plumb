// The beats and the spring every shown change moves on (show.js, show-motion.js): one place to tune them. Kept apart
// so the show and the motion module can both read them without importing each other.
// a little slower than a flick, so each change can be watched (and filmed): marked, moved, held to be seen, let go
export const BEAT = { in: 300, move: 640, hold: 460, out: 200, travel: 560 };
// the overlay's spring, written out (the page can't read the overlay's tokens)
export const SPRING = 'linear(0, 0.21 6%, 0.62 15%, 0.9 25%, 1.01 36%, 1.02 46%, 1 60%, 1)';
