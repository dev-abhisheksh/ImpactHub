const MODEL_NAME = "gemini-2.5-flash-lite";
const API_VERSION = "v1beta";

export const textEnhancementService = async ({ text, purpose }) => {
    const prompt = `
    Improve the following text for ${purpose}.
    Fix grammar, clarity, and sentence flow.
    Do NOT change meaning. Do NOT add new information.
    Return only the improved text.

    Text:
    ${text}
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
    return data.candidates[0].content.parts[0].text.trim();
};
