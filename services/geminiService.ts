import { GoogleGenAI, GenerateContentResponse, Content } from "@google/genai";
import { ReplySuggestion } from '../types';

export type CommentStyle = 'humorous' | 'supportive' | 'inquisitive' | 'analytical';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    console.warn(
        "API_KEY environment variable not set. The application will likely fail to connect to the Gemini API."
    );
}

// Khởi tạo một lần duy nhất
const ai = new GoogleGenAI({ apiKey: API_KEY! });
const MODEL_NAME = "gemini-2.5-pro"; // Sử dụng model mới nhất

// === HÀM CŨ: GIỮ NGUYÊN KHÔNG ĐỔI ===
export const generateReplySuggestions = async (
    articleContent: string,
    style: CommentStyle
): Promise<ReplySuggestion[]> => {
    // ... (toàn bộ nội dung hàm này giữ nguyên như cũ) ...
     if (!articleContent.trim()) {
        throw new Error('Vui lòng nhập nội dung bài viết.');
    }

    const styleInstructions: Record<CommentStyle, string> = {
        humorous: `Read the original post carefully and write a short, original comment in the same language. Your comment must respond directly and thoughtfully to the main idea or message of the post — not around it, not beyond it, and not by asking unrelated questions. Avoid repeating or rephrasing the original post. The response should feel natural, relevant, and human — like a smart and socially aware person replying to what was actually said, not what they want to say. Do not be overly formal, robotic, or promotional. Avoid clichés, filler words, or empty jokes. Your goal is to make a comment that feels genuinely engaged with the post itself — playful or witty if appropriate, but always clearly connected to the post’s actual content. Do not use exclamation marks, connect clauses with a comma.`,
        supportive: `Please write a short, concise, friendly comment in the same language as the following post, without adding anything other than the comment itself, also do not use emojis, should be separated by commas instead of periods or exclamation marks.`,
        inquisitive: `Write a single, concise, humorous, and friendly comment in the style of Twitter. The comment must be in the same language as the original post and must not include any other language. Do not repeat or rephrase any previous comments. Do not include any explanations or introductions—only the comment itself, do not use emojis,should be separated by commas instead of periods or exclamation marks.`,
        analytical: `Write a single, concise, and analytical comment that offers a sharp insight or a key takeaway from the article. The comment must be in the same language as the original post and must not include any other language. Do not include any explanations or introductions—only the comment itself, do not use emojis,should be separated by commas instead of periods or exclamation marks.`
    };

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
  },
  {
    "originalReply": "Gợi ý 6 bằng ngôn ngữ gốc",
    "vietnameseTranslation": "Bản dịch tiếng Việt của gợi ý 6"
  },
  {
    "originalReply": "Gợi ý 7 bằng ngôn ngữ gốc",
    "vietnameseTranslation": "Bản dịch tiếng Việt của gợi ý 7"
  },
  {
    "originalReply": "Gợi ý 8 bằng ngôn ngữ gốc",
    "vietnameseTranslation": "Bản dịch tiếng Việt của gợi ý 8"
  },
  {
    "originalReply": "Gợi ý 9 bằng ngôn ngữ gốc",
    "vietnameseTranslation": "Bản dịch tiếng Việt của gợi ý 9"
  },
  {
    "originalReply": "Gợi ý 10 bằng ngôn ngữ gốc",
    "vietnameseTranslation": "Bản dịch tiếng Việt của gợi ý 10"
  }
]

Bài viết:
"${articleContent}"
`;

    const model = ai.getGenerativeModel({ model: MODEL_NAME });
    const generationConfig = {
        responseMimeType: "application/json",
    };

    try {
        const result = await model.generateContent(prompt, generationConfig);
        const response = result.response;
        let jsonText = response.text().trim();
        
        // Không cần regex nữa nếu dùng responseMimeType, nhưng giữ lại để phòng trường hợp API thay đổi
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


// === HÀM MỚI: TÓM TẮT NỘI DUNG BÀI VIẾT ===
export const summarizeArticle = async (
    articleContent: string
): Promise<string> => {

    if (!articleContent.trim()) {
        throw new Error('Vui lòng nhập nội dung bài viết.');
    }

    const prompt = `
    Bạn là chuyên gia marketing cho công ty tư vấn du học cao cấp EDUCHANCES. Văn phong của bạn luôn chuyên nghiệp, uy tín, nhưng đầy cảm hứng và tập trung vào lợi ích, cơ hội cho học sinh.

Nhiệm vụ của bạn là đọc kỹ bài viết gốc được cung cấp, sau đó biến nó thành một bài đăng Facebook quảng cáo hấp dẫn, tuân thủ nghiêm ngặt cấu trúc đặc trưng sau đây:

1.  **Tiêu đề:** Bắt đầu bằng một emoji phù hợp với ngành học (vd: 🎨🎓🚗🍴). Viết IN HOA tên chương trình và trường. Kết thúc bằng emoji 🌟 hoặc 🔥.

2.  **Câu "Hook" (Mồi câu):** Ngay sau tiêu đề, hãy viết một câu ngắn gọn, cực kỳ mạnh mẽ. Hãy tự động xác định và chọn **điểm đắt giá nhất** trong bài gốc để làm hook:
    *   Nếu có **chứng nhận/kiểm định uy tín** (như CIDA), hãy dùng nó.
    *   Nếu có **thứ hạng cao** (như Top 23), hãy dùng nó.
    *   Nếu có **hợp tác với thương hiệu lớn** (như Lamborghini, PepsiCo), hãy dùng nó.
    *   Nếu không có các yếu tố trên, hãy đặt một **câu hỏi trực diện** vào ước mơ hoặc vấn đề của đối tượng mục tiêu.

3.  **Lợi ích chính:** Sử dụng emoji ✅ hoặc ✨ để liệt kê 3-4 lợi ích thuyết phục nhất, hấp dẫn nhất từ bài gốc. Tập trung vào "Tại sao nên chọn chương trình này?".

4.  **Thông tin chi tiết:** Tóm tắt ngắn gọn các thông tin quan trọng như Thời gian học, Yêu cầu, Ngôn ngữ, Kỳ nhập học. Sử dụng các emoji như 🎓, 🗓️, 📌 để phân mục cho dễ đọc.

5.  **Kêu gọi hành động (CTA):** Luôn sử dụng khối thông tin liên hệ cố định này.
    🌐🌸 Để biết thêm thông tin và nhận tư vấn, hãy liên hệ ngay với chúng tôi:
    CÔNG TY TNHH EDUCHANCES
    📞 Hotline: 086 5995 787
    📧 Email: support@educhances.edu.vn

6.  **Câu chốt:** Kết thúc bằng một câu truyền cảm hứng, khơi gợi khát khao và hành động. Bắt đầu bằng emoji 🚀 hoặc 🌟.

7.  **Hashtags:** Tự động tạo 5-7 hashtag liên quan nhất, trong đó luôn phải có #EduChances, #DuHoc[Tên_nước], và các từ khóa chính của ngành học.

Bây giờ, hãy áp dụng prompt này cho nội dung gốc dưới đây:

    Bài viết cần tóm tắt:
    "${articleContent}"
    `;

    try {
        const model = ai.getGenerativeModel({ model: MODEL_NAME });
        const result = await model.generateContent(prompt);
        const response = result.response;
        const summaryText = response.text();
        
        return summaryText.trim();

    } catch (error) {
        console.error('Lỗi khi gọi API Gemini để tóm tắt:', error);
        if (error instanceof Error) {
            if (error.message.toLowerCase().includes('api key not valid')) {
                throw new Error('Khóa API không hợp lệ. Vui lòng kiểm tra cấu hình.');
            }
            throw new Error(`Đã xảy ra lỗi khi kết nối với AI: ${error.message}. Vui lòng thử lại.`);
        }
        throw new Error('Đã xảy ra lỗi không xác định khi kết nối với AI. Vui lòng thử lại sau.');
    }
};