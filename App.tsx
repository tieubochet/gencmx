
import React, { useState, useCallback } from 'react';
import { ReplySuggestion } from './types';
import { generateReplySuggestions } from './services/geminiService';

// LoadingSpinner component defined outside App to prevent re-creation on re-renders
const LoadingSpinner: React.FC = () => (
    <div className="flex items-center justify-center">
        <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Đang tạo...
    </div>
);

// ReplyCard component defined outside App
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
                    <span className="font-semibold text-gray-700 text-sm">Bản gốc:</span>
                    <button 
                        onClick={() => handleCopyToClipboard(reply.originalReply, 'original')}
                        className={`text-xs ${copiedOriginal ? 'bg-green-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'} font-medium py-1 px-2 rounded transition-all duration-200 min-w-[70px]`}
                        title="Sao chép bản gốc"
                    >
                        {copiedOriginal ? 'Đã chép!' : 'Sao chép'}
                    </button>
                </div>
                <p className="text-gray-800 leading-relaxed break-words whitespace-pre-wrap bg-white p-2 rounded border border-gray-200 text-lg">
                    {reply.originalReply}
                </p>
            </div>

            <div>
                <p className="text-gray text-m opacity-75">
                    Dịch: {reply.vietnameseTranslation}
                </p>
            </div>
        </div>
    );
};


const App: React.FC = () => {
    const [articleContent, setArticleContent] = useState<string>('');
    const [replySuggestions, setReplySuggestions] = useState<ReplySuggestion[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');

    const handleGenerateReply = useCallback(async () => {
        setError('');
        // Do not clear previous suggestions immediately, clear them only on successful new generation or if explicitly desired
        // setReplySuggestions([]); 
        if (!articleContent.trim()) {
            setError('Vui lòng nhập nội dung bài viết.');
            return;
        }

        setIsLoading(true);
        try {
            const suggestions = await generateReplySuggestions(articleContent);
            setReplySuggestions(suggestions);
        } catch (err: any) {
            setError(err.message || 'Đã xảy ra lỗi không xác định.');
            setReplySuggestions([]); // Clear suggestions on error
            console.error('Error generating replies:', err);
        } finally {
            setIsLoading(false);
        }
    }, [articleContent]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 to-sky-100 flex flex-col items-center justify-center p-4 selection:bg-blue-200">
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-4xl border border-gray-200 transform transition-all duration-500">

                <div className="md:flex md:space-x-6">
                    {/* Left Column */}
                    <div className="md:w-2/5 mb-6 md:mb-0 flex flex-col">
  
                        <textarea
                            id="articleContent"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 resize-y min-h-[200px] sm:min-h-[250px] text-gray-800 placeholder-gray-400 shadow-sm flex-grow"
                            placeholder="Dán nội dung bài viết vào đây... Ví dụ: 'Bài viết này thảo luận về tầm quan trọng của trí tuệ nhân tạo...'"
                            value={articleContent}
                            onChange={(e) => setArticleContent(e.target.value)}
                        ></textarea>
                        
                        <button
                            onClick={handleGenerateReply}
                            className="w-full mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
                            disabled={isLoading}
                        >
                            {isLoading ? <LoadingSpinner /> : 'Tạo 5 Gợi ý Trả lời'}
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

                        {!error && !isLoading && replySuggestions.length === 0 && !articleContent && (
                             <div className="p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-md text-sm shadow text-center">
                                <p>Nhập nội dung bài viết ở cột bên trái và nhấn nút "Tạo Gợi Ý" để xem kết quả tại đây.</p>
                            </div>
                        )}
                        
                        {!error && !isLoading && replySuggestions.length === 0 && articleContent && (
                             <div className="p-4 bg-yellow-50 border border-yellow-300 text-yellow-700 rounded-md text-sm shadow text-center">
                                <p>Nhấn nút "Tạo Gợi Ý" để AI phân tích và đưa ra các đề xuất trả lời.</p>
                            </div>
                        )}


                        {replySuggestions.length > 0 && (
                            <div>
                                <h2 className="text-xl font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-200">
                                    Các gợi ý trả lời từ AI:
                                </h2>
                                <div className="space-y-4 max-h-[60vh] md:max-h-[calc(100vh-280px)] overflow-y-auto pr-2 custom-scrollbar">
                                    {replySuggestions.map((reply, index) => (
                                        <ReplyCard key={index} reply={reply} index={index} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                 <footer className="mt-8 pt-4 border-t border-gray-200 text-center text-xs text-gray-500">
                    Powered by Gemini API
                </footer>
            </div>
        </div>
    );
};

export default App;
