import { getEngagementRuleModel } from '../models/EngagementRule.model.js';
import { generateAiContent } from './ai.service.js';
import { logger } from '../utils/logger.js';

export async function getUserEngagementRules(userId: number) {
    const EngagementRule = getEngagementRuleModel();
    return EngagementRule.findAll({
        where: { userId },
        order: [['createdAt', 'DESC']],
    });
}

export async function createEngagementRule(userId: number, data: any) {
    const EngagementRule = getEngagementRuleModel();
    logger.info(`[Engagement Service] Creating engagement rule "${data.name}" for user ${userId}`);
    return EngagementRule.create({
        userId,
        name: data.name || 'New Auto-Reply Rule',
        triggerType: data.triggerType || 'keyword',
        keywords: data.keywords || [],
        matchMode: data.matchMode || 'contains',
        replyType: data.replyType || 'ai_persona',
        replyTemplate: data.replyTemplate || null,
        aiPersonaTone: data.aiPersonaTone || 'friendly',
        ctaLink: data.ctaLink || null,
        dmMessage: data.dmMessage || null,
        isActive: data.isActive ?? true,
    });
}

export async function updateEngagementRule(userId: number, ruleId: number, data: any) {
    const EngagementRule = getEngagementRuleModel();
    const rule = await EngagementRule.findOne({ where: { id: ruleId, userId } });
    if (!rule) throw new Error('Engagement rule not found');
    await rule.update(data);
    return rule;
}

export async function deleteEngagementRule(userId: number, ruleId: number) {
    const EngagementRule = getEngagementRuleModel();
    const rule = await EngagementRule.findOne({ where: { id: ruleId, userId } });
    if (!rule) throw new Error('Engagement rule not found');
    await rule.destroy();
    return true;
}

export async function evaluateCommentAndAutoReply(userId: number, commentText: string, authorName: string = 'User') {
    const EngagementRule = getEngagementRuleModel();
    const rules = await EngagementRule.findAll({ where: { userId, isActive: true } });

    logger.info(`[Engagement Service] Evaluating comment "${commentText}" from ${authorName} against ${rules.length} rules`);

    // Basic sentiment classification
    const lower = commentText.toLowerCase();
    let sentiment: 'positive' | 'negative' | 'question' | 'neutral' = 'neutral';
    if (lower.includes('?') || lower.startsWith('how') || lower.startsWith('what') || lower.startsWith('where')) {
        sentiment = 'question';
    } else if (lower.includes('bad') || lower.includes('worst') || lower.includes('hate') || lower.includes('scam')) {
        sentiment = 'negative';
    } else if (lower.includes('great') || lower.includes('love') || lower.includes('awesome') || lower.includes('amazing') || lower.includes('fire')) {
        sentiment = 'positive';
    }

    let matchedRule = null;
    for (const r of rules) {
        if (r.triggerType === 'keyword' && r.keywords && r.keywords.length > 0) {
            const matches = r.keywords.some((kw) => lower.includes(kw.toLowerCase()));
            if (matches) {
                matchedRule = r;
                break;
            }
        } else if (r.triggerType === 'sentiment_' + sentiment) {
            matchedRule = r;
            break;
        } else if (r.triggerType === 'ai_all') {
            matchedRule = r;
            break;
        }
    }

    if (!matchedRule) {
        return {
            sentiment,
            autoReplied: false,
            replyText: null,
            dmTriggered: false,
            message: 'No matching rule found',
        };
    }

    let replyText = '';
    let dmTriggered = false;

    if (matchedRule.replyType === 'template' && matchedRule.replyTemplate) {
        replyText = matchedRule.replyTemplate.replace(/{{name}}/g, authorName);
    } else if (matchedRule.replyType === 'dm_link') {
        replyText = `Thanks @${authorName}! I just sent you a direct message with the details. 📩`;
        dmTriggered = true;
    } else {
        // AI Persona reply
        try {
            const aiPrompt = `Write a short, engaging ${matchedRule.aiPersonaTone} social media comment reply to @${authorName} who commented: "${commentText}". Maximum 20 words.`;
            replyText = await generateAiContent(aiPrompt);
        } catch {
            replyText = `Thanks for the comment @${authorName}! Glad you're enjoying our reels! 🔥`;
        }
    }

    if (matchedRule.ctaLink) {
        replyText += ` Check out more here: ${matchedRule.ctaLink}`;
    }

    // Increment count
    await matchedRule.increment('repliesCount', { by: 1 });

    return {
        sentiment,
        autoReplied: true,
        ruleName: matchedRule.name,
        replyText: replyText.trim(),
        dmTriggered,
        dmMessage: dmTriggered ? matchedRule.dmMessage || `Here is your link: ${matchedRule.ctaLink}` : null,
    };
}
