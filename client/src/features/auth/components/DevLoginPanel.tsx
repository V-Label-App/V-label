import { useState } from 'react'
import { useAuth } from '../../../context/AuthContext'

interface DevLoginPanelProps {
    onSuccess?: () => void
}

const DEV_ROLES = [
    { role: 'ADMIN' as const, label: '👑 Admin', color: 'bg-purple-600 hover:bg-purple-700' },
    { role: 'MANAGER' as const, label: '📊 Manager', color: 'bg-blue-600 hover:bg-blue-700' },
    { role: 'REVIEWER' as const, label: '✅ Reviewer', color: 'bg-green-600 hover:bg-green-700' },
    { role: 'ANNOTATOR' as const, label: '✏️ Annotator', color: 'bg-orange-600 hover:bg-orange-700' },
]

export default function DevLoginPanel({ onSuccess }: DevLoginPanelProps) {
    const { devLogin } = useAuth()
    const [error, setError] = useState('')
    const [loadingRole, setLoadingRole] = useState<string | null>(null)

    // Only show in development
    if (import.meta.env.MODE !== 'development') {
        return null
    }

    const handleDevLogin = async (role: 'ADMIN' | 'MANAGER' | 'REVIEWER' | 'ANNOTATOR') => {
        setError('')
        setLoadingRole(role)

        try {
            await devLogin(role)
            onSuccess?.()
        } catch (err: any) {
            setError(err.response?.data?.error || 'Dev login failed')
        } finally {
            setLoadingRole(null)
        }
    }

    return (
        <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-1">🚀 Fast Login (Dev Only)</h3>
                <p className="text-xs text-gray-500">Click to instantly login as any role</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
                {DEV_ROLES.map(({ role, label, color }) => (
                    <button
                        key={role}
                        onClick={() => handleDevLogin(role)}
                        disabled={loadingRole !== null}
                        className={`
              px-4 py-3 text-white rounded-lg transition-all font-medium text-sm
              ${color}
              ${loadingRole === role ? 'opacity-75 cursor-wait' : ''}
              ${loadingRole && loadingRole !== role ? 'opacity-50 cursor-not-allowed' : ''}
            `}
                    >
                        {loadingRole === role ? '...' : label}
                    </button>
                ))}
            </div>

            {error && (
                <div className="mt-3 p-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded">
                    {error}
                </div>
            )}
        </div>
    )
}
