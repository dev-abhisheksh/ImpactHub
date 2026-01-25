const MODEL_NAME = "gemini-2.5-flash-lite";
const API_VERSION = "v1beta";

export const generateCategoryWithAi = async ({ title, description }) => {
    const prompt = `Choose ONE best category for the problem based on title and description.
Return only the category name (no explanation, no extra text).

Title: ${title}
Description: ${description}
`

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