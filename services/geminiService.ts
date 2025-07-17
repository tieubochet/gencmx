import { GoogleGenAI, GenerateContentResponse, Content } from "@google/genai";
// Giả sử bạn có file types.ts định nghĩa ReplySuggestion
// Nếu không, bạn có thể định nghĩa trực tiếp ở đây:
// export interface ReplySuggestion { originalReply: string; vietnameseTranslation: string; }
import { ReplySuggestion } from '../types';

// Định nghĩa các style bình luận mà người dùng có thể chọn.
// Chúng ta export nó để frontend có thể dùng.
export type CommentStyle = 'humorous' | 'supportive' | 'inquisitive' | 'analytical';

// --- PHẦN CẤU HÌNH GIỮ NGUYÊN ---
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    console.warn(
        "API_KEY environment variable not set. The application will likely fail to connect to the Gemini API."
    );
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });
const MODEL_NAME = "gemini-2.5-flash-preview-04-17";

// --- HÀM CHÍNH ĐÃ ĐƯỢC CẬP NHẬT THEO YÊU CẦU ---
export const generateReplySuggestions = async (
    articleContent: string,
    style: CommentStyle // Thêm tham số 'style' để nhận lựa chọn từ người dùng
): Promise<ReplySuggestion[]> => {

    if (!articleContent.trim()) {
        throw new Error('Vui lòng nhập nội dung bài viết.');
    }

    // -- BƯỚC 1: Tạo một "kho" chứa các prompt ngay bên trong hàm --
    // Mỗi style sẽ tương ứng với một chỉ dẫn khác nhau cho AI.
    const styleInstructions: Record<CommentStyle, string> = {
        humorous: `Write a single, concise, humorous, and friendly comment in the style of Twitter. The comment must be in the same language as the original post and must not include any other language. Do not repeat or rephrase any previous comments. Do not include any explanations or introductions—only the comment itself, do not use emojis,should be separated by commas instead of periods or exclamation marks.`,
        supportive: `Write a single, concise, supportive, and encouraging comment. The comment should be positive and uplifting. The comment must be in the same language as the original post and must not include any other language. Do not include any explanations or introductions—only the comment itself, do not use emojis,should be separated by commas instead of periods or exclamation marks.`,
        inquisitive: `Write a single, concise, and insightful question about the article's content. The question should spark further discussion. The comment must be in the same language as the original post and must not include any other language. Do not include any explanations or introductions—only the comment itself, do not use emojis,should be separated by commas instead of periods or exclamation marks.`,
        analytical: `Write a single, concise, and analytical comment that offers a sharp insight or a key takeaway from the article. The comment must be in the same language as the original post and must not include any other language. Do not include any explanations or introductions—only the comment itself, do not use emojis,should be separated by commas instead of periods or exclamation marks.`
    };

    // -- BƯỚC 2: Xây dựng prompt cuối cùng --
    // Lấy chỉ dẫn tương ứng với style người dùng chọn và ghép với phần còn lại.
    const prompt = `
${styleInstructions[style]}

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

    // --- PHẦN LOGIC GỌI API VÀ XỬ LÝ LỖI GIỮ NGUYÊN HOÀN TOÀN ---
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
            if (error.message.toLowerCase().includes('api key not valid')) {
                throw new Error('Khóa API không hợp lệ. Vui lòng kiểm tra cấu hình.');
            }
            throw new Error(`Đã xảy ra lỗi khi kết nối với AI: ${error.message}. Vui lòng thử lại.`);
        }
        throw new Error('Đã xảy ra lỗi không xác định khi kết nối với AI. Vui lòng thử lại sau.');
    }
};