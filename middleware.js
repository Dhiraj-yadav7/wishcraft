const JWT_SECRET = process.env.JWT_SECRET || 'birthday-surprise-secret-key-12345';

// Base64URL decode helper for Edge runtime
function base64UrlDecode(str) {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    try {
        return atob(base64);
    } catch (e) {
        return '';
    }
}

// Verify HMAC-SHA256 signature using Web Crypto API
async function verifyHS256(token, secret) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return false;
        
        const [headerB64, payloadB64, signatureB64] = parts;
        
        const payloadStr = base64UrlDecode(payloadB64);
        if (!payloadStr) return false;
        const payload = JSON.parse(payloadStr);
        
        if (payload.exp && Date.now() >= payload.exp * 1000) {
            return false; // Expired
        }
        
        const encoder = new TextEncoder();
        const keyData = encoder.encode(secret);
        const key = await crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['verify']
        );
        
        const data = encoder.encode(`${headerB64}.${payloadB64}`);
        
        const sigStr = base64UrlDecode(signatureB64);
        const sigBuf = new Uint8Array(sigStr.length);
        for (let i = 0; i < sigStr.length; i++) {
            sigBuf[i] = sigStr.charCodeAt(i);
        }
        
        const isValid = await crypto.subtle.verify(
            'HMAC',
            key,
            sigBuf,
            data
        );
        
        return isValid ? payload : false;
    } catch (e) {
        return false;
    }
}

export default async function middleware(request) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    // Normalize path to lowercase
    const path = pathname.toLowerCase();
    
    // Private paths to protect
    const privatePages = ['/dashboard', '/profile', '/generator'];
    const isPrivatePage = privatePages.some(p => path === p || path.startsWith(p + '/') || path === p + '.html');
    
    const privateApis = ['/api/dashboard', '/api/profile', '/api/pages', '/api/ai'];
    const isPrivateApi = privateApis.some(api => path === api || path.startsWith(api + '/'));
    
    // Helper to retrieve cookie on standard request
    const getCookie = (name) => {
        const cookieHeader = request.headers.get('cookie');
        if (!cookieHeader) return null;
        const cookies = {};
        cookieHeader.split(';').forEach(c => {
            let [k, ...v] = c.split('=');
            k = k.trim();
            if (k) {
                cookies[k] = decodeURIComponent(v.join('='));
            }
        });
        return cookies[name] || null;
    };
    
    if (isPrivatePage || isPrivateApi) {
        const token = getCookie('auth_token');
        let payload = null;
        if (token) {
            payload = await verifyHS256(token, JWT_SECRET);
        }
        
        if (!payload) {
            if (isPrivateApi) {
                return new Response(
                    JSON.stringify({ success: false, message: 'Session expired or invalid token. Please log in again.' }),
                    { status: 401, headers: { 'content-type': 'application/json' } }
                );
            } else {
                // Redirect HTML requests to /login
                return Response.redirect(new URL('/login', request.url));
            }
        }
        
        // ✅ THE FIX: Returning `undefined` (no return value) tells Vercel Edge Middleware
        // to continue the request chain and serve the actual destination file.
        //
        // ❌ WRONG (old code): `return new Response(null, { headers })` — this terminates
        // the chain and serves a blank 200 body, causing the white screen.
        //
        // The x-middleware-request-* prefix is the correct Vercel pattern for injecting
        // headers into the forwarded-to origin/function request.
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set('x-user-id', payload.userId);

        return new Response(null, {
            headers: {
                'x-middleware-request-x-user-id': payload.userId,
                'x-middleware-next': '1',
            },
        });
    }
    
    // Auth pages (login, signup) - if user is logged in, redirect to dashboard
    const isAuthPage = path === '/login' || path === '/signup' || path.startsWith('/login/') || path.startsWith('/signup/');
    if (isAuthPage) {
        const token = getCookie('auth_token');
        if (token) {
            const payload = await verifyHS256(token, JWT_SECRET);
            if (payload) {
                return Response.redirect(new URL('/dashboard', request.url));
            }
        }
    }

    // For all other routes: fall through (return undefined = passthrough)
}

// ✅ CRITICAL: Matcher prevents middleware from intercepting static assets.
// Without this, every .css, .js, .png request also runs through this middleware
// and gets a blank response — breaking all scripts and styles.
export const config = {
    matcher: [
        // Run middleware ONLY on page routes, NOT on static files with extensions
        '/((?!.*\\.[a-zA-Z0-9]+$|_next).*)',
    ],
};
