const jwt = require('jsonwebtoken');
const { success, error } = require('./utils/response');

const JWT_SECRET = process.env.JWT_SECRET || 'birthday-surprise-secret-key-12345';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Curriculum of local rules fallbacks for advanced AI actions
const fallbackTemplates = {
    wishes: {
        girlfriend: "Happy Birthday to the one who makes my heart beat faster and my world so much brighter! I love you more every single day. 💕",
        friend: "Happy Birthday buddy! Thanks for always having my back. May this year bring you all the success and happiness you deserve! 🍻",
        sister: "To the best sister in the universe! Thanks for all the sweet childhood memories and for always being my closest support. Have an amazing day! 🎂"
    },
    poems: {
        girlfriend: "A year older, a year more sweet,\nWith you, my life is completely complete.\nYour smile is a flame, your eyes are a star,\nI love you exactly for who you are.\nHappy Birthday, my sweet queen! 💖",
        friend: "Through laughs and sighs, we've walked the mile,\nAnother year to share a smile.\nHappy Birthday to a friend so true,\nHere's to another great year for you! 🌟"
    },
    quotes: {
        other: "“Count your life by smiles, not tears. Count your age by friends, not years.” — John Lennon. Happy Birthday! 💫"
    },
    funny: {
        friend: "Happy Birthday! You’re not getting older... you're just getting closer to those senior citizen discounts! Enjoy your day! 😂"
    },
    romantic: {
        girlfriend: "To my beautiful queen on her birthday: You are my heart, my soul, my today and all of my tomorrows. Wishing you a day as gorgeous as your smile. 😘❤️"
    },
    professional: {
        other: "Wishing you a very Happy Birthday! May this year bring you new professional breakthroughs, exciting opportunities, and great success in all your projects."
    },
    caption: {
        other: "Another orbit around the sun completed! ☀️ Leveling up today. 🎂🎉 #birthdayvibes #levelingup"
    },
    status: {
        other: "It's someone special's birthday today! Send them your warmest love. 🥳🎈✨"
    },
    speech: {
        other: "Ladies and gentlemen, we are gathered here today to celebrate a truly outstanding individual. Over the years, they have brought so much light, laughter, and wisdom into our lives. Let's raise a glass and toast to health, joy, and many more happy years. Happy Birthday!"
    },
    invitation: {
        other: "You're invited to celebrate the birthday bash! Save the date: we're hosting a night of cake, drinks, and unforgettable memories. See you there!"
    },
    hashtags: {
        other: "#HappyBirthday #Celebration #BirthdayVibes #PartyTime #Blessed"
    },

    // ====================================================
    // ADVANCED PLANNING ENGINE FALLBACKS
    // ====================================================
    story: {
        girlfriend: "Once upon a time, in a world full of ordinary moments, I met someone who changed everything. recipient has been my anchor, my spark of joy, and my favorite adventure. Looking back at our memories—from late-night laughs to quiet morning coffee dates—I realize how blessed I am. This birthday is a celebration of the wonderful story we are writing together. Happy Birthday, my love! 💕📖",
        other: "Every year is a chapter in the book of life. For recipient, this chapter represents growth, triumphs over hurdles, and sharing beautiful laughs with those who care. The story of our bond is written in trust, joy, and small kind gestures. Here's to writing the next chapter of your journey!"
    },
    video: {
        other: "[SCENE 1: Warm smile to camera]\nHost: 'Hey everyone! Today is an incredibly special day... it's recipient's birthday!'\n[SCENE 2: Montage of memories slideshow]\nHost (voiceover): 'From the silly laughs to the big milestones, you make every day brighter.'\n[SCENE 3: Raise a cup/cake]\nHost: 'Sending you oceans of love and success. Happy Birthday! Let's make this year unforgettable!' 🎉📽️"
    },
    gift: {
        girlfriend: "Top 3 Luxury Gift Suggestions:\n1. Custom Gold Name Pendant (matching the Royal Theme aesthetic).\n2. Instax Mini Instant Camera (to capture more timeline memory nodes).\n3. Curated Spa Day Gift Voucher (to pamper your queen). 🎁👑",
        other: "Top 3 Gift Suggestions:\n1. Personalized Leather Wallet or Handbag.\n2. Visual Memory Box filled with custom notes.\n3. Premium Noise-Canceling Wireless Earbuds. 🎁"
    },
    plan: {
        other: "Party Itinerary:\n- 10:00 AM: Surprise Birthday Breakfast & flower deliveries.\n- 02:00 PM: Cozy family lunch & memory timeline viewing.\n- 06:00 PM: Envelope unlock reveal ceremony & cake blowout!\n- 08:00 PM: Intimate dinner with friends and toasts. ⏰🥂"
    },
    decor: {
        other: "Decoration Concepts:\n- Luxury Gold: Velvet table runners, warm fairy string lights, gold foil balloons.\n- Minimal: Neutral linen accents, fresh eucalyptus branches, polaroid memory clothesline.\n- Kids/Playful: Bright colorful hanging streamers, bubble generators, balloon arch. 🎈🎨"
    },
    cake: {
        other: "Cake Inspiration:\n- Option 1: Luxury Dual-Layer Belgian Chocolate Truffle Cake with gold foil flakes.\n- Option 2: Pastel Strawberry Chiffon Cake with vanilla frosting and glowing sparkles.\n- Option 3: Cyberpunk Galaxy Mirror-Glaze Cake with neon glowing candles. 🎂"
    },
    budget: {
        other: "Estimated Party Budget (Base 20 guests):\n- Catering/Drinks: $300\n- Custom Cake & Candles: $60\n- Theme Decorations: $80\n- Gift Capsule Items: $100\n-------------------------\nEstimated Total Spend: $540 💰"
    }
};

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return error(res, 'Method not allowed', 405);
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return error(res, 'Unauthenticated. Token missing.', 401);
    }

    const token = authHeader.split(' ')[1];
    try {
        jwt.verify(token, JWT_SECRET);
    } catch (e) {
        return error(res, 'Invalid session token.', 401);
    }

    const { recipientName, relation, category } = req.body;

    if (!recipientName || !relation || !category) {
        return error(res, 'Missing generation inputs.', 400);
    }

    // ====================================================
    // GEMINI REST API INTEGRATION
    // ====================================================
    if (GEMINI_API_KEY) {
        try {
            let stylePrompt = `a creative ${category}`;
            if (category === 'story') stylePrompt = 'an emotional, tear-jerker memory lane story';
            else if (category === 'video') stylePrompt = 'a detailed birthday video greeting script with scenes and camera directions';
            else if (category === 'gift') stylePrompt = 'a personalized list of 3 premium gift suggestions based on age and interests';
            else if (category === 'plan') stylePrompt = 'a full chronological birthday celebration planner itinerary';
            else if (category === 'decor') stylePrompt = 'a theme decoration board guideline containing colors, balloons, and setups';
            else if (category === 'cake') stylePrompt = 'a custom designer cake concept, listing flavors and layering designs';
            else if (category === 'budget') stylePrompt = 'a guest budget planner containing cost lines (food, cake, decor) in a clean text table';

            const prompt = `Generate ${stylePrompt} for my ${relation} whose name is "${recipientName}". Output only the direct result text itself. Do not include any intro, prefaces, conversational responses, or meta-labels. Just output the clean text.`;

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [
                        { parts: [{ text: prompt }] }
                    ]
                })
            });

            const data = await response.json();
            
            if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
                const aiResult = data.candidates[0].content.parts[0].text.trim();
                return success(res, { text: aiResult }, 'Content generated by Gemini AI.', 200);
            } else {
                console.error("Gemini structure error:", JSON.stringify(data));
            }
        } catch (err) {
            console.error('Gemini API fetch error:', err);
        }
    }

    // ====================================================
    // RULES ENGINE FALLBACK (Curated templates)
    // ====================================================
    const categoryDict = fallbackTemplates[category] || fallbackTemplates['wishes'];
    let textResult = categoryDict[relation] || categoryDict['other'] || fallbackTemplates['wishes']['friend'];
    
    // Replace placeholder name if applicable
    textResult = textResult.replace(/recipient/g, recipientName);

    return success(res, { text: textResult, isFallback: true }, 'Content loaded from curated template library.', 200);
};
