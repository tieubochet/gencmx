
import { GoogleGenAI, GenerateContentResponse, Content } from "@google/genai";
import { ReplySuggestion } from '../types';

// API_KEY is expected to be set in the environment (process.env.API_KEY)
// The problem statement assumes it's pre-configured and accessible.
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    // This warning is for development convenience; in a production environment,
    // the key must be present. The application logic assumes it is.
    console.warn(
        "API_KEY environment variable not set. The application will likely fail to connect to the Gemini API."
    );
}

// Initialize GoogleGenAI with a non-null assertion for API_KEY, as per problem spec assumption.
const ai = new GoogleGenAI({ apiKey: API_KEY! });
const MODEL_NAME = "gemini-2.5-flash-preview-04-17";

export const generateReplySuggestions = async (articleContent: string): Promise<ReplySuggestion[]> => {
    if (!articleContent.trim()) {
        throw new Error('Vui lòng nhập nội dung bài viết.');
    }

    const prompt = `
Hãy gợi ý 5 bình luận ngắn gọn, súc tích, vui vẻ hài hước, hấp dẫn mang phong cách X và có cùng ngôn ngữ với bài viết gốc sau mà không nói thêm bất cứ điều gì khác ngoài bình luận đó:

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
"${articleContent}"
`;

    const chatHistory: Content[] = [{ role: "user", parts: [{ text: prompt }] }];

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: chatHistory,
            config: {
                responseMimeType: "application/json",
            },
        });

        let jsonText = response.text.trim();
        const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
        const match = jsonText.match(fenceRegex);
        if (match && match[1]) {
            jsonText = match[1].trim();
        }
        
        const parsedReplies = JSON.parse(jsonText);

        if (
            Array.isArray(parsedReplies) &&
            parsedReplies.length > 0 &&
            parsedReplies.every(
                (item: any) =>
                    item &&
                    typeof item.originalReply === 'string' &&
                    typeof item.vietnameseTranslation === 'string'
            )
        ) {
            return parsedReplies as ReplySuggestion[];
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
             // Check for specific Gemini API related errors if possible, e.g., authentication issues
            if (error.message.toLowerCase().includes('api key not valid')) {
                throw new Error('Khóa API không hợp lệ. Vui lòng kiểm tra cấu hình.');
            }
            throw new Error(`Đã xảy ra lỗi khi kết nối với AI: ${error.message}. Vui lòng thử lại.`);
        }
        throw new Error('Đã xảy ra lỗi không xác định khi kết nối với AI. Vui lòng thử lại sau.');
    }
};
