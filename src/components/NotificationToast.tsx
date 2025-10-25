'use client'

import { useEffect, useState } from 'react'

export interface Notification {
  id: string
  type: 'info' | 'warning' | 'error' | 'success'
  title: string
  message: string
  duration?: number // milliseconds, default 5000
}

interface NotificationToastProps {
  notifications: Notification[]
  onDismiss: (id: string) => void
}

export default function NotificationToast({ notifications, onDismiss }: NotificationToastProps) {
  useEffect(() => {
    notifications.forEach((notification) => {
      const duration = notification.duration || 5000
      const timer = setTimeout(() => {
        onDismiss(notification.id)
      }, duration)

      return () => clearTimeout(timer)
    })
  }, [notifications, onDismiss])

  if (notifications.length === 0) return null

  const getTypeStyles = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-500 border-green-600'
      case 'error':
        return 'bg-red-500 border-red-600'
      case 'warning':
        return 'bg-yellow-500 border-yellow-600'
      case 'info':
      default:
        return 'bg-blue-500 border-blue-600'
    }
  }

  const getTypeIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return '✓'
      case 'error':
        return '✕'
      case 'warning':
        return '⚠'
      case 'info':
      default:
        return 'ℹ'
    }
  }

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`${getTypeStyles(notification.type)} border-2 rounded-lg shadow-lg p-4 text-white animate-slide-in-right`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <span className="text-2xl font-bold flex-shrink-0">
                {getTypeIcon(notification.type)}
              </span>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm mb-1">{notification.title}</h4>
                <p className="text-xs opacity-90 break-words">{notification.message}</p>
              </div>
            </div>
            <button
              onClick={() => onDismiss(notification.id)}
              className="text-white hover:text-gray-200 flex-shrink-0 text-lg font-bold leading-none"
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
