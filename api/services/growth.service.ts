import axios from 'axios';
import { logger } from '../utils/logger.js';

export interface ViralGroupRecommendation {
    category: string;
    searchKeyword: string;
    targetDemographic: string;
    viralMatchScore: number; // 0-100
    rationale: string;
    suggestedGroupNames: string[];
}

export interface GroupDiscoveryResponse {
    topic: string;
    recommendations: ViralGroupRecommendation[];
    viralStrategyTip: string;
}

/**
 * Find viral Facebook group niches and demographic strategies for a video topic using Gemini AI
 */
export const findViralGroupsForTopic = async (
    topic: string,
    customGeminiKey?: string
): Promise<GroupDiscoveryResponse> => {
    const input = topic.trim();
    const geminiKey = customGeminiKey || process.env.GEMINI_API_KEY;

    logger.info(`[Growth] Finding viral group niches for topic: "${input}"`);

    if (geminiKey) {
        try {
            const prompt = `You are a social media growth hacker. Analyze this video topic: "${input}".
Discover top 3 viral Facebook Group niches and community strategies that will bring massive viewer traffic to this video.
Return JSON strictly in this format:
{
  "recommendations": [
    {
      "category": "e.g. AI & Future Tech Enthusiasts",
      "searchKeyword": "search term to find groups on Facebook",
      "targetDemographic": "e.g. Tech enthusiasts, developers, 18-35 males",
      "viralMatchScore": 96,
      "rationale": "High engagement group where members actively reshare new AI videos",
      "suggestedGroupNames": ["AI Innovations 2026", "Tech & Robotics Hub", "Future Tools Community"]
    }
  ],
  "viralStrategyTip": "1-sentence growth advice for posting without being flagged as spam"
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
                    topic: input,
                    recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
                    viralStrategyTip: parsed.viralStrategyTip || 'Post naturally with a question hook to spark community discussion.',
                };
            }
        } catch (err: any) {
            logger.warn(`[Growth] Gemini AI Group discovery failed: ${err?.message}`);
        }
    }

    // Fallback recommendation engine
    return {
        topic: input,
        recommendations: [
            {
                category: `${input} Viral Fans & Enthusiasts`,
                searchKeyword: `${input} community`,
                targetDemographic: 'Active short-form video consumers & social sharers',
                viralMatchScore: 92,
                rationale: 'Direct audience niche interested in this exact video topic',
                suggestedGroupNames: [`${input} World`, `Daily ${input} Videos`, `${input} Official Group`],
            },
            {
                category: 'Trending Reels & Shorts Hub',
                searchKeyword: 'viral reels group',
                targetDemographic: 'General social media creators & video enthusiasts',
                viralMatchScore: 85,
                rationale: 'Broad viral group focused on discovering high-performing short clips',
                suggestedGroupNames: ['Viral Reels Daily', 'Facebook Reels Creators', 'Shorts & Reels Hub'],
            },
        ],
        viralStrategyTip: 'Ask an open-ended question in your group post caption to encourage comments and boost viral distribution.',
    };
};

/**
 * Generate a high-traffic, anti-spam group discussion hook for a Reel
 */
export const generateGroupViralHook = async (
    topic: string,
    groupName?: string,
    customGeminiKey?: string
): Promise<{ hookText: string; callToAction: string }> => {
    const geminiKey = customGeminiKey || process.env.GEMINI_API_KEY;
    const targetGroup = groupName || 'the community';

    if (geminiKey) {
        try {
            const prompt = `You are a community engagement expert. Create an anti-spam, high-converting Facebook Group post hook for a video about: "${topic}".
Target Group: "${targetGroup}".
Return JSON strictly in this format:
{
  "hookText": "Engaging discussion question or statement that makes group members want to watch the video and comment",
  "callToAction": "Natural non-salesy invitation to watch full reel"
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
                    hookText: parsed.hookText || `What do you all think about this? Watch full clip! 👇`,
                    callToAction: parsed.callToAction || 'Watch full reel & let me know your thoughts!',
                };
            }
        } catch (err: any) {
            logger.warn(`[Growth] Gemini AI Hook generation failed: ${err?.message}`);
        }
    }

    return {
        hookText: `Came across this crazy clip about ${topic}! What do you guys think? 🤔`,
        callToAction: 'Watch full video and drop your thoughts below! 👇',
    };
};
