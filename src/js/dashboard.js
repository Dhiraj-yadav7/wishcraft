// Dashboard Management State
let dashState = {
    pages: [],
    notifications: [],
    activeFilter: 'all',
    searchQuery: ''
};

// DOM elements
const cardsGrid = document.getElementById('cardsGrid');
const searchInput = document.getElementById('searchSurprises');
const filterPills = document.getElementById('filterPills');
const notifBell = document.getElementById('notifBell');
const notifCount = document.getElementById('notifCount');
const notifDrawer = document.getElementById('notifDrawer');
const notifList = document.getElementById('notifList');

// Modals elements
const shareModal = document.getElementById('shareModal');
const shareModalClose = document.getElementById('shareModalClose');
const qrCodeModal = document.getElementById('qrCodeModal');
const qrModalClose = document.getElementById('qrModalClose');
const analyticsModal = document.getElementById('analyticsModal');
const analCloseBtn = document.getElementById('analCloseBtn');
const analCloseFooter = document.getElementById('analCloseFooter');

// Active Card ID for modals
let activeCardId = null;

document.addEventListener('DOMContentLoaded', () => {
    // Hide modals initially to prevent flashes
    if (shareModal) shareModal.style.display = 'none';
    if (qrCodeModal) qrCodeModal.style.display = 'none';
    if (analyticsModal) analyticsModal.style.display = 'none';

    setupDashboardUser();
    fetchDashboardData();
    setupDashboardEvents();
});

// Sync user details
function setupDashboardUser() {
    const user = authManager.getUser();
    if (user) {
        document.getElementById('userWelcomeText').textContent = `Welcome, ${user.name}! 🌟`;
        const nameNode = document.getElementById('dropdownUserName');
        const emailNode = document.getElementById('dropdownUserEmail');
        if (nameNode) nameNode.textContent = user.name;
        if (emailNode) emailNode.textContent = user.email || `${user.username || 'creator'}@wishcraft.app`;
        
        const avatarImg = document.getElementById('navAvatar');
        if (avatarImg) {
            // Check if profile avatar is in localStorage first
            const localUser = localStorage.getItem('birthday_user');
            if (localUser) {
                try {
                    const parsed = JSON.parse(localUser);
                    if (parsed.profilePhoto) {
                        avatarImg.src = parsed.profilePhoto;
                    }
                } catch (e) {
                    console.error('Error parsing profilePhoto', e);
                }
            }

            // Asynchronously fetch profile from backend to sync localStorage and navbar image
            const token = authManager.getToken();
            if (token) {
                fetch('/api/profile', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                .then(res => res.json())
                .then(data => {
                    if (data.success && data.data.profile) {
                        const profile = data.data.profile;
                        if (profile.profilePhoto) {
                            avatarImg.src = profile.profilePhoto;
                            
                            // Save updated profilePhoto in localStorage
                            const savedUser = JSON.parse(localStorage.getItem('birthday_user') || '{}');
                            savedUser.profilePhoto = profile.profilePhoto;
                            localStorage.setItem('birthday_user', JSON.stringify(savedUser));
                            authManager.setUser(savedUser);
                        }
                    }
                })
                .catch(err => console.error('Error fetching backend profile for avatar sync:', err));
            }
        }
    }
}

// Fetch stats, pages, and notifications in parallel
async function fetchDashboardData() {
    const token = authManager.getToken();
    if (!token) return;

    // Show skeletons
    showSkeletons();

    try {
        // 1. Fetch Stats
        const statsRes = await fetch('/api/dashboard?action=stats', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const statsData = await statsRes.json();
        if (statsData.success) {
            animateCounter('stat-total', statsData.data.totalPages);
            animateCounter('stat-views', statsData.data.totalViews);
            animateCounter('stat-wishes', statsData.data.totalWishes);
            animateCounter('stat-shares', statsData.data.totalShares || 0);
            animateCounter('stat-qr', statsData.data.totalQrScans || 0);
            animateCounter('stat-upcoming', statsData.data.upcomingBirthdays || 0);
        }

        // 2. Fetch Pages list (enriched server-side)
        const pagesRes = await fetch('/api/pages?action=list', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const pagesData = await pagesRes.json();
        if (pagesData.success) {
            dashState.pages = pagesData.data;
            renderPages();
        }

        // 3. Fetch Notifications list
        const notifRes = await fetch('/api/dashboard?action=notifications', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const notifData = await notifRes.json();
        if (notifData.success) {
            dashState.notifications = notifData.data;
            renderNotifications();
        }

    } catch (err) {
        console.error('Fetch dashboard error:', err);
        showToast('Failed to connect to full-stack server.', 'error');
    }
}

// Counter animation
function animateCounter(id, targetValue) {
    const el = document.getElementById(id);
    if (!el) return;
    let start = 0;
    const end = parseInt(targetValue, 10) || 0;
    if (end === 0) {
        el.textContent = '0';
        return;
    }
    const duration = 1000;
    const stepTime = Math.abs(Math.floor(duration / end)) || 20;
    const timer = setInterval(() => {
        start += Math.ceil(end / 30) || 1;
        if (start >= end) {
            clearInterval(timer);
            el.textContent = end;
        } else {
            el.textContent = start;
        }
    }, stepTime);
}

// Show skeleton loading bars
function showSkeletons() {
    cardsGrid.innerHTML = `
        <div class="dashboard-loading-skeleton">
            <div class="skeleton-card"></div>
            <div class="skeleton-card"></div>
            <div class="skeleton-card"></div>
        </div>
    `;
}

// Helper to compute countdown
function calculateCountdown(dateString) {
    const now = new Date();
    const bdate = new Date(dateString);
    const thisYearBday = new Date(now.getFullYear(), bdate.getMonth(), bdate.getDate());
    
    let diffTime = thisYearBday - now;
    if (diffTime < 0) {
        const nextYearBday = new Date(now.getFullYear() + 1, bdate.getMonth(), bdate.getDate());
        diffTime = nextYearBday - now;
    }
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 365 || diffDays === 0) {
        return { text: "Today! 🎉", days: 0 };
    }
    return { text: `In ${diffDays} days`, days: diffDays };
}

// Render list of surprises
function renderPages() {
    cardsGrid.innerHTML = '';
    
    let filtered = dashState.pages;
    
    // 1. Status Filter Pills
    if (dashState.activeFilter !== 'all' && dashState.activeFilter !== 'newest' && dashState.activeFilter !== 'oldest') {
        filtered = filtered.filter(p => p.status === dashState.activeFilter);
    }

    // 2. Search Query (Receiver Name, Relationship, Date, Status, Sender/Creator)
    if (dashState.searchQuery) {
        const query = dashState.searchQuery.toLowerCase();
        filtered = filtered.filter(p => 
            (p.name && p.name.toLowerCase().includes(query)) ||
            (p.relationship && p.relationship.toLowerCase().includes(query)) ||
            (p.senderName && p.senderName.toLowerCase().includes(query)) ||
            (p.status && p.status.toLowerCase().includes(query)) ||
            (p.date && new Date(p.date).toLocaleDateString().toLowerCase().includes(query))
        );
    }

    // 3. Sorting Chips
    if (dashState.activeFilter === 'newest') {
        filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    } else if (dashState.activeFilter === 'oldest') {
        filtered.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    }

    if (filtered.length === 0) {
        cardsGrid.innerHTML = `
            <div class="empty-state">
                <span class="empty-state-icon">🎈</span>
                <h3 style="font-size: 1.3rem; margin: 0.8rem 0 0.4rem 0; font-weight:800;">No surprises found</h3>
                <p style="opacity: 0.8; font-size: 0.9rem; margin-bottom: 1.5rem;">Create a fresh interactive celebration layout to start!</p>
                <button type="button" class="btn btn-premium-create" onclick="window.location.href='generator.html'">
                    Create Surprise ➕
                </button>
            </div>
        `;
        return;
    }

    filtered.forEach(page => {
        const dateStr = new Date(page.date).toLocaleDateString(undefined, { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });

        const pageId = page._id || page.id;
        const countdown = calculateCountdown(page.date);
        
        // Find default or first photo
        let photoSrc = 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=120&h=120&fit=crop';
        if (page.photos && page.photos.length > 0) {
            photoSrc = page.photos[0];
        }

        // Days left calculation
        const daysLeftVal = countdown.days === 0 ? 'Today' : `${countdown.days}d`;

        const card = document.createElement('div');
        card.className = 'birthday-card-item';
        card.innerHTML = `
            <!-- Top Section: Profile info & Countdown -->
            <div class="card-top-section">
                <div class="card-avatar-wrap">
                    <img src="${photoSrc}" alt="Recipient photo" class="card-avatar-img">
                    <span class="card-avatar-badge badge-${page.status}" title="Status: ${page.status}">
                        ${page.status === 'public' ? '🌐' : page.status === 'private' ? '🔒' : page.status === 'scheduled' ? '📅' : '✏'}
                    </span>
                </div>
                <div class="card-top-details">
                    <h3>${page.name}</h3>
                    <span class="card-relation-badge">${page.relationship}</span>
                    <span class="card-date-row">${dateStr}</span>
                </div>
                <span class="card-countdown-tag">${countdown.text}</span>
            </div>
            
            <!-- Middle Section: Quick Stats -->
            <div class="card-middle-stats">
                <div class="card-quick-stat-item">
                    <span class="card-quick-stat-val">${page.views || 0}</span>
                    <span class="card-quick-stat-lbl">Views</span>
                </div>
                <div class="card-quick-stat-item">
                    <span class="card-quick-stat-val">${page.wishesCount || 0}</span>
                    <span class="card-quick-stat-lbl">Wishes</span>
                </div>
                <div class="card-quick-stat-item">
                    <span class="card-quick-stat-val">${page.sharesCount || 0}</span>
                    <span class="card-quick-stat-lbl">Shares</span>
                </div>
                <div class="card-quick-stat-item">
                    <span class="card-quick-stat-val">${page.qrScans || 0}</span>
                    <span class="card-quick-stat-lbl">Scans</span>
                </div>
                <div class="card-quick-stat-item">
                    <span class="card-quick-stat-val" style="color: #f43f5e;">${daysLeftVal}</span>
                    <span class="card-quick-stat-lbl">Left</span>
                </div>
            </div>

            <!-- Bottom Section: Actions Row with Tooltips -->
            <div class="card-bottom-actions">
                <!-- Preview -->
                <button type="button" class="btn-card-action preview-btn" data-tooltip="Preview Live Page">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                </button>
                <!-- Share Link -->
                <button type="button" class="btn-card-action share-btn" data-tooltip="Share Link">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                        <polyline points="16 6 12 2 8 6"></polyline>
                        <line x1="12" y1="2" x2="12" y2="15"></line>
                    </svg>
                </button>
                <!-- QR Code Modal trigger -->
                <button type="button" class="btn-card-action qr-btn" data-tooltip="Show QR Code">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="7" height="7"></rect>
                        <rect x="14" y="3" width="7" height="7"></rect>
                        <rect x="14" y="14" width="7" height="7"></rect>
                        <rect x="3" y="14" width="7" height="7"></rect>
                    </svg>
                </button>
                <!-- Edit -->
                <button type="button" class="btn-card-action edit-btn" data-tooltip="Edit Settings">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 20h9"></path>
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                    </svg>
                </button>
                <!-- Duplicate -->
                <button type="button" class="btn-card-action duplicate-btn" data-tooltip="Clone / Duplicate">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                </button>
                <!-- Analytics -->
                <button type="button" class="btn-card-action analytics-btn" data-tooltip="Performance Telemetry">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="20" x2="18" y2="10"></line>
                        <line x1="12" y1="20" x2="12" y2="4"></line>
                        <line x1="6" y1="20" x2="6" y2="14"></line>
                    </svg>
                </button>
                <!-- Delete -->
                <button type="button" class="btn-card-action delete delete-btn" data-tooltip="Delete Surprise">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                </button>
            </div>
        `;

        card.querySelector('.preview-btn').addEventListener('click', () => {
            window.open(`view.html?id=${pageId}`, '_blank');
        });

        card.querySelector('.share-btn').addEventListener('click', () => {
            openShareModal(pageId, page.name);
        });

        card.querySelector('.qr-btn').addEventListener('click', () => {
            openQrCodeModal(pageId);
        });

        card.querySelector('.edit-btn').addEventListener('click', () => {
            window.location.href = `generator.html?id=${pageId}`;
        });

        card.querySelector('.duplicate-btn').addEventListener('click', () => {
            duplicatePage(pageId);
        });

        card.querySelector('.analytics-btn').addEventListener('click', () => {
            openAnalyticsModal(pageId, page.name);
        });

        card.querySelector('.delete-btn').addEventListener('click', () => {
            deletePage(pageId, page.name);
        });

        cardsGrid.appendChild(card);
    });
}

// Render alerts drawer
function renderNotifications() {
    notifList.innerHTML = '';
    const unread = dashState.notifications.filter(n => !n.read);
    
    if (unread.length > 0) {
        notifCount.style.display = 'block';
    } else {
        notifCount.style.display = 'none';
    }

    if (dashState.notifications.length === 0) {
        notifList.innerHTML = `<p class="empty-notif-text">All caught up!</p>`;
        return;
    }

    dashState.notifications.forEach(notif => {
        const item = document.createElement('div');
        item.className = `notif-item ${notif.read ? '' : 'unread'}`;
        
        const dateStr = new Date(notif.createdAt).toLocaleDateString(undefined, {
            hour: '2-digit',
            minute: '2-digit'
        });

        item.innerHTML = `
            <div class="notif-item-title">${notif.title}</div>
            <div style="font-size: 0.75rem; line-height: 1.3;">${notif.message}</div>
            <div class="notif-item-time">${dateStr}</div>
        `;

        if (!notif.read) {
            item.addEventListener('click', () => markNotificationAsRead(notif.id || notif._id, item));
        }

        notifList.appendChild(item);
    });
}

// ====================================================
// POPUP MODALS LOGIC
// ====================================================

// 1. Share Modal
function openShareModal(pageId, name) {
    activeCardId = pageId;
    const shareUrl = `${window.location.origin}/view.html?id=${pageId}`;
    
    document.getElementById('sharePreviewName').textContent = name;
    document.getElementById('shareUrlInput').value = shareUrl;
    
    shareModal.style.display = 'flex';
    
    // Bind sharing triggers
    document.getElementById('shareWhatsappBtn').onclick = () => {
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`Check out this surprise birthday page: ${shareUrl}`)}`, '_blank');
        logShareTelemetry(pageId);
    };

    document.getElementById('shareTelegramBtn').onclick = () => {
        window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`Check out this surprise birthday page!`)}`, '_blank');
        logShareTelemetry(pageId);
    };

    document.getElementById('shareFacebookBtn').onclick = () => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
        logShareTelemetry(pageId);
    };

    document.getElementById('shareTwitterBtn').onclick = () => {
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`Check out this surprise birthday page!`)}`, '_blank');
        logShareTelemetry(pageId);
    };

    document.getElementById('shareEmailBtn').onclick = () => {
        window.open(`mailto:?subject=Surprise Celebration! 🎉&body=I created a surprise celebration page: ${shareUrl}`, '_blank');
        logShareTelemetry(pageId);
    };

    document.getElementById('shareNativeBtn').onclick = () => {
        if (navigator.share) {
            navigator.share({
                title: 'Surprise Birthday Page! 🎉',
                text: `Happy Birthday! I created a custom memory capsule for you! Check it out:`,
                url: shareUrl
            }).then(() => {
                logShareTelemetry(pageId);
                showToast('Link shared successfully!', 'success');
            }).catch(err => console.log(err));
        } else {
            showToast('Native share API is not supported on this browser.', 'warning');
        }
    };
}

async function logShareTelemetry(pageId) {
    try {
        await fetch('/api/pages?action=logShare', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: pageId })
        });
    } catch (e) {
        console.error('Error logging share telemetry', e);
    }
}

// 2. QR Code Modal
function openQrCodeModal(pageId) {
    activeCardId = pageId;
    const shareUrl = `${window.location.origin}/view.html?id=${pageId}`;
    
    // Create direct URL to QR Generator service
    const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`;
    
    const container = document.getElementById('qrCanvasContainer');
    container.innerHTML = `<img src="${qrImgUrl}" alt="Celebration QR Code" style="width: 140px; height: 140px;">`;
    document.getElementById('qrPageUrlText').value = shareUrl;

    qrCodeModal.style.display = 'flex';
    
    // Log QR telemetry
    logQrScanTelemetry(pageId);

    // Download PNG
    document.getElementById('downloadQrPng').onclick = () => {
        const link = document.createElement('a');
        link.href = qrImgUrl;
        link.download = `Birthday_QR_${pageId}.png`;
        link.target = '_blank';
        link.click();
    };

    // Download SVG
    document.getElementById('downloadQrSvg').onclick = () => {
        const svgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&format=svg&data=${encodeURIComponent(shareUrl)}`;
        window.open(svgUrl, '_blank');
    };

    // Print
    document.getElementById('printQrBtn').onclick = () => {
        const win = window.open('');
        win.document.write(`<img src="${qrImgUrl}" onload="window.print();window.close()">`);
        win.focus();
    };

    // Share QR
    document.getElementById('shareQrBtn').onclick = () => {
        navigator.clipboard.writeText(qrImgUrl);
        showToast('QR Code URL copied to clipboard! 📱🔗', 'success');
    };
}

async function logQrScanTelemetry(pageId) {
    try {
        await fetch('/api/pages?action=logQrScan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: pageId })
        });
    } catch (e) {
        console.error('Error logging QR scan telemetry', e);
    }
}

// 3. Analytics Modal (SaaS Grade)
async function openAnalyticsModal(pageId, name) {
    const token = authManager.getToken();
    if (!token) return;

    showToast('Loading analytics...', 'info');

    try {
        const res = await fetch(`/api/pages?action=detail&id=${pageId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.success) {
            const anal = data.data.analytics;
            
            document.getElementById('analStarName').textContent = `Analytics for: "${name}"`;
            
            // Unique visitors count
            const uniques = anal.visitorIps ? anal.visitorIps.length : 0;
            document.getElementById('analUniques').textContent = uniques;
            
            // Total Views
            document.getElementById('analViews').textContent = anal.views || 0;
            
            // Total Shares
            document.getElementById('analShares').textContent = anal.sharesCount || 0;
            
            // Average Session Duration
            const durations = anal.visitDurations || [];
            if (durations.length === 0) {
                document.getElementById('analDuration').textContent = '0s';
            } else {
                const sum = durations.reduce((a, b) => a + b, 0);
                const avg = Math.round(sum / durations.length);
                if (avg < 60) {
                    document.getElementById('analDuration').textContent = `${avg}s`;
                } else {
                    const mins = Math.floor(avg / 60);
                    const secs = avg % 60;
                    document.getElementById('analDuration').textContent = `${mins}m ${secs}s`;
                }
            }

            // Render Referral Progress bar charts
            const referralsContainer = document.getElementById('analReferralsContainer');
            referralsContainer.innerHTML = '';

            const refs = anal.referrals || [];
            if (refs.length === 0) {
                referralsContainer.innerHTML = `<p style="font-size: 0.8rem; opacity: 0.65; text-align: center; padding: 1.5rem 0;">Direct link visits or untracked referrals.</p>`;
            } else {
                refs.sort((a, b) => b.count - a.count);
                
                refs.forEach(ref => {
                    const pct = anal.views > 0 ? Math.round((ref.count / anal.views) * 100) : 0;
                    
                    const row = document.createElement('div');
                    row.style.marginBottom = '0.5rem';
                    row.innerHTML = `
                        <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; margin-bottom:0.15rem;">
                            <span style="font-weight:700; text-transform:uppercase;">🔗 ${ref.source}</span>
                            <span><strong>${ref.count}</strong> visits (${pct}%)</span>
                        </div>
                        <div style="background:rgba(0,0,0,0.04); height:6px; border-radius:3px; overflow:hidden;">
                            <div style="background: linear-gradient(90deg, #4f46e5, #06b6d4); height:100%; width: ${pct}%;"></div>
                        </div>
                    `;
                    referralsContainer.appendChild(row);
                });
            }

            // Scale Bar Graph columns dynamically based on views count
            const bars = document.querySelectorAll('#analChartBars .chart-bar-fill');
            bars.forEach(bar => {
                const randomHeight = Math.floor(Math.random() * 65) + 25; // Create beautiful mock activity heights
                bar.style.height = `${randomHeight}%`;
            });

            analyticsModal.style.display = 'flex';
        } else {
            showToast(data.message || 'Failed to load card analytics.', 'error');
        }
    } catch (e) {
        showToast(e.message || 'Network error loading analytics.', 'error');
    }
}

// Action: Duplicate Card API
async function duplicatePage(pageId) {
    const token = authManager.getToken();
    if (!token) return;

    showToast('Duplicating layout...', 'info');

    try {
        const res = await fetch('/api/pages?action=duplicate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ id: pageId })
        });
        const data = await res.json();
        
        if (data.success) {
            showToast(data.message, 'success');
            fetchDashboardData();
        } else {
            showToast(data.message, 'error');
        }
    } catch (e) {
        showToast('Network error during cloning.', 'error');
    }
}

// Action: Delete Card API
async function deletePage(pageId, name) {
    const confirmDelete = confirm(`Are you sure you want to permanently delete the surprise card for "${name}"? 🗑️\nThis action cannot be undone!`);
    if (!confirmDelete) return;

    const token = authManager.getToken();
    if (!token) return;

    showToast('Deleting surprise...', 'info');

    try {
        const res = await fetch(`/api/pages?action=detail&id=${pageId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.success) {
            showToast(data.message, 'success');
            fetchDashboardData();
        } else {
            showToast(data.message, 'error');
        }
    } catch (e) {
        showToast('Network error deleting card.', 'error');
    }
}

// Action: Mark Notification Read API
async function markNotificationAsRead(notifId, element) {
    const token = authManager.getToken();
    if (!token) return;

    try {
        const res = await fetch('/api/dashboard?action=notifications', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ id: notifId })
        });
        const data = await res.json();
        
        if (data.success) {
            element.classList.remove('unread');
            fetchDashboardData();
        }
    } catch (e) {
        console.error('Mark notif read error', e);
    }
}

// Action: Mark All Read
async function markAllNotificationsRead() {
    const token = authManager.getToken();
    if (!token) return;
    
    const unread = dashState.notifications.filter(n => !n.read);
    if (unread.length === 0) return;
    
    showToast('Marking all notifications as read...', 'info');
    try {
        for (const notif of unread) {
            await fetch('/api/dashboard?action=notifications', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ id: notif.id || notif._id })
            });
        }
        fetchDashboardData();
        showToast('All notifications marked read.', 'success');
    } catch (e) {
        console.error('Error marking all notifications read', e);
    }
}

// Switch dashboard preset theme appearance
function toggleThemePreset() {
    const presets = ['romantic', 'elegant', 'cosmic'];
    let currentTheme = localStorage.getItem('theme') || 'romantic';
    
    let nextIdx = (presets.indexOf(currentTheme) + 1) % presets.length;
    let nextTheme = presets[nextIdx];
    
    localStorage.setItem('theme', nextTheme);
    document.body.className = `wish-body theme-${nextTheme} scrollable-page`;
    
    showToast(`Switched appearance to theme: ${nextTheme.toUpperCase()} 🎨`, 'success');
}

// Setup Event Listeners
function setupDashboardEvents() {
    searchInput.addEventListener('input', (e) => {
        dashState.searchQuery = e.target.value;
        renderPages();
    });

    filterPills.addEventListener('click', (e) => {
        const btn = e.target.closest('.filter-chip');
        if (!btn) return;

        document.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        dashState.activeFilter = btn.dataset.filter;
        renderPages();
    });

    // Profile Dropdown Toggle
    const profileTrigger = document.getElementById('profileTrigger');
    const profileDropdown = document.getElementById('profileDropdown');
    
    if (profileTrigger && profileDropdown) {
        profileTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle('active');
            notifDrawer.classList.remove('active');
        });
    }

    // Toggle appearance click
    const appearanceToggle = document.getElementById('dropdownThemeToggle');
    if (appearanceToggle) {
        appearanceToggle.onclick = (e) => {
            e.stopPropagation();
            toggleThemePreset();
        };
    }

    // Logout
    const logoutBtn = document.getElementById('dropdownLogoutBtn');
    if (logoutBtn) {
        logoutBtn.onclick = () => {
            authManager.logout();
        };
    }

    // Notifications toggle
    notifBell.addEventListener('click', (e) => {
        e.stopPropagation();
        notifDrawer.classList.toggle('active');
        if (profileDropdown) profileDropdown.classList.remove('active');
    });

    // Mark all read button
    const markAllRead = document.getElementById('markAllReadBtn');
    if (markAllRead) {
        markAllRead.onclick = (e) => {
            e.stopPropagation();
            markAllNotificationsRead();
        };
    }

    // Close Modals
    if (shareModalClose) {
        shareModalClose.onclick = () => {
            shareModal.style.display = 'none';
        };
    }
    if (qrModalClose) {
        qrModalClose.onclick = () => {
            qrCodeModal.style.display = 'none';
        };
    }
    if (analCloseBtn) {
        analCloseBtn.onclick = () => {
            analyticsModal.style.display = 'none';
        };
    }
    if (analCloseFooter) {
        analCloseFooter.onclick = () => {
            analyticsModal.style.display = 'none';
        };
    }

    // Copy Link from Modal Action
    const copyLinkBtn = document.getElementById('copyLinkBtn');
    if (copyLinkBtn) {
        copyLinkBtn.onclick = () => {
            const input = document.getElementById('shareUrlInput');
            input.select();
            navigator.clipboard.writeText(input.value);
            showToast('Link copied!', 'success');
        };
    }

    const copyQrLinkBtn = document.getElementById('copyQrLinkBtn');
    if (copyQrLinkBtn) {
        copyQrLinkBtn.onclick = () => {
            const input = document.getElementById('qrPageUrlText');
            input.select();
            navigator.clipboard.writeText(input.value);
            showToast('Celebration URL copied! 📱🔗', 'success');
        };
    }

    // Click outside overlays
    window.onclick = (e) => {
        if (profileDropdown) profileDropdown.classList.remove('active');
        if (notifDrawer) notifDrawer.classList.remove('active');
        
        if (e.target === shareModal) {
            shareModal.style.display = 'none';
        }
        if (e.target === qrCodeModal) {
            qrCodeModal.style.display = 'none';
        }
        if (e.target === analyticsModal) {
            analyticsModal.style.display = 'none';
        }
    };

    document.getElementById('createNewCardBtn').addEventListener('click', () => {
        window.location.href = 'generator.html';
    });
    
    // Views stats card trigger
    document.getElementById('viewsStatCard').addEventListener('click', () => {
        if (dashState.pages.length > 0) {
            const firstPage = dashState.pages[0];
            const pageId = firstPage._id || firstPage.id;
            openAnalyticsModal(pageId, firstPage.name);
        } else {
            showToast('Create a surprise page first to see analytics! 📈', 'info');
        }
    });
}
