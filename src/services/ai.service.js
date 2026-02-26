// ai.service.js - All AI helper functions in one file

const MODEL_NAME = "gemini-2.5-flash-lite";
const API_VERSION = "v1beta";

// ===================== TEXT ENHANCEMENT =====================
export const textEnhancementService = async ({ text, purpose }) => {
    const prompt = `
Improve the following text for ${purpose}.
Fix grammar, clarity, and sentence flow.
Do NOT change meaning. Do NOT add new information.
Return ONLY the improved text.

Text:
${text}
`;

    const res = await fetch(
        `https://generativelanguage.googleapis.com/${API_VERSION}/models/${MODEL_NAME}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0,
                    maxOutputTokens: 500
                }
            })
        }
    );

    if (!res.ok) {
        throw new Error(`Gemini API failed: ${res.status}`);
    }

    const data = await res.json();
    const improvedText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!improvedText) {
        throw new Error("Gemini returned empty enhanced text");
    }

    return { enhancedText: improvedText.trim() };
};

// ===================== CATEGORY GENERATION =====================

const SPECIFIC_CATEGORIES = [
    "water conservation",
    "water scarcity",
    "water pollution",
    "energy efficiency",
    "energy wastage",
    "fossil dependence",
    "waste management",
    "plastic waste",
    "improper waste segregation",
    "e-waste dumping",
    "landfill overflow",
    "single-use plastics",
    "food waste",
    "food insecurity",
    "sustainable agriculture",
    "crop wastage",
    "chemical overuse",
    "soil degradation",
    "air pollution",
    "noise pollution",
    "urban flooding",
    "traffic congestion",
    "climate impacts",
    "heatwaves",
    "low awareness",
    "weak enforcement",
    "overconsumption",
    "eco-friendly living",
    "urban sustainability"
];

const BROAD_CATEGORIES = [
    "water",
    "energy",
    "waste",
    "food",
    "agriculture",
    "air",
    "climate",
    "urban",
    "pollution",
    "environment"
];

// -------------------------
// STEP 1: Domain Check
// -------------------------
export const isSustainabilityRelated = async ({ title, description }) => {

    const prompt = `
Determine if the following issue is directly related to environmental sustainability,
climate change, waste management, water, food systems, agriculture,
energy, pollution, or urban environmental management.

Return ONLY true or false.

Title: ${title}
Description: ${description}
`;

    const res = await fetch(
        `https://generativelanguage.googleapis.com/${API_VERSION}/models/${MODEL_NAME}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0,
                    maxOutputTokens: 10
                }
            }),
        }
    );

    if (!res.ok) {
        throw new Error(`Gemini API failed: ${res.status}`);
    }

    const data = await res.json();
    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) return false;

    text = text.trim().toLowerCase();

    if (text === "true") return true;
    if (text === "false") return false;

    return false;
};


// -------------------------
// STEP 2: Category Generator
// -------------------------
export const generateCategoryWithAi = async ({ title, description }) => {

    const prompt = `
You are a sustainability problem classifier.

Choose EXACTLY ONE specificCategory from:
${SPECIFIC_CATEGORIES.join(", ")}

Choose EXACTLY ONE broadCategory from:
${BROAD_CATEGORIES.join(", ")}

If the issue is NOT sustainability-related,
return:
{"specificCategory":"out_of_scope","broadCategory":"none"}

Title: ${title}
Description: ${description}

Return ONLY JSON in this format:
{"specificCategory":"category","broadCategory":"category"}
`;

    const res = await fetch(
        `https://generativelanguage.googleapis.com/${API_VERSION}/models/${MODEL_NAME}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0,
                    maxOutputTokens: 100
                }
            }),
        }
    );

    if (!res.ok) {
        throw new Error(`Gemini API failed: ${res.status}`);
    }

    const data = await res.json();
    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
        return fallbackCategory();
    }

    text = text.trim();
    text = text.replace(/```json\n?/g, "").replace(/```\n?/g, "");

    try {
        const parsed = JSON.parse(text);

        let specific = parsed.specificCategory?.trim().toLowerCase();
        let broad = parsed.broadCategory?.trim().toLowerCase();

        // 🔒 Handle out_of_scope explicitly
        if (specific === "out_of_scope") {
            return {
                specificCategory: "out_of_scope",
                broadCategory: "none"
            };
        }

        // 🔒 Strict validation
        if (!SPECIFIC_CATEGORIES.includes(specific)) {
            specific = "low awareness";
        }

        if (!BROAD_CATEGORIES.includes(broad)) {
            broad = "environment";
        }

        return {
            specificCategory: specific,
            broadCategory: broad
        };

    } catch (err) {
        console.error("Category parse error:", err);
        return fallbackCategory();
    }
};

const fallbackCategory = () => ({
    specificCategory: "low awareness",
    broadCategory: "environment"
});


// ===================== TAG GENERATION =====================
export const generateTagsWithAI = async ({ title, description, category }) => {
    const prompt = `
Generate 2–4 concrete, technical tags that BELONG to the given category.
Do NOT invent tags outside this category.
Avoid abstract or generic words.
Return ONLY a comma-separated list. No explanations.

Category: ${category}

Title: ${title}
Description: ${description}
`;

    const res = await fetch(
        `https://generativelanguage.googleapis.com/${API_VERSION}/models/${MODEL_NAME}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0,
                    maxOutputTokens: 30
                }
            })
        }
    );

    if (!res.ok) {
        throw new Error(`Gemini API failed: ${res.status}`);
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
        throw new Error("Gemini returned empty tags response");
    }

    return text
        .split(",")
        .map(t => t.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 4);
};

export const validateSolutionWithAI = async ({ problemTitle, problemDescription, solutionText }) => {

    const prompt = `
You are a strict moderator.

Check the following solution submission.

1. Is the solution relevant to the given problem?
2. Does it contain spam, promotional content, hate speech, or inappropriate language?

Return ONLY JSON in this format:
{
  "isRelevant": true or false,
  "isAppropriate": true or false
}

Problem Title: ${problemTitle}
Problem Description: ${problemDescription}

Solution:
${solutionText}
`;

    const res = await fetch(
        `https://generativelanguage.googleapis.com/${API_VERSION}/models/${MODEL_NAME}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0,
                    maxOutputTokens: 50
                }
            }),
        }
    );

    if (!res.ok) {
        throw new Error(`Gemini API failed: ${res.status}`);
    }

    const data = await res.json();
    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
        return { isRelevant: false, isAppropriate: false };
    }

    text = text.trim().replace(/```json\n?/g, "").replace(/```\n?/g, "");

    try {
        return JSON.parse(text);
    } catch {
        return { isRelevant: false, isAppropriate: false };
    }
};