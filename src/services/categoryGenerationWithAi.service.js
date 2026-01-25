const MODEL_NAME = "gemini-2.5-flash-lite";
const API_VERSION = "v1beta";

export const generateCategoryWithAi = async ({ title, description }) => {
    const prompt = `
    Choose EXACTLY ONE category from the list below.
    Do NOT invent new categories. Return only the category text.

    Allowed categories:
    water conservation, food waste, energy efficiency, waste management,
    sustainable agriculture, air pollution, plastic reduction,
    urban sustainability, climate awareness, eco-friendly living

    Title: ${title}
    Description: ${description}
    `;

    const res = await fetch(`https://generativelanguage.googleapis.com/${API_VERSION}/models/${MODEL_NAME}:generateContent?key=${process.env.GEMINI_API_KEY}`,
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

    return text.trim().toLowerCase();
}