import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Search } from 'lucide-react';
import { Button } from '../components/ui/button';

export function NotFoundPage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full text-center">
                {/* 404 Animation */}
                <div className="relative mb-8">
                    <div className="text-[180px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 leading-none select-none">
                        404
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-32 h-32 bg-blue-100 rounded-full animate-pulse opacity-50" />
                    </div>
                </div>

                {/* Error Message */}
                <div className="space-y-4 mb-8">
                    <h1 className="text-4xl font-bold text-gray-900">
                        Trang không tìm thấy
                    </h1>
                    <p className="text-lg text-gray-600 max-w-md mx-auto">
                        Xin lỗi, trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
                    </p>
                </div>

                {/* Illustration */}
                <div className="mb-8 flex justify-center">
                    <div className="relative">
                        <Search className="w-24 h-24 text-gray-300" strokeWidth={1.5} />
                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xl font-bold">✕</span>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <Button
                        onClick={() => navigate(-1)}
                        variant="outline"
                        size="lg"
                        className="w-full sm:w-auto"
                    >
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        Quay lại
                    </Button>
                    <Button
                        onClick={() => navigate('/')}
                        size="lg"
                        className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                        <Home className="w-5 h-5 mr-2" />
                        Về trang chủ
                    </Button>
                </div>

                {/* Helpful Links */}
                <div className="mt-12 pt-8 border-t border-gray-200">
                    <p className="text-sm text-gray-500 mb-4">Có thể bạn đang tìm kiếm:</p>
                    <div className="flex flex-wrap gap-3 justify-center">
                        <button
                            onClick={() => navigate('/projects')}
                            className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                        >
                            Dự án
                        </button>
                        <span className="text-gray-300">•</span>
                        <button
                            onClick={() => navigate('/tasks')}
                            className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                        >
                            Nhiệm vụ
                        </button>
                        <span className="text-gray-300">•</span>
                        <button
                            onClick={() => navigate('/profile')}
                            className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                        >
                            Hồ sơ
                        </button>
                    </div>
                </div>

                {/* Footer Note */}
                <div className="mt-8">
                    <p className="text-xs text-gray-400">
                        Nếu bạn nghĩ đây là lỗi, vui lòng liên hệ với quản trị viên.
                    </p>
                </div>
            </div>
        </div>
    );
}
