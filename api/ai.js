const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });
require('dotenv').config();

const { success, error } = require('./utils/response');
const { checkRateLimit } = require('./utils/rateLimiter');
const { getUserIdFromRequest } = require('./utils/auth');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Curriculum of local rules fallbacks for advanced AI actions
const fallbackTemplates = {
    wishes: {
        girlfriend: "Happy Birthday to the one who makes my heart beat faster and my world so much brighter! I love you more every single day. 💕",
        boyfriend: "To my amazing guy on his birthday! You are my rock, my partner in crime, and my absolute favorite person. Happy Birthday! 💖",
        friend: "Happy Birthday buddy! Thanks for always having my back. May this year bring you all the success and happiness you deserve! 🍻",
        sister: "To the best sister in the universe! Thanks for all the sweet childhood memories and for always being my closest support. Have an amazing day! 🎂",
        brother: "Happy Birthday to the coolest brother! Thanks for being my lifetime teammate and partner in crime. Cheers to another year of laughs! 🍕",
        parents: "Happy Birthday! Thank you for your endless love, guidance, and support. Wishing you a day filled with relaxation and joy! ❤️",
        other: "“Count your life by smiles, not tears. Count your age by friends, not years.” — John Lennon. Happy Birthday! 💫"
    },
    romantic: {
        girlfriend: "To my beautiful queen on her birthday: You are my heart, my soul, my today and all of my tomorrows. Wishing you a day as gorgeous as your smile. 😘❤️",
        boyfriend: "Happy Birthday to the man of my dreams! You fill my life with laughter and my heart with pure happiness. I love you, handsome! 💕",
        other: "Wishing the love of my life a birthday as wonderful as they are. You make every single moment feel like a fairy tale. 💖"
    },
    funny: {
        friend: "Happy Birthday! You’re not getting older... you're just getting closer to those senior citizen discounts! Enjoy your day! 😂",
        brother: "Happy Birthday! I'm pretty sure I got all the good looks in the family, but hey, you got the good personality! Have a blast! 😜",
        sister: "Happy Birthday to the sibling who is almost as cool as I am. Almost. Keep dreaming! 😉🎉",
        other: "Happy Birthday! Another year older, wiser, and still no closer to acting like an actual adult. Cheers to never growing up! 🥂"
    },
    professional: {
        other: "Wishing you a very Happy Birthday! May this year bring you new professional breakthroughs, exciting opportunities, and great success in all your projects. 💼📈"
    },
    poetic: {
        other: "A year of grace, a chapter brand new,\nMay skies ahead be bright and blue.\nA canvas clean for you to paint,\nWith joy that knows no cold constraint.\nHappy Birthday! 🌟📜"
    },
    story: {
        girlfriend: "Once upon a time, in a world full of ordinary moments, I met someone who changed everything. recipient has been my anchor, my spark of joy, and my favorite adventure. Looking back at our memories—from late-night laughs to quiet morning coffee dates—I realize how blessed I am. This birthday is a celebration of the wonderful story we are writing together. Happy Birthday, my love! 💕📖",
        other: "Every year is a chapter in the book of life. For recipient, this chapter represents growth, triumphs over hurdles, and sharing beautiful laughs with those who care. The story of our bond is written in trust, joy, and small kind gestures. Here's to writing the next chapter of your journey!"
    },
    video: {
        other: "[SCENE 1: Warm smile to camera]\nHost: 'Hey everyone! Today is an incredibly special day... it's recipient's birthday!'\n[SCENE 2: Montage of memories slideshow]\nHost (voiceover): 'From the silly laughs to the big milestones, you make every day brighter.'\n[SCENE 3: Raise a cup/cake]\nHost: 'Sending you oceans of love and success. Happy Birthday! Let's make this year unforgettable!' 🎉📽️"
    },
    gift: {
        girlfriend: "Top 3 Luxury Gift Suggestions:\n1. Custom Gold Name Pendant (matching the Royal Theme aesthetic). [Price: $120] (Link: https://www.amazon.com/s?k=gold+name+pendant) - A personal piece of jewelry they'll wear every day.\n2. Instax Mini Instant Camera [Price: $80] (Link: https://www.amazon.com/s?k=instax+mini+camera) - To capture more timeline memory nodes.\n3. Curated Spa Day Gift Voucher [Price: $150] (Link: https://www.amazon.com/s?k=spa+gift+card) - To pamper your queen.",
        boyfriend: "Top 3 Luxury Gift Suggestions:\n1. Premium Leather Wallet [Price: $45] (Link: https://www.amazon.com/s?k=leather+wallet) - Sleek and practical everyday item.\n2. Noise-Canceling Wireless Earbuds [Price: $99] (Link: https://www.amazon.com/s?k=wireless+earbuds) - Perfect for their daily music and calls.\n3. Custom Docking Station [Price: $35] (Link: https://www.amazon.com/s?k=wooden+docking+station) - To keep their desk organized.",
        friend: "Top 3 Gift Suggestions:\n1. Custom Mug & Coffee Blend [Price: $25] (Link: https://www.amazon.com/s?k=custom+mug) - For their morning fuel.\n2. Retro Board Game [Price: $30] (Link: https://www.amazon.com/s?k=board+game) - For your next game night.\n3. Portable Bluetooth Speaker [Price: $40] (Link: https://www.amazon.com/s?k=bluetooth+speaker) - Bring the music anywhere.",
        sister: "Top 3 Gift Suggestions:\n1. Scented Candle Gift Set [Price: $30] (Link: https://www.amazon.com/s?k=scented+candles) - Cozy and relaxing vibes.\n2. Personalized Sketchbook or Planner [Price: $20] (Link: https://www.amazon.com/s?k=custom+planner) - For their dreams and doodles.\n3. Cozy Silk Pajama Set [Price: $50] (Link: https://www.amazon.com/s?k=silk+pajamas) - Ultimate comfort luxury.",
        brother: "Top 3 Gift Suggestions:\n1. Gaming Headset [Price: $60] (Link: https://www.amazon.com/s?k=gaming+headset) - Clear audio for long gaming sessions.\n2. Smart Water Bottle [Price: $35] (Link: https://www.amazon.com/s?k=smart+water+bottle) - To keep them hydrated at the gym.\n3. Graphic Tee of their favorite show [Price: $22] (Link: https://www.amazon.com/s?k=graphic+tee) - Fun and casual style.",
        parents: "Top 3 Gift Suggestions:\n1. Digital Photo Frame [Price: $99] (Link: https://www.amazon.com/s?k=digital+photo+frame) - Preloaded with family timeline memories.\n2. Premium Tea or Coffee Sampler [Price: $35] (Link: https://www.amazon.com/s?k=tea+sampler) - Gourmet morning blends.\n3. Orthopedic Massage Pillow [Price: $40] (Link: https://www.amazon.com/s?k=massage+pillow) - Relaxation and neck relief.",
        other: "Top 3 Gift Suggestions:\n1. Personalized Leather Notebook [Price: $20] (Link: https://www.amazon.com/s?k=leather+notebook) - To jot down notes and plans.\n2. Visual Memory Box filled with custom notes [Price: $15] (Link: https://www.amazon.com/s?k=memory+box) - Heartfelt and unique.\n3. Premium Ceramic Mug [Price: $18] (Link: https://www.amazon.com/s?k=ceramic+mug) - Sleek and cozy. 🎁"
    },
    plan: {
        other: "Party Itinerary:\n- 10:00 AM: Surprise Birthday Birthday Breakfast & flower deliveries.\n- 02:00 PM: Cozy family lunch & memory timeline viewing.\n- 06:00 PM: Envelope unlock reveal ceremony & cake blowout!\n- 08:00 PM: Intimate dinner with friends and toasts. ⏰🥂"
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

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown-ip';
    if (!checkRateLimit(ip, 10)) {
        return error(res, 'Too many requests. Please wait a minute before generating again.', 429);
    }

    const { recipientName, relation, category } = req.body || {};

    if (!recipientName || !relation || !category) {
        return error(res, 'Missing generation inputs.', 400);
    }

    const publicCategories = [
        'wishes', 'gift', 'funny', 'romantic', 'professional', 'poetic', 
        'brother', 'sister', 'friend', 'parents', 'story', 'poems'
    ];

    const isPublicCategory = publicCategories.includes(category);

    const userId = getUserIdFromRequest(req);
    const isAuthenticated = !!userId;

    if (!isAuthenticated && !isPublicCategory) {
        return error(res, 'Session expired or invalid token. Please log in again.', 401);
    }

    // ====================================================
    // GEMINI REST API INTEGRATION
    // ====================================================
    if (GEMINI_API_KEY) {
        try {
            let stylePrompt = `a creative ${category}`;
            if (category === 'story') stylePrompt = 'an emotional, tear-jerker memory lane story';
            else if (category === 'video') stylePrompt = 'a detailed birthday video greeting script with scenes and camera directions';
            else if (category === 'gift') stylePrompt = 'a personalized list of 3 premium gift suggestions based on age and interests, specifying price ranges and mock Buy Links';
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
}
