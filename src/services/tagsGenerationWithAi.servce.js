const MODEL_NAME = "gemini-2.5-flash-lite";
const API_VERSION = "v1beta";

export const generateTagsWithAI = async ({ title, description }) => {
    const prompt = `
Return 2–4 concrete, technical tags directly related to the problem domain.
Avoid abstract, emotional, or generic words (e.g., health, death, issue, help).
Use only specific nouns. Return a comma-separated list.


Title: ${title}
Description: ${description}
`;

    const res = await fetch(
        `https://generativelanguage.googleapis.com/${API_VERSION}/models/${MODEL_NAME}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        }
    );

    const data = await res.json();
    const text = data.candidates[0].content.parts[0].text;

    return text.split(",").map(t => t.trim().toLowerCase());
};
