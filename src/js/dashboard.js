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

// Analytics elements
const analyticsModal = document.getElementById('analyticsModal');
const analCloseBtn = document.getElementById('analCloseBtn');

document.addEventListener('DOMContentLoaded', () => {
    // Hide analytics modal to prevent flashing
    analyticsModal.style.display = 'none';

    setupDashboardUser();
    fetchDashboardData();
    setupDashboardEvents();
});

// Sync user details
function setupDashboardUser() {
    const user = authManager.getUser();
    if (user) {
        document.getElementById('userWelcomeText').textContent = `Hello, ${user.name}! Ready to surprise someone? 🌟`;
    }
}

// Fetch stats, pages, and notifications in parallel
async function fetchDashboardData() {
    const token = authManager.getToken();
    if (!token) return;

    try {
        // 1. Fetch Stats
        const statsRes = await fetch('/api/dashboard?action=stats', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const statsData = await statsRes.json();
        if (statsData.success) {
            document.getElementById('stat-total').textContent = statsData.data.totalPages;
            document.getElementById('stat-active').textContent = statsData.data.activePages;
            document.getElementById('stat-views').textContent = statsData.data.totalViews;
            document.getElementById('stat-wishes').textContent = statsData.data.totalWishes;
        }

        // 2. Fetch Pages list
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

// Render list of surprises
function renderPages() {
    cardsGrid.innerHTML = '';
    
    let filtered = dashState.pages;
    if (dashState.activeFilter !== 'all') {
        filtered = filtered.filter(p => p.status === dashState.activeFilter);
    }

    if (dashState.searchQuery) {
        const query = dashState.searchQuery.toLowerCase();
        filtered = filtered.filter(p => 
            (p.name && p.name.toLowerCase().includes(query)) ||
            (p.relationship && p.relationship.toLowerCase().includes(query)) ||
            (p.senderName && p.senderName.toLowerCase().includes(query))
        );
    }

    if (filtered.length === 0) {
        cardsGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <span class="empty-state-icon">🎈</span>
                <h3 style="font-size: 1.3rem; margin-bottom: 0.5rem;">No cards found</h3>
                <p style="opacity: 0.8; font-size: 0.95rem; margin-bottom: 1.5rem;">Create a fresh surprise layout to start celebrating!</p>
                <button type="button" class="btn btn-primary" onclick="window.location.href='generator.html'" style="display: inline-flex; width: auto; padding: 0.6rem 1.5rem;">Add Card ➕</button>
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

        const card = document.createElement('div');
        card.className = 'birthday-card-item';
        card.innerHTML = `
            <span class="card-status-badge status-${page.status}">${page.status}</span>
            <h3 class="card-recipient-name">${page.name}</h3>
            <div class="card-meta-row">
                <span>Relation: <strong>${page.relationship.toUpperCase()}</strong></span>
                <span style="display: block; margin-top: 0.2rem;">Date: <strong>${dateStr}</strong></span>
            </div>
            
            <div class="card-actions-bar">
                <!-- Preview -->
                <button type="button" class="action-icon-btn preview-btn" data-id="${page.id}" title="Preview Public URL">👁️</button>
                <!-- Edit -->
                <button type="button" class="action-icon-btn edit-btn" data-id="${page.id}" title="Edit Card Parameters">✏️</button>
                <!-- Duplicate -->
                <button type="button" class="action-icon-btn duplicate-btn" data-id="${page.id}" title="Duplicate / Clone Layout">📋</button>
                <!-- Analytics -->
                <button type="button" class="action-icon-btn analytics-btn" data-id="${page.id}" title="View Card Analytics">📈</button>
                <!-- Delete -->
                <button type="button" class="action-icon-btn delete-btn" data-id="${page.id}" title="Delete Surprise Card">🗑️</button>
            </div>
        `;

        card.querySelector('.preview-btn').addEventListener('click', () => {
            window.open(`view.html?id=${page.id}`, '_blank');
        });

        card.querySelector('.edit-btn').addEventListener('click', () => {
            window.location.href = `generator.html?id=${page.id}`;
        });

        card.querySelector('.duplicate-btn').addEventListener('click', () => {
            duplicatePage(page.id);
        });

        card.querySelector('.analytics-btn').addEventListener('click', () => {
            openAnalyticsModal(page.id, page.name);
        });

        card.querySelector('.delete-btn').addEventListener('click', () => {
            deletePage(page.id, page.name);
        });

        cardsGrid.appendChild(card);
    });
}

// Render alerts drawer
function renderNotifications() {
    notifList.innerHTML = '';
    
    const unread = dashState.notifications.filter(n => !n.read);
    
    if (unread.length > 0) {
        notifCount.textContent = unread.length;
        notifCount.style.display = 'flex';
    } else {
        notifCount.style.display = 'none';
    }

    if (dashState.notifications.length === 0) {
        notifList.innerHTML = `<p style="font-size: 0.8rem; text-align: center; opacity: 0.6; padding: 1rem 0;">No notifications yet.</p>`;
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
            <div style="font-size: 0.8rem; line-height: 1.3;">${notif.message}</div>
            <div class="notif-item-time">${dateStr}</div>
        `;

        if (!notif.read) {
            item.addEventListener('click', () => markNotificationAsRead(notif.id, item));
        }

        notifList.appendChild(item);
    });
}

// ========================================================
// VISITOR ANALYTICS DISPLAYER (Premium Feature)
// ========================================================
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
            
            document.getElementById('analStarName').textContent = `Analytics for surprise card: "${name}"`;
            
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
                referralsContainer.innerHTML = `<p style="font-size: 0.8rem; opacity: 0.65; text-align: center; padding: 0.5rem 0;">Direct link visits or untracked referrals.</p>`;
            } else {
                // Sort by count descending
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
                        <div style="background:rgba(0,0,0,0.04); height:6px; border-radius:3px; overflow:hidden; border: 1px solid rgba(0,0,0,0.02);">
                            <div style="background: linear-gradient(90deg, var(--primary-color), var(--accent-color)); height:100%; width: ${pct}%;"></div>
                        </div>
                    `;
                    referralsContainer.appendChild(row);
                });
            }

            analyticsModal.style.display = 'flex';
        } else {
            showToast('Failed to load card analytics.', 'error');
        }
    } catch (e) {
        showToast('Network error loading analytics.', 'error');
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

// Setup Event Listeners
function setupDashboardEvents() {
    searchInput.addEventListener('input', (e) => {
        dashState.searchQuery = e.target.value;
        renderPages();
    });

    filterPills.addEventListener('click', (e) => {
        const btn = e.target.closest('.filter-pill');
        if (!btn) return;

        document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        dashState.activeFilter = btn.dataset.filter;
        renderPages();
    });

    notifBell.addEventListener('click', (e) => {
        e.stopPropagation();
        notifDrawer.classList.toggle('active');
    });

    document.addEventListener('click', () => {
        notifDrawer.classList.remove('active');
    });

    analCloseBtn.addEventListener('click', () => {
        analyticsModal.style.display = 'none';
    });

    document.getElementById('createNewCardBtn').addEventListener('click', () => {
        window.location.href = 'generator.html';
    });
    
    // Clicking the view summary card opens the latest page analytics if available
    document.getElementById('viewsStatCard').addEventListener('click', () => {
        if (dashState.pages.length > 0) {
            openAnalyticsModal(dashState.pages[0].id, dashState.pages[0].name);
        } else {
            showToast('Create a surprise page first to see analytics! 📈', 'info');
        }
    });
}
