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
    // 🌊 WATER
    "water scarcity",
    "groundwater depletion",
    "industrial water contamination",
    "sewage discharge",
    "chemical runoff contamination",
    "river ecosystem damage",
    "wastewater mismanagement",
    "flooding",

    // ♻ WASTE
    "plastic waste",
    "e-waste dumping",
    "landfill overflow",
    "improper waste segregation",
    "open waste burning",

    // 🌫 AIR
    "air pollution",
    "vehicular emissions",
    "industrial emissions",
    "dust pollution",
    "noise pollution",

    // 🌱 AGRICULTURE & LAND
    "soil degradation",
    "chemical overuse",
    "crop wastage",
    "deforestation",
    "unsustainable farming",

    // ⚡ ENERGY
    "fossil fuel dependence",
    "energy inefficiency",
    "diesel generator emissions",
    "renewable energy gaps",

    // 🌍 CLIMATE
    "heatwaves",
    "carbon emissions",
    "climate adaptation failure",
    "extreme weather impact",

    // 🏙 URBAN
    "urban flooding",
    "poor drainage systems",
    "unplanned urbanization",
    "infrastructure stress"
];

const BROAD_CATEGORIES = [
    "water",
    "waste",
    "air",
    "agriculture",
    "energy",
    "climate",
    "urban"
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
You are an expert environmental analyst.

Your task is to classify the PRIMARY environmental impact of the issue.

Important rules:
- Choose the category that best represents the MAIN environmental damage.
- Do NOT classify based only on keywords.
- Avoid generic matches if a more precise category exists.
- The specificCategory must represent the core environmental issue.
- The broadCategory must logically match the specificCategory.

SPECIFIC CATEGORIES:
${SPECIFIC_CATEGORIES.map(c => `- ${c}`).join("\n")}

BROAD CATEGORIES:
${BROAD_CATEGORIES.map(c => `- ${c}`).join("\n")}

If the issue is NOT sustainability-related, return:
{"specificCategory":"out_of_scope","broadCategory":"none"}

Title: ${title}
Description: ${description}

Return ONLY valid JSON in this exact format:
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

    const candidate = data?.candidates?.[0];

    if (!candidate || !candidate.content || !candidate.content.parts) {
        console.log("Gemini returned no usable candidate:", JSON.stringify(data, null, 2));
        return fallbackCategory();
    }

    // Join all text parts safely
    let text = candidate.content.parts
        .map(p => p.text || "")
        .join("")
        .trim();

    console.log("RAW AI RESPONSE:", text);

    if (!text) {
        return fallbackCategory();
    }

    text = text.trim().replace(/```json\n?/g, "").replace(/```\n?/g, "");

    try {
        const parsed = JSON.parse(text);

        let specific = parsed.specificCategory?.trim().toLowerCase();
        let broad = parsed.broadCategory?.trim().toLowerCase();

        // Handle out_of_scope
        if (specific === "out_of_scope") {
            return {
                specificCategory: "out_of_scope",
                broadCategory: "none"
            };
        }

        // 🔥 Flexible specific matching
        const matchedSpecific =
            SPECIFIC_CATEGORIES.find(c => c.toLowerCase() === specific) ||
            SPECIFIC_CATEGORIES.find(c => specific?.includes(c.toLowerCase())) ||
            SPECIFIC_CATEGORIES.find(c => c.toLowerCase().includes(specific || "")) ||
            null;

        // 🔥 Flexible broad matching
        const matchedBroad =
            BROAD_CATEGORIES.find(c => c.toLowerCase() === broad) ||
            BROAD_CATEGORIES.find(c => broad?.includes(c.toLowerCase())) ||
            BROAD_CATEGORIES.find(c => c.toLowerCase().includes(broad || "")) ||
            null;

        return {
            specificCategory: matchedSpecific || SPECIFIC_CATEGORIES[0],
            broadCategory: matchedBroad || BROAD_CATEGORIES[0]
        };

    } catch (err) {
        console.error("Category parse error:", err);
        return fallbackCategory();
    }
};

const fallbackCategory = () => ({
    specificCategory: SPECIFIC_CATEGORIES[0],
    broadCategory: BROAD_CATEGORIES[0]
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
    console.log("RAW AI RESPONSE:", text);

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