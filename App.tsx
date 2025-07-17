import React, { useState, useCallback } from 'react';
import { ReplySuggestion } from './types';
// Import thêm "CommentStyle" để sử dụng type an toàn
import { generateReplySuggestions, CommentStyle } from './services/geminiService';

// LoadingSpinner component (không đổi)
const LoadingSpinner: React.FC = () => (
    <div className="flex items-center justify-center">
        <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Đang tạo...
    </div>
);

// ReplyCard component (không đổi)
interface ReplyCardProps {
    reply: ReplySuggestion;
    index: number;
}
const ReplyCard: React.FC<ReplyCardProps> = ({ reply, index }) => {
    const [copiedOriginal, setCopiedOriginal] = useState(false);
    const [copiedTranslation, setCopiedTranslation] = useState(false);

    const handleCopyToClipboard = useCallback((text: string, type: 'original' | 'translation') => {
        navigator.clipboard.writeText(text)
            .then(() => {
                if (type === 'original') {
                    setCopiedOriginal(true);
                    setCopiedTranslation(false);
                } else {
                    setCopiedTranslation(true);
                    setCopiedOriginal(false);
                }
                setTimeout(() => {
                    setCopiedOriginal(false);
                    setCopiedTranslation(false);
                }, 2000); // Reset after 2 seconds
            })
            .catch(err => {
                console.error("Failed to copy:", err);
            });
    }, []);

    return (
        <div className="mb-4 last:mb-0 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="flex justify-between items-start mb-2">
                <p className="text-lg font-semibold text-blue-700">Gợi ý {index + 1}</p>
            </div>
            
            <div className="mb-3">
                <div className="flex justify-between items-center mb-1">
                    <button 
                        onClick={() => handleCopyToClipboard(reply.originalReply, 'original')}
                        className={`text-xs ${copiedOriginal ? 'bg-green-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'} font-medium py-1 px-2 rounded transition-all duration-200 min-w-[70px]`}
                        title="Sao chép bản gốc"
                        aria-label={copiedOriginal ? "Đã sao chép bản gốc" : "Sao chép bản gốc"}
                    >
                        {copiedOriginal ? 'Đã chép!' : 'Sao chép'}
                    </button>
                </div>
                <p className="text-gray-800 leading-relaxed break-words whitespace-pre-wrap bg-white p-2 rounded border border-gray-200 text-base">
                    {reply.originalReply}
                </p>
            </div>

            <div>
                 <p className="text-red-500 text-base opacity-90"> {reply.vietnameseTranslation}</p>
            </div>
        </div>
    );
};


// === CÁC THAY ĐỔI CHÍNH NẰM TRONG COMPONENT APP NÀY ===

const App: React.FC = () => {
    const [articleContent, setArticleContent] = useState<string>('');
    const [replySuggestions, setReplySuggestions] = useState<ReplySuggestion[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    
    // **THAY ĐỔI 1: Thêm state để lưu trữ style được chọn**
    // Đặt 'supportive' làm giá trị mặc định.
    const [selectedStyle, setSelectedStyle] = useState<CommentStyle>('supportive');

    const handleGenerateReply = useCallback(async () => {
        setError('');
        if (!articleContent.trim()) {
            setError('Vui lòng nhập nội dung bài viết.');
            return;
        }

        setIsLoading(true);
        try {
            // **THAY ĐỔI 2: Truyền `selectedStyle` làm tham số thứ hai**
            const suggestions = await generateReplySuggestions(articleContent, selectedStyle);
            setReplySuggestions(suggestions);
        } catch (err: any) {
            setError(err.message || 'Đã xảy ra lỗi không xác định.');
            setReplySuggestions([]);
            console.error('Error generating replies:', err);
        } finally {
            setIsLoading(false);
        }
    // **THAY ĐỔI 3: Thêm `selectedStyle` vào dependency array của useCallback**
    }, [articleContent, selectedStyle]);

    const handleResetContent = useCallback(() => {
        setArticleContent('');
    }, []);

    // Danh sách các tùy chọn style để render radio buttons
    const styleOptions: { value: CommentStyle; label: string }[] = [
        { value: 'humorous', label: 'Chuẩn, hay xài' },
        { value: 'supportive', label: 'Ngắn gọn' },
        { value: 'inquisitive', label: 'Không emoji' },
        { value: 'analytical', label: 'Phân tích' },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 to-sky-100 flex flex-col items-center justify-center p-4 selection:bg-blue-200">
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-4xl border border-gray-200 transform transition-all duration-500">

                <div className="md:flex md:space-x-6">
                    {/* Left Column */}
                    <div className="md:w-2/5 mb-6 md:mb-0 flex flex-col">
                        <div className="relative flex-grow">
                            <textarea
                                id="articleContent"
                                aria-label="Nội dung bài viết"
                                className="w-full h-full p-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 resize-y min-h-[200px] sm:min-h-[250px] text-gray-800 placeholder-gray-400 shadow-sm"
                                placeholder="Dán nội dung bài viết vào đây..."
                                value={articleContent}
                                onChange={(e) => setArticleContent(e.target.value)}
                            ></textarea>
                            {articleContent && (
                                <button
                                    onClick={handleResetContent}
                                    title="Xóa nội dung"
                                    aria-label="Xóa nội dung bài viết"
                                    className="absolute top-2 right-2 p-1.5 bg-gray-200 hover:bg-gray-300 text-gray-600 hover:text-gray-800 rounded-full transition-colors duration-200"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>

                        {/* **THAY ĐỔI 4: Thêm khối giao diện cho các nút Radio** */}
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Chọn văn phong trả lời:
                            </label>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                {styleOptions.map((option) => (
                                    <label key={option.value} htmlFor={option.value} className="flex items-center space-x-2 cursor-pointer p-2 rounded-md hover:bg-gray-100 transition-colors duration-200">
                                        <input
                                            type="radio"
                                            id={option.value}
                                            name="commentStyle"
                                            value={option.value}
                                            checked={selectedStyle === option.value}
                                            onChange={() => setSelectedStyle(option.value)}
                                            className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-800">{option.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        
                        <button
                            onClick={handleGenerateReply}
                            className="w-full mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
                            disabled={isLoading}
                        >
                            {isLoading ? <LoadingSpinner /> : 'Tạo 5 Gợi ý Trả lời'}
                        </button>
                    </div>

                    {/* Right Column (Không đổi) */}
                    <div className="md:w-3/5">
                        {error && (
                            <div className="p-3 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-md text-sm shadow mb-4" role="alert">
                                <p className="font-semibold">Lỗi:</p>
                                <p>{error}</p>
                            </div>
                        )}

                        {!error && !isLoading && replySuggestions.length === 0 && !articleContent && (
                             <div className="p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-md text-sm shadow text-center">
                                <p>Nhập nội dung bài viết, chọn văn phong và nhấn nút "Tạo Gợi Ý" để xem kết quả tại đây.</p>
                            </div>
                        )}
                        
                        {!error && !isLoading && replySuggestions.length === 0 && articleContent && (
                             <div className="p-4 bg-yellow-50 border border-yellow-300 text-yellow-700 rounded-md text-sm shadow text-center">
                                <p>Nhấn nút "Tạo Gợi Ý" để AI phân tích và đưa ra các đề xuất trả lời.</p>
                            </div>
                        )}


                        {replySuggestions.length > 0 && (
                            <div>
                                <div className="space-y-4 max-h-[60vh] md:max-h-[calc(100vh-280px)] overflow-y-auto pr-2 custom-scrollbar">
                                    {replySuggestions.map((reply, index) => (
                                        <ReplyCard key={index} reply={reply} index={index} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default App;