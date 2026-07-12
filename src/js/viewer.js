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

        const res = await fetch(url);
        
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
            window.location.href = 'login.html';
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

    // 1. Photos Carousel
    setupPhotosCarousel();

    // 2. Video Player Embed
    setupVideoEmbed();

    // 3. Voice Message Cassette
    setupVoiceMessagePlayer();

    // 4. Cake style blowing interaction
    setupCakeBlowing();

    // 5. Memory Timeline
    setupTimelineMemoryLane();

    // 6. Birthday Countdown Timer
    setupBirthdayCountdown();

    // 7. QR Code Generation
    setupQrCodeShare();
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
        slide.src = base64;
        slide.className = `carousel-slide ${idx === 0 ? 'active' : ''}`;
        slide.alt = `Slide ${idx + 1}`;
        photoDeck.appendChild(slide);
    });

    if (images.length > 1) {
        let currentSlide = 0;
        setInterval(() => {
            const slides = document.querySelectorAll('.carousel-slide');
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

// Youtube or HTML5 raw MP4 video resolver
function setupVideoEmbed() {
    const wrapper = document.getElementById('videoWrapper');
    const container = document.getElementById('videoContainer');
    const url = viewerConfig.videoUrl;

    if (!url) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';
    
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        let videoId = '';
        if (url.includes('v=')) {
            videoId = url.split('v=')[1].split('&')[0];
        } else if (url.includes('youtu.be/')) {
            videoId = url.split('youtu.be/')[1].split('?')[0];
        }
        
        wrapper.innerHTML = `
            <iframe src="https://www.youtube.com/embed/${videoId}" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen>
            </iframe>
        `;
    } else {
        wrapper.innerHTML = `
            <video src="${url}" controls preload="metadata"></video>
        `;
    }
}

// Voice Tape cassette player controls
function setupVoiceMessagePlayer() {
    const container = document.getElementById('cassetteContainer');
    const playBtn = document.getElementById('tapePlayBtn');
    const tape = document.getElementById('cassetteTape');
    const status = document.getElementById('tapeStatus');
    const audio = document.getElementById('voiceMessageAudio');

    if (!viewerConfig.voiceMessage) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';
    audio.src = viewerConfig.voiceMessage;

    playBtn.addEventListener('click', () => {
        if (audio.paused) {
            stopSong();
            audio.play();
            playBtn.textContent = '⏸️';
            tape.classList.add('playing');
            status.textContent = 'Playing voice note... 🔊';
        } else {
            audio.pause();
            playBtn.textContent = '▶️';
            tape.classList.remove('playing');
            status.textContent = 'Voice note paused';
        }
    });

    audio.addEventListener('ended', () => {
        playBtn.textContent = '▶️';
        tape.classList.remove('playing');
        status.textContent = 'Listen again';
        playSong();
    });
}

// Memory Timeline loader (Premium feature)
function setupTimelineMemoryLane() {
    const container = document.getElementById('timelineContainer');
    const list = document.getElementById('timelineList');
    list.innerHTML = '';

    if (!viewerConfig.timeline || viewerConfig.timeline.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';

    viewerConfig.timeline.forEach(item => {
        const card = document.createElement('div');
        card.className = 'timeline-item-card';
        
        card.innerHTML = `
            ${item.photo ? `<img src="${item.photo}" class="timeline-img" alt="Memory">` : '<div style="font-size:1.8rem; padding: 0.5rem;">📅</div>'}
            <div style="flex:1;">
                <span style="font-size:0.75rem; font-weight:800; color:var(--primary-color); display:block; text-transform:uppercase;">${item.date}</span>
                <strong style="font-size:0.9rem; display:block; margin-top:0.1rem; color:var(--text-color);">${item.title}</strong>
                <p style="font-size:0.8rem; opacity:0.85; margin-top:0.2rem; line-height:1.3;">${item.text}</p>
            </div>
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
    
    // Use public QR Code generator API
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(pageUrl)}`;
}

// Setup premium actions (PDF downloads, PNG downloads, Calendar events)
function setupPremiumActions() {
    const pdfBtn = document.getElementById('downloadPdfBtn');
    const imgBtn = document.getElementById('downloadImgBtn');
    const calendarBtn = document.getElementById('calendarBtn');

    // 1. Download PDF using html2canvas and jsPDF
    pdfBtn.addEventListener('click', async () => {
        showToast('Preparing PDF download...', 'info');
        logShareClick();

        try {
            const canvasEl = await html2canvas(displayCard, { scale: 2 });
            const imgData = canvasEl.toDataURL('image/png');
            
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgWidth = 190;
            const pageHeight = 295;
            const imgHeight = (canvasEl.height * imgWidth) / canvasEl.width;
            
            pdf.addImage(imgData, 'PNG', 10, 15, imgWidth, imgHeight);
            pdf.save(`Surprise_${viewerConfig.name}.pdf`);
            showToast('PDF downloaded successfully! 📄', 'success');
        } catch (e) {
            console.error('PDF export error:', e);
            showToast('PDF download failed. Try again.', 'error');
        }
    });

    // 2. Download Image (PNG)
    imgBtn.addEventListener('click', async () => {
        showToast('Saving wish card image...', 'info');
        logShareClick();

        try {
            const canvasEl = await html2canvas(displayCard, { scale: 2 });
            const link = document.createElement('a');
            link.download = `Surprise_${viewerConfig.name}.png`;
            link.href = canvasEl.toDataURL('image/png');
            link.click();
            showToast('Image downloaded successfully! 🖼️', 'success');
        } catch (e) {
            console.error('Image capture error', e);
            showToast('Image download failed.', 'error');
        }
    });

    // 3. Add to Google Calendar Template Link
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

// Guestbook Wish list rendering
function renderGuestbookWishes() {
    const list = document.getElementById('guestWishesList');
    list.innerHTML = '';

    if (viewerConfig.guestbook.length === 0) {
        list.innerHTML = `<p style="font-size: 0.8rem; text-align: center; opacity: 0.6; padding: 1.5rem 0;">No one has signed the guestbook yet. Be the first! ✍️</p>`;
        return;
    }

    viewerConfig.guestbook.forEach(wish => {
        const post = document.createElement('div');
        post.className = 'wish-post';
        
        post.innerHTML = `
            <div class="wish-post-avatar">${wish.avatarIndex || '🎈'}</div>
            <div style="flex: 1;">
                <span class="wish-post-author">${wish.author}</span>
                <p class="wish-post-text">${wish.text}</p>
            </div>
        `;
        list.appendChild(post);
    });
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

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const author = document.getElementById('guestAuthor').value.trim();
        const text = document.getElementById('guestText').value.trim();

        if (!author || !text || !viewerConfig.pageId) return;

        try {
            const res = await fetch('/api/pages?action=guestbook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pageId: viewerConfig.pageId,
                    author,
                    text,
                    avatarIndex: selectedEmoji
                })
            });
            const data = await res.json();
            
            if (data.success) {
                document.getElementById('guestText').value = '';
                
                viewerConfig.guestbook.unshift(data.data);
                renderGuestbookWishes();
                
                showToast('Wishes signed in guestbook! ✍️', 'success');
            }
        } catch (err) {
            console.error('Submit guestbook error:', err);
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
                envelope.style.opacity = '0';
                envelope.style.pointerEvents = 'none';
                displayCard.classList.add('show');
                
                triggerGreetingMessage();
                startFloatingConfetti();
                
                if (viewerConfig.pageId) {
                    guestbookCard.style.display = 'block';
                    setTimeout(() => guestbookCard.style.opacity = '1', 50);
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
// WEB AUDIO INSTRUMENT SYNTHESIZER
// ========================================================
let audioCtx = null;
let currentNotes = [];
let isPlaying = false;
let songTimeout = null;

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

function playNote(freq, start, duration, style) {
    if (!audioCtx) return;
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    if (style === 'piano') {
        osc.type = 'sine';
    } else if (style === 'happy') {
        osc.type = 'sawtooth';
    } else {
        osc.type = 'triangle';
    }
    
    osc.frequency.value = freq;
    
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(style === 'happy' ? 0.12 : 0.22, start + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration - 0.04);
    
    osc.start(start);
    osc.stop(start + duration);
    
    currentNotes.push(osc);
}

function playSong() {
    stopSong();
    
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    isPlaying = true;
    document.getElementById('musicBtn').textContent = '🔇';
    
    let time = audioCtx.currentTime + 0.1;
    
    const style = viewerConfig.music || 'chimes';
    const beatLength = style === 'happy' ? 0.45 : (style === 'piano' ? 0.65 : 0.55);
    
    melody.forEach(noteObj => {
        const freq = noteFreqs[noteObj.note];
        const duration = noteObj.dur * beatLength;
        
        playNote(freq, time, duration, style);
        time += duration + 0.04;
    });
    
    const totalDuration = time - audioCtx.currentTime;
    songTimeout = setTimeout(() => {
        if (isPlaying) {
            playSong();
        }
    }, totalDuration * 1000);
}

function stopSong() {
    isPlaying = false;
    document.getElementById('musicBtn').textContent = '🎵';
    if (songTimeout) clearTimeout(songTimeout);
    currentNotes.forEach(osc => {
        try { osc.stop(); } catch(e) {}
    });
    currentNotes = [];
}

document.getElementById('musicBtn').addEventListener('click', () => {
    if (isPlaying) {
        stopSong();
    } else {
        document.getElementById('voiceMessageAudio').pause();
        document.getElementById('tapePlayBtn').textContent = '▶️';
        document.getElementById('cassetteTape').classList.remove('playing');
        document.getElementById('tapeStatus').textContent = 'Voice note paused';
        
        playSong();
    }
});
