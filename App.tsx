import React, { useState, useCallback } from 'react';
import { ReplySuggestion } from './types';
// === THAY ĐỔI 1: Import thêm hàm summarizeArticle ===
import { generateReplySuggestions, summarizeArticle, CommentStyle } from './services/geminiService';

// === THAY ĐỔI 2: Định nghĩa kiểu cho chế độ hoạt động của App ===
type AppMode = 'reply' | 'summary';

// LoadingSpinner component (không đổi)
const LoadingSpinner: React.FC = () => (
    <div className="flex items-center justify-center">
        <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Đang xử lý...
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
                }, 2000);
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

// === THAY ĐỔI 3: Component mới để hiển thị kết quả tóm tắt ===
interface SummaryCardProps {
    summary: string;
}
const SummaryCard: React.FC<SummaryCardProps> = ({ summary }) => {
    const [copied, setCopied] = useState(false);

    const handleCopyToClipboard = useCallback((text: string) => {
        navigator.clipboard.writeText(text)
            .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            })
            .catch(err => console.error("Failed to copy:", err));
    }, []);

    return (
        <div className="p-4 bg-gradient-to-br from-green-50 to-teal-50 rounded-lg border border-green-200 shadow-sm">
            <div className="flex justify-between items-center mb-2">
                 <p className="text-lg font-semibold text-green-700">Nội dung tóm tắt</p>
                 <button
                    onClick={() => handleCopyToClipboard(summary)}
                    className={`text-xs ${copied ? 'bg-green-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'} font-medium py-1 px-2 rounded transition-all duration-200 min-w-[70px]`}
                    title="Sao chép nội dung tóm tắt"
                 >
                    {copied ? 'Đã chép!' : 'Sao chép'}
                 </button>
            </div>
            <p className="text-gray-800 leading-relaxed break-words whitespace-pre-wrap bg-white p-3 rounded border border-gray-200">
                {summary}
            </p>
        </div>
    );
};


const App: React.FC = () => {
    const [articleContent, setArticleContent] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');

    // === THAY ĐỔI 4: Cập nhật State ===
    const [mode, setMode] = useState<AppMode>('reply'); // State cho chế độ: 'reply' hoặc 'summary'
    const [selectedStyle, setSelectedStyle] = useState<CommentStyle>('humorous');
    const [replySuggestions, setReplySuggestions] = useState<ReplySuggestion[]>([]);
    const [summary, setSummary] = useState<string>(''); // State để lưu kết quả tóm tắt


    // === THAY ĐỔI 5: Cập nhật hàm xử lý chính để bao gồm cả 2 chế độ ===
    const handleGenerate = useCallback(async () => {
        setError('');
        if (!articleContent.trim()) {
            setError('Vui lòng nhập nội dung bài viết.');
            return;
        }

        setIsLoading(true);
        setReplySuggestions([]); // Xóa kết quả cũ
        setSummary('');         // Xóa kết quả cũ

        try {
            if (mode === 'reply') {
                const suggestions = await generateReplySuggestions(articleContent, selectedStyle);
                setReplySuggestions(suggestions);
            } else { // mode === 'summary'
                const summaryResult = await summarizeArticle(articleContent);
                setSummary(summaryResult);
            }
        } catch (err: any) {
            setError(err.message || 'Đã xảy ra lỗi không xác định.');
            console.error('Error generating content:', err);
        } finally {
            setIsLoading(false);
        }
    }, [articleContent, mode, selectedStyle]); // Thêm 'mode' vào dependency array

    const handleResetContent = useCallback(() => {
        setArticleContent('');
    }, []);

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

                        {/* === THAY ĐỔI 6: Giao diện chọn chế độ === */}
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg border">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Chọn chức năng:
                            </label>
                            <div className="flex space-x-4">
                                <label htmlFor="mode-reply" className="flex-1 flex items-center space-x-2 cursor-pointer p-2 rounded-md hover:bg-gray-100 transition-colors duration-200">
                                    <input type="radio" id="mode-reply" name="appMode" value="reply" checked={mode === 'reply'} onChange={() => setMode('reply')} className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"/>
                                    <span className="text-sm text-gray-800">Gợi ý trả lời</span>
                                </label>
                                <label htmlFor="mode-summary" className="flex-1 flex items-center space-x-2 cursor-pointer p-2 rounded-md hover:bg-gray-100 transition-colors duration-200">
                                    <input type="radio" id="mode-summary" name="appMode" value="summary" checked={mode === 'summary'} onChange={() => setMode('summary')} className="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500"/>
                                    <span className="text-sm text-gray-800">Tóm tắt </span>
                                </label>
                            </div>
                        </div>

                        {/* === THAY ĐỔI 7: Chỉ hiển thị chọn văn phong khi ở chế độ 'reply' === */}
                        {mode === 'reply' && (
                            <div className="mt-4 transition-opacity duration-300">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Chọn văn phong trả lời:
                                </label>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                    {styleOptions.map((option) => (
                                        <label key={option.value} htmlFor={option.value} className="flex items-center space-x-2 cursor-pointer p-2 rounded-md hover:bg-gray-100 transition-colors duration-200">
                                            <input type="radio" id={option.value} name="commentStyle" value={option.value} checked={selectedStyle === option.value} onChange={() => setSelectedStyle(option.value)} className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"/>
                                            <span className="text-sm text-gray-800">{option.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        <button
                            onClick={handleGenerate}
                            className="w-full mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
                            disabled={isLoading}
                        >
                            {/* === THAY ĐỔI 8: Cập nhật text của nút === */}
                            {isLoading ? <LoadingSpinner /> : (mode === 'reply' ? 'Tạo Gợi ý Trả lời' : 'Tóm tắt Nội dung')}
                        </button>
                    </div>

                    {/* Right Column */}
                    <div className="md:w-3/5">
                        {error && (
                            <div className="p-3 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-md text-sm shadow mb-4" role="alert">
                                <p className="font-semibold">Lỗi:</p>
                                <p>{error}</p>
                            </div>
                        )}

                        {/* === THAY ĐỔI 9: Cập nhật logic hiển thị kết quả và placeholder === */}
                        {!error && !isLoading && replySuggestions.length === 0 && !summary && (
                            <div className="p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-md text-sm shadow text-center h-full flex items-center justify-center">
                                <p>Chọn chức năng, nhập nội dung và nhấn nút để xem kết quả tại đây.</p>
                            </div>
                        )}

                        {summary && (
                            <SummaryCard summary={summary} />
                        )}

                        {replySuggestions.length > 0 && (
                            <div className="space-y-4 max-h-[60vh] md:max-h-[calc(100vh-280px)] overflow-y-auto pr-2 custom-scrollbar">
                                {replySuggestions.map((reply, index) => (
                                    <ReplyCard key={index} reply={reply} index={index} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default App;