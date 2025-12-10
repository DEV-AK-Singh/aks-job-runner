export function nanoid(len = 10) {
    const alphaNum = "abcdefghijklmnopqrstuvwxyz0123456789";
    let s = "";
    for (let i = 0; i < len; i++)
        s += alphaNum[Math.floor(Math.random() * alphaNum.length)];
    return s;
}
export function now() {
    return Date.now();
}
export function backoff(base, attempt, max) {
    // exponential backoff with jitter
    const pow = Math.pow(2, attempt - 1);
    const raw = base * pow;
    const jitter = Math.floor(Math.random() * Math.min(raw, 500));
    const value = raw + jitter;
    if (max !== undefined)
        return Math.min(value, max);
    return value;
}
export function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
//# sourceMappingURL=utils.js.map