import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { createRequire } from 'module';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

export interface AiGeneratedReelContent {
    title: string;
    caption: string;
    hashtags: string[];
}

export async function generateAiContent(prompt: string): Promise<string> {
    try {
        const content = await generateReelContent(prompt);
        return JSON.stringify(content);
    } catch {
        return prompt;
    }
}

/**
 * Generate viral title, caption, and hashtag set using Gemini / OpenAI or smart AI fallback engine
 */
export const generateReelContent = async (
    topicOrUrl: string,
    customGeminiKey?: string,
    customOpenAiKey?: string
): Promise<AiGeneratedReelContent> => {
    const input = topicOrUrl.trim();
    const geminiKey = customGeminiKey || process.env.GEMINI_API_KEY;
    const openAiKey = customOpenAiKey || process.env.OPENAI_API_KEY;

    logger.info(`[AI] Generating Reel content for input: "${input}"`);

    // 1. Try Gemini API if key is available
    if (geminiKey) {
        try {
            const prompt = `You are a social media viral growth expert. Generate viral short-form video content details for: "${input}".
Return JSON strictly in this format:
{
  "title": "Short punchy click-worthy title under 70 chars",
  "caption": "Engaging hook caption with 2-3 sentences explaining why people must watch",
  "hashtags": ["viral", "trending", "reels", "ai", "short"]
}`;
            const res = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
                {
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { responseMimeType: 'application/json' },
                }
            );
            const jsonText = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (jsonText) {
                const cleanJson = jsonText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
                const parsed = JSON.parse(cleanJson);
                return {
                    title: parsed.title || input,
                    caption: parsed.caption || `Check out this amazing video about ${input}!`,
                    hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : ['viral', 'reels', 'trending'],
                };
            }
        } catch (err: any) {
            const detail = err?.response?.data?.error?.message || err?.message;
            logger.warn(`[AI] Gemini API call failed: ${detail}`);
        }
    }

    // 2. Try OpenAI API if key is available
    if (openAiKey) {
        try {
            const res = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: 'gpt-3.5-turbo',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a viral social media manager. Respond only in JSON with keys "title", "caption", and "hashtags" (array of 5 strings).',
                        },
                        {
                            role: 'user',
                            content: `Generate viral Reel title, caption, and hashtags for topic: "${input}"`,
                        },
                    ],
                    response_format: { type: 'json_object' },
                },
                { headers: { Authorization: `Bearer ${openAiKey}` } }
            );
            const content = res.data?.choices?.[0]?.message?.content;
            if (content) {
                const parsed = JSON.parse(content);
                return {
                    title: parsed.title || input,
                    caption: parsed.caption || `Watch till the end! #viral`,
                    hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : ['viral', 'trending', 'shorts'],
                };
            }
        } catch (err: any) {
            logger.warn(`[AI] OpenAI API call failed, using AI fallback engine: ${err?.message}`);
        }
    }

    // 3. High-quality rule-based AI content engine fallback
    const cleanTopic = input.replace(/^https?:\/\/[^\s]+/i, 'this trending video').replace(/[^a-zA-Z0-9\s]/g, '');
    const subject = cleanTopic.length > 3 ? cleanTopic : 'Viral Short';

    return {
        title: `🔥 Mind-Blowing ${subject.slice(0, 50)}! You Won't Believe This!`,
        caption: `Wait till you see this incredible moment! 😱 Drop a comment below if this blew your mind. Don't forget to save & share with a friend!`,
        hashtags: ['viral', 'trending', 'reels', 'fyp', 'explore', 'ai', 'shorts'],
    };
};

export interface AiSubtitleCue {
    id: number;
    startTime: string;
    endTime: string;
    text: string;
    highlightWord: string;
}

/**
 * Generate viral Alex Hormozi-style subtitle timestamp cues with kinetic word highlighting
 */
export const generateAutoSubtitles = async (
    textOrScript: string
): Promise<{ subtitles: AiSubtitleCue[]; stylePreset: string }> => {
    const words = textOrScript.trim().split(/\s+/).filter(Boolean);
    const cues: AiSubtitleCue[] = [];
    const wordsPerCue = 3;
    let currentTimeMs = 0;

    for (let i = 0; i < words.length; i += wordsPerCue) {
        const group = words.slice(i, i + wordsPerCue);
        const text = group.join(' ');
        const durationMs = Math.max(1200, group.length * 400);
        
        const startSec = (currentTimeMs / 1000).toFixed(1);
        const endSec = ((currentTimeMs + durationMs) / 1000).toFixed(1);
        const highlightWord = group[Math.floor(Math.random() * group.length)]?.toUpperCase() || group[0]?.toUpperCase() || '';

        cues.push({
            id: cues.length + 1,
            startTime: `${startSec}s`,
            endTime: `${endSec}s`,
            text,
            highlightWord: highlightWord.replace(/[^A-Z0-9]/gi, ''),
        });

        currentTimeMs += durationMs;
    }

    if (cues.length === 0) {
        cues.push({
            id: 1,
            startTime: '0.0s',
            endTime: '2.5s',
            text: 'WATCH TILL THE END!',
            highlightWord: 'WATCH',
        });
    }

    return {
        subtitles: cues,
        stylePreset: 'hormozi-yellow-bold',
    };
};

export interface AiThumbnailConcept {
    headline: string;
    subhead: string;
    badgeText: string;
    bgGradient: string;
    textColor: string;
    accentColor: string;
}

/**
 * Generate 9:16 high-CTR Vertical Reel Thumbnail concept & overlay design
 */
export const generateThumbnailConcept = async (
    title: string,
    caption?: string
): Promise<AiThumbnailConcept> => {
    const cleanTitle = title.trim().toUpperCase();
    const words = cleanTitle.split(' ');
    
    const headline = words.slice(0, 4).join(' ') || 'MUST WATCH!';
    const subhead = words.length > 4 ? words.slice(4, 9).join(' ') : (caption?.slice(0, 30) || 'SECRET TIP REVEALED');

    const gradients = [
        'from-purple-900 via-indigo-900 to-slate-950',
        'from-amber-600 via-rose-700 to-slate-950',
        'from-emerald-700 via-teal-900 to-slate-950',
        'from-blue-600 via-indigo-900 to-purple-950',
    ];

    const accents = ['#FACC15', '#EF4444', '#10B981', '#3B82F6', '#F43F5E'];

    return {
        headline,
        subhead,
        badgeText: '🔥 VIRAL REEL',
        bgGradient: gradients[Math.floor(Math.random() * gradients.length)],
        textColor: '#FFFFFF',
        accentColor: accents[Math.floor(Math.random() * accents.length)],
    };
};

// ─── AI IMAGE GENERATION ───────────────────────────────────────────────────

export interface AiImageResult {
    imagePath: string;   // local absolute path
    imageUrl: string;    // public URL to serve
    imagePrompt: string;
}

/**
 * Generate an image using Gemini Imagen API.
 * Tries imagen-3.0-generate-002 first, then falls back to
 * gemini-2.0-flash-preview-image-generation.
 * Saves the image to uploads/ai-images/ and returns path + public URL.
 */
export const generateAiImage = async (
    imagePrompt: string,
    geminiKey?: string
): Promise<AiImageResult> => {
    const apiKey = geminiKey || process.env.GEMINI_API_KEY;
    const aiImagesDir = path.join(config.UPLOAD_DIR, 'ai-images');
    fs.mkdirSync(aiImagesDir, { recursive: true });

    const fileName = `${randomUUID()}.png`;
    const imagePath = path.join(aiImagesDir, fileName);
    const imageUrl = `/uploads/ai-images/${fileName}`;

    // 1. High-Quality Photorealistic AI Image Generator (Pollinations FLUX / SDXL)
    try {
        const cleanPrompt = encodeURIComponent(imagePrompt.slice(0, 1200));
        const pollinationsUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=1080&height=1080&nologo=true&seed=${Math.floor(Math.random() * 999999)}`;
        logger.info(`[AI Image] Generating high-resolution AI image...`);
        const imgRes = await axios.get(pollinationsUrl, {
            responseType: 'arraybuffer',
            timeout: 35000,
        });

        if (imgRes.data && imgRes.data.length > 5000) {
            fs.writeFileSync(imagePath, Buffer.from(imgRes.data));
            logger.info(`[AI Image] Photorealistic AI image generated successfully: ${imagePath} (${imgRes.data.length} bytes)`);
            return { imagePath, imageUrl, imagePrompt };
        }
    } catch (pollErr: any) {
        logger.warn(`[AI Image] Pollinations AI generator note: ${pollErr?.message}`);
    }

    // 2. Try Gemini Imagen 3 if Gemini API key is provided
    if (apiKey) {
        try {
            const imagen3Url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;
            const res = await axios.post(imagen3Url, {
                instances: [{ prompt: imagePrompt }],
                parameters: { sampleCount: 1, aspectRatio: '1:1' },
            }, { timeout: 35000 });

            const b64 = res.data?.predictions?.[0]?.bytesBase64Encoded as string | undefined;
            if (b64) {
                fs.writeFileSync(imagePath, Buffer.from(b64, 'base64'));
                logger.info(`[AI Image] Imagen 3 generated image: ${imagePath}`);
                return { imagePath, imageUrl, imagePrompt };
            }
        } catch (err: any) {
            logger.warn(`[AI Image] Imagen 3 note: ${err?.response?.data?.error?.message ?? err?.message}`);
        }
    }

    // 3. Fallback: High-resolution Unsplash photo
    try {
        const keywords = imagePrompt.split(' ').slice(0, 3).join(',');
        const unsplashUrl = `https://source.unsplash.com/1080x1080/?${encodeURIComponent(keywords)}`;
        const imgRes = await axios.get(unsplashUrl, {
            responseType: 'arraybuffer',
            timeout: 15000,
            maxRedirects: 5,
        });
        if (imgRes.data && imgRes.data.length > 3000) {
            fs.writeFileSync(imagePath, Buffer.from(imgRes.data));
            logger.info(`[AI Image] Stock photo fallback saved: ${imagePath}`);
            return { imagePath, imageUrl, imagePrompt };
        }
    } catch (unErr: any) {
        logger.warn(`[AI Image] Stock photo note: ${unErr?.message}`);
    }

    // 4. Guaranteed valid 1080x1080 raster PNG (never SVG, since Facebook rejects SVGs)
    const validPngBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAABAAAAAQACAIAAADwf7zUAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAADISURBVHhe7cExAQAAAMKg9U9tCF8gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgD8H/wAB3/8m0QAAAABJRU5ErkJggg==',
        'base64'
    );
    fs.writeFileSync(imagePath, validPngBuffer);
    logger.info(`[AI Image] Fallback PNG saved: ${imagePath}`);
    return { imagePath, imageUrl, imagePrompt };
};


/**
 * Generate viral topic ideas tailored to a Facebook page name.
 */
export const suggestTopicsForPage = async (
    pageName: string,
    geminiKey?: string
): Promise<string[]> => {
    const apiKey = geminiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return [
            `${pageName} - Daily Highlights & Tips`,
            `Trending Viral Moments on ${pageName}`,
            `Must-Know Hacks & Insights for ${pageName} Fans`,
            `Behind the Scenes & Exclusive Tips`,
            `Top Trends & Creative Inspiration`,
        ];
    }

    try {
        const prompt = `You are a social media growth strategist. The user's Facebook Page is named: "${pageName}".
Generate 5 highly engaging, viral, specific image post topic ideas strictly tailored to the theme and audience implied by this page name.
Return JSON strictly in this format:
{
  "topics": [
    "Specific Viral Topic 1",
    "Specific Viral Topic 2",
    "Specific Viral Topic 3",
    "Specific Viral Topic 4",
    "Specific Viral Topic 5"
  ]
}`;
        const res = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: 'application/json' },
            },
            { timeout: 20000 }
        );
        const jsonText = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (jsonText) {
            const parsed = JSON.parse(jsonText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim());
            if (Array.isArray(parsed.topics) && parsed.topics.length > 0) {
                return parsed.topics;
            }
        }
    } catch (err: any) {
        logger.warn(`[AI Topics] Gemini suggestTopicsForPage failed: ${err?.message}`);
    }

    return [
        `${pageName} - Daily Viral Spotlight`,
        `Top Tips & Insights for ${pageName}`,
        `Trending Highlights`,
        `Inspirational Moments`,
        `Did You Know? Facts & Hacks`,
    ];
};

let _agentAiConfig: { apiKey?: string; model?: string; baseUrl?: string } | null = null;

function getAgentAiConfig(): { apiKey?: string; model?: string; baseUrl?: string } {
    if (_agentAiConfig) return _agentAiConfig;
    try {
        const require = createRequire(import.meta.url);
        const agentConfig = require('/root/projects/agents/config.js');
        _agentAiConfig = agentConfig?.ai || {};
    } catch {
        _agentAiConfig = {};
    }
    return _agentAiConfig;
}

const VIRAL_TRENDING_SEEDS = [
    'ultra satisfying moments', 'impossible comeback', 'pets doing something hilarious',
    'wait for it shock ending', 'world record attempt fails', 'instant karma',
    'rare animal encounter', 'funny kids', 'extreme water slide', 'mind blown facts',
    'oddly satisfying cooking', 'mother nature surprising deal', 'glow up transformation',
    'street food secrets', 'emotional reunion', 'science experiment gone right',
];

/**
 * Generate 8 trending short-video keyword ideas, using Gemini when available
 * and the agent AI provider (opencode-zen) otherwise.
 */
export const suggestViralTopics = async (
    seed: string,
    pageName: string
): Promise<string[]> => {
    const geminiKey = process.env.GEMINI_API_KEY;
    const apiKey = geminiKey || getAgentAiConfig().apiKey;
    const seedText = seed.trim();

    // 1. Gemini
    if (geminiKey) {
        try {
            const prompt = `You are a short-form video trend strategist. Based on the theme "${pageName}"${seedText ? ` and the angle "${seedText}"` : ''}, suggest 8 high-retention viral short-video keyword ideas (short phrases a content creator would search on YouTube Shorts to find clips to repost).
Return JSON strictly: {"topics":["topic 1", ... 8 topics]}`;
            const res = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
                { contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json' } },
                { timeout: 20000 }
            );
            const jsonText = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (jsonText) {
                const parsed = JSON.parse(jsonText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim());
                if (Array.isArray(parsed.topics) && parsed.topics.length > 0) return parsed.topics.slice(0, 8);
            }
        } catch {
            // fall through to agent provider
        }
    }

    // 2. Agent AI provider (opencode-zen / deepseek)
    if (apiKey) {
        const cfg = getAgentAiConfig();
        const baseUrl = cfg.baseUrl || 'https://opencode.ai/zen/v1';
        const models = [
            (cfg.model as string) || 'deepseek-v4-flash-free',
            'nemotron-3-ultra-free',
            'mimo-v2.5-free',
            'gemini-3.5-flash-lite',
            'claude-haiku-4-5',
        ];
        const system = 'You are a short-form video trend strategist. Reply with only valid JSON.';
        const user = `Based on the theme "${pageName}"${seedText ? ` and the angle "${seedText}"` : ''}, suggest 8 high-retention viral short-video keyword ideas (short search phrases for YouTube Shorts, real-world clips a creator reposts). Return exactly: {"topics":["...", ... 8 items]}`;

        for (const model of models) {
            try {
                const payload: any = {
                    model,
                    temperature: 0.9,
                    messages: [
                        { role: 'system', content: system },
                        { role: 'user', content: user },
                    ],
                    response_format: { type: 'json_object' },
                };
                const res = await axios.post(
                    `${baseUrl.replace(/\/$/, '')}/chat/completions`,
                    payload,
                    {
                        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                        timeout: 30000,
                    }
                );
                const msg = res.data?.choices?.[0]?.message;
                let content = typeof msg?.content === 'string' ? msg.content : '';
                if (Array.isArray(msg?.content)) content = msg.content.map((p: any) => p?.text || '').join('');
                if (content) {
                    const cleaned = String(content).replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
                    const start = cleaned.indexOf('{');
                    const end = cleaned.lastIndexOf('}');
                    const jsonText = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
                    const parsed = JSON.parse(jsonText);
                    if (Array.isArray(parsed.topics) && parsed.topics.length > 0) return parsed.topics.slice(0, 8);
                }
            } catch (err: any) {
                logger.warn(`[AI Topics] Agent model "${model}" failed: ${err?.message}`);
            }
        }
    }

    // 3. Fallback: seed-aware guidelines so suggestions stay relevant without an API key
    const results = [...VIRAL_TRENDING_SEEDS];
    if (seedText) {
        const stem = seedText.replace(/[^a-z0-9\s]/gi, '').trim().toLowerCase().split(/\s+/).filter(Boolean);
        const unique = [...new Set(stem)].join(' ');
        const ck = (prefix: string, suffix = '') => {
            const pref = prefix.split(/\s+/).filter((w) => !unique.includes(w)).join(' ');
            return `${pref} ${unique}${suffix}`.replace(/\s+/g, ' ').trim();
        };
        const combos = [ck('funny'), ck('crazy'), ck('ultra satisfying'), ck('', ' moments'), ck('', ' that went wrong'), ck('best', ' compilation'), ck('unbelievable'), ck('wait for it')];
        results.splice(0, combos.length - 1, ...combos);
    }
    const pageStem = pageName === 'Viral Videos' ? 'viral' : pageName.replace(/[^a-zA-Z0-9\s]/g, '').trim() || 'viral';
    if (!results.some((t) => t.toLowerCase().includes(pageStem))) results[results.length - 1] = `trending ${pageStem} clips`;
    return results.slice(0, 8);
};

export interface AiImagePostResult {
    title: string;
    caption: string;
    hashtags: string[];
    imagePrompt: string;
    imagePath: string;
    imageUrl: string;
}

export interface AiImagePostOptions {
    topic: string;
    geminiKey?: string;
    pageName?: string;
    stylePreset?: string;
    brandName?: string;
    brandRole?: string;
    brandHandle?: string;
    directorPrompt?: string;
    variationIndex?: number;
    totalVariations?: number;
}

export const MASTER_CREATIVE_DIRECTOR_PROMPT = `# MASTER AI IMAGE & POST PROMPT
You are an elite AI Creative Director, Visual Strategist, and Copywriter.
Your task is to invent an original visual concept and generate:
1. A production-ready FLUX/SDXL image generation prompt for Gemini.
2. An engaging social media title/hook, caption, and hashtags for {platform}.

### CONTEXT & BRANDING:
- Topic / Focus: {topic}
- Creator Name: {brand_name}
- Creator Role: {brand_role}
- Watermark Signature: {brand_handle}

### INSTRUCTIONS:
- When topic is "auto" or broad, invent a fresh, viral, high-value visual concept.
- Image Prompt: Be descriptive about subjects, composition, camera angle, cinematic lighting, colors, and 8k detail.
- Title: Punchy, scroll-stopping headline with 1-2 emojis (under 70 chars).
- Caption: High-engagement 2-3 sentences with a question that drives comments.
- Hashtags: 5-8 relevant trending hashtags.

### OUTPUT FORMAT (Strictly JSON):
{
  "title": "Viral Hook / Headline with emojis",
  "concept": "1-2 sentence description of the creative concept",
  "imagePrompt": "Full detailed FLUX/SDXL prompt (lighting, composition, style, 8k resolution)",
  "caption": "Short engaging caption with a question to drive audience comments",
  "hashtags": ["AI", "Tech", "Innovation", "CodeByJawad"]
}`;

/**
 * Full pipeline: given a topic, master prompt, and branding options,
 * generate title/caption/hashtags + tailored AI image prompt with Gemini, then generate the image.
 */
export const generateAiImagePost = async (
    optionsOrTopic: string | AiImagePostOptions,
    geminiKey?: string,
    pageName?: string
): Promise<AiImagePostResult> => {
    const opts: AiImagePostOptions = typeof optionsOrTopic === 'string'
        ? { topic: optionsOrTopic, geminiKey, pageName }
        : optionsOrTopic;

    const apiKey = opts.geminiKey || process.env.GEMINI_API_KEY;
    const effectivePageName = opts.pageName || 'Tech & Creativity';
    const displayName = opts.brandName || 'Muhammad Jawad Iqbal Khan';
    const displayRole = opts.brandRole || 'Full-Stack Developer & Automation Engineer';
    const displayHandle = opts.brandHandle || 'CodeByJawad';
    const varIdx = opts.variationIndex || 1;
    const totalVars = opts.totalVariations || 1;

    let effectiveTopic = opts.topic?.trim() || '';
    const isAuto = !effectiveTopic || effectiveTopic.toLowerCase().includes('auto');
    const topicLabel = isAuto ? 'Autonomous AI, Tech & Future of Architecture' : effectiveTopic;

    logger.info(`[AI ImagePost] Generating post #${varIdx}/${totalVars} | Topic: "${topicLabel}" | Brand: "${displayName}" | Key: ${apiKey ? 'Yes' : 'No'}`);

    let title = `🚀 ${topicLabel} (Variation #${varIdx})`;
    let concept = `An innovative exploration of ${topicLabel}.`;
    let caption = `Crafting digital systems with precision. What are you focusing on today? 💫`;
    let hashtags = ['TechInnovation', 'AI', 'FullStack', 'Automation', 'CodeByJawad'];
    let imagePrompt = `High-end photorealistic studio composite for ${topicLabel}, cinematic lighting, 8k resolution, modern minimalist layout with subtle signature badge '${displayName} | ${displayRole}' [${displayHandle}].`;

    // 1. If Gemini API Key is provided, ask Gemini for a unique, creative campaign
    if (apiKey) {
        try {
            let userPromptText = (opts.directorPrompt || '').trim();
            const hasJsonStructure = userPromptText.includes('JSON') || userPromptText.includes('{') || userPromptText.includes('OUTPUT FORMAT');

            let finalPrompt = '';
            if (userPromptText && !hasJsonStructure && userPromptText.length > 20) {
                // User entered a direct custom scene prompt (e.g. "The person seated in a 1920s speakeasy...")
                finalPrompt = `You are an elite AI Image Prompt Engineer and Social Media Strategist.
The user wants to create an AI image and social post based on this exact creative scene description:
"""
${userPromptText}
"""
Context / Branding:
- Creator Name: ${displayName}
- Creator Role: ${displayRole}
- Watermark Handle: ${displayHandle}
${effectiveTopic ? `- Additional Topic Focus: ${effectiveTopic}` : ''}

INSTRUCTIONS:
1. "imagePrompt": Keep and enhance the user's exact visual scene, clothing, era (e.g. 1920s speakeasy), lighting, camera style, mood, and 8K photorealistic quality. Do not replace it with unrelated tech concepts.
2. "title": Create a catchy, intriguing headline/hook matching this exact scene with 1-2 emojis.
3. "caption": Write a smooth, engaging 2-3 sentence social media caption matching this theme, ending with an interesting question to get comments.
4. "hashtags": 5-8 relevant aesthetic and thematic hashtags.

Return strictly valid JSON in this structure:
{
  "title": "Title with emoji",
  "concept": "1-2 sentence description of the scene metaphor",
  "imagePrompt": "Enhanced, ultra-detailed FLUX/SDXL production prompt faithful to the user's scene (8k resolution, cinematic lighting)",
  "caption": "Engaging caption with question",
  "hashtags": ["vintage", "1920s", "cinematic", "editorial"]
}`;
            } else {
                let systemPromptTemplate = userPromptText || MASTER_CREATIVE_DIRECTOR_PROMPT;
                finalPrompt = systemPromptTemplate
                    .replace(/{brand_name}/g, displayName)
                    .replace(/{brand_role}/g, displayRole)
                    .replace(/{brand_handle}/g, displayHandle)
                    .replace(/{topic}/g, isAuto ? 'Trending Visual Aesthetics & Innovation' : effectiveTopic)
                    .replace(/{platform}/g, 'Facebook');
            }

            if (totalVars > 1) {
                finalPrompt += `\n\n[VARIATION INSTRUCTION]: This is Variation #${varIdx} of ${totalVars}. You MUST invent a completely UNIQUE, fresh angle, different headline, different visual metaphor/lighting/composition, and different caption compared to other variations.`;
            }

            const res = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
                {
                    contents: [{ parts: [{ text: finalPrompt }] }],
                    generationConfig: {
                        responseMimeType: 'application/json',
                        temperature: Math.min(1.0, 0.85 + (varIdx * 0.05)),
                    },
                },
                { timeout: 25000 }
            );

            const jsonText = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (jsonText) {
                const parsed = JSON.parse(jsonText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim());
                title = parsed.title || parsed.ideaTitle || title;
                concept = parsed.concept || concept;
                caption = parsed.caption || caption;
                hashtags = Array.isArray(parsed.hashtags) ? parsed.hashtags : hashtags;
                imagePrompt = parsed.imagePrompt || imagePrompt;
            }
        } catch (err: any) {
            logger.warn(`[AI ImagePost] Gemini LLM generation note: ${err?.message}`);
        }
    } else {
        // 2. Dynamic multi-angle synthesizer when no Gemini key is set yet
        const angles = [
            {
                hook: `✨ The Architecture of ${isAuto ? 'Modern Cloud Systems' : effectiveTopic}`,
                concept: `Visualizing scalable backend microservices and reactive pipelines.`,
                caption: `True engineering isn't just writing code—it's designing living systems that scale effortlessly. Where is your focus this week? 🔥`,
                prompt: `Ultra-premium creative personal branding poster for ${displayName} (${displayRole}). On the left: crisp cinematic studio portrait of an intelligent confident professional with warm directional rim lighting. On the right: translucent glowing neural network blueprint and floating cloud architecture diagram merging seamlessly. Deep graphite and cyber cyan atmosphere, subtle editorial badge '${displayName} | ${displayRole}', signature watermark '${displayHandle}'. 8k resolution, Hasselblad studio photography.`
            },
            {
                hook: `⚡ Quick Cheat Sheet: ${isAuto ? 'High-Performance Automation' : effectiveTopic}`,
                concept: `Clean visual developer guide with dark mode glassmorphism accents.`,
                caption: `Bookmark this for later! Here are the core architectural patterns you need to know. Which one is your favorite? 👇`,
                prompt: `Sleek modern infographic tech card. Dark mode glassmorphism UI background with glowing blue and violet neon accents. Minimalist floating code syntax badges, clean modern layout displaying key concepts for '${topicLabel}'. Branding badge '${displayName}'. 8k render, hyper-detailed tech illustration.`
            },
            {
                hook: `🤖 The Next Era of ${isAuto ? 'Autonomous AI Agents' : effectiveTopic}`,
                concept: `3D futuristic conceptual art of cybernetic nodes and intelligence networks.`,
                caption: `Technology is evolving faster than ever. How are you adapting your development workflow for the next decade? 🌐`,
                prompt: `Futuristic high-tech 3D isometric conceptual art about ${topicLabel}. Holographic glowing cybernetic nodes, iridescent luminous glass prisms, volumetric cinematic cyber lighting, deep navy and cyan tones. Ultra photorealistic, Unreal Engine 5 render, 8k.`
            },
            {
                hook: `💬 Wisdom for the Journey: ${isAuto ? 'Resilient Engineering' : effectiveTopic}`,
                concept: `Minimalist dark studio typography with high contrast warm gold accents.`,
                caption: `Success in technology isn't about rapid shortcuts—it's about compounding solid foundations every single day. Double tap if you agree! 💫`,
                prompt: `Striking dark aesthetic typography poster. Moody atmospheric studio lighting, deep matte black and charcoal background with subtle warm gold bokeh. Bold elegant minimalist layout with clean modern typography reading '${topicLabel}'. 8k resolution, cinematic graphic design.`
            },
            {
                hook: `🔮 Breakthroughs in ${isAuto ? 'Intelligent Workflows' : effectiveTopic}`,
                concept: `Surreal high-concept visual metaphor depicting artificial intelligence and future innovation.`,
                caption: `The future belongs to those who build with intention. Where are you deploying your creative energy today? 🚀`,
                prompt: `Surreal conceptual visual art depicting ${topicLabel}, floating luminous geometric forms, ethereal ambient lighting, 85mm prime lens depth of field, 8k resolution, award-winning digital artwork.`
            }
        ];

        const chosen = angles[(varIdx - 1) % angles.length];
        title = chosen.hook;
        concept = chosen.concept;
        caption = chosen.caption;
        imagePrompt = chosen.prompt;
        hashtags = [
            topicLabel.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20) || 'TechInnovation',
            'AI',
            'FullStack',
            'SoftwareArchitecture',
            'CodeByJawad'
        ];
    }

    // Build full caption with hashtags & branding watermark
    const hashtagStr = hashtags.map((h) => (h.startsWith('#') ? h : `#${h.replace(/[^a-zA-Z0-9_]/g, '')}`)).join(' ');
    const brandFooter = displayHandle ? `\n\n📌 Follow ${displayHandle} for more daily insights.` : '';
    const fullCaption = `${title}\n\n${caption}${brandFooter}\n\n${hashtagStr}`;

    // Generate the high-resolution AI image with distinct random seed
    const imageResult = await generateAiImage(imagePrompt, apiKey);

    return {
        title,
        caption: fullCaption,
        hashtags,
        imagePrompt,
        imagePath: imageResult.imagePath,
        imageUrl: imageResult.imageUrl,
    };
};



