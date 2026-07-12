// Viewer Configuration State
let viewerConfig = {
    pageId: null,
    name: 'Anshika',
    senderName: 'Your Love',
    relationship: 'girlfriend',
    message: "Happy Birthday, my love 😈🔥 you own my heart, my thoughts, and every wild desire in between 😘❤️‍🔥 Tonight isn't just about candles and cake—it's about passion, obsession, and you being dangerously unforgettable 🖤🔥🎂",
    photos: [],
    videoUrl: '',
    voiceMessage: '',
    theme: 'romantic',
    background: 'linear-gradient(135deg, #ffe4e6 0%, #fbcfe8 100%)',
    music: 'chimes',
    font: 'Outfit',
    confettiStyle: 'hearts',
    fireworksStyle: 'burst',
    cakeStyle: 'animated',
    greetingStyle: 'typewriter',
    comments: [],
    guestbook: []
};

// DOM elements
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
        // Run with mock/default settings
        setupSurpriseCardUI();
    }

    setupEnvelopeReveal();
    setupGuestbookForm();
});

// Load Card Settings from API
async function fetchCardDetails(pageId) {
    try {
        const res = await fetch(`/api/pages?action=public&id=${pageId}`);
        const data = await res.json();
        
        if (data.success) {
            viewerConfig = {
                ...viewerConfig,
                ...data.data.page,
                comments: data.data.comments || [],
                guestbook: data.data.guestbook || []
            };

            setupSurpriseCardUI();
            renderGuestbookWishes();
        } else {
            alert('This birthday card is private or does not exist.');
            window.location.href = 'login.html';
        }
    } catch (e) {
        console.error('Fetch card details error:', e);
    }
}

// Populate card fields, background, media elements, and styles
function setupSurpriseCardUI() {
    // Apply theme & background
    document.body.className = `wish-body theme-${viewerConfig.theme}`;
    document.body.style.background = viewerConfig.background;
    
    // Apply font
    const font = viewerConfig.font || 'Outfit';
    displayCard.style.fontFamily = font;
    wishMessage.style.fontFamily = font;
    document.getElementById('cardTitle').style.fontFamily = font;
    
    // Set headers
    document.getElementById('relationBadge').textContent = viewerConfig.relationship.toUpperCase();
    document.getElementById('cardTitle').textContent = `Happy Birthday, ${viewerConfig.name}! 🎉`;
    document.getElementById('senderTag').textContent = `From: ${viewerConfig.senderName}`;

    // 1. Photos Carousel
    setupPhotosCarousel();

    // 2. Video Player Embed
    setupVideoEmbed();

    // 3. Voice Message Cassette
    setupVoiceMessagePlayer();

    // 4. Cake style emoji selection
    const cakeBox = document.getElementById('cakeBox');
    if (viewerConfig.cakeStyle === 'chocolate') {
        cakeBox.textContent = '🍫🎂';
    } else if (viewerConfig.cakeStyle === 'cupcake') {
        cakeBox.textContent = '🧁';
    } else {
        cakeBox.textContent = '🎂🕯️'; // default glowing cake
    }
}

// Photo Slider Slide Deck
function setupPhotosCarousel() {
    const photoDeck = document.getElementById('photoDeck');
    photoDeck.innerHTML = ''; // clear

    const images = viewerConfig.photos && viewerConfig.photos.length > 0 ? 
                   viewerConfig.photos : 
                   [generateFallbackPhoto(viewerConfig.gender || 'female')];

    images.forEach((base64, idx) => {
        const slide = document.createElement('img');
        slide.src = base64;
        slide.className = `carousel-slide ${idx === 0 ? 'active' : ''}`;
        slide.alt = `Slide ${idx + 1}`;
        photoDeck.appendChild(slide);
    });

    // Auto slideshow if multiple photos
    if (images.length > 1) {
        let currentSlide = 0;
        setInterval(() => {
            const slides = document.querySelectorAll('.carousel-slide');
            slides[currentSlide].classList.remove('active');
            currentSlide = (currentSlide + 1) % slides.length;
            slides[currentSlide].classList.add('active');
        }, 3000);
    }
}

function generateFallbackPhoto(gender) {
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
    
    const emoji = (gender === 'male') ? '🤵' : '👸';
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
    
    // Resolve Youtube links to embed iframe
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
        // standard direct mp4 video asset
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
            // Stop background song to focus on voice message
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
        // Resume background song
        playSong();
    });
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

    // Click handler to choose custom emojis
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
                // Clear input
                document.getElementById('guestText').value = '';
                
                // Add new post to array
                viewerConfig.guestbook.unshift(data.data);
                renderGuestbookWishes();
                
                if (typeof showToast === 'function') {
                    showToast('Wishes signed in guestbook! ✍️', 'success');
                } else {
                    alert('Wishes signed in guestbook! ✍️');
                }
            }
        } catch (err) {
            console.error('Submit guestbook error:', err);
        }
    });
}

// ========================================================
// ENVELOPE INTERACTIVE REVEAL
// ========================================================
function setupEnvelopeReveal() {
    envelope.addEventListener('click', () => {
        if (!envelope.classList.contains('open')) {
            envelope.classList.add('open');
            
            // 1. Play Background loops
            playSong();
            
            // 2. Trigger initial bursts
            setTimeout(() => {
                const w = window.innerWidth;
                const h = window.innerHeight;
                createBurst(w * 0.25, h * 0.3);
                createBurst(w * 0.75, h * 0.3);
            }, 600);

            // 3. Slide card up & Fade envelope
            setTimeout(() => {
                envelope.style.opacity = '0';
                envelope.style.pointerEvents = 'none';
                displayCard.classList.add('show');
                
                // Start typing message greeting
                triggerGreetingMessage();
                
                // Start particle floaters
                startFloatingConfetti();
                
                // Show guestbook panel
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
    } else { // fade-in
        wishMessage.innerHTML = viewerConfig.message;
        wishMessage.style.opacity = '0';
        wishMessage.style.transition = 'opacity 1.5s ease-in';
        setTimeout(() => wishMessage.style.opacity = '1', 50);
    }
}

// ========================================================
// FLOATING PARTICLES CONFETTI SYSTEM
// ========================================================
let confettiInterval = null;
const confettiPresets = {
    hearts: ['❤️', '💖', '💕', '🌹', '💟'],
    balloons: ['🎈', '🎈', '🎈', '🎈'],
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

// ========================================================
// CANVAS FIREWORKS SYSTEM (TRANS-SAFE TRAILS)
// ========================================================
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
    if (viewerConfig.theme === 'romantic') {
        return ['244, 63, 94', '236, 72, 153', '255, 192, 203', '225, 29, 72'];
    } else if (viewerConfig.theme === 'elegant') {
        return ['217, 119, 6', '251, 191, 36', '255, 255, 255', '245, 158, 11'];
    } else if (viewerConfig.theme === 'playful') {
        return ['6, 182, 212', '244, 63, 94', '234, 179, 8', '168, 85, 247'];
    } else { // cosmic
        return ['99, 102, 241', '168, 85, 247', '236, 72, 153', '6, 182, 212'];
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

// Autoplay fireworks occasionally
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

// Birthday melody notes mapping
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
    
    // Choose tone color based on selected music option
    if (style === 'piano') {
        osc.type = 'sine'; // soft classical sine
    } else if (style === 'happy') {
        osc.type = 'sawtooth'; // bright retro synth
    } else {
        osc.type = 'triangle'; // chime box bell
    }
    
    osc.frequency.value = freq;
    
    // Volume envelope
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
    
    // Adjust tempo based on selected music category
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
        playSong();
    }
});
