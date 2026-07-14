// Settings Loader
let config = {
    name: 'Anshika',
    gender: 'female',
    relation: 'girlfriend',
    photo: '', // Default fallback
    theme: 'romantic',
    birthdate: new Date().toISOString().split('T')[0],
    message: "Happy Birthday, my love 😈🔥 you own my heart, my thoughts, and every wild desire in between 😘❤️‍🔥 Tonight isn't just about candles and cake—it's about passion, obsession, and you being dangerously unforgettable 🖤🔥🎂"
};

// Load actual data from localStorage
const storedConfig = localStorage.getItem('birthdaySurpriseConfig');
if (storedConfig) {
    try {
        config = JSON.parse(storedConfig);
    } catch (e) {
        console.error('Error loading config', e);
    }
}

// UI Setup
document.body.className = `wish-body theme-${config.theme}`;
document.getElementById('relationBadge').textContent = config.relation.toUpperCase();
document.getElementById('cardTitle').textContent = `Happy Birthday, ${config.name}! 🎉`;

// Setup photo or fallback preset
const photoImg = document.getElementById('recipientPhoto');
if (config.photo) {
    photoImg.src = config.photo;
} else {
    // Generate default gender icon if none set
    photoImg.src = generateDefaultPhoto(config.gender);
}

// Generate default photo if none uploaded
function generateDefaultPhoto(gender) {
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');
    
    // Draw background gradient
    const grad = ctx.createLinearGradient(0, 0, 160, 160);
    grad.addColorStop(0, '#a855f7');
    grad.addColorStop(1, '#ec4899');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(80, 80, 80, 0, Math.PI * 2);
    ctx.fill();
    
    // Choose Emoji
    const emoji = (gender === 'female') ? '👸' : (gender === 'male' ? '🤵' : '✨');
    ctx.font = '80px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 80, 84);
    
    return canvas.toDataURL('image/png');
}

// Typewriter Effect
let typingTimer = null;
function startTypewriter(text, targetEl) {
    targetEl.innerHTML = '';
    let i = 0;
    if (typingTimer) clearInterval(typingTimer);
    
    typingTimer = setInterval(() => {
        if (i < text.length) {
            targetEl.innerHTML += text.charAt(i);
            i++;
        } else {
            clearInterval(typingTimer);
        }
    }, 55); // Typing speed
}

// Countdown or Birthday Date Display
function updateBirthdayInfo() {
    const countdownBox = document.getElementById('countdownBox');
    const today = new Date();
    const bdate = new Date(config.birthdate);
    
    const sameMonth = today.getMonth() === bdate.getMonth();
    const sameDay = today.getDate() === bdate.getDate();

    if (sameMonth && sameDay) {
        countdownBox.innerHTML = "🎂 TODAY IS YOUR SPECIAL DAY! 🥳🎉";
        countdownBox.style.color = "var(--accent-color)";
        countdownBox.style.fontSize = "1rem";
        countdownBox.style.textShadow = "0 0 10px rgba(255,255,255,0.8)";
    } else {
        const formattedDate = bdate.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
        countdownBox.innerHTML = `📅 Birthday: ${formattedDate}`;
    }
}
updateBirthdayInfo();

// ========================================================
// ENVELOPE INTERACTION
// ========================================================
const envelope = document.getElementById('envelope');
const displayCard = document.getElementById('displayCard');

envelope.addEventListener('click', () => {
    if (!envelope.classList.contains('open')) {
        // Step 1: Open the envelope flap
        envelope.classList.add('open');
        
        // Step 2: Play sound synthesis
        playSong();
        
        // Step 3: Trigger multiple fireworks
        setTimeout(() => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            createBurst(w * 0.25, h * 0.3);
            createBurst(w * 0.75, h * 0.3);
            createBurst(w * 0.5, h * 0.4);
        }, 600);

        // Step 4: Shrink/Fade envelope and Slide Card Up
        setTimeout(() => {
            envelope.style.opacity = '0';
            envelope.style.pointerEvents = 'none';
            displayCard.classList.add('show');
            
            // Start message typing
            const msgEl = document.getElementById('wishMessage');
            startTypewriter(config.message, msgEl);
            
            // Start floating background emojis
            startFloatingEmojis();
        }, 1200);
    }
});

// ========================================================
// FLOATING EMOJIS SYSTEM
// ========================================================
let emojiInterval = null;
const themeEmojis = {
    romantic: ['❤️', '💖', '🌹', '💕', '✨', '🌸'],
    playful: ['🎈', '🎂', '🎁', '🎉', '🥳', '🍰'],
    elegant: ['👑', '✨', '🌟', '🥂', '💎', '💛'],
    cosmic: ['🌌', '⭐', '🌙', '🪐', '💫', '☄️']
};

function startFloatingEmojis() {
    if (emojiInterval) clearInterval(emojiInterval);
    
    emojiInterval = setInterval(() => {
        const emojis = themeEmojis[config.theme] || themeEmojis['romantic'];
        const emoji = emojis[Math.floor(Math.random() * emojis.length)];
        
        const el = document.createElement('div');
        el.className = 'floating-emoji';
        el.textContent = emoji;
        
        // Style variables
        el.style.left = Math.random() * 95 + 'vw';
        el.style.fontSize = Math.random() * 1.5 + 1.2 + 'rem';
        el.style.animation = `floatUp ${Math.random() * 3 + 5}s linear forwards`;
        
        document.body.appendChild(el);
        
        // Garbage collector
        setTimeout(() => {
            el.remove();
        }, 8000);
    }, 450);
}

// ========================================================
// CANVAS FIREWORKS SYSTEM (TRANS-SAFE, TRAILS ENGINE)
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
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 2.5;
        
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        
        this.gravity = 0.08;
        this.friction = 0.95;
        this.opacity = 1;
        this.decay = Math.random() * 0.015 + 0.008;
        this.size = Math.random() * 2.5 + 1.5;
        this.history = [];
    }
    
    update() {
        this.history.push({ x: this.x, y: this.y });
        if (this.history.length > 5) {
            this.history.shift();
        }
        
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
    const count = 50;
    for (let i = 0; i < count; i++) {
        const color = colors[Math.floor(Math.random() * colors.length)];
        particles.push(new Particle(x, y, color));
    }
}

function getThemeColors() {
    if (config.theme === 'romantic') {
        return ['244, 63, 94', '236, 72, 153', '255, 192, 203', '225, 29, 72'];
    } else if (config.theme === 'elegant') {
        return ['217, 119, 6', '251, 191, 36', '255, 255, 255', '245, 158, 11'];
    } else if (config.theme === 'playful') {
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

// Autoplay random background fireworks occasionally
setInterval(() => {
    if (displayCard.classList.contains('show') && particles.length < 80) {
        createBurst(
            Math.random() * window.innerWidth,
            Math.random() * window.innerHeight * 0.6
        );
    }
}, 2500);

// ========================================================
// WEB AUDIO SYNTHESIZED MUSIC (Happy Birthday Piano)
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
    { note: 'C4', dur: 0.5 },
    { note: 'C4', dur: 0.5 },
    { note: 'D4', dur: 1 },
    { note: 'C4', dur: 1 },
    { note: 'F4', dur: 1 },
    { note: 'E4', dur: 2 },
    
    { note: 'C4', dur: 0.5 },
    { note: 'C4', dur: 0.5 },
    { note: 'D4', dur: 1 },
    { note: 'C4', dur: 1 },
    { note: 'G4', dur: 1 },
    { note: 'F4', dur: 2 },
    
    { note: 'C4', dur: 0.5 },
    { note: 'C4', dur: 0.5 },
    { note: 'C5', dur: 1 },
    { note: 'A4', dur: 1 },
    { note: 'F4', dur: 1 },
    { note: 'E4', dur: 1 },
    { note: 'D4', dur: 2 },
    
    { note: 'A#4', dur: 0.5 },
    { note: 'A#4', dur: 0.5 },
    { note: 'A4', dur: 1 },
    { note: 'F4', dur: 1 },
    { note: 'G4', dur: 1 },
    { note: 'F4', dur: 2 }
];

function playNote(freq, start, duration) {
    if (!audioCtx) return;
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    // Sweet musicbox chime using Triangle waves
    osc.type = 'triangle';
    osc.frequency.value = freq;
    
    // Chime Envelope
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.2, start + 0.04);
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
    const beatLength = 0.55; // tempo controller
    
    melody.forEach(noteObj => {
        const freq = noteFreqs[noteObj.note];
        const duration = noteObj.dur * beatLength;
        
        playNote(freq, time, duration);
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

// Setup Control Buttons Actions
document.getElementById('musicBtn').addEventListener('click', () => {
    if (isPlaying) {
        stopSong();
    } else {
        playSong();
    }
});

document.getElementById('fireworksBtn').addEventListener('click', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    createBurst(w * 0.2, h * 0.4);
    createBurst(w * 0.5, h * 0.3);
    createBurst(w * 0.8, h * 0.4);
});

document.getElementById('createBtn').addEventListener('click', () => {
    stopSong();
    window.location.href = '/home';
});
