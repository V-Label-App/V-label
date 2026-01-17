import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext'
import { Toaster } from 'sonner'

import { logger } from './utils/logger'

logger.info('Application starting...');
logger.success('Environment:', import.meta.env.MODE);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
      <Toaster
        position="bottom-right"
        closeButton // 1. Thêm nút X để tắt
        // richColors // Lưu ý: Nếu bạn muốn TOÀN BỘ là đen trắng, hãy bỏ richColors đi. Giữ lại nếu muốn icon Success/Error vẫn có màu.
        toastOptions={{
          // 2. Custom style: Nền trắng, chữ đen, viền đen
          style: {
            background: 'white',
            color: 'black',
            border: 'solid black',
          },
          // 3. Custom thêm cho nút đóng (nếu muốn nó đồng bộ style)
          // classNames: {
          //   toast: 'font-sans', // Ví dụ: đổi font chữ
          //   title: 'text-lg font-bold', // Ví dụ: làm tiêu đề to hơn
          //   closeButton: '!bg-white !text-black !border-black border hover:!bg-gray-100', // Style riêng cho nút X
          // },
        }}
      />
    </AuthProvider>
  </StrictMode>,
)
