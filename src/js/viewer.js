// Viewer Configuration State
let viewerConfig = {
    pageId: null,
    name: 'Anshika',
    senderName: 'Your Love',
    relationship: 'girlfriend',
    message: "Happy Birthday, my love! You own my heart and thoughts. 😘❤️",
    photos: [],
    videoUrl: '',
    voiceMessage: '',
    theme: 'romantic',
    themePreset: 'romantic',
    background: 'linear-gradient(135deg, #ffe4e6 0%, #fbcfe8 100%)',
    music: 'chimes',
    font: 'Outfit',
    confettiStyle: 'hearts',
    fireworksStyle: 'burst',
    cakeStyle: 'animated',
    greetingStyle: 'typewriter',
    
    // premium variables
    timeline: [],
    aiWishes: [],
    expiresAt: null,
    hasPassword: false,
    
    // saas capsule gating
    capsuleLocked: false,
    unlockDate: null,
    
    comments: [],
    guestbook: []
};

// Local Toast Notification system
function showToast(message, type = 'info') {
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
}

// Analytics tracks
let sessionStartTime = null;

// DOM elements
const loadingScreen = document.getElementById('loadingScreen');
const passwordGate = document.getElementById('passwordGate');
const expiredGate = document.getElementById('expiredGate');
const capsuleLockedGate = document.getElementById('capsuleLockedGate');
const giftBoxContainer = document.getElementById('giftBoxContainer');
const envelope = document.getElementById('envelope');
const displayCard = document.getElementById('displayCard');
const guestbookCard = document.getElementById('guestbookCard');
const wishMessage = document.getElementById('wishMessage');

document.addEventListener('DOMContentLoaded', () => {
    // Parse query parameters
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    
    if (id) {
        viewerConfig.pageId = id;
        fetchCardDetails(id);
    } else {
        // Run with mock defaults
        setTimeout(() => {
            loadingScreen.style.opacity = '0';
            setTimeout(() => loadingScreen.style.display = 'none', 500);
            setupSurpriseCardUI();
        }, 1000);
    }

    setupEnvelopeReveal();
    setupGuestbookForm();
    setupPremiumActions();
    setupSessionTracker();
    setupThemeToggleFloating();
});

// Load Card Settings from API (supporting password gate & capsule gates check)
async function fetchCardDetails(pageId, passwordValue = '') {
    try {
        let url = `/api/pages?action=public&id=${pageId}`;
        
        // Append password query if provided
        if (passwordValue) {
            url += `&password=${encodeURIComponent(passwordValue)}`;
        }

        // Get referral channel if any
        const params = new URLSearchParams(window.location.search);
        const ref = params.get('ref');
        if (ref) {
            url += `&ref=${encodeURIComponent(ref)}`;
        }

        const token = localStorage.getItem('birthdaySurpriseAuthToken') || localStorage.getItem('token');
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const res = await fetch(url, { headers });
        
        // Handle expiration (Vercel returns 410 for expired pages)
        if (res.status === 410) {
            loadingScreen.style.display = 'none';
            passwordGate.style.display = 'none';
            capsuleLockedGate.style.display = 'none';
            expiredGate.style.display = 'flex';
            return;
        }

        const data = await res.json();
        
        if (data.success) {
            // 1. Check if Capsule is locked
            if (data.data.isCapsuleLocked) {
                loadingScreen.style.display = 'none';
                passwordGate.style.display = 'none';
                capsuleLockedGate.style.display = 'flex';
                
                setupCapsuleTimeLockCountdown(pageId, data.data.unlockDate);
                return;
            }

            // 2. Check if page is locked under password gate
            if (data.data.isGated) {
                loadingScreen.style.display = 'none';
                capsuleLockedGate.style.display = 'none';
                passwordGate.style.display = 'flex';
                setupPasswordGateSubmit(pageId);
                return;
            }

            // Successfully unlocked/open
            viewerConfig = {
                ...viewerConfig,
                ...data.data.page,
                creator: data.data.creator || null,
                comments: data.data.comments || [],
                guestbook: data.data.guestbook || []
            };

            // Hide gates
            passwordGate.style.display = 'none';
            capsuleLockedGate.style.display = 'none';
            loadingScreen.style.opacity = '0';
            setTimeout(() => loadingScreen.style.display = 'none', 500);

            setupSurpriseCardUI();
            renderGuestbookWishes();
        } else {
            alert(data.message || 'Birthday surprise not found.');
            window.location.href = '/login';
        }
    } catch (e) {
        console.error('Fetch card details error:', e);
        loadingScreen.style.display = 'none';
    }
}

// Password Gate controls
function setupPasswordGateSubmit(pageId) {
    const submitBtn = document.getElementById('gateSubmitBtn');
    const input = document.getElementById('gatePasswordInput');

    const submitPassword = () => {
        const passwordValue = input.value.trim();
        if (!passwordValue) return;
        
        loadingScreen.style.display = 'flex';
        loadingScreen.style.opacity = '1';
        fetchCardDetails(pageId, passwordValue);
    };

    submitBtn.addEventListener('click', submitPassword);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submitPassword();
    });
}

// Time-Locked Capsule countdown clock trigger
function setupCapsuleTimeLockCountdown(pageId, unlockDateStr) {
    const clockText = document.getElementById('capsuleCountdownText');
    const targetTime = new Date(unlockDateStr).getTime();

    const updateClock = () => {
        const now = new Date().getTime();
        const distance = targetTime - now;

        if (distance <= 0) {
            clearInterval(capsuleInterval);
            clockText.textContent = "Capsule Unlocked! 🔓🎂";
            
            // Magical Unlock Experience! (Sound chimes, confetti burst)
            playMagicalUnlockSequence();
            
            setTimeout(() => {
                // Re-fetch now-decrypted data
                fetchCardDetails(pageId);
            }, 1500);
        } else {
            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            clockText.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
        }
    };

    updateClock();
    const capsuleInterval = setInterval(updateClock, 1000);
}

function playMagicalUnlockSequence() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    const now = audioCtx.currentTime;
    
    // Synthesis cute ascending sound
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
    notes.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        gain.gain.setValueAtTime(0, now + idx * 0.1);
        gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.1 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.4);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.4);
    });

    // Massive canvas fireworks
    const w = window.innerWidth;
    const h = window.innerHeight;
    createBurst(w * 0.5, h * 0.4);
    createBurst(w * 0.3, h * 0.5);
    createBurst(w * 0.7, h * 0.5);
}

// Populate card fields, background, media elements, and styles
// Populate card fields, background, media elements, and styles
function setupSurpriseCardUI() {
    const currentTheme = viewerConfig.themePreset || viewerConfig.theme || 'romantic';
    document.body.className = `wish-body theme-${currentTheme}`;
    document.body.style.background = viewerConfig.background;
    
    const font = viewerConfig.font || 'Outfit';
    displayCard.style.fontFamily = font;
    wishMessage.style.fontFamily = font;
    document.getElementById('cardTitle').style.fontFamily = font;
    
    document.getElementById('relationBadge').textContent = viewerConfig.relationship.toUpperCase();
    document.getElementById('cardTitle').textContent = `Happy Birthday, ${viewerConfig.name}! 🎉`;
    document.getElementById('senderTag').textContent = `From: ${viewerConfig.senderName}`;

    // Populate creator badge
    const badge = document.getElementById('creatorBadge');
    if (badge && viewerConfig.creator) {
        document.getElementById('creatorNameText').textContent = `Created by ${viewerConfig.creator.name}`;
        const avatar = document.getElementById('creatorAvatar');
        if (viewerConfig.creator.profilePhoto) {
            avatar.crossOrigin = "anonymous";
            avatar.src = viewerConfig.creator.profilePhoto;
            avatar.style.display = 'inline-block';
        } else {
            avatar.style.display = 'none';
        }
        badge.style.display = 'inline-flex';
    }

    // 1. Photos loop on Hero profile photo
    setupPhotosCarousel();

    // 2. Video Player Embed
    setupVideoEmbed();

    // 3. Voice Message Cassette & custom player
    setupVoiceMessagePlayer();

    // 4. Cake style blowing interaction
    setupCakeBlowing();

    // 5. Memory Timeline
    setupTimelineMemoryLane();

    // 6. Birthday Countdown Timer
    setupBirthdayCountdown();

    // 7. QR Code Generation
    setupQrCodeShare();

    // 8. New Redesign elements
    setupMemoryGallery();
    setupAiWishes();
    setupGiftSuggestions();
    setupGuestbookWidget();

    // Setup Story navigation flow
    setTimeout(initStoryNavigation, 100);
}

let storyPages = [];
let currentStoryIdx = 0;

function initStoryNavigation() {
    // Collect all pages that should be visible
    const allSections = [
        document.getElementById('heroSection'),
        document.getElementById('messageSection'),
        document.getElementById('videoSection'),
        document.getElementById('voiceSection'),
        document.getElementById('gallerySection'),
        document.getElementById('timelineSection'),
        document.getElementById('musicSection'),
        document.getElementById('aiWishesSection'),
        document.getElementById('giftSection'),
        document.getElementById('shareSection'),
        document.getElementById('guestbookSection')
    ];
    
    // Bind global arrow keyboard shortcuts for slide deck navigation
    if (!window.hasStoryKeyboardBound) {
        window.hasStoryKeyboardBound = true;
        document.addEventListener('keydown', (e) => {
            const activeTag = document.activeElement ? document.activeElement.tagName : '';
            if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') {
                return; // User is typing, skip navigating slides
            }
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                const prevBtn = document.getElementById('storyPrevBtn');
                if (prevBtn && !prevBtn.disabled) prevBtn.click();
            } else if (e.key === 'ArrowRight' || e.key === ' ') {
                e.preventDefault();
                const nextBtn = document.getElementById('storyNextBtn');
                if (nextBtn && !nextBtn.disabled) nextBtn.click();
            }
        });
    }
    
    storyPages = [];
    allSections.forEach(section => {
        if (section) {
            // Check if section is active (not display: none)
            if (section.style.display !== 'none') {
                storyPages.push(section);
                section.classList.remove('active');
                section.style.display = 'none';
            }
        }
    });
    
    if (storyPages.length === 0) return;
    
    currentStoryIdx = 0;
    showStoryPage(0);
    
    // Bind navigation buttons
    const prevBtn = document.getElementById('storyPrevBtn');
    const nextBtn = document.getElementById('storyNextBtn');
    
    if (prevBtn) {
        prevBtn.onclick = () => {
            if (currentStoryIdx > 0) {
                currentStoryIdx--;
                showStoryPage(currentStoryIdx);
            }
        };
    }
    
    if (nextBtn) {
        nextBtn.onclick = () => {
            if (currentStoryIdx < storyPages.length - 1) {
                currentStoryIdx++;
                showStoryPage(currentStoryIdx);
            }
        };
    }

    // Bind Start Celebration button
    const startBtn = document.getElementById('startCelebrationBtn');
    if (startBtn) {
        startBtn.onclick = () => {
            if (storyPages.length > 1) {
                currentStoryIdx = 1;
                showStoryPage(1);
            }
        };
    }
}

function showStoryPage(idx) {
    const navBar = document.getElementById('storyNavBar');
    const progress = document.getElementById('storyProgress');
    
    if (idx === 0) {
        if (navBar) navBar.style.opacity = '0';
        setTimeout(() => {
            if (currentStoryIdx === 0 && navBar) navBar.style.display = 'none';
        }, 300);
    } else {
        if (navBar) {
            navBar.style.display = 'flex';
            setTimeout(() => {
                if (currentStoryIdx > 0) navBar.style.opacity = '1';
            }, 50);
        }
    }
    
    // Toggle page active transitions
    storyPages.forEach((page, pIdx) => {
        if (pIdx === idx) {
            page.style.display = 'flex';
            // Force reflow
            page.getBoundingClientRect();
            page.classList.add('active');
        } else {
            page.classList.remove('active');
            setTimeout(() => {
                if (currentStoryIdx !== pIdx) {
                    page.style.display = 'none';
                }
            }, 800);
        }
    });
    
    // Disable navigation boundaries
    const prevBtn = document.getElementById('storyPrevBtn');
    const nextBtn = document.getElementById('storyNextBtn');
    
    if (prevBtn) prevBtn.disabled = (idx === 0);
    if (nextBtn) nextBtn.disabled = (idx === storyPages.length - 1);
    
    // Rerender indicators
    if (progress) {
        progress.innerHTML = '';
        storyPages.forEach((_, pIdx) => {
            const dot = document.createElement('div');
            dot.className = `story-dot${pIdx === idx ? ' active' : ''}`;
            dot.onclick = () => {
                currentStoryIdx = pIdx;
                showStoryPage(pIdx);
            };
            progress.appendChild(dot);
        });
    }
}

// Photo Slider Slide Deck
function setupPhotosCarousel() {
    const photoDeck = document.getElementById('photoDeck');
    photoDeck.innerHTML = '';

    const images = viewerConfig.photos && viewerConfig.photos.length > 0 ? 
                   viewerConfig.photos : 
                   [generateFallbackPhoto(viewerConfig.relationship)];

    images.forEach((base64, idx) => {
        const slide = document.createElement('img');
        slide.crossOrigin = "anonymous";
        slide.src = base64;
        slide.className = `carousel-slide ${idx === 0 ? 'active' : ''}`;
        slide.alt = `Slide ${idx + 1}`;
        photoDeck.appendChild(slide);
    });

    if (images.length > 1) {
        let currentSlide = 0;
        setInterval(() => {
            const slides = photoDeck.querySelectorAll('.carousel-slide');
            if (slides.length > 0) {
                slides[currentSlide].classList.remove('active');
                currentSlide = (currentSlide + 1) % slides.length;
                slides[currentSlide].classList.add('active');
            }
        }, 3000);
    }
}

function generateFallbackPhoto(relation) {
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 160, 160);
    grad.addColorStop(0, '#a855f7');
    grad.addColorStop(1, '#ec4899');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(80, 80, 80, 0, Math.PI * 2);
    ctx.fill();
    
    const emoji = (relation === 'girlfriend' || relation === 'sister' || relation === 'mother') ? '👸' : '🤵';
    ctx.font = '80px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 80, 84);
    return canvas.toDataURL('image/png');
}

// Youtube, Instagram, Vimeo or HTML5 raw MP4 video resolver
function setupVideoEmbed() {
    const wrapper = document.getElementById('videoWrapper');
    const container = document.getElementById('videoSection');
    const url = viewerConfig.videoUrl;

    if (!url) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';
    wrapper.innerHTML = '';

    // 1. YouTube Player
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        let videoId = '';
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
        const match = url.match(regExp);
        if (match && match[2].length === 11) {
            videoId = match[2];
        }
        wrapper.innerHTML = `
            <iframe src="https://www.youtube.com/embed/${videoId}" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen>
            </iframe>
        `;
    } 
    // 2. Vimeo Player
    else if (url.includes('vimeo.com')) {
        let videoId = '';
        const vimeoRegex = /(?:vimeo\.com)\/(?:video\/)?([0-9]+)/i;
        const match = url.match(vimeoRegex);
        if (match) {
            videoId = match[1];
        }
        wrapper.innerHTML = `
            <iframe src="https://player.vimeo.com/video/${videoId}" 
                    allow="autoplay; fullscreen; picture-in-picture" 
                    allowfullscreen>
            </iframe>
        `;
    } 
    // 3. Instagram Reels / Posts Fallback Card
    else if (url.includes('instagram.com') || url.includes('instagr.am')) {
        const igRegex = /(?:instagram\.com)\/(?:p|reel|tv)\/([a-zA-Z0-9_\-]+)/i;
        const match = url.match(igRegex);
        const shortcode = match ? match[1] : '';
        const thumbUrl = shortcode ? `https://www.instagram.com/p/${shortcode}/media/?size=l` : '';

        wrapper.innerHTML = `
            <div class="instagram-fallback-card" id="igFallback" style="background-image: url('${thumbUrl}');">
                <div class="instagram-fallback-overlay"></div>
                <div class="instagram-fallback-content">
                    <div class="instagram-icon-badge">📸</div>
                    <h3 style="font-size: 1.3rem; font-weight: 800; margin: 0; color: #ffffff;">Instagram Reel Surprise</h3>
                    <p style="font-size: 0.9rem; opacity: 0.85; margin: 0 0 0.5rem 0; line-height: 1.4; color: #ffffff;">Due to platform limits, this Reel must be viewed directly on Instagram.</p>
                    <a href="${url}" target="_blank" rel="noopener noreferrer" class="btn-instagram">
                        Open on Instagram ➜
                    </a>
                </div>
            </div>
        `;

        // If the cover image fails to load, gracefully clear the background image
        const img = new Image();
        img.src = thumbUrl;
        img.onerror = () => {
            const igFallback = document.getElementById('igFallback');
            if (igFallback) igFallback.style.backgroundImage = 'none';
        };
    } 
    // 4. Raw MP4 / Direct Video Files
    else {
        wrapper.innerHTML = `
            <video src="${url}" controls preload="metadata"></video>
        `;
    }

    // 5. Add Shimmer Loading Effect for Iframe and Video tags
    const iframe = wrapper.querySelector('iframe');
    const video = wrapper.querySelector('video');

    if (iframe || video) {
        const loader = document.createElement('div');
        loader.className = 'video-loading-placeholder';
        loader.innerHTML = '<span style="font-weight: 600; font-size: 0.95rem; opacity: 0.85; animation: floatUp 1.2s infinite alternate;">Loading Surprise Player... 📽️</span>';
        wrapper.appendChild(loader);

        if (iframe) {
            iframe.onload = () => {
                loader.style.opacity = '0';
                setTimeout(() => loader.remove(), 300);
            };
        } else if (video) {
            video.onloadeddata = () => {
                loader.style.opacity = '0';
                setTimeout(() => loader.remove(), 300);
            };
        }
    }
}

// Voice Tape cassette player controls
function setupVoiceMessagePlayer() {
    const container = document.getElementById('voiceSection');
    const playBtn = document.getElementById('tapePlayBtn');
    const audio = document.getElementById('voiceMessageAudio');
    const slider = document.getElementById('voiceProgress');
    const currentTimeText = document.getElementById('voiceCurrentTime');
    const durationText = document.getElementById('voiceDuration');
    const waveform = document.getElementById('voiceWaveform');
    const downloadBtn = document.getElementById('downloadVoiceBtn');
    const voiceSenderName = document.getElementById('voiceSenderName');
    const status = document.getElementById('tapeStatus');

    if (!viewerConfig.voiceMessage) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';
    audio.src = viewerConfig.voiceMessage;
    voiceSenderName.textContent = viewerConfig.senderName || 'Sender';

    let wasMusicPlayingBeforeVoice = false;

    playBtn.addEventListener('click', () => {
        if (audio.paused) {
            wasMusicPlayingBeforeVoice = isPlaying;
            stopSong();
            audio.play().catch(e => console.error(e));
            playBtn.textContent = '⏸️';
            waveform.classList.add('playing');
            status.textContent = 'Playing voice message... 🔊';
        } else {
            audio.pause();
            playBtn.textContent = '▶️';
            waveform.classList.remove('playing');
            status.textContent = 'Voice message paused';
        }
    });

    audio.addEventListener('timeupdate', () => {
        const progress = (audio.currentTime / audio.duration) * 100 || 0;
        slider.value = progress;
        currentTimeText.textContent = formatTime(audio.currentTime);
    });

    audio.addEventListener('loadedmetadata', () => {
        durationText.textContent = formatTime(audio.duration);
    });

    slider.addEventListener('input', (e) => {
        const seekTime = (parseFloat(e.target.value) / 100) * audio.duration;
        audio.currentTime = seekTime;
    });

    audio.addEventListener('ended', () => {
        playBtn.textContent = '▶️';
        waveform.classList.remove('playing');
        status.textContent = 'Listen again';
        slider.value = 0;
        currentTimeText.textContent = '00:00';
        if (wasMusicPlayingBeforeVoice) {
            playSong();
        }
    });

    downloadBtn.onclick = () => {
        const a = document.createElement('a');
        a.href = viewerConfig.voiceMessage;
        a.download = `Voice_from_${viewerConfig.senderName || 'friend'}.webm`;
        a.click();
    };
}

function formatTime(seconds) {
    if (isNaN(seconds)) return '00:00';
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

// Memory Timeline loader (Premium feature)
function setupTimelineMemoryLane() {
    const container = document.getElementById('timelineSection');
    const list = document.getElementById('timelineList');
    list.innerHTML = '';

    if (!viewerConfig.timeline || viewerConfig.timeline.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';

    viewerConfig.timeline.forEach(item => {
        const card = document.createElement('div');
        card.className = 'timeline-node-card';
        
        card.innerHTML = `
            <div class="timeline-node-dot"></div>
            <span class="timeline-node-year">${item.date}</span>
            <h4 class="timeline-node-title">${item.title}</h4>
            <p class="timeline-node-text">${item.text}</p>
            ${item.photo ? `<img src="${item.photo}" class="timeline-node-img" alt="Timeline Photo" crossorigin="anonymous" loading="lazy">` : ''}
        `;
        list.appendChild(card);
    });
}

// Countdown Clock (Premium feature)
function setupBirthdayCountdown() {
    const container = document.getElementById('countdownBlock');
    const countdownText = document.getElementById('countdownText');
    
    // Parse target date
    const bdayDate = new Date(viewerConfig.date);
    const today = new Date();
    
    // If the birthday already passed this year, calculate for next year's anniversary
    let targetYear = today.getFullYear();
    let targetDate = new Date(targetYear, bdayDate.getMonth(), bdayDate.getDate());
    
    if (today > targetDate) {
        targetDate.setFullYear(targetYear + 1);
    }

    container.style.display = 'block';

    const updateTimer = () => {
        const now = new Date().getTime();
        const distance = targetDate.getTime() - now;
        
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        if (distance < 0) {
            countdownText.textContent = "It's Celebration Day! 🎂🥳";
            clearInterval(timerInterval);
        } else {
            countdownText.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
        }
    };

    updateTimer();
    const timerInterval = setInterval(updateTimer, 1000);
}

// Cake Blowing candle blow interactions
function setupCakeBlowing() {
    const cakeBox = document.getElementById('cakeBox');
    const hint = document.getElementById('candleHint');
    
    let blownOut = false;

    // Default cake emoji set
    if (viewerConfig.cakeStyle === 'chocolate') {
        cakeBox.textContent = '🍫🎂🕯️';
    } else if (viewerConfig.cakeStyle === 'cupcake') {
        cakeBox.textContent = '🧁🕯️';
    } else {
        cakeBox.textContent = '🎂🕯️';
    }

    cakeBox.addEventListener('click', () => {
        if (blownOut) return;
        blownOut = true;
        
        // Remove candle flame emoji
        if (viewerConfig.cakeStyle === 'chocolate') {
            cakeBox.textContent = '🍫🎂💨';
        } else if (viewerConfig.cakeStyle === 'cupcake') {
            cakeBox.textContent = '🧁💨';
        } else {
            cakeBox.textContent = '🎂💨';
        }

        hint.textContent = 'Candle Blown! Happy Birthday! 🎉🎈';
        hint.style.color = '#10b981';

        // Play applause synthesized tone
        playBlowoutApplause();
        
        // Trigger massive fireworks burst
        const w = window.innerWidth;
        const h = window.innerHeight;
        createBurst(w * 0.5, h * 0.5);
        createBurst(w * 0.25, h * 0.4);
        createBurst(w * 0.75, h * 0.4);
    });
}

function playBlowoutApplause() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    const now = audioCtx.currentTime;
    
    // Play celebratory fast arpeggios
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        
        gain.gain.setValueAtTime(0, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.3);
        
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.3);
    });
}

// Generate QR Code linking to this view page
function setupQrCodeShare() {
    const img = document.getElementById('qrCodeImg');
    const pageUrl = window.location.href;
    
    img.crossOrigin = "anonymous";
    // Use public QR Code generator API
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(pageUrl)}`;
}

// Memory Gallery Masonry and swipe carousel renderer
let activeLightboxIdx = 0;
let activeGalleryIdx = 0;

function setupMemoryGallery() {
    const gallerySection = document.getElementById('gallerySection');
    const photos = viewerConfig.photos || [];

    if (photos.length === 0) {
        gallerySection.style.display = 'none';
        return;
    }

    gallerySection.style.display = 'flex';
    activeGalleryIdx = 0;
    
    // Bind buttons
    const prevBtn = document.getElementById('galleryPrevBtn');
    const nextBtn = document.getElementById('galleryNextBtn');
    const zoomBtn = document.getElementById('galleryZoomBtn');
    const downloadBtn = document.getElementById('galleryDownloadBtn');
    
    if (prevBtn) {
        prevBtn.onclick = (e) => {
            e.stopPropagation();
            activeGalleryIdx = (activeGalleryIdx - 1 + photos.length) % photos.length;
            updateGalleryImage();
        };
    }
    
    if (nextBtn) {
        nextBtn.onclick = (e) => {
            e.stopPropagation();
            activeGalleryIdx = (activeGalleryIdx + 1) % photos.length;
            updateGalleryImage();
        };
    }
    
    if (zoomBtn) {
        zoomBtn.onclick = (e) => {
            e.stopPropagation();
            openLightbox(activeGalleryIdx);
        };
    }
    
    if (downloadBtn) {
        downloadBtn.onclick = (e) => {
            e.stopPropagation();
            const a = document.createElement('a');
            a.href = photos[activeGalleryIdx];
            a.download = `Memory_${activeGalleryIdx + 1}.jpg`;
            a.click();
        };
    }

    updateGalleryImage();
    setupLightboxListeners();
}

function updateGalleryImage() {
    const photos = viewerConfig.photos || [];
    const activeImg = document.getElementById('activeGalleryImage');
    const indexText = document.getElementById('galleryIndexText');
    
    if (photos.length > 0 && activeImg) {
        activeImg.src = photos[activeGalleryIdx];
        if (indexText) {
            indexText.textContent = `Photo ${activeGalleryIdx + 1} of ${photos.length}`;
        }
    }
}

function openLightbox(idx) {
    const lightbox = document.getElementById('galleryLightbox');
    const lightboxImg = document.getElementById('lightboxImg');
    activeLightboxIdx = idx;

    lightboxImg.src = viewerConfig.photos[idx];
    lightboxImg.style.transform = 'scale(1)'; // Reset zoom
    
    lightbox.style.display = 'flex';
    setTimeout(() => lightbox.style.opacity = '1', 50);
}

function setupLightboxListeners() {
    const lightbox = document.getElementById('galleryLightbox');
    const closeBtn = document.getElementById('lightboxClose');
    const prevBtn = document.getElementById('lightboxPrev');
    const nextBtn = document.getElementById('lightboxNext');
    const img = document.getElementById('lightboxImg');
    const zoomInBtn = document.getElementById('lightboxZoomInBtn');
    const zoomOutBtn = document.getElementById('lightboxZoomOutBtn');
    const downloadBtn = document.getElementById('lightboxDownloadBtn');
    const shareBtn = document.getElementById('lightboxShareBtn');

    let scale = 1;

    closeBtn.onclick = () => {
        lightbox.style.opacity = '0';
        setTimeout(() => lightbox.style.display = 'none', 300);
    };

    prevBtn.onclick = (e) => {
        e.stopPropagation();
        const photos = viewerConfig.photos;
        activeLightboxIdx = (activeLightboxIdx - 1 + photos.length) % photos.length;
        img.src = photos[activeLightboxIdx];
        scale = 1;
        img.style.transform = `scale(${scale})`;
    };

    nextBtn.onclick = (e) => {
        e.stopPropagation();
        const photos = viewerConfig.photos;
        activeLightboxIdx = (activeLightboxIdx + 1) % photos.length;
        img.src = photos[activeLightboxIdx];
        scale = 1;
        img.style.transform = `scale(${scale})`;
    };

    zoomInBtn.onclick = (e) => {
        e.stopPropagation();
        scale = Math.min(scale + 0.25, 3);
        img.style.transform = `scale(${scale})`;
    };

    zoomOutBtn.onclick = (e) => {
        e.stopPropagation();
        scale = Math.max(scale - 0.25, 0.5);
        img.style.transform = `scale(${scale})`;
    };

    downloadBtn.onclick = (e) => {
        e.stopPropagation();
        const a = document.createElement('a');
        a.href = viewerConfig.photos[activeLightboxIdx];
        a.download = `Memory_${activeLightboxIdx + 1}.png`;
        a.click();
    };

    shareBtn.onclick = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(window.location.href);
        showToast('Card link copied to clipboard! 🔗', 'success');
    };
}

// AI Birthday Wishes tab selector
let activeAiCategory = 'romantic';
function setupAiWishes() {
    const tabs = document.getElementById('aiWishesTabs');
    const text = document.getElementById('aiWishText');
    const regenBtn = document.getElementById('regenerateAiWishBtn');
    const copyBtn = document.getElementById('copyAiWishBtn');

    tabs.querySelectorAll('.ai-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            tabs.querySelectorAll('.ai-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            activeAiCategory = tab.getAttribute('data-cat');
            generateAiWish();
        });
    });

    regenBtn.onclick = () => generateAiWish();
    
    copyBtn.onclick = () => {
        navigator.clipboard.writeText(text.textContent);
        showToast('Wish copied to clipboard! 📋', 'success');
    };

    generateAiWish();
}

async function generateAiWish() {
    const text = document.getElementById('aiWishText');
    text.textContent = '⏳ WishCraft is channeling the stars to write a beautiful greeting for you...';

    try {
        const res = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                recipientName: viewerConfig.name || 'Recipient',
                relation: viewerConfig.relationship || 'friend',
                category: activeAiCategory
            })
        });
        const data = await res.json();
        if (data.success) {
            text.textContent = data.data.text;
        } else {
            text.textContent = 'Wishes are currently floating in orbit. Please try again! ✨';
        }
    } catch (e) {
        console.error(e);
        text.textContent = 'Failed to connect to the wish generator.';
    }
}

// Gift Suggestions Section
function setupGiftSuggestions() {
    const grid = document.getElementById('giftSuggestionsGrid');
    const refreshBtn = document.getElementById('regenerateGiftsBtn');

    refreshBtn.onclick = () => generateGiftSuggestions();
    generateGiftSuggestions();
}

async function generateGiftSuggestions() {
    const grid = document.getElementById('giftSuggestionsGrid');
    grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; font-size: 0.9rem; opacity: 0.8; padding: 2rem;">⏳ Finding the perfect gifts for your relationship...</div>';

    try {
        const res = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                recipientName: viewerConfig.name || 'Recipient',
                relation: viewerConfig.relationship || 'friend',
                category: 'gift'
            })
        });
        const data = await res.json();
        if (data.success) {
            renderGiftCards(data.data.text);
        } else {
            grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem;">Gift recommendations are currently locking up. 🎁</div>';
        }
    } catch (e) {
        console.error(e);
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem;">Failed to fetch gift suggestions.</div>';
    }
}

function renderGiftCards(aiText) {
    const grid = document.getElementById('giftSuggestionsGrid');
    grid.innerHTML = '';

    const lines = aiText.split('\n');
    const giftItems = [];

    lines.forEach(line => {
        const itemMatch = line.match(/^\d+\.\s+(.*?)\s+\[Price:\s*(.*?)\]\s+\(Link:\s*(.*?)\)\s*-\s*(.*)/i);
        if (itemMatch) {
            giftItems.push({
                name: itemMatch[1].trim(),
                price: itemMatch[2].trim(),
                link: itemMatch[3].trim(),
                reason: itemMatch[4].trim()
            });
        }
    });

    if (giftItems.length === 0) {
        const suggestions = aiText.split(/\d+\.\s+/).filter(Boolean);
        suggestions.forEach((itemText, idx) => {
            const parts = itemText.split(' - ');
            const nameAndDetails = parts[0] || 'Curated Gift Selection';
            const reason = parts[1] || 'A perfect birthday gift concept.';
            
            const priceMatch = nameAndDetails.match(/\[Price:\s*(.*?)\]/i);
            const price = priceMatch ? priceMatch[1] : '$35 - $60';
            const nameClean = nameAndDetails.replace(/\[Price:.*?\]/g, '').replace(/\(Link:.*?\)/g, '').trim();

            giftItems.push({
                name: nameClean,
                price: price,
                link: `https://www.amazon.com/s?k=${encodeURIComponent(nameClean)}`,
                reason: reason.trim()
            });
        });
    }

    const icons = ['🎁', '💎', '🎨', '📸', '🎧', '🍷', '🔋', '📚', '⌚'];
    giftItems.slice(0, 3).forEach((item, idx) => {
        const card = document.createElement('div');
        card.className = 'gift-card';
        const icon = icons[idx % icons.length];
        card.innerHTML = `
            <div class="gift-card-icon">${icon}</div>
            <h3 class="gift-card-title">${item.name}</h3>
            <div class="gift-card-price">${item.price}</div>
            <p class="gift-card-reason">${item.reason}</p>
            <a href="${item.link}" target="_blank" class="gift-card-buy-btn">View Store ↗</a>
        `;
        grid.appendChild(card);
    });
}

// Collapsible Floating Guestbook widget toggle
function setupGuestbookWidget() {
    const trigger = document.getElementById('floatingGuestbookTrigger');
    const modal = document.getElementById('guestbookModal');
    const closeBtn = document.getElementById('guestbookModalClose');
    
    if (trigger && modal && closeBtn) {
        trigger.onclick = () => {
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('show'), 10);
        };
        
        closeBtn.onclick = () => {
            modal.classList.remove('show');
            setTimeout(() => modal.style.display = 'none', 400);
        };
        
        modal.onclick = (e) => {
            if (e.target === modal) {
                closeBtn.click();
            }
        };
    }
}

// Setup premium actions (PDF downloads, PNG downloads, Calendar events, Social shares)
function setupPremiumActions() {
    const pdfBtn = document.getElementById('downloadPdfBtn');
    const imgBtn = document.getElementById('downloadImgBtn');
    const calendarBtn = document.getElementById('calendarBtn');

    // Helper function to preload all images on the page and in the configuration
    const preloadAllImages = () => {
        const images = Array.from(document.querySelectorAll('img'));
        const configPhotos = viewerConfig.photos || [];
        const configPromises = configPhotos.map(url => {
            return new Promise((resolve) => {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.onload = resolve;
                img.onerror = resolve;
                img.src = url;
            });
        });

        if (viewerConfig.creator && viewerConfig.creator.profilePhoto) {
            const creatorPhotoPromise = new Promise((resolve) => {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.onload = resolve;
                img.onerror = resolve;
                img.src = viewerConfig.creator.profilePhoto;
            });
            configPromises.push(creatorPhotoPromise);
        }

        const docPromises = images.map(img => {
            if (!img.src) return Promise.resolve();
            if (img.complete && img.naturalWidth !== 0) {
                return Promise.resolve();
            }
            return new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve;
            });
        });
        
        return Promise.all([...configPromises, ...docPromises]);
    };

    // 1. Download PDF using html2canvas and jsPDF (capturing all active slides)
    if (pdfBtn) {
        pdfBtn.addEventListener('click', async () => {
        if (typeof html2canvas === 'undefined') {
            showToast('Image capture library (html2canvas) is not loaded yet. Check your connection.', 'error');
            return;
        }
        if (!window.jspdf || !window.jspdf.jsPDF) {
            showToast('PDF export library (jsPDF) is not loaded yet. Check your connection.', 'error');
            return;
        }
        if (pdfBtn.disabled) return;
        pdfBtn.disabled = true;
        const originalText = pdfBtn.textContent;
        pdfBtn.textContent = '⏳ Preparing...';

        showToast('Preparing PDF download...', 'info');
        logShareClick();

        // Show premium loading screen overlay to hide screen flicker during rendering
        const loader = document.getElementById('loadingScreen');
        if (loader) {
            loader.style.display = 'flex';
            loader.style.opacity = '1';
        }

        try {
            // Wait for all cross-origin images and web fonts to be fully loaded
            await preloadAllImages();
            await document.fonts.ready;

            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            // Get computed background of the body so each PDF page has the correct theme color/gradient
            const bodyStyle = window.getComputedStyle(document.body);
            let bodyBg = bodyStyle.backgroundImage;
            if (!bodyBg || bodyBg === 'none') {
                bodyBg = bodyStyle.backgroundColor;
            }

            const originalIdx = currentStoryIdx;

            // Render and capture each active section slide
            for (let i = 0; i < storyPages.length; i++) {
                const page = storyPages[i];

                // Save styles to restore later
                const origDisplay = page.style.display;
                const origOpacity = page.style.opacity;
                const origVisibility = page.style.visibility;
                const origTransform = page.style.transform;
                const origFilter = page.style.filter;
                const origBg = page.style.background;

                // Make page fully visible and un-animated
                page.style.display = 'flex';
                page.style.opacity = '1';
                page.style.visibility = 'visible';
                page.style.transform = 'none';
                page.style.filter = 'none';
                if (bodyBg) {
                    page.style.background = bodyBg;
                }

                // Force layout reflow
                page.getBoundingClientRect();

                // Wait 100ms for browser rendering to settle
                await new Promise(resolve => setTimeout(resolve, 100));

                const canvasEl = await html2canvas(page, {
                    scale: 2,
                    useCORS: true,
                    allowTaint: false,
                    logging: false
                });

                const imgData = canvasEl.toDataURL('image/png');

                if (i > 0) {
                    pdf.addPage();
                }

                // Render page to fit A4 size exactly
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

                // Restore styles
                page.style.display = origDisplay;
                page.style.opacity = origOpacity;
                page.style.visibility = origVisibility;
                page.style.transform = origTransform;
                page.style.filter = origFilter;
                page.style.background = origBg;
            }

            // Restore active view page
            showStoryPage(originalIdx);

            pdf.save(`SurpriseBook_${viewerConfig.name || 'WishCraft'}.pdf`);
            showToast('PDF downloaded successfully! 📄', 'success');
        } catch (e) {
            console.error('PDF export error:', e);
            showToast('PDF download failed. Try again.', 'error');
        } finally {
            if (loader) {
                loader.style.opacity = '0';
                setTimeout(() => {
                    loader.style.display = 'none';
                }, 500);
            }
            pdfBtn.disabled = false;
            pdfBtn.textContent = originalText;
        }
    });
    }

    // 2. Download Image (PNG) (capturing the core hero card only)
    if (imgBtn) {
        imgBtn.addEventListener('click', async () => {
        if (typeof html2canvas === 'undefined') {
            showToast('Image capture library (html2canvas) is not loaded yet. Check your connection.', 'error');
            return;
        }
        if (imgBtn.disabled) return;
        imgBtn.disabled = true;
        const originalText = imgBtn.textContent;
        imgBtn.textContent = '⏳ Saving...';

        showToast('Saving wish card image...', 'info');
        logShareClick();

        try {
            const heroCard = document.getElementById('birthdayCardHero');
            const canvasEl = await html2canvas(heroCard, {
                scale: 2,
                useCORS: true,
                allowTaint: false,
                logging: false
            });
            const link = document.createElement('a');
            link.download = `Surprise_${viewerConfig.name}.png`;
            link.href = canvasEl.toDataURL('image/png');
            link.click();
            showToast('Image downloaded successfully! 🖼️', 'success');
        } catch (e) {
            console.error('Image capture error', e);
            showToast('Image download failed.', 'error');
        } finally {
            imgBtn.disabled = false;
            imgBtn.textContent = originalText;
        }
    });
    }

    // 3. Add to Google Calendar Template Link
    if (calendarBtn) {
        calendarBtn.addEventListener('click', () => {
        logShareClick();
        
        const name = viewerConfig.name;
        const bdayDate = new Date(viewerConfig.date);
        
        const dateStr = bdayDate.toISOString().split('T')[0].replace(/-/g, '');
        const nextDay = new Date(bdayDate.getTime() + 24 * 60 * 60 * 1000);
        const nextDayStr = nextDay.toISOString().split('T')[0].replace(/-/g, '');

        const calUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Happy+Birthday+${encodeURIComponent(name)}+%F0%9F%8E%82&dates=${dateStr}/${nextDayStr}&details=Sent+via+Surprise+Card+App%21&recur=RRULE:FREQ=YEARLY`;
        
        window.open(calUrl, '_blank');
    });
    }

    // 4. Social media direct redirects & native share
    const shareUrlInput = document.getElementById('shareUrlInput');
    if (shareUrlInput) {
        shareUrlInput.value = window.location.href;
    }

    const copyLinkBtn = document.getElementById('copyLinkBtn');
    if (copyLinkBtn) {
        copyLinkBtn.onclick = () => {
            navigator.clipboard.writeText(window.location.href);
            showToast('Card link copied to clipboard! 🔗', 'success');
            logShareClick();
        };
    }

    const msg = `Check out this amazing birthday surprise card for ${viewerConfig.name}! 🎂✨`;
    const encodedMsg = encodeURIComponent(msg);
    const encodedUrl = encodeURIComponent(window.location.href);

    const wa = document.getElementById('shareWhatsappBtn');
    if (wa) {
        wa.onclick = () => {
            window.open(`https://api.whatsapp.com/send?text=${encodedMsg}%20${encodedUrl}`, '_blank');
            logShareClick();
        };
    }

    const tg = document.getElementById('shareTelegramBtn');
    if (tg) {
        tg.onclick = () => {
            window.open(`https://t.me/share/url?url=${encodedUrl}&text=${encodedMsg}`, '_blank');
            logShareClick();
        };
    }

    const fb = document.getElementById('shareFacebookBtn');
    if (fb) {
        fb.onclick = () => {
            window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, '_blank');
            logShareClick();
        };
    }

    const tw = document.getElementById('shareTwitterBtn');
    if (tw) {
        tw.onclick = () => {
            window.open(`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedMsg}`, '_blank');
            logShareClick();
        };
    }

    const em = document.getElementById('shareEmailBtn');
    if (em) {
        em.onclick = () => {
            window.open(`mailto:?subject=${encodeURIComponent('Happy Birthday Surprise!')}&body=${encodedMsg}%20${encodedUrl}`, '_blank');
            logShareClick();
        };
    }

    const native = document.getElementById('shareNativeBtn');
    if (native) {
        native.onclick = async () => {
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: `Birthday Surprise for ${viewerConfig.name}`,
                        text: msg,
                        url: window.location.href
                    });
                    logShareClick();
                } catch(e) {}
            } else {
                navigator.clipboard.writeText(window.location.href);
                showToast('Sharing not supported on this device. Link copied! 🔗', 'info');
            }
        };
    }
}

// Session duration tracking
function setupSessionTracker() {
    sessionStartTime = new Date();

    // Log duration on page close
    window.addEventListener('beforeunload', logSessionDuration);
    window.addEventListener('pagehide', logSessionDuration);
}

function logSessionDuration() {
    if (!sessionStartTime || !viewerConfig.pageId) return;

    const endTime = new Date();
    const durationSeconds = Math.floor((endTime - sessionStartTime) / 1000);

    if (durationSeconds <= 0) return;

    const payload = JSON.stringify({
        id: viewerConfig.pageId,
        duration: durationSeconds
    });

    const url = `/api/pages?action=logDuration`;
    
    if (navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }));
    } else {
        // Fallback fetch sync
        fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            keepalive: true
        });
    }

    sessionStartTime = null;
}

// Log share transaction
async function logShareClick() {
    if (!viewerConfig.pageId) return;
    try {
        await fetch('/api/pages?action=logShare', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: viewerConfig.pageId })
        });
    } catch(e) {}
}

// Guestbook Wish list rendering with social features (likes, reactions, delete, colorful avatars)
function renderGuestbookWishes() {
    const list = document.getElementById('guestWishesList');
    const listInline = document.getElementById('guestWishesListInline');
    const counter = document.getElementById('guestCounter');
    
    if (list) list.innerHTML = '';
    if (listInline) listInline.innerHTML = '';
    
    // Update guest counter
    if (counter) {
        counter.textContent = viewerConfig.guestbook.length;
    }

    if (viewerConfig.guestbook.length === 0) {
        const emptyStateHtml = `
            <div style="text-align: center; opacity: 0.6; padding: 2rem 0; display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
                <span style="font-size: 2.5rem;">✍️</span>
                <p style="font-size: 0.85rem; font-weight: bold;">No one has signed the guestbook yet.</p>
                <p style="font-size: 0.75rem; opacity: 0.8;">Be the first to leave a sweet wish! 👇</p>
            </div>
        `;
        if (list) list.innerHTML = emptyStateHtml;
        if (listInline) listInline.innerHTML = emptyStateHtml;
        return;
    }

    const visitorKey = localStorage.getItem('birthday_visitor_key') || '';
    const hasToken = !!(localStorage.getItem('birthdaySurpriseAuthToken') || localStorage.getItem('token'));

    viewerConfig.guestbook.forEach(wish => {
        const post = document.createElement('div');
        post.className = 'wish-post';
        
        // Random avatar color based on name hash
        const hash = wish.author.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const gradients = [
            'linear-gradient(135deg, #ff007f 0%, #ff7f00 100%)',
            'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)',
            'linear-gradient(135deg, #f857a6 0%, #ff5858 100%)',
            'linear-gradient(135deg, #a8ff78 0%, #78ffd6 100%)',
            'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'
        ];
        const gradient = gradients[hash % gradients.length];
        
        const wishId = wish._id || wish.id;
        const timeStr = wish.createdAt ? new Date(wish.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now';
        
        // Check reactions map
        const reacts = wish.reactions || {};
        const thumbsCount = reacts['👍'] || 0;
        const heartCount = reacts['❤️'] || 0;
        const laughCount = reacts['😂'] || 0;
        const celebrateCount = reacts['🎉'] || 0;
        
        // Delete authorization check
        const isCommentAuthor = wish.visitorKey && wish.visitorKey === visitorKey;
        const canDelete = hasToken || isCommentAuthor;

        const deleteBtnHtml = canDelete ? `
            <button class="delete-wish-btn" onclick="deleteGuestbookEntry('${wishId}')" style="background: none; border: none; cursor: pointer; font-size: 0.9rem; opacity: 0.5; transition: opacity 0.2s;" title="Delete Wish">🗑️</button>
        ` : '';

        // Spam report button html
        const reportBtnHtml = !canDelete ? `
            <button class="report-wish-btn" onclick="reportGuestbookEntry('${wishId}')" style="background: none; border: none; cursor: pointer; font-size: 0.9rem; opacity: 0.5; transition: opacity 0.2s;" title="Report Spam">🚩</button>
        ` : '';

        post.innerHTML = `
            <div class="wish-post-avatar" style="background: ${gradient}; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; flex-shrink: 0; color: white;">${wish.avatarIndex || '🎈'}</div>
            <div style="flex: 1; min-width: 0;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span class="wish-post-author" style="font-weight: 800; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 140px;">${wish.author}</span>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span style="font-size: 0.75rem; opacity: 0.6;">${timeStr}</span>
                        ${deleteBtnHtml}
                        ${reportBtnHtml}
                    </div>
                </div>
                <p class="wish-post-text" style="margin-top: 0.2rem; opacity: 0.9; word-break: break-word;">${wish.text}</p>
                
                <div class="wish-post-actions" style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.6rem; flex-wrap: wrap;">
                    <button class="action-like-btn" onclick="likeGuestbookEntry('${wishId}', event)" style="background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.25); border-radius: 20px; padding: 0.2rem 0.6rem; font-size: 0.75rem; cursor: pointer; display: flex; align-items: center; gap: 0.3rem; transition: all 0.2s; color: inherit;">
                        ❤️ <span class="like-count">${wish.likes || 0}</span>
                    </button>
                    
                    <button class="reaction-bubble" onclick="reactToEntry('${wishId}', '👍', event)" style="cursor: pointer; font-size: 0.75rem; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; padding: 0.2rem 0.5rem; display: flex; align-items: center; gap: 0.2rem; color: inherit;">
                        👍 <span class="react-count">${thumbsCount}</span>
                    </button>
                    <button class="reaction-bubble" onclick="reactToEntry('${wishId}', '❤️', event)" style="cursor: pointer; font-size: 0.75rem; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; padding: 0.2rem 0.5rem; display: flex; align-items: center; gap: 0.2rem; color: inherit;">
                        ❤️ <span class="react-count">${heartCount}</span>
                    </button>
                    <button class="reaction-bubble" onclick="reactToEntry('${wishId}', '😂', event)" style="cursor: pointer; font-size: 0.75rem; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; padding: 0.2rem 0.5rem; display: flex; align-items: center; gap: 0.2rem; color: inherit;">
                        😂 <span class="react-count">${laughCount}</span>
                    </button>
                    <button class="reaction-bubble" onclick="reactToEntry('${wishId}', '🎉', event)" style="cursor: pointer; font-size: 0.75rem; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; padding: 0.2rem 0.5rem; display: flex; align-items: center; gap: 0.2rem; color: inherit;">
                        🎉 <span class="react-count">${celebrateCount}</span>
                    </button>
                </div>
            </div>
        `;
        
        if (list) list.appendChild(post);
        if (listInline) listInline.appendChild(post.cloneNode(true));
    });
}

// Social interactions callbacks bound to window scope for HTML inline calls
window.likeGuestbookEntry = async (entryId, event) => {
    spawnFloatingHeart(event.clientX, event.clientY);
    
    try {
        const res = await fetch('/api/pages?action=likeGuestbook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ entryId })
        });
        const data = await res.json();
        if (data.success) {
            const entry = viewerConfig.guestbook.find(g => (g._id || g.id) === entryId);
            if (entry) {
                entry.likes = data.data.likes;
                const countEl = event.currentTarget.querySelector('.like-count');
                if (countEl) countEl.textContent = data.data.likes;
            }
        }
    } catch(e) {
        console.error('Like wish error:', e);
    }
};

window.reactToEntry = async (entryId, reaction, event) => {
    try {
        const res = await fetch('/api/pages?action=reactGuestbook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ entryId, reaction })
        });
        const data = await res.json();
        if (data.success) {
            const entry = viewerConfig.guestbook.find(g => (g._id || g.id) === entryId);
            if (entry) {
                entry.reactions = data.data.reactions;
                const countEl = event.currentTarget.querySelector('.react-count');
                if (countEl) {
                    const reacts = data.data.reactions || {};
                    countEl.textContent = reacts[reaction] || 0;
                }
            }
        }
    } catch(e) {
        console.error('Reaction wish error:', e);
    }
};

window.deleteGuestbookEntry = async (entryId) => {
    if (!confirm('Are you sure you want to delete this wish?')) return;
    
    const token = localStorage.getItem('birthdaySurpriseAuthToken') || localStorage.getItem('token');
    const visitorKey = localStorage.getItem('birthday_visitor_key') || '';
    try {
        const res = await fetch('/api/pages?action=deleteGuestbook', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ entryId, pageId: viewerConfig.pageId, visitorKey })
        });
        const data = await res.json();
        if (data.success) {
            showToast('Wish deleted from guestbook.', 'success');
            viewerConfig.guestbook = viewerConfig.guestbook.filter(g => (g._id || g.id) !== entryId);
            renderGuestbookWishes();
        } else {
            showToast(data.message || 'Failed to delete wish.', 'error');
        }
    } catch(e) {
        console.error('Delete wish error:', e);
        showToast('Failed to delete wish.', 'error');
    }
};

window.reportGuestbookEntry = async (entryId) => {
    if (!confirm('Report this comment for containing spam or inappropriate content?')) return;
    try {
        const res = await fetch('/api/pages?action=reportGuestbook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ entryId })
        });
        const data = await res.json();
        if (data.success) {
            showToast('Comment reported. Thank you for making WishCraft safe! 🛡️', 'success');
        } else {
            showToast(data.message || 'Failed to report comment.', 'error');
        }
    } catch (e) {
        showToast('Network error reporting comment.', 'error');
    }
};

function spawnFloatingHeart(x, y) {
    const heart = document.createElement('div');
    heart.textContent = '❤️';
    heart.style.position = 'fixed';
    heart.style.left = `${x}px`;
    heart.style.top = `${y}px`;
    heart.style.fontSize = '1.8rem';
    heart.style.pointerEvents = 'none';
    heart.style.zIndex = '9999';
    heart.style.transition = 'all 0.8s ease-out';
    document.body.appendChild(heart);
    
    setTimeout(() => {
        heart.style.transform = 'translateY(-120px) scale(1.5)';
        heart.style.opacity = '0';
    }, 50);
    setTimeout(() => heart.remove(), 900);
}

// Guestbook signatures POST
function setupGuestbookForm() {
    const form = document.getElementById('guestbookForm');
    const avatarOptions = document.querySelectorAll('.avatar-pick-option');
    let selectedEmoji = '🎈';

    avatarOptions.forEach(opt => {
        opt.addEventListener('click', () => {
            avatarOptions.forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
            selectedEmoji = opt.dataset.emoji;
        });
    });

    // Character counter validation listener
    const textInput = document.getElementById('guestText');
    const charCount = document.getElementById('charCount');
    if (textInput && charCount) {
        textInput.addEventListener('input', () => {
            const len = textInput.value.length;
            charCount.textContent = `${len}/200`;
            
            // local typing indicator simulator
            const indicator = document.getElementById('typingIndicator');
            if (indicator) {
                if (len > 0) {
                    indicator.style.display = 'block';
                } else {
                    indicator.style.display = 'none';
                }
            }
        });
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const author = document.getElementById('guestAuthor').value.trim();
        const text = document.getElementById('guestText').value.trim();
        const submitBtn = document.getElementById('submitGuestbookBtn');
        const btnText = document.getElementById('submitBtnText');
        const spinner = document.getElementById('submitBtnSpinner');

        if (!author || !text || !viewerConfig.pageId) return;

        // Prevent duplicates
        submitBtn.disabled = true;
        if (btnText) btnText.textContent = 'Signing...';
        if (spinner) spinner.style.display = 'inline-block';

        let visitorKey = localStorage.getItem('birthday_visitor_key');
        if (!visitorKey) {
            visitorKey = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            localStorage.setItem('birthday_visitor_key', visitorKey);
        }

        try {
            const res = await fetch('/api/pages?action=guestbook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pageId: viewerConfig.pageId,
                    author,
                    text,
                    avatarIndex: selectedEmoji,
                    visitorKey
                })
            });
            const data = await res.json();
            
            if (data.success) {
                document.getElementById('guestText').value = '';
                if (charCount) charCount.textContent = '0/200';
                
                const indicator = document.getElementById('typingIndicator');
                if (indicator) indicator.style.display = 'none';

                // Confetti blast on first submit
                createBurst(window.innerWidth * 0.5, window.innerHeight * 0.4);
                startFloatingConfetti();

                viewerConfig.guestbook.unshift(data.data);
                renderGuestbookWishes();
                
                showToast('Wishes signed in guestbook! ✍️', 'success');
                
                // Auto scroll to top of guestbook list (newest first)
                const list = document.getElementById('guestWishesList');
                if (list) list.scrollTop = 0;
            } else {
                showToast(data.message || 'Failed to sign guestbook.', 'error');
            }
        } catch (err) {
            console.error('Submit guestbook error:', err);
            showToast('Something went wrong. Try again.', 'error');
        } finally {
            submitBtn.disabled = false;
            if (btnText) btnText.textContent = 'Sign Guestbook ✍️';
            if (spinner) spinner.style.display = 'none';
        }
    });
}

// Envelope Interactive Click Reveal inside gift box sequence
function setupEnvelopeReveal() {
    const giftBox = document.getElementById('giftBoxContainer');
    
    giftBox.addEventListener('click', () => {
        giftBox.style.transform = 'scale(0.01)';
        startFloatingBalloons();

        setTimeout(() => {
            giftBox.style.display = 'none';
            envelope.style.display = 'block';
            setTimeout(() => envelope.style.opacity = '1', 50);
        }, 400);
    });

    envelope.addEventListener('click', () => {
        if (!envelope.classList.contains('open')) {
            envelope.classList.add('open');
            playSong();
            
            setTimeout(() => {
                const w = window.innerWidth;
                const h = window.innerHeight;
                createBurst(w * 0.25, h * 0.3);
                createBurst(w * 0.75, h * 0.3);
            }, 600);

            setTimeout(() => {
                envelope.style.display = 'none';
                envelope.style.opacity = '0';
                envelope.style.pointerEvents = 'none';
                
                // Show the story presentation container smoothly
                displayCard.style.display = 'block';
                setTimeout(() => {
                    displayCard.style.opacity = '1';
                }, 50);
                
                triggerGreetingMessage();
                startFloatingConfetti();
                
                // Show floating guestbook button if this is a saved card
                if (viewerConfig.pageId) {
                    const guestbookBtn = document.getElementById('floatingGuestbookTrigger');
                    if (guestbookBtn) {
                        guestbookBtn.style.display = 'flex';
                    }
                }
            }, 1200);
        }
    });
}

function triggerGreetingMessage() {
    const style = viewerConfig.greetingStyle || 'typewriter';
    
    if (style === 'typewriter') {
        wishMessage.innerHTML = '';
        let i = 0;
        const text = viewerConfig.message;
        const timer = setInterval(() => {
            if (i < text.length) {
                wishMessage.innerHTML += text.charAt(i);
                i++;
            } else {
                clearInterval(timer);
            }
        }, 55);
    } else if (style === 'neon-glow') {
        wishMessage.innerHTML = viewerConfig.message;
        wishMessage.style.textShadow = '0 0 15px var(--primary-color), 0 0 25px var(--accent-color)';
        wishMessage.style.opacity = '0';
        wishMessage.style.transition = 'opacity 1.5s ease-in';
        setTimeout(() => wishMessage.style.opacity = '1', 50);
    } else {
        wishMessage.innerHTML = viewerConfig.message;
        wishMessage.style.opacity = '0';
        wishMessage.style.transition = 'opacity 1.5s ease-in';
        setTimeout(() => wishMessage.style.opacity = '1', 50);
    }
}

// Floating balloons
function startFloatingBalloons() {
    const colors = ['#f43f5e', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#a855f7'];
    for (let i = 0; i < 15; i++) {
        setTimeout(() => {
            const balloon = document.createElement('div');
            balloon.className = 'floating-emoji';
            balloon.textContent = '🎈';
            balloon.style.left = Math.random() * 90 + 'vw';
            balloon.style.fontSize = Math.random() * 2 + 1.5 + 'rem';
            
            const colorIdx = Math.floor(Math.random() * colors.length);
            balloon.style.filter = `hue-rotate(${colorIdx * 60}deg)`;
            
            balloon.style.animation = `floatUp ${Math.random() * 4 + 4}s linear forwards`;
            document.body.appendChild(balloon);
            setTimeout(() => balloon.remove(), 8000);
        }, i * 200);
    }
}

// Confetti System
let confettiInterval = null;
const confettiPresets = {
    hearts: ['❤️', '💖', '💕', '🌹', '💟'],
    balloons: ['🎈', '🎈', '🎈'],
    stars: ['⭐', '✨', '🌟', '💫'],
    mixed: ['🎉', '🥳', '🎁', '🎂', '🍬', '🎈', '💖']
};

function startFloatingConfetti() {
    if (confettiInterval) clearInterval(confettiInterval);
    
    confettiInterval = setInterval(() => {
        const style = viewerConfig.confettiStyle || 'hearts';
        const list = confettiPresets[style] || confettiPresets['hearts'];
        const emoji = list[Math.floor(Math.random() * list.length)];
        
        const el = document.createElement('div');
        el.className = 'floating-emoji';
        el.textContent = emoji;
        
        el.style.left = Math.random() * 95 + 'vw';
        el.style.fontSize = Math.random() * 1.5 + 1.2 + 'rem';
        el.style.animation = `floatUp ${Math.random() * 3 + 5}s linear forwards`;
        
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 8000);
    }, 450);
}

// Canvas Sparkles trailing
let mousePos = { x: 0, y: 0 };

window.addEventListener('mousemove', (e) => {
    mousePos.x = e.clientX;
    mousePos.y = e.clientY;
    
    if (displayCard.classList.contains('show') && Math.random() < 0.28) {
        const colors = getThemeColors();
        const color = colors[Math.floor(Math.random() * colors.length)];
        particles.push(new Particle(mousePos.x, mousePos.y, color, 'firefly'));
    }
});

// Canvas particle system
const canvas = document.getElementById('fireworks-canvas');
const ctx = canvas.getContext('2d');
let particles = [];

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class Particle {
    constructor(x, y, color, style) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.style = style;
        
        const angle = Math.random() * Math.PI * 2;
        let speed = Math.random() * 5 + 2;
        if (style === 'sparks') speed *= 1.3;
        
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        
        this.gravity = (style === 'firefly') ? -0.01 : 0.08;
        this.friction = 0.95;
        this.opacity = 1;
        this.decay = Math.random() * 0.012 + 0.008;
        this.size = Math.random() * 2.5 + 1.2;
        this.history = [];
    }
    
    update() {
        this.history.push({ x: this.x, y: this.y });
        if (this.history.length > 5) this.history.shift();
        
        this.vx *= this.friction;
        this.vy *= this.friction;
        this.vy += this.gravity;
        this.x += this.vx;
        this.y += this.vy;
        this.opacity -= this.decay;
    }
    
    draw() {
        if (this.history.length > 1) {
            ctx.beginPath();
            ctx.moveTo(this.history[0].x, this.history[0].y);
            for (let i = 1; i < this.history.length; i++) {
                ctx.lineTo(this.history[i].x, this.history[i].y);
            }
            ctx.strokeStyle = `rgba(${this.color}, ${this.opacity})`;
            ctx.lineWidth = this.size;
            ctx.lineCap = 'round';
            ctx.stroke();
        }
    }
}

function createBurst(x, y) {
    const colors = getThemeColors();
    const style = viewerConfig.fireworksStyle || 'burst';
    const count = style === 'firefly' ? 25 : 55;
    
    for (let i = 0; i < count; i++) {
        const color = colors[Math.floor(Math.random() * colors.length)];
        particles.push(new Particle(x, y, color, style));
    }
}

function getThemeColors() {
    if (viewerConfig.themePreset === 'romantic' || viewerConfig.theme === 'romantic') {
        return ['244, 63, 94', '236, 72, 153', '255, 192, 203', '225, 29, 72'];
    } else if (viewerConfig.themePreset === 'luxury') {
        return ['212, 175, 55', '243, 229, 171', '255, 255, 255', '170, 132, 33'];
    } else if (viewerConfig.themePreset === 'royal') {
        return ['99, 102, 241', '251, 191, 36', '245, 158, 11', '30, 30, 74'];
    } else if (viewerConfig.themePreset === 'minimal') {
        return ['9, 9, 11', '113, 113, 122', '244, 244, 245', '82, 82, 91'];
    } else if (viewerConfig.themePreset === 'anime') {
        return ['236, 72, 153', '59, 130, 246', '234, 179, 8', '16, 185, 129'];
    } else if (viewerConfig.themePreset === 'kids') {
        return ['6, 182, 212', '244, 63, 94', '245, 158, 11', '16, 185, 129'];
    } else {
        return ['168, 85, 247', '34, 211, 238', '244, 63, 94', '9, 9, 11'];
    }
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update();
        if (p.opacity <= 0) {
            particles.splice(i, 1);
        } else {
            p.draw();
        }
    }
    requestAnimationFrame(animate);
}
animate();

setInterval(() => {
    if (displayCard.classList.contains('show') && particles.length < 80) {
        createBurst(
            Math.random() * window.innerWidth,
            Math.random() * window.innerHeight * 0.5
        );
    }
}, 3000);

document.getElementById('fireworksBtn').addEventListener('click', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    createBurst(w * 0.25, h * 0.4);
    createBurst(w * 0.75, h * 0.4);
});

// ========================================================
// WEB AUDIO INSTRUMENT SYNTHESIZER with Volume & Visualizer
// ========================================================
let audioCtx = null;
let gainNode = null;
let analyserNode = null;
let currentNotes = [];
let isPlaying = false;
let songTimeout = null;
let currentVolume = 0.5;

const noteFreqs = {
    'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'A#4': 466.16, 'B4': 493.88,
    'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00, 'A#5': 932.33, 'B5': 987.77
};

const melody = [
    { note: 'C4', dur: 0.5 }, { note: 'C4', dur: 0.5 }, { note: 'D4', dur: 1 }, { note: 'C4', dur: 1 }, { note: 'F4', dur: 1 }, { note: 'E4', dur: 2 },
    { note: 'C4', dur: 0.5 }, { note: 'C4', dur: 0.5 }, { note: 'D4', dur: 1 }, { note: 'C4', dur: 1 }, { note: 'G4', dur: 1 }, { note: 'F4', dur: 2 },
    { note: 'C4', dur: 0.5 }, { note: 'C4', dur: 0.5 }, { note: 'C5', dur: 1 }, { note: 'A4', dur: 1 }, { note: 'F4', dur: 1 }, { note: 'E4', dur: 1 }, { note: 'D4', dur: 2 },
    { note: 'A#4', dur: 0.5 }, { note: 'A#4', dur: 0.5 }, { note: 'A4', dur: 1 }, { note: 'F4', dur: 1 }, { note: 'G4', dur: 1 }, { note: 'F4', dur: 2 }
];

function initAudioNodes() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (!gainNode) {
        gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(currentVolume, audioCtx.currentTime);
    }
    if (!analyserNode) {
        analyserNode = audioCtx.createAnalyser();
        analyserNode.fftSize = 64;
    }
    gainNode.connect(analyserNode);
    analyserNode.connect(audioCtx.destination);
}

function playNote(freq, start, duration, style) {
    if (!audioCtx) return;
    
    const osc = audioCtx.createOscillator();
    const noteGain = audioCtx.createGain();
    
    osc.connect(noteGain);
    noteGain.connect(gainNode);
    
    if (style === 'piano') {
        osc.type = 'sine';
    } else if (style === 'happy') {
        osc.type = 'sawtooth';
    } else {
        osc.type = 'triangle';
    }
    
    osc.frequency.value = freq;
    
    noteGain.gain.setValueAtTime(0, start);
    noteGain.gain.linearRampToValueAtTime(style === 'happy' ? 0.08 : 0.15, start + 0.04);
    noteGain.gain.exponentialRampToValueAtTime(0.001, start + duration - 0.04);
    
    osc.start(start);
    osc.stop(start + duration);
    
    currentNotes.push(osc);
}

let noteTimer = null;
function startFloatingNotes() {
    if (noteTimer) clearInterval(noteTimer);
    const notes = ['🎵', '🎶', '♩', '♪', '🔊'];
    noteTimer = setInterval(() => {
        if (!isPlaying) return;
        const note = document.createElement('div');
        note.className = 'floating-note';
        note.textContent = notes[Math.floor(Math.random() * notes.length)];
        
        const card = document.querySelector('.premium-music-card');
        if (card) {
            const rect = card.getBoundingClientRect();
            note.style.left = `${rect.left + rect.width / 2 + (Math.random() * 80 - 40)}px`;
            note.style.top = `${rect.top}px`;
        } else {
            note.style.left = `${window.innerWidth / 2 + (Math.random() * 200 - 100)}px`;
            note.style.top = `${window.innerHeight - 200}px`;
        }
        
        document.body.appendChild(note);
        setTimeout(() => note.remove(), 3000);
    }, 800);
}

function playSong() {
    stopSong();
    initAudioNodes();
    
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    isPlaying = true;
    document.getElementById('musicBtn').textContent = 'Pause';
    
    const eq = document.getElementById('musicEqualizer');
    if (eq) eq.classList.add('active');
    startFloatingNotes();
    
    let time = audioCtx.currentTime + 0.1;
    
    const style = viewerConfig.music || 'chimes';
    const beatLength = style === 'happy' ? 0.45 : (style === 'piano' ? 0.65 : 0.55);
    
    melody.forEach(noteObj => {
        const freq = noteFreqs[noteObj.note];
        const duration = noteObj.dur * beatLength;
        
        playNote(freq, time, duration, style);
        time += duration + 0.04;
    });
    
    drawVisualizer();
    
    const totalDuration = time - audioCtx.currentTime;
    songTimeout = setTimeout(() => {
        if (isPlaying) {
            playSong();
        }
    }, totalDuration * 1000);
}

function stopSong() {
    isPlaying = false;
    document.getElementById('musicBtn').textContent = 'Play';
    
    const eq = document.getElementById('musicEqualizer');
    if (eq) eq.classList.remove('active');
    
    if (noteTimer) {
        clearInterval(noteTimer);
        noteTimer = null;
    }
    
    if (songTimeout) clearTimeout(songTimeout);
    currentNotes.forEach(osc => {
        try { osc.stop(); } catch(e) {}
    });
    currentNotes = [];
}

function drawVisualizer() {
    if (!analyserNode || !isPlaying) return;
    
    const canvas = document.getElementById('visualizerCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const render = () => {
        if (!isPlaying) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            return;
        }
        requestAnimationFrame(render);
        
        analyserNode.getByteFrequencyData(dataArray);
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const barWidth = (canvas.width / bufferLength) * 1.5;
        let barHeight;
        let x = 0;
        
        for (let i = 0; i < bufferLength; i++) {
            barHeight = dataArray[i] / 2.5;
            
            const grad = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
            grad.addColorStop(0, '#ec4899');
            grad.addColorStop(1, '#a855f7');
            
            ctx.fillStyle = grad;
            ctx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);
            
            x += barWidth;
        }
    };
    
    render();
}

// Attach listener to volume slider
document.getElementById('volumeSlider').addEventListener('input', (e) => {
    currentVolume = parseFloat(e.target.value);
    if (gainNode) {
        gainNode.gain.setValueAtTime(currentVolume, audioCtx.currentTime);
    }
});

document.getElementById('musicBtn').addEventListener('click', () => {
    if (isPlaying) {
        stopSong();
    } else {
        const voiceAudio = document.getElementById('voiceMessageAudio');
        if (voiceAudio) voiceAudio.pause();
        const tapePlayBtn = document.getElementById('tapePlayBtn');
        if (tapePlayBtn) tapePlayBtn.textContent = '▶️';
        const waveform = document.getElementById('voiceWaveform');
        if (waveform) waveform.classList.remove('playing');
        const tapeStatus = document.getElementById('tapeStatus');
        if (tapeStatus) tapeStatus.textContent = 'Voice note paused';
        
        playSong();
    }
});

function setupThemeToggleFloating() {
    const btn = document.getElementById('themeToggleFloating');
    if (!btn) return;
    
    const savedMode = localStorage.getItem('themeMode');
    if (savedMode === 'dark') {
        document.body.classList.add('dark-mode');
        btn.textContent = '☀️';
    } else {
        document.body.classList.remove('dark-mode');
        btn.textContent = '🌙';
    }
    
    btn.addEventListener('click', () => {
        if (document.body.classList.contains('dark-mode')) {
            document.body.classList.remove('dark-mode');
            btn.textContent = '🌙';
            localStorage.setItem('themeMode', 'light');
        } else {
            document.body.classList.add('dark-mode');
            btn.textContent = '☀️';
            localStorage.setItem('themeMode', 'dark');
        }
    });
}
