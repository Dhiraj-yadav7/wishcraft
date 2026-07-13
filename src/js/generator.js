// Generator State
let generatorState = {
    pageId: null, // Set in Edit Mode
    activeStep: 1,
    photos: [], // Array of base64
    voiceMessage: '', // Base64 audio
    theme: 'romantic',
    background: 'linear-gradient(135deg, #ffe4e6 0%, #fbcfe8 100%)',
    
    // premium specs
    timeline: [], // Array of { date, title, text, photo }
    aiWishes: [], // Array of { category, text, favorite }
    currentTimelinePhoto: '', // Temp base64 for upload

    // saas parameters
    themePreset: 'romantic',
    capsuleLocked: false,
    unlockDate: null,

    mediaRecorder: null,
    audioChunks: [],
    isRecording: false
};

// Gradient Presets list
const backgroundPresets = [
    { name: 'Romantic Pink', value: 'linear-gradient(135deg, #ffe4e6 0%, #fbcfe8 100%)' },
    { name: 'Sweet Lavender', value: 'linear-gradient(135deg, #f3e8ff 0%, #fce7f3 100%)' },
    { name: 'Warm Sunset', value: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)' },
    { name: 'Royal Gold', value: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)' },
    { name: 'Cosmic Void', value: 'linear-gradient(135deg, #09090b 0%, #03001e 100%)' },
    { name: 'Vibrant Teal', value: 'linear-gradient(135deg, #ecfeff 0%, #e0f2fe 100%)' },
    { name: 'Emerald Soft', value: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)' },
    { name: 'Pastel Glow', value: 'linear-gradient(135deg, #e0f2fe 0%, #fae8ff 100%)' }
];

document.addEventListener('DOMContentLoaded', () => {
    // Hide AI Modal initially to prevent flash
    document.getElementById('aiAssistModal').style.display = 'none';

    // 1. Initial renders
    renderBackgroundPresets();
    setupSimulatorSync();
    setupTabWizard();
    setupPhotoManager();
    setupVoiceRecorder();
    setupSaveActions();
    
    // Premium setups
    setupAiAssistModule();
    setupTimelineManager();
    setupCapsuleLockedForm();
    
    // 2. Check if Edit Mode (url query parameter ?id=xxx)
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (id) {
        generatorState.pageId = id;
        loadEditDetails(id);
    } else {
        document.getElementById('birthdate').value = new Date().toISOString().split('T')[0];
    }
});

// Render presets
function renderBackgroundPresets() {
    const list = document.getElementById('bgPresetList');
    list.innerHTML = '';
    
    backgroundPresets.forEach((preset, idx) => {
        const option = document.createElement('div');
        option.className = `bg-preset-option ${idx === 0 ? 'selected' : ''}`;
        option.style.background = preset.value;
        option.dataset.val = preset.value;
        
        option.addEventListener('click', () => {
            document.querySelectorAll('.bg-preset-option').forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
            generatorState.background = preset.value;
            document.getElementById('previewPane').style.background = preset.value;
        });

        list.appendChild(option);
    });
}

// Check local settings state and load editing details
async function loadEditDetails(pageId) {
    const token = authManager.getToken();
    if (!token) return;

    showToast('Loading card details...', 'info');

    try {
        const res = await fetch(`/api/pages?action=detail&id=${pageId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.success) {
            const page = data.data.page;
            
            // Populate inputs
            document.getElementById('recipientName').value = page.name;
            document.getElementById('birthdate').value = page.date.split('T')[0];
            document.getElementById('relationship').value = page.relationship;
            document.getElementById('senderName').value = page.senderName;
            document.getElementById('cardMessage').value = page.message;
            document.getElementById('videoUrl').value = page.videoUrl;
            document.getElementById('fontSelect').value = page.font || 'Outfit';
            document.getElementById('musicSelect').value = page.music || 'chimes';
            document.getElementById('confettiSelect').value = page.confettiStyle || 'hearts';
            document.getElementById('fireworksSelect').value = page.fireworksStyle || 'burst';
            document.getElementById('cakeSelect').value = page.cakeStyle || 'animated';
            document.getElementById('greetingSelect').value = page.greetingStyle || 'typewriter';

            // Premium inputs populate
            document.getElementById('linkPassword').value = page.password || '';
            if (page.expiresAt) {
                const date = new Date(page.expiresAt);
                const localVal = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                document.getElementById('linkExpiry').value = localVal;
            }
            generatorState.timeline = page.timeline || [];
            updateTimelineItemsList();
            generatorState.aiWishes = page.aiWishes || [];

            // SaaS Digital Capsule parameters populate
            const isCapsule = !!page.capsuleLocked;
            document.getElementById('capsuleLockedToggle').checked = isCapsule;
            document.getElementById('capsuleTimeBlock').style.display = isCapsule ? 'block' : 'none';
            if (page.unlockDate) {
                const date = new Date(page.unlockDate);
                const localVal = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                document.getElementById('capsuleUnlockDate').value = localVal;
            }
            generatorState.capsuleLocked = isCapsule;

            // Sync grid theme preset selection
            document.querySelectorAll('.grid-option[data-type="themePreset"]').forEach(opt => {
                if (opt.dataset.value === (page.themePreset || 'romantic')) {
                    opt.classList.add('selected');
                } else {
                    opt.classList.remove('selected');
                }
            });
            generatorState.themePreset = page.themePreset || 'romantic';
            generatorState.theme = page.themePreset || 'romantic';

            // Set visual body class
            document.body.className = `theme-${generatorState.themePreset}`;

            // Sync photos array
            generatorState.photos = page.photos || [];
            updatePhotoThumbnailsGrid();

            // Sync audio voice message
            if (page.voiceMessage) {
                generatorState.voiceMessage = page.voiceMessage;
                const previewEl = document.getElementById('voicePreview');
                previewEl.src = page.voiceMessage;
                document.getElementById('audioPlayContainer').style.display = 'block';
                document.getElementById('recordBtn').className = 'rec-btn has-audio';
                document.getElementById('recStatus').textContent = 'Voice message loaded 🎧';
            }

            // Sync custom background style
            generatorState.background = page.background || backgroundPresets[0].value;
            document.getElementById('previewPane').style.background = generatorState.background;
            
            document.querySelectorAll('.bg-preset-option').forEach(opt => {
                if (opt.dataset.val === page.background) {
                    opt.classList.add('selected');
                } else {
                    opt.classList.remove('selected');
                }
            });

            syncSimulator();
        } else {
            showToast(data.message, 'error');
        }
    } catch (err) {
        showToast('Error loading page configurations.', 'error');
    }
}

// Sync Simulator panel in real-time
function setupSimulatorSync() {
    const inputs = ['recipientName', 'relationship', 'cardMessage', 'fontSelect'];
    inputs.forEach(id => {
        document.getElementById(id).addEventListener('input', syncSimulator);
        document.getElementById(id).addEventListener('change', syncSimulator);
    });

    // Theme Preset click triggers
    document.querySelectorAll('.grid-option[data-type="themePreset"]').forEach(opt => {
        opt.addEventListener('click', (e) => {
            document.querySelectorAll('.grid-option[data-type="themePreset"]').forEach(o => o.classList.remove('selected'));
            const current = e.currentTarget;
            current.classList.add('selected');
            
            generatorState.themePreset = current.dataset.value;
            generatorState.theme = current.dataset.value;
            
            // Set dynamic visual theme live in editor body!
            document.body.className = `theme-${generatorState.themePreset}`;
            
            syncSimulator();
        });
    });
}

function syncSimulator() {
    const name = document.getElementById('recipientName').value || 'Recipient';
    const rel = document.getElementById('relationship').value;
    const msg = document.getElementById('cardMessage').value || 'Surprise thought text preview...';
    const font = document.getElementById('fontSelect').value;

    document.getElementById('simName').textContent = name;
    document.getElementById('simRelation').textContent = rel.toUpperCase();
    document.getElementById('simMessage').textContent = msg;

    document.getElementById('simCard').style.fontFamily = font;
    document.getElementById('simMessage').style.fontFamily = font;
    document.getElementById('simCard').className = `preview-sim-card theme-${generatorState.themePreset}`;

    const simPhoto = document.getElementById('simPhoto');
    if (generatorState.photos.length > 0) {
        simPhoto.src = generatorState.photos[0];
    } else {
        simPhoto.src = generateFallbackAvatar();
    }
}

function generateFallbackAvatar() {
    const canvas = document.createElement('canvas');
    canvas.width = 120;
    canvas.height = 120;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0,0,120,120);
    grad.addColorStop(0, '#a855f7');
    grad.addColorStop(1, '#ec4899');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(60,60,60,0,Math.PI*2);
    ctx.fill();
    ctx.font = '55px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('👸', 60, 62);
    return canvas.toDataURL('image/png');
}

// Tab Wizard Navigation
function setupTabWizard() {
    const nextBtn = document.getElementById('nextBtn');
    const backBtn = document.getElementById('backBtn');

    nextBtn.addEventListener('click', () => {
        if (validateStep(generatorState.activeStep)) {
            generatorState.activeStep++;
            showTabStep(generatorState.activeStep);
        }
    });

    backBtn.addEventListener('click', () => {
        generatorState.activeStep--;
        showTabStep(generatorState.activeStep);
    });

    document.querySelectorAll('.tab-btn').forEach((btn, idx) => {
        btn.addEventListener('click', () => {
            const targetStep = idx + 1;
            if (targetStep > generatorState.activeStep && !validateStep(generatorState.activeStep)) {
                return;
            }
            generatorState.activeStep = targetStep;
            showTabStep(targetStep);
        });
    });
}

function validateStep(step) {
    if (step === 1) {
        const name = document.getElementById('recipientName').value.trim();
        const date = document.getElementById('birthdate').value;
        const sender = document.getElementById('senderName').value.trim();
        const msg = document.getElementById('cardMessage').value.trim();

        if (!name || !date || !sender || !msg) {
            showToast('Please complete all fields in the Basics tab. 📝', 'warning');
            return false;
        }
    }
    return true;
}

function showTabStep(step) {
    const nextBtn = document.getElementById('nextBtn');
    const backBtn = document.getElementById('backBtn');
    const saveActions = document.getElementById('saveActions');

    if (step === 1) {
        backBtn.style.display = 'none';
        nextBtn.style.display = 'block';
        saveActions.style.display = 'none';
    } else if (step === 4) {
        backBtn.style.display = 'block';
        nextBtn.style.display = 'none';
        saveActions.style.display = 'flex';
    } else {
        backBtn.style.display = 'block';
        nextBtn.style.display = 'block';
        saveActions.style.display = 'none';
    }

    document.querySelectorAll('.tab-btn').forEach((btn, idx) => {
        if (idx === (step - 1)) btn.classList.add('active');
        else btn.classList.remove('active');
    });

    document.querySelectorAll('.tab-content').forEach((content, idx) => {
        if (idx === (step - 1)) content.classList.add('active');
        else content.classList.remove('active');
    });

    document.body.className = `theme-${generatorState.themePreset}`;
}

// Photos file manager
function setupPhotoManager() {
    const dropzone = document.getElementById('photosDropzone');
    const fileInput = document.getElementById('photosInput');

    dropzone.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files) {
            handlePhotoFiles(Array.from(e.target.files));
        }
    });

    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--primary-color)';
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.style.borderColor = 'rgba(168, 85, 247, 0.3)';
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'rgba(168, 85, 247, 0.3)';
        if (e.dataTransfer.files) {
            handlePhotoFiles(Array.from(e.dataTransfer.files));
        }
    });
}

function handlePhotoFiles(files) {
    if (generatorState.photos.length + files.length > 5) {
        showToast('You can upload a maximum of 5 photos! 📸', 'warning');
        return;
    }

    files.forEach(file => {
        if (!file.type.startsWith('image/')) return;
        if (file.size > 10 * 1024 * 1024) {
            showToast('Files must be smaller than 10MB to save securely.', 'warning');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const maxDimension = 1024;
                let width = img.width;
                let height = img.height;

                if (width > maxDimension || height > maxDimension) {
                    if (width > height) {
                        height = Math.round((height * maxDimension) / width);
                        width = maxDimension;
                    } else {
                        width = Math.round((width * maxDimension) / height);
                        height = maxDimension;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Compress image to jpeg at 0.75 quality
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75);

                generatorState.photos.push(compressedBase64);
                updatePhotoThumbnailsGrid();
                syncSimulator();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function updatePhotoThumbnailsGrid() {
    const list = document.getElementById('photosThumbnails');
    list.innerHTML = '';

    generatorState.photos.forEach((base64, idx) => {
        const wrap = document.createElement('div');
        wrap.className = 'photo-thumb-wrapper';
        
        wrap.innerHTML = `
            <img src="${base64}" alt="Thumb ${idx + 1}">
            <button type="button" class="photo-thumb-remove" data-idx="${idx}">✕</button>
        `;

        wrap.querySelector('.photo-thumb-remove').addEventListener('click', (e) => {
            e.stopPropagation();
            const removeIdx = parseInt(e.target.dataset.idx);
            generatorState.photos.splice(removeIdx, 1);
            updatePhotoThumbnailsGrid();
            syncSimulator();
        });

        list.appendChild(wrap);
    });
}

// Voice Recorder via Web Audio & MediaRecorder API
function setupVoiceRecorder() {
    const recordBtn = document.getElementById('recordBtn');
    const recStatus = document.getElementById('recStatus');
    const clearVoiceBtn = document.getElementById('clearVoiceBtn');
    const voicePreview = document.getElementById('voicePreview');
    const playContainer = document.getElementById('audioPlayContainer');

    recordBtn.addEventListener('click', async () => {
        if (recordBtn.classList.contains('has-audio')) {
            if (voicePreview.paused) {
                voicePreview.play();
                recStatus.textContent = 'Playing voice message... 🔊';
            } else {
                voicePreview.pause();
                recStatus.textContent = 'Voice message loaded 🎧';
            }
            return;
        }

        if (generatorState.isRecording) {
            generatorState.mediaRecorder.stop();
            generatorState.isRecording = false;
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                generatorState.audioChunks = [];
                
                const mediaRecorder = new MediaRecorder(stream);
                generatorState.mediaRecorder = mediaRecorder;
                
                mediaRecorder.addEventListener('dataavailable', event => {
                    generatorState.audioChunks.push(event.data);
                });

                mediaRecorder.addEventListener('stop', () => {
                    const audioBlob = new Blob(generatorState.audioChunks, { type: 'audio/mp3' });
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const base64Audio = reader.result;
                        generatorState.voiceMessage = base64Audio;
                        
                        voicePreview.src = base64Audio;
                        playContainer.style.display = 'block';
                        
                        recordBtn.className = 'rec-btn has-audio';
                        recordBtn.textContent = '🎵';
                        recStatus.textContent = 'Voice message recorded successfully! click to test.';
                    };
                    reader.readAsDataURL(audioBlob);
                });

                mediaRecorder.start();
                generatorState.isRecording = true;
                
                recordBtn.className = 'rec-btn recording';
                recordBtn.textContent = '⏹️';
                recStatus.textContent = 'Recording microphone... tap icon to stop.';
                
            } catch (e) {
                showToast('Failed to access microphone. Check browser permissions.', 'error');
            }
        }
    });

    clearVoiceBtn.addEventListener('click', () => {
        generatorState.voiceMessage = '';
        voicePreview.src = '';
        playContainer.style.display = 'none';
        
        recordBtn.className = 'rec-btn idle';
        recordBtn.textContent = '🎤';
        recStatus.textContent = 'Click icon to start microphone recording';
    });
}

// ========================================================
// TIMELINE MEMORY LANE EDITOR (Premium feature)
// ========================================================
function setupTimelineManager() {
    const photoBtn = document.getElementById('timelinePhotoBtn');
    const photoInput = document.getElementById('timelinePhotoInput');
    const previewImg = document.getElementById('timelinePreviewImg');
    const previewContainer = document.getElementById('timelinePhotoPreview');
    const addBtn = document.getElementById('addTimelineItemBtn');

    photoBtn.addEventListener('click', () => photoInput.click());

    photoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file || !file.type.startsWith('image/')) return;
        if (file.size > 1.2 * 1024 * 1024) {
            showToast('Timeline photos must be smaller than 1.2MB.', 'warning');
            return;
        }

        const reader = new FileReader();
        reader.onload = (ev) => {
            generatorState.currentTimelinePhoto = ev.target.result;
            previewImg.src = ev.target.result;
            previewContainer.style.display = 'block';
        };
        reader.readAsDataURL(file);
    });

    addBtn.addEventListener('click', () => {
        const title = document.getElementById('timelineTitle').value.trim();
        const date = document.getElementById('timelineDate').value.trim();
        const text = document.getElementById('timelineText').value.trim();

        if (!title || !date) {
            showToast('Please provide a Title and Date/Age for the memory node.', 'warning');
            return;
        }

        if (generatorState.timeline.length >= 4) {
            showToast('Timeline is limited to 4 memory nodes for best display.', 'warning');
            return;
        }

        // Add node
        generatorState.timeline.push({
            title,
            date,
            text: text || '',
            photo: generatorState.currentTimelinePhoto || ''
        });

        // Reset inputs
        document.getElementById('timelineTitle').value = '';
        document.getElementById('timelineDate').value = '';
        document.getElementById('timelineText').value = '';
        generatorState.currentTimelinePhoto = '';
        previewContainer.style.display = 'none';
        previewImg.src = '';
        photoInput.value = '';

        updateTimelineItemsList();
        showToast('Memory node added to timeline! ⏰', 'success');
    });
}

function updateTimelineItemsList() {
    const container = document.getElementById('timelineItemsList');
    container.innerHTML = '';

    generatorState.timeline.forEach((item, idx) => {
        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.justifyContent = 'space-between';
        div.style.padding = '0.5rem 0.8rem';
        div.style.background = 'rgba(255,255,255,0.5)';
        div.style.borderRadius = '10px';
        div.style.border = '1px solid rgba(0,0,0,0.04)';
        div.style.fontSize = '0.8rem';

        div.innerHTML = `
            <div style="display:flex; align-items:center; gap:0.5rem;">
                ${item.photo ? `<img src="${item.photo}" style="width:28px; height:28px; object-fit:cover; border-radius:50%;">` : '📅'}
                <span><strong>${item.date}</strong>: ${item.title}</span>
            </div>
            <button type="button" class="photo-thumb-remove" data-idx="${idx}" style="position:static; width:22px; height:22px; flex-shrink:0;">✕</button>
        `;

        div.querySelector('button').addEventListener('click', (e) => {
            const removeIdx = parseInt(e.target.dataset.idx);
            generatorState.timeline.splice(removeIdx, 1);
            updateTimelineItemsList();
        });

        container.appendChild(div);
    });
}

// ========================================================
// LOCKED DIGITAL TIME CAPSULE CONFIGS
// ========================================================
function setupCapsuleLockedForm() {
    const toggle = document.getElementById('capsuleLockedToggle');
    const timeBlock = document.getElementById('capsuleTimeBlock');

    toggle.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        timeBlock.style.display = isChecked ? 'block' : 'none';
        generatorState.capsuleLocked = isChecked;
        
        if (isChecked) {
            // Preset release date to tomorrow
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setMinutes(tomorrow.getMinutes() - tomorrow.getTimezoneOffset());
            document.getElementById('capsuleUnlockDate').value = tomorrow.toISOString().slice(0,16);
        }
    });
}

// ========================================================
// GEMINI AI ASSIST DIALOG DRAWER (Premium integration)
// ========================================================
function setupAiAssistModule() {
    const modal = document.getElementById('aiAssistModal');
    const openBtn = document.getElementById('aiAssistBtn');
    const closeBtn = document.getElementById('aiCloseBtn');
    const generateBtn = document.getElementById('aiGenerateBtn');
    const regenBtn = document.getElementById('aiRegenerateBtn');
    const copyBtn = document.getElementById('aiCopyBtn');
    const favoriteBtn = document.getElementById('aiFavoriteBtn');
    const useBtn = document.getElementById('aiUseBtn');
    
    const shimmer = document.getElementById('aiShimmer');
    const resultBlock = document.getElementById('aiResultBlock');
    const resultText = document.getElementById('aiResultText');
    const categorySelect = document.getElementById('aiCategory');

    openBtn.addEventListener('click', () => {
        const name = document.getElementById('recipientName').value.trim();
        if (!name) {
            showToast('Please fill in the Birthday Name first to generate custom wishes!', 'warning');
            return;
        }
        modal.style.display = 'flex';
        resultBlock.style.display = 'none';
        shimmer.style.display = 'none';
    });

    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    const triggerGeneration = async () => {
        const token = authManager.getToken();
        if (!token) return;

        const recipientName = document.getElementById('recipientName').value.trim();
        const relation = document.getElementById('relationship').value;
        const category = categorySelect.value;

        shimmer.style.display = 'block';
        resultBlock.style.display = 'none';
        generateBtn.style.display = 'none';

        try {
            const res = await fetch('/api/ai', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ recipientName, relation, category })
            });
            const data = await res.json();
            
            shimmer.style.display = 'none';
            generateBtn.style.display = 'block';
            
            if (data.success) {
                resultText.value = data.data.text;
                resultBlock.style.display = 'flex';
                showToast('Gemini planning completed!', 'success');
            } else {
                showToast(data.message, 'error');
            }
        } catch (e) {
            shimmer.style.display = 'none';
            generateBtn.style.display = 'block';
            showToast('Failed to contact AI planning assistant.', 'error');
        }
    };

    generateBtn.addEventListener('click', triggerGeneration);
    regenBtn.addEventListener('click', triggerGeneration);

    copyBtn.addEventListener('click', () => {
        resultText.select();
        document.execCommand('copy');
        showToast('Copied to clipboard! 📋', 'success');
    });

    useBtn.addEventListener('click', () => {
        const text = resultText.value.trim();
        if (text) {
            document.getElementById('cardMessage').value = text;
            syncSimulator();
            modal.style.display = 'none';
            showToast('AI content injected to editor! 🪄', 'success');
        }
    });

    favoriteBtn.addEventListener('click', () => {
        const text = resultText.value.trim();
        const category = categorySelect.value;
        if (text) {
            generatorState.aiWishes.push({ category, text, favorite: true });
            showToast('Saved to AI suggestions library! ❤️', 'success');
        }
    });
}

// Save as Draft or Publish Card
function setupSaveActions() {
    const saveDraftBtn = document.getElementById('saveDraftBtn');
    const publishBtn = document.getElementById('publishBtn');

    saveDraftBtn.addEventListener('click', () => submitCardData('draft'));
    publishBtn.addEventListener('click', () => submitCardData('public'));
}

async function submitCardData(status) {
    const token = authManager.getToken();
    if (!token) return;

    const name = document.getElementById('recipientName').value.trim();
    const date = document.getElementById('birthdate').value;
    const relationship = document.getElementById('relationship').value;
    const senderName = document.getElementById('senderName').value.trim();
    const message = document.getElementById('cardMessage').value.trim();
    const videoUrl = document.getElementById('videoUrl').value.trim();
    const font = document.getElementById('fontSelect').value;
    const music = document.getElementById('musicSelect').value;
    const confettiStyle = document.getElementById('confettiSelect').value;
    const fireworksStyle = document.getElementById('fireworksSelect').value;
    const cakeStyle = document.getElementById('cakeSelect').value;
    const greetingStyle = document.getElementById('greetingSelect').value;

    // Premium attributes
    const password = document.getElementById('linkPassword').value.trim();
    const expiresAtVal = document.getElementById('linkExpiry').value;
    const expiresAt = expiresAtVal ? new Date(expiresAtVal).toISOString() : null;

    // SaaS Capsule locks mappings
    const capsuleLocked = document.getElementById('capsuleLockedToggle').checked;
    const unlockDateVal = document.getElementById('capsuleUnlockDate').value;
    const unlockDate = (capsuleLocked && unlockDateVal) ? new Date(unlockDateVal).toISOString() : null;

    const payload = {
        name,
        date,
        relationship,
        senderName,
        message,
        photos: generatorState.photos,
        videoUrl,
        voiceMessage: generatorState.voiceMessage,
        theme: generatorState.themePreset, // Fallback mappings
        background: generatorState.background,
        music,
        font,
        confettiStyle,
        fireworksStyle,
        cakeStyle,
        greetingStyle,
        status,
        
        // Premium payload maps
        password,
        expiresAt,
        timeline: generatorState.timeline,
        aiWishes: generatorState.aiWishes,

        // SaaS parameters payload
        capsuleLocked,
        unlockDate,
        themePreset: generatorState.themePreset,
        favoriteTemplate: false
    };

    const isEdit = generatorState.pageId !== null;
    const url = isEdit ? `/api/pages?action=detail&id=${generatorState.pageId}` : '/api/pages?action=list';
    const method = isEdit ? 'PUT' : 'POST';

    showToast(isEdit ? 'Saving changes...' : 'Creating surprise...', 'info');

    try {
        const res = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if (data.success) {
            showToast(data.message, 'success');
            setTimeout(() => window.location.href = 'dashboard.html', 1200);
        } else {
            showToast(data.message, 'error');
        }
    } catch (e) {
        showToast('Network error saving surprise card.', 'error');
    }
}
