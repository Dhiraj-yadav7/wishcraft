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
    
    logout: () => {
        authManager.removeToken();
        localStorage.removeItem('birthdaySurpriseUser');
        showToast('Logged out successfully. See you! 👋');
        setTimeout(() => window.location.href = 'login.html', 1000);
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
                authManager.logout();
                return false;
            }
        } catch (err) {
            console.error('Session verification error:', err);
            return false;
        }
    },

    // Guard routes dynamically on page load
    guardRoute: async () => {
        const isAuthPage = window.location.pathname.includes('login') || window.location.pathname.includes('signup');
        const isPublicPage = window.location.pathname.includes('view') || window.location.pathname.includes('wish');
        
        // Skip checks on public card presentations
        if (isPublicPage) return;

        const authenticated = await authManager.verifySession();

        if (isAuthPage && authenticated) {
            // Already logged in, redirect home
            window.location.href = 'dashboard.html';
        } else if (!isAuthPage && !authenticated) {
            // Not authenticated, redirect to login
            window.location.href = 'login.html';
        }
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
                    setTimeout(() => window.location.href = 'index.html', 1000);
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
                    setTimeout(() => window.location.href = 'index.html', 1000);
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

        // Simulate social callback details (creates a secure DB account andJWT via social API)
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
                const data = await res.json();
                
                if (data.success) {
                    showToast(data.message, 'success');
                    authManager.setToken(data.data.token);
                    authManager.setUser(data.data.user);
                    setTimeout(() => window.location.href = 'index.html', 1000);
                } else {
                    showToast(data.message, 'error');
                }
            } catch (err) {
                showToast('Failed to authenticate social account.', 'error');
            }
        }, 1200); // Small loading animation delay
    };

    const googleBtn = document.getElementById('google-btn');
    const githubBtn = document.getElementById('github-btn');
    
    if (googleBtn) googleBtn.addEventListener('click', () => handleSocialLogin('google'));
    if (githubBtn) githubBtn.addEventListener('click', () => handleSocialLogin('github'));
});
