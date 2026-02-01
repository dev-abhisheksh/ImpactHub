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

    // ✅ RETURN OBJECT, NOT STRING
    return { enhancedText: improvedText.trim() };
};

// ===================== CATEGORY GENERATION =====================
export const generateCategoryWithAi = async ({ title, description }) => {
    const prompt = `
Choose EXACTLY ONE category from the list below.
Do NOT invent new categories. Return only the category text.

Allowed categories:
water conservation, food waste, energy efficiency, waste management,
sustainable agriculture, air pollution, plastic reduction,
urban sustainability, climate awareness, eco-friendly living
Water scarcity, water pollution, food waste, food insecurity,
energy wastage, fossil dependence, plastic waste, poor segregation,
e-waste dumping, landfill overflow, air pollution, noise pollution,
urban flooding, traffic congestion, climate impacts, heatwaves,
soil degradation, crop wastage, chemical overuse, overconsumption,
single-use plastics, weak enforcement, low awareness.

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
            }),
        }
    );

    if (!res.ok) {
        throw new Error(`Gemini API failed: ${res.status}`);
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
        throw new Error("Gemini returned empty category response");
    }

    return text.trim().toLowerCase();
};

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