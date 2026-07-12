// Configuration Wizard State
let wizardState = {
    name: '',
    gender: 'female', // Default
    relation: 'friend', // Default
    photo: '', // Base64
    theme: 'romantic', // Default
    birthdate: '',
    message: ''
};

// Preset Messages based on relationship and gender
const messageTemplates = {
    girlfriend: [
        "Happy Birthday to my endless love! 💖 You own my heart, my thoughts, and every wild desire. Tonight is all about you being dangerously unforgettable. 😘🔥",
        "To the girl who stole my heart: Happy Birthday! 🌸 You make every day feel like a beautiful dream. I promise to cherish and love you forever and always. 👑💞",
        "Happy Birthday my lifeline! 🎂 You are my sunshine, my anchor, and my happiest thought. Can't wait to make countless more memories together. 😍💙"
    ],
    boyfriend: [
        "Happy Birthday to the keeper of my heart! 💙 You are my protector, my lover, and my favorite place to be. Let's make today unforgettable! 🔥😘",
        "To my handsome prince: Happy Birthday! 👑 Thank you for being the most loving, caring, and understanding partner. I am incredibly blessed to have you. ✨❤️",
        "Happy Birthday my lifeline! 🎂 You own my heart, my smile, and my forever. Looking forward to celebrating many more years of you. 🥰"
    ],
    friend: [
        "Happy Birthday to my absolute favorite human! 🍻 Thanks for always being the one I can do stupid things with. Hope your day is as chaotic and fun as you! 🎉🥳",
        "Cheers to another year of survival! 🎂 May your day be filled with laughter, drinks, and all the love you deserve. Happy Birthday, bestie! 🌟",
        "Happy Birthday! 🎈 You are the therapist I never had to pay for. Thanks for always being there. Have an awesome one! 💥"
    ],
    brother: [
        "Happy Birthday to my partner in crime! 👦 Even though you annoy me to no end, I wouldn't trade you for anything in the world. Have an absolute blast today! 🎁",
        "To the best brother ever: Happy Birthday! 🚀 May this year bring you all the success, joy, and good fortunes you've been working so hard for. Keep shining!",
        "Happy Birthday bro! 🎂 Thanks for always having my back, even when we fight like cats and dogs. Tonight, the first round is on you! 😂🍻"
    ],
    sister: [
        "Happy Birthday to my forever sister and best friend! 👧 Thank you for sharing your clothes, your secrets, and your life with me. Love you to pieces! 💖",
        "To my amazing sister: Happy Birthday! 🌸 Wishing you a year filled with sweet surprises, laughter, and endless shopping sprees! You deserve the best.",
        "Happy Birthday, sissy! 🎂 You're still the golden child, but I still love you. Have a magical and beautiful birthday! ✨👑"
    ],
    father: [
        "Happy Birthday, Dad! 👔 Thank you for the endless wisdom, guidance, and unconditional love you've given me. You are my true hero. 👑",
        "To the strongest man I know: Happy Birthday! 🌟 May this year bring you rest, happiness, and excellent health. Thank you for everything, Dad.",
        "Happy Birthday to the world's best father! 🎂 Your silent support has always been my greatest strength. Enjoy your special day to the fullest! ❤️"
    ],
    mother: [
        "Happy Birthday, Mom! 👩 Your grace, love, and strength inspire me every single day. Thank you for being my anchor and my warmth. 💕",
        "To my beautiful mother: Happy Birthday! 🌸 May your day be as gentle, bright, and lovely as your heart. I love you beyond words.",
        "Happy Birthday to the queen of our home! 👑🎂 Thank you for your endless patience and for making our lives so beautiful. Have a wonderful day!"
    ],
    other: [
        "Happy Birthday! 🎂 Wishing you a spectacular year ahead filled with happiness, wonderful opportunities, and sweet memories. 🎉",
        "Warmest wishes on your birthday! ✨ May your special day bring you as much joy and sunshine as you bring to everyone around you.",
        "Happy Birthday! 🎈 Here's to celebrating you and all the amazing things that make you so special. Have a fantastic day!"
    ]
};

// UI Elements mapping
const steps = [
    document.getElementById('step-1'),
    document.getElementById('step-2'),
    document.getElementById('step-3'),
    document.getElementById('step-4')
];
const progressFill = document.getElementById('progressFill');

// Initialize DOM events when loaded
document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    setupGridSelectors();
    setupPhotoUpload();
    setupThemeSelector();
    setupDefaultDate();
    
    // Generate initial avatars based on default female gender
    renderAvatarPresets('female');
});

// Setup date input to default to today
function setupDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('birthdate').value = today;
    wizardState.birthdate = today;
}

// Navigation flow control
function setupNavigation() {
    // Next Step transitions
    document.getElementById('next-1').addEventListener('click', () => {
        const nameVal = document.getElementById('recipientName').value.trim();
        if (!nameVal) {
            alert('Please enter their name first! 😊');
            return;
        }
        wizardState.name = nameVal;
        goToStep(2);
    });

    document.getElementById('next-2').addEventListener('click', () => {
        // If photo isn't loaded, select the active avatar
        if (!wizardState.photo) {
            const selectedAvatar = document.querySelector('.avatar-option.selected');
            if (selectedAvatar) {
                wizardState.photo = selectedAvatar.dataset.url;
            } else {
                // Autoselect the first avatar
                const firstAvatar = document.querySelector('.avatar-option');
                if (firstAvatar) {
                    wizardState.photo = firstAvatar.dataset.url;
                }
            }
        }
        
        // Populate messages dynamically based on relationship
        populateMessagePresets();
        goToStep(3);
    });

    document.getElementById('next-3').addEventListener('click', () => {
        const msg = document.getElementById('customMessage').value.trim();
        const bdate = document.getElementById('birthdate').value;
        if (!msg) {
            alert('Please select or customize a thought! 💖');
            return;
        }
        if (!bdate) {
            alert('Please select a birth date! 🎂');
            return;
        }
        wizardState.message = msg;
        wizardState.birthdate = bdate;
        
        // Load step 4 preview
        updatePreviewCard();
        goToStep(4);
    });

    // Back Step transitions
    document.getElementById('prev-2').addEventListener('click', () => goToStep(1));
    document.getElementById('prev-3').addEventListener('click', () => goToStep(2));
    document.getElementById('prev-4').addEventListener('click', () => goToStep(3));

    // Save and launch surprise
    document.getElementById('generateSurprise').addEventListener('click', () => {
        // Save state to local storage
        localStorage.setItem('birthdaySurpriseConfig', JSON.stringify(wizardState));
        // Redirect to wish page
        window.location.href = 'wish.html';
    });
}

// Step Transition Logic
function goToStep(stepIndex) {
    // Progress fill update
    const percent = stepIndex * 25;
    progressFill.style.width = `${percent}%`;

    // Toggle active step
    steps.forEach((step, idx) => {
        if (idx === (stepIndex - 1)) {
            step.classList.add('active');
        } else {
            step.classList.remove('active');
        }
    });

    // Theme preview on body while building (if Step 3 or 4)
    if (stepIndex >= 3) {
        document.body.className = `theme-${wizardState.theme}`;
    } else {
        document.body.className = 'theme-romantic';
    }
}

// Custom Grid Radio Boxes (Gender, Relation, Theme)
function setupGridSelectors() {
    const gridOptions = document.querySelectorAll('.grid-option');
    gridOptions.forEach(opt => {
        opt.addEventListener('click', (e) => {
            const currentOpt = e.currentTarget;
            const selectType = currentOpt.dataset.type;
            const val = currentOpt.dataset.value;

            // Clear siblings in same category
            const siblings = document.querySelectorAll(`.grid-option[data-type="${selectType}"]`);
            siblings.forEach(sib => sib.classList.remove('selected'));

            // Select clicked
            currentOpt.classList.add('selected');

            // Save state
            if (selectType === 'gender') {
                wizardState.gender = val;
                renderAvatarPresets(val); // Re-render preset avatars for gender
                // Auto change relation emoji / default suggestions if needed
            } else if (selectType === 'relation') {
                wizardState.relation = val;
            }
        });
    });

    // Select default options
    document.querySelector('.grid-option[data-value="female"]').classList.add('selected');
    document.querySelector('.grid-option[data-value="friend"]').classList.add('selected');
}

// Draw custom high-res colored emoji profile pictures on Canvas
function generateEmojiAvatar(emoji, gradientIndex) {
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');
    
    const gradients = [
        ['#ff9a9e', '#fecfef'], // Romantic Pink
        ['#f6d365', '#fda085'], // Sunset Orange
        ['#84fab0', '#8fd3f4'], // Spring Teal
        ['#a18cd1', '#fbc2eb'], // Purple Magic
        ['#ff0844', '#ffb199'], // Warm Red
        ['#fedac2', '#ffa3b1']  // Cream Peach
    ];
    
    const colors = gradients[gradientIndex % gradients.length];
    const grad = ctx.createLinearGradient(0, 0, 160, 160);
    grad.addColorStop(0, colors[0]);
    grad.addColorStop(1, colors[1]);
    
    // Draw background circle
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(80, 80, 80, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw emoji
    ctx.font = '80px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 80, 84);
    
    return canvas.toDataURL('image/png');
}

// Generate dynamic avatars based on gender choice
function renderAvatarPresets(gender) {
    const avatarGrid = document.getElementById('avatarGrid');
    avatarGrid.innerHTML = ''; // Clear previous

    let emojis = [];
    if (gender === 'female') {
        emojis = ['👸', '👧', '👩', '👩‍🦰', '✨'];
    } else if (gender === 'male') {
        emojis = ['👑', '👦', '👨', '👱‍♂️', '🚀'];
    } else {
        emojis = ['🦄', '🐱', '🦊', '🐨', '✨'];
    }

    emojis.forEach((emoji, idx) => {
        const dataUrl = generateEmojiAvatar(emoji, idx);
        
        const opt = document.createElement('div');
        opt.className = 'avatar-option';
        opt.dataset.url = dataUrl;
        if (idx === 0) {
            opt.classList.add('selected');
            if (!wizardState.photo) {
                // Sync initial default
                wizardState.photo = dataUrl;
            }
        }

        const img = document.createElement('img');
        img.src = dataUrl;
        img.alt = `Preset ${idx + 1}`;

        opt.appendChild(img);
        avatarGrid.appendChild(opt);

        opt.addEventListener('click', () => {
            document.querySelectorAll('.avatar-option').forEach(a => a.classList.remove('selected'));
            opt.classList.add('selected');
            wizardState.photo = dataUrl; // Set custom base64
        });
    });
}

// Photo Upload handlers (Drag and Drop / File Input)
function setupPhotoUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const photoInput = document.getElementById('photoInput');
    const previewContainer = document.getElementById('previewContainer');
    const uploadPreview = document.getElementById('uploadPreview');
    const removePhoto = document.getElementById('removePhoto');
    const avatarPresetsBlock = document.getElementById('avatarPresetsBlock');

    uploadArea.addEventListener('click', () => photoInput.click());

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handlePhotoFile(e.dataTransfer.files[0]);
        }
    });

    photoInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            handlePhotoFile(e.target.files[0]);
        }
    });

    removePhoto.addEventListener('click', () => {
        // Clear photo
        wizardState.photo = '';
        photoInput.value = '';
        uploadPreview.src = '';
        
        previewContainer.style.display = 'none';
        uploadArea.style.display = 'block';
        avatarPresetsBlock.style.display = 'block';
        
        // Reset selected avatar preset
        const selected = document.querySelector('.avatar-option.selected');
        if (selected) {
            wizardState.photo = selected.dataset.url;
        }
    });

    function handlePhotoFile(file) {
        if (!file.type.startsWith('image/')) {
            alert('Please select a valid image file! 🖼️');
            return;
        }
        
        // Enforce maximum size (under 2MB to keep localStorage happy)
        if (file.size > 2 * 1024 * 1024) {
            alert('To ensure smooth loading, please upload an image smaller than 2MB! 📁');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            wizardState.photo = dataUrl;
            uploadPreview.src = dataUrl;
            
            // Hide upload area, show preview, hide presets
            uploadArea.style.display = 'none';
            previewContainer.style.display = 'flex';
            avatarPresetsBlock.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
}

// Theme select handlers
function setupThemeSelector() {
    const options = document.querySelectorAll('.grid-option[data-type="theme"]');
    options.forEach(opt => {
        opt.addEventListener('click', (e) => {
            const val = e.currentTarget.dataset.value;
            wizardState.theme = val;
            document.body.className = `theme-${val}`;
        });
    });
}

// Dynamically generate message templates based on selected relationship
function populateMessagePresets() {
    const list = document.getElementById('presetMessages');
    list.innerHTML = ''; // Clear previous

    const relation = wizardState.relation;
    const presets = messageTemplates[relation] || messageTemplates['other'];
    const textarea = document.getElementById('customMessage');

    presets.forEach((msg, idx) => {
        const item = document.createElement('div');
        item.className = 'message-preset-item';
        item.textContent = msg;
        item.title = msg;

        if (idx === 0) {
            // Set default textarea value to the first template
            textarea.value = msg;
            wizardState.message = msg;
        }

        item.addEventListener('click', () => {
            textarea.value = msg;
            wizardState.message = msg;
        });

        list.appendChild(item);
    });
}

// Update the preview card values in step 4
function updatePreviewCard() {
    document.getElementById('miniName').textContent = wizardState.name || 'Name';
    document.getElementById('miniTag').textContent = wizardState.relation.toUpperCase();
    document.getElementById('miniMessage').textContent = wizardState.message || 'Wishes here...';
    document.getElementById('miniAvatar').src = wizardState.photo;
}
