// ========================================================
// SERVICE WORKER CLEANUP (Rescues browsers from cache traps)
// ========================================================
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
        for (let registration of registrations) {
            registration.unregister().then(() => {
                console.log('Stuck Service Worker cleaned up successfully.');
            });
        }
    }).catch(err => console.error('SW unregister error:', err));
}

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
const authManager = {
    // Under HttpOnly cookie authentication, the frontend cannot read the actual token.
    // We return a truthy indicator string if user details exist in localStorage,
    // which allows existing client code (e.g. checks for !token) to pass seamlessly.
    getToken: () => authManager.getUser() ? 'session-active' : null,
    setToken: (token) => { /* no-op: stored automatically by server in HttpOnly cookie */ },
    removeToken: () => { /* no-op */ },
    
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
        localStorage.removeItem('birthdaySurpriseUser');
        // Clear all cookies
        document.cookie.split(";").forEach(function(c) { 
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
        });
    },

    logout: async () => {
        try {
            await fetch('/api/auth?action=logout', { method: 'POST' });
        } catch (e) {
            console.error('Logout API call failed:', e);
        }
        authManager.clearSession();
        showToast('Logged out successfully. See you! 👋');
        setTimeout(() => window.location.href = '/login', 1000);
    },

    // Verify session with the backend API
    verifySession: async () => {
        try {
            const res = await fetch('/api/auth?action=user', {
                method: 'GET'
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
        const isPublicPage = path.includes('/view') || path.includes('/wish') || path.includes('/home') || path.includes('/landing');

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

// Intercept all fetch requests to handle expired/invalid JWT sessions globally
if (typeof window !== 'undefined') {
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        try {
            const response = await originalFetch(...args);
            if (response.status === 401) {
                const path = window.location.pathname.toLowerCase();
                const isPublicPage = path.includes('/view') || path.includes('/wish') || path.includes('/home') || path.includes('/landing');
                const isAuthPage = path.includes('/login') || path.includes('/signup');
                if (!isPublicPage && !isAuthPage) {
                    authManager.clearSession();
                    window.location.href = '/login';
                }
            }
            return response;
        } catch (error) {
            throw error;
        }
    };
}

// Auto-run route guards when loaded
if (typeof window !== 'undefined') {
    authManager.guardRoute();
}

// ========================================================
// ========================================================
// AUTHENTICATION INTERACTIVE FORMS & FIREBASE INTEGRATION
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

    // Initialize Firebase client
    let firebaseAuth = null;
    let isFirebaseConfigMissing = false;

    const initFirebaseClient = async () => {
        try {
            const res = await fetch('/api/auth?action=config');
            const data = await res.json();
            if (data.success && data.data.firebaseConfig) {
                const config = data.data.firebaseConfig;
                if (config.apiKey) {
                    firebase.initializeApp(config);
                    firebaseAuth = firebase.auth();
                    console.log('Firebase Client SDK initialized.');
                } else {
                    isFirebaseConfigMissing = true;
                    console.warn('Firebase configuration details missing in dynamic config.');
                }
            } else {
                isFirebaseConfigMissing = true;
            }
        } catch (err) {
            console.error('Error loading dynamic Firebase config:', err);
            isFirebaseConfigMissing = true;
        }
    };

    initFirebaseClient();

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

            if (!firebaseAuth) {
                if (isFirebaseConfigMissing) {
                    showToast('Firebase credentials missing! Please configure environment variables in your .env.local file.', 'error');
                } else {
                    showToast('Authentication system is initializing. Please try again in a moment.', 'warning');
                }
                return;
            }

            try {
                showToast('Authenticating with Firebase... 🔐', 'info');
                // Authenticate with Firebase Email/Password
                const userCredential = await firebaseAuth.signInWithEmailAndPassword(email, password);
                const idToken = await userCredential.user.getIdToken();

                showToast('Verifying session with backend... 🛡️', 'info');
                // Exchange Firebase ID Token for Backend JWT Cookie
                const res = await fetch('/api/auth?action=login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ idToken })
                });
                const data = await res.json();
                
                if (data.success) {
                    showToast(data.message, 'success');
                    authManager.setUser(data.data.user);
                    setTimeout(() => window.location.href = '/dashboard', 1000);
                } else {
                    showToast(data.message, 'error');
                }
            } catch (err) {
                console.error('Firebase Login Error:', err);
                showToast(err.message || 'Firebase login failed.', 'error');
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

            if (!firebaseAuth) {
                if (isFirebaseConfigMissing) {
                    showToast('Firebase credentials missing! Please configure environment variables in your .env.local file.', 'error');
                } else {
                    showToast('Authentication system is initializing. Please try again in a moment.', 'warning');
                }
                return;
            }

            try {
                showToast('Registering user with Firebase... 🚀', 'info');
                // Register with Firebase Email/Password
                const userCredential = await firebaseAuth.createUserWithEmailAndPassword(email, password);
                
                // Update Firebase display name profile
                await userCredential.user.updateProfile({ displayName: name });
                
                const idToken = await userCredential.user.getIdToken();

                showToast('Creating database profile... 🛡️', 'info');
                // Create account on backend using Firebase ID Token
                const res = await fetch('/api/auth?action=signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ idToken, name })
                });
                const data = await res.json();
                
                if (data.success) {
                    showToast(data.message, 'success');
                    authManager.setUser(data.data.user);
                    setTimeout(() => window.location.href = '/dashboard', 1000);
                } else {
                    showToast(data.message, 'error');
                }
            } catch (err) {
                console.error('Firebase Signup Error:', err);
                showToast(err.message || 'Firebase signup failed.', 'error');
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

            if (!firebaseAuth) {
                if (isFirebaseConfigMissing) {
                    showToast('Firebase credentials missing! Please configure environment variables in your .env.local file.', 'error');
                } else {
                    showToast('Authentication system is initializing. Please try again in a moment.', 'warning');
                }
                return;
            }

            try {
                showToast('Sending password reset email... ✉️', 'info');
                await firebaseAuth.sendPasswordResetEmail(email);
                showToast('Password reset email sent! Check your inbox ✉️', 'success');
            } catch (err) {
                console.error('Firebase password reset error:', err);
                showToast(err.message || 'Failed to send password reset email.', 'error');
            }
        });
    }

    // 4. RESET PASSWORD Form submission (Handled via Firebase email redirection link)
    if (resetForm) {
        resetForm.addEventListener('submit', (e) => {
            e.preventDefault();
            showToast('Please use the password reset link sent to your email to configure a new password.', 'info');
        });
    }

    // Google Sign-In with Firebase Provider
    const googleBtn = document.getElementById('google-btn');
    const githubBtn = document.getElementById('github-btn');
    
    if (googleBtn) {
        googleBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (!firebaseAuth) {
                if (isFirebaseConfigMissing) {
                    showToast('Firebase credentials missing! Please configure environment variables in your .env.local file.', 'error');
                } else {
                    showToast('Authentication system is initializing. Please try again in a moment.', 'warning');
                }
                return;
            }

            try {
                showToast('Connecting to Google... 🚀', 'info');
                const provider = new firebase.auth.GoogleAuthProvider();
                
                // Open popup flow
                const result = await firebaseAuth.signInWithPopup(provider);
                const idToken = await result.user.getIdToken();

                showToast('Verifying Google account details... 👤', 'info');
                const res = await fetch('/api/auth?action=google', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ idToken })
                });
                const data = await res.json();
                
                if (data.success) {
                    showToast(data.message, 'success');
                    authManager.setUser(data.data.user);
                    setTimeout(() => window.location.href = '/dashboard', 1000);
                } else {
                    showToast(data.message, 'error');
                }
            } catch (err) {
                console.error('Google Auth Error:', err);
                showToast(err.message || 'Google Sign-in failed.', 'error');
            }
        });
    }
    
    if (githubBtn) {
        githubBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showToast('GitHub login is not supported. Please use Google or Email login.', 'warning');
        });
    }
});
