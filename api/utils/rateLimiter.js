// Lightweight memory-based rate limiter for Vercel serverless environment.
// Prevents rapid burst abuse (e.g. brute force, spamming, AI token exhaustion).

const ipCache = new Map();
const LIMIT_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(ip, limit = 15) {
    const now = Date.now();
    if (!ipCache.has(ip)) {
        ipCache.set(ip, { count: 1, resetTime: now + LIMIT_WINDOW });
        return true;
    }

    const rateState = ipCache.get(ip);
    if (now > rateState.resetTime) {
        rateState.count = 1;
        rateState.resetTime = now + LIMIT_WINDOW;
        return true;
    }

    rateState.count++;
    if (rateState.count > limit) {
        return false;
    }
    return true;
}

module.exports = { checkRateLimit };
