// ========================================================
// ANTI-FLICKER & LOADING STATE OVERLAY
// ========================================================
let antiFlickerStyle = null;

// Add anti-flicker style immediately when auth.js script executes in head
if (typeof document !== 'undefined') {
    antiFlickerStyle = document.createElement('style');
    antiFlickerStyle.id = 'anti-flicker';
    antiFlickerStyle.innerHTML = `
        body {
            opacity: 0 !important;
            pointer-events: none !important;
            transition: opacity 0.3s ease;
        }
    `;
    document.head.appendChild(antiFlickerStyle);
}

function removeAntiFlicker() {
    if (typeof document !== 'undefined') {
        const af = document.getElementById('anti-flicker');
        if (af) af.remove();
        if (document.body) {
            document.body.style.opacity = '1';
            document.body.style.pointerEvents = 'auto';
        }
    }
}

function showLoadingOverlay() {
    if (typeof document === 'undefined') return;
    let overlay = document.getElementById('authLoadingScreen');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'authLoadingScreen';
        overlay.style.cssText = `
            position: fixed;
            inset: 0;
            background: #1e1b4b;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 999999;
            color: #ffffff;
            font-family: 'Outfit', sans-serif;
            transition: opacity 0.3s ease;
        `;
        overlay.innerHTML = `
            <div style="font-size: 4rem; animation: floatUp 1.2s infinite alternate; margin-bottom: 1rem; user-select: none;">🪄✨</div>
            <h1 style="font-size: 1.8rem; font-weight: 900; margin-bottom: 0.5rem; letter-spacing: 0.05em; background: linear-gradient(135deg, #f43f5e, #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; user-select: none;">WishCraft</h1>
            <p style="font-size: 0.95rem; opacity: 0.8; display: flex; align-items: center; gap: 0.6rem; user-select: none;">
                <span style="display: inline-block; width: 12px; height: 12px; border: 2px solid currentColor; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></span>
                Checking your session...
            </p>
            <style>
                @keyframes spin { 100% { transform: rotate(360deg); } }
                @keyframes floatUp { from { transform: translateY(0); } to { transform: translateY(-10px); } }
            </style>
        `;
        document.documentElement.appendChild(overlay);
    }
}

function hideLoadingOverlay() {
    if (typeof document === 'undefined') return;
    const overlay = document.getElementById('authLoadingScreen');
    if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.remove();
            removeAntiFlicker();
        }, 300);
    } else {
        removeAntiFlicker();
    }
}

// ========================================================
// TOAST NOTIFICATIONS MODULE
// ========================================================
const showToast = (message, type = 'success') => {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    else if (type === 'error') icon = '❌';
    else if (type === 'warning') icon = '⚠️';

    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    // Trigger transition reflow
    setTimeout(() => toast.classList.add('show'), 50);

    // Auto-remove toast after 4s
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 4000);
};

// Global notifications object
window.showToast = showToast;

// ========================================================
// SESSION & JWT PERSISTENCE MANAGEMENT
// ========================================================
const TOKEN_KEY = 'birthdaySurpriseAuthToken';

const authManager = {
    getToken: () => localStorage.getItem(TOKEN_KEY),
    setToken: (token) => localStorage.setItem(TOKEN_KEY, token),
    removeToken: () => localStorage.removeItem(TOKEN_KEY),
    
    // Check local session
    getUser: () => {
        const u = localStorage.getItem('birthdaySurpriseUser');
        try {
            return u ? JSON.parse(u) : null;
        } catch (e) {
            return null;
        }
    },
    
    setUser: (user) => localStorage.setItem('birthdaySurpriseUser', JSON.stringify(user)),
    
    clearSession: () => {
        authManager.removeToken();
        localStorage.removeItem('birthdaySurpriseUser');
        // Clear all cookies
        document.cookie.split(";").forEach(function(c) { 
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
        });
    },

    logout: () => {
        authManager.clearSession();
        showToast('Logged out successfully. See you! 👋');
        setTimeout(() => window.location.href = '/login', 1000);
    },

    // Verify session with the backend API
    verifySession: async () => {
        const token = authManager.getToken();
        if (!token) return false;

        try {
            const res = await fetch('/api/auth?action=user', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (data.success) {
                authManager.setUser(data.data.user);
                return true;
            } else {
                authManager.clearSession();
                return false;
            }
        } catch (err) {
            console.error('Session verification error:', err);
            return false;
        }
    },

    // Guard routes dynamically on page load
    guardRoute: async () => {
        const path = window.location.pathname.toLowerCase();

        // Classify routes
        const isIndex = path === '/' || path.endsWith('/index.html') || path.endsWith('/index');
        const isLogin = path.includes('/login');
        const isSignup = path.includes('/signup');
        const isAuthPage = isLogin || isSignup;

        const isDashboard = path.includes('/dashboard');
        const isGenerator = path.includes('/generator');
        const isProfile = path.includes('/profile');
        const isSettings = path.includes('/settings');
        const isGuestbookMgmt = path.includes('/guestbook');

        const isProtectedRoute = isDashboard || isGenerator || isProfile || isSettings || isGuestbookMgmt;
        const isPublicPage = path.includes('/view') || path.includes('/wish');

        // Skip checks on public viewer pages
        if (isPublicPage) {
            removeAntiFlicker();
            return;
        }

        // Show checking session loading overlay
        showLoadingOverlay();

        // Validate session with the backend
        const authenticated = await authManager.verifySession();

        if (isIndex) {
            if (authenticated) {
                window.location.href = '/dashboard';
            } else {
                window.location.href = '/login';
            }
            return;
        }

        if (isProtectedRoute) {
            if (!authenticated) {
                authManager.clearSession();
                window.location.href = '/login';
                return;
            }
            
            // Redirect settings to profile
            if (isSettings) {
                window.location.href = '/profile';
                return;
            }
        }

        if (isAuthPage && authenticated) {
            // Already logged in, redirect to dashboard
            window.location.href = '/dashboard';
            return;
        }

        // Smooth transition inside the current page
        hideLoadingOverlay();
    }
};

window.authManager = authManager;

// Auto-run route guards when loaded
if (typeof window !== 'undefined') {
    authManager.guardRoute();
}

// ========================================================
// AUTHENTICATION INTERACTIVE FORMS
// ========================================================
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form-el');
    const signupForm = document.getElementById('signup-form-el');
    const forgotForm = document.getElementById('forgot-form-el');
    const resetForm = document.getElementById('reset-form-el');

    // Switch view helper based on URL hash or manual clicks
    const showFormSection = (sectionId) => {
        document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
        const activeForm = document.getElementById(sectionId);
        if (activeForm) {
            activeForm.classList.add('active');
        }
    };

    // Auto-toggle view based on path or hash
    if (window.location.pathname.includes('signup') || window.location.hash === '#signup') {
        showFormSection('signup-form');
    }

    // Toggle Link click event listeners
    const toSignup = document.getElementById('to-signup');
    const toLogin = document.getElementById('to-login');
    const toForgot = document.getElementById('to-forgot');
    const toLogin2 = document.getElementById('to-login-2');
    const toLogin3 = document.getElementById('to-login-3');

    if (toSignup) toSignup.addEventListener('click', (e) => { e.preventDefault(); showFormSection('signup-form'); });
    if (toLogin) toLogin.addEventListener('click', (e) => { e.preventDefault(); showFormSection('login-form'); });
    if (toForgot) toForgot.addEventListener('click', (e) => { e.preventDefault(); showFormSection('forgot-form'); });
    if (toLogin2) toLogin2.addEventListener('click', (e) => { e.preventDefault(); showFormSection('login-form'); });
    if (toLogin3) toLogin3.addEventListener('click', (e) => { e.preventDefault(); showFormSection('login-form'); });

    // Handle Form Submissions & Validations
    
    // 1. LOGIN Form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;

            if (!email || !password) {
                showToast('Please fill in both fields.', 'warning');
                return;
            }

            try {
                const res = await fetch('/api/auth?action=login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();
                
                if (data.success) {
                    showToast(data.message, 'success');
                    authManager.setToken(data.data.token);
                    authManager.setUser(data.data.user);
                    setTimeout(() => window.location.href = 'dashboard.html', 1000);
                } else {
                    showToast(data.message, 'error');
                }
            } catch (err) {
                showToast('Network error. Please try again.', 'error');
            }
        });
    }

    // 2. SIGNUP Form submission
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('signup-name').value.trim();
            const email = document.getElementById('signup-email').value.trim();
            const password = document.getElementById('signup-password').value;
            const confirm = document.getElementById('signup-confirm').value;

            // Frontend Form Validation
            if (!name || !email || !password || !confirm) {
                showToast('Please fill in all fields.', 'warning');
                return;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showToast('Please enter a valid email address.', 'warning');
                return;
            }

            if (password.length < 6) {
                showToast('Password must be at least 6 characters long.', 'warning');
                return;
            }

            if (password !== confirm) {
                showToast('Passwords do not match.', 'error');
                return;
            }

            try {
                const res = await fetch('/api/auth?action=signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password })
                });
                const data = await res.json();
                
                if (data.success) {
                    showToast(data.message, 'success');
                    authManager.setToken(data.data.token);
                    authManager.setUser(data.data.user);
                    setTimeout(() => window.location.href = 'dashboard.html', 1000);
                } else {
                    showToast(data.message, 'error');
                }
            } catch (err) {
                showToast('Network error. Please try again.', 'error');
            }
        });
    }

    // 3. FORGOT PASSWORD Form submission
    if (forgotForm) {
        forgotForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('forgot-email').value.trim();

            if (!email) {
                showToast('Please enter your email.', 'warning');
                return;
            }

            try {
                const res = await fetch('/api/auth?action=forgot', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });
                const data = await res.json();
                
                if (data.success) {
                    showToast(data.message, 'success');
                    
                    // Auto redirect to reset screen and fill token for testing
                    document.getElementById('reset-token').value = data.data.resetToken;
                    setTimeout(() => {
                        showFormSection('reset-form');
                        showToast('Autofilled recovery token in Reset form for testing! 🔐', 'info');
                    }, 1500);
                } else {
                    showToast(data.message, 'error');
                }
            } catch (err) {
                showToast('Network error. Please try again.', 'error');
            }
        });
    }

    // 4. RESET PASSWORD Form submission
    if (resetForm) {
        resetForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const token = document.getElementById('reset-token').value.trim();
            const password = document.getElementById('reset-password').value;
            const confirm = document.getElementById('reset-confirm').value;

            if (!token || !password || !confirm) {
                showToast('Please fill in all fields.', 'warning');
                return;
            }

            if (password.length < 6) {
                showToast('Password must be at least 6 characters long.', 'warning');
                return;
            }

            if (password !== confirm) {
                showToast('Passwords do not match.', 'error');
                return;
            }

            try {
                const res = await fetch('/api/auth?action=reset', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token, password })
                });
                const data = await res.json();
                
                if (data.success) {
                    showToast(data.message, 'success');
                    setTimeout(() => showFormSection('login-form'), 1500);
                } else {
                    showToast(data.message, 'error');
                }
            } catch (err) {
                showToast('Network error. Please try again.', 'error');
            }
        });
    }

    // ========================================================
    // SOCIAL LOGINS (GOOGLE & GITHUB SIMULATOR)
    // ========================================================
    const handleSocialLogin = async (provider) => {
        showToast(`Connecting to ${provider.toUpperCase()}... 🚀`, 'info');

        // Simulate social callback details (creates a secure DB account and JWT via social API)
        const socialProfiles = {
            google: {
                email: 'dhiraj.yadav.google@gmail.com',
                name: 'Dhiraj Yadav (Google)',
                provider: 'google',
                providerId: 'gg_109283748293817'
            },
            github: {
                email: 'dhiraj.github@github.com',
                name: 'Dhiraj Yadav (GitHub)',
                provider: 'github',
                providerId: 'gh_9928374'
            }
        };

        const profile = socialProfiles[provider];

        setTimeout(async () => {
            try {
                const res = await fetch('/api/auth?action=social', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(profile)
                });
                
                if (!res.ok) {
                    const text = await res.text();
                    console.error('Server returned non-ok response:', res.status, text);
                    showToast(`Server Error (${res.status}). Check Vercel Logs.`, 'error');
                    return;
                }

                const data = await res.json();
                
                if (data.success) {
                    showToast(data.message, 'success');
                    authManager.setToken(data.data.token);
                    authManager.setUser(data.data.user);
                    setTimeout(() => window.location.href = 'dashboard.html', 1000);
                } else {
                    showToast(data.message, 'error');
                }
            } catch (err) {
                console.error('Social auth request network exception:', err);
                showToast('Network exception. Check your database connections or Atlas whitelist.', 'error');
            }
        }, 1200); // Small loading animation delay
    };

    const googleBtn = document.getElementById('google-btn');
    const githubBtn = document.getElementById('github-btn');
    
    if (googleBtn) googleBtn.addEventListener('click', () => handleSocialLogin('google'));
    if (githubBtn) githubBtn.addEventListener('click', () => handleSocialLogin('github'));
});
