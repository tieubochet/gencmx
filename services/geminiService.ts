/**
 * @file This service module handles interactions with the Google Gemini API 
 * to generate reply suggestions for articles based on different styles.
 */

// 1. Imports & Type Definitions
import { GoogleGenAI, GenerateContentResponse, Content } from "@google/genai";

/**
 * Defines the structure for a reply suggestion object.
 * This type should ideally be in a central `types.ts` file but is defined here for completeness.
 */
export interface ReplySuggestion {
  originalReply: string;
  vietnameseTranslation: string;
}

/**
 * Defines the available comment styles that the user can choose from.
 * Exported to be used in the frontend for creating UI elements like radio buttons.
 */
export type CommentStyle = 'humorous' | 'supportive' | 'inquisitive' | 'analytical';


// 2. Configuration & AI Initialization
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    console.warn(
        "API_KEY environment variable not set. The application will likely fail to connect to the Gemini API."
    );
}

// Initialize GoogleGenAI with a non-null assertion for API_KEY, as per problem spec assumption.
const ai = new GoogleGenAI({ apiKey: API_KEY! });
const MODEL_NAME = "gemini-2.5-flash-preview-04-17";


// 3. Prompt Templates
/**
 * A record mapping each comment style to its specific instruction for the AI.
 * This makes it easy to add or modify styles in the future.
 */
const promptTemplates: Record<CommentStyle, string> = {
    humorous: `Write a single, concise, humorous, and friendly comment in the style of Twitter. The comment must be in the same language as the original post and must not include any other language. Do not repeat or rephrase any previous comments. Do not include any explanations or introductions—only the comment itself, do not use emojis,should be separated by commas instead of periods or exclamation marks.`,
    supportive: `Write a single, concise, supportive, and encouraging comment. The comment should be positive and uplifting. The comment must be in the same language as the original post and must not include any other language. Do not include any explanations or introductions—only the comment itself, do not use emojis,should be separated by commas instead of periods or exclamation marks.`,
    inquisitive: `Write a single, concise, and insightful question about the article's content. The question should spark further discussion. The comment must be in the same language as the original post and must not include any other language. Do not include any explanations or introductions—only the comment itself, do not use emojis,should be separated by commas instead of periods or exclamation marks.`,
    analytical: `Write a single, concise, and analytical comment that offers a sharp insight or a key takeaway from the article. The comment must be in the same language as the original post and must not include any other language. Do not include any explanations or introductions—only the comment itself, do not use emojis,should be separated by commas instead of periods or exclamation marks.`
};

/**
 * Helper function to construct the final prompt sent to the AI.
 * It combines the selected style's template with the common JSON formatting rules and the article content.
 * @param style - The chosen comment style.
 * @param articleContent - The content of the article.
 * @returns The complete prompt string.
 */
const getPrompt = (style: CommentStyle, articleContent: string): string => {
    const styleInstruction = promptTemplates[style];
    const jsonFormatInstructions = `
Vui lòng trả lời dưới định dạng JSON sau:
[
  {
    "originalReply": "Câu trả lời bằng ngôn ngữ gốc của bài viết",
    "vietnameseTranslation": "Bản dịch tiếng Việt của câu trả lời"
  },
  {
    "originalReply": "Gợi ý 2 bằng ngôn ngữ gốc",
    "vietnameseTranslation": "Bản dịch tiếng Việt của gợi ý 2"
  },
  {
    "originalReply": "Gợi ý 3 bằng ngôn ngữ gốc",
    "vietnameseTranslation": "Bản dịch tiếng Việt của gợi ý 3"
  },
  {
    "originalReply": "Gợi ý 4 bằng ngôn ngữ gốc",
    "vietnameseTranslation": "Bản dịch tiếng Việt của gợi ý 4"
  },
  {
    "originalReply": "Gợi ý 5 bằng ngôn ngữ gốc",
    "vietnameseTranslation": "Bản dịch tiếng Việt của gợi ý 5"
  }
]

Bài viết:
"${articleContent}"`;

    return `${styleInstruction}\n${jsonFormatInstructions}`;
}


// 4. Main Exported Function
/**
 * Generates reply suggestions for a given article based on a selected style.
 * @param articleContent - The content of the article to comment on.
 * @param style - The desired style for the suggestions ('humorous', 'supportive', etc.).
 * @returns A promise that resolves to an array of ReplySuggestion objects.
 */
export const generateReplySuggestions = async (
    articleContent: string,
    style: CommentStyle
): Promise<ReplySuggestion[]> => {
    if (!articleContent.trim()) {
        throw new Error('Vui lòng nhập nội dung bài viết.');
    }

    // Dynamically build the prompt based on the user's selected style
    const prompt = getPrompt(style, articleContent);
    const chatHistory: Content[] = [{ role: "user", parts: [{ text: prompt }] }];

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: chatHistory,
            config: {
                responseMimeType: "application/json",
            },
        });

        // Clean up potential markdown code fences around the JSON
        let jsonText = response.text.trim();
        const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
        const match = jsonText.match(fenceRegex);
        if (match && match[1]) {
            jsonText = match[1].trim();
        }
        
        const parsedReplies = JSON.parse(jsonText);

        // Validate the structure of the parsed JSON
        if (
            Array.isArray(parsedReplies) &&
            parsedReplies.length > 0 &&
            parsedReplies.every(
                (item: any): item is ReplySuggestion =>
                    item &&
                    typeof item.originalReply === 'string' &&
                    typeof item.vietnameseTranslation === 'string'
            )
        ) {
            return parsedReplies;
        } else {
            console.error('Parsed JSON structure unexpected or malformed:', parsedReplies);
            throw new Error('Cấu trúc phản hồi từ AI không như mong đợi. Dữ liệu nhận được không hợp lệ.');
        }
    } catch (error) {
        console.error('Lỗi khi gọi API Gemini hoặc phân tích phản hồi:', error);
        if (error instanceof Error) {
            if (error.message.toLowerCase().includes('json')) {
                 throw new Error('Lỗi khi phân tích phản hồi JSON từ AI. Vui lòng thử lại.');
            }
            if (error.message.toLowerCase().includes('api key not valid')) {
                throw new Error('Khóa API không hợp lệ. Vui lòng kiểm tra cấu hình.');
            }
            throw new Error(`Đã xảy ra lỗi khi kết nối với AI: ${error.message}. Vui lòng thử lại.`);
        }
        throw new Error('Đã xảy ra lỗi không xác định khi kết nối với AI. Vui lòng thử lại sau.');
    }
};