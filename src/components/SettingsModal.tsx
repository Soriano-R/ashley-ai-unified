'use client'

import { useState } from 'react'
import { sanitizeExportData, canUserExport, logExportAttempt } from "../utils/exportSecurity"
import { Message, Session, User } from "../types"
import MemoryManager from './MemoryManager'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  user: User | null
}

export default function SettingsModal({ isOpen, onClose, user }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState('appearance')
  const [showMemoryManager, setShowMemoryManager] = useState(false)
  
  // Password change state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [passwordErrors, setPasswordErrors] = useState<{[key: string]: string}>({})
  const [passwordChangeStatus, setPasswordChangeStatus] = useState<'idle' | 'success' | 'error'>('idle')
  
  // Settings state
  const [settings, setSettings] = useState({
    // Appearance
    theme: 'dark',
    fontSize: 'medium',
    compactMode: false,
    sidebarDefault: 'remember',
    
    // Avatar & Visual
    userAvatar: 'initials', // 'initials', 'uploaded', 'generated'
    avatarColor: 'blue',
    chatBubbleStyle: 'modern', // 'modern', 'classic', 'minimal'
    chatWidth: 'medium', // 'narrow', 'medium', 'wide'
    
    // Chat Preferences
    defaultModel: 'gpt-4',
    responseLength: 'balanced',
    autoScroll: true,
    messageTimestamps: false,
    codeHighlighting: true,
    memoryEnabled: true,
    memoryRetention: '30days',
    
    // Code Execution
    codeExecution: true,
    
    // File Uploads
    fileAttachments: true,
    maxFileSize: '10mb',
    
    // AI Creativity
    creativity: 'balanced',
    
    // Voice & Audio
    voiceInput: true,
    voiceOutput: false,
    voiceSpeed: 'normal',
    voiceLanguage: 'en-US',
    
    // Data & Privacy
    chatHistory: true,
    autoDelete: 'never',
    
    // Model Training & Data Usage
    allowModelTraining: false, // Critical privacy setting
    allowDataImprovement: false,
    anonymousUsage: true,
    
    // Analytics (user level)
    analyticsUsageData: true,
    analyticsPerformance: true,
    analyticsErrorReporting: true,
    analyticsFeatureUsage: false,
    
    // Notifications
    responseReady: true,
    typingIndicators: true,
    errorAlerts: 'popup',
    
    // Shortcuts & Accessibility
    sendOnEnter: true,
    screenReader: false,
    highContrast: false,
    
    // Advanced Appearance
    interfaceScale: 'normal', // 'small', 'normal', 'large'
    animationsEnabled: true,
    reducedMotion: false,
    customThemeColors: {
      primary: '#3b82f6',
      accent: '#10b981',
      background: '#111827'
    },
    
    // Security & Session
    sessionTimeout: '1hour', // '15min', '30min', '1hour', 'never'
    requirePasswordForSettings: false,
    twoFactorEnabled: false,
    loginRememberMe: true,
    
    // Advanced Chat Features
    autoSaveInterval: '5min', // '1min', '5min', '10min'
    spellCheck: true,
    autoComplete: true,
    suggestionShortcuts: true,
    markdownPreview: true,
    
    // Data Management
  exportFormat: 'csv', // 'json', 'csv', 'xml'
    bulkDelete: false,
    storageQuota: '1gb',
    offlineMode: false,
    
    // Performance
    preloadResponses: true,
    cacheResponses: true,
    backgroundSync: true,
    lowPowerMode: false
  })

  const updateSetting = (key: string, value: string | number | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  // Password change handlers
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Reset previous errors and status
    setPasswordErrors({})
    setPasswordChangeStatus('idle')
    
    // Validation
    const errors: {[key: string]: string} = {}
    
    if (!passwordForm.currentPassword) {
      errors.currentPassword = 'Current password is required'
    }
    
    if (!passwordForm.newPassword) {
      errors.newPassword = 'New password is required'
    } else if (passwordForm.newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters'
    }
    
    if (!passwordForm.confirmPassword) {
      errors.confirmPassword = 'Please confirm your new password'
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }
    
    if (passwordForm.currentPassword === passwordForm.newPassword) {
      errors.newPassword = 'New password must be different from current password'
    }
    
    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors)
      return
    }
    
    try {
      // TODO: In production, this would call the backend API
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // For demo purposes, just show success
      setPasswordChangeStatus('success')
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      
      setTimeout(() => {
        setPasswordChangeStatus('idle')
      }, 3000)
      
    } catch {
      setPasswordChangeStatus('error')
      setPasswordErrors({ general: 'Failed to change password. Please try again.' })
    }
  }

  const updatePasswordForm = (field: string, value: string) => {
    setPasswordForm(prev => ({ ...prev, [field]: value }))
    // Clear specific field error when user starts typing
    if (passwordErrors[field]) {
      setPasswordErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  // Secure Export Handlers
  const handleSecureExport = async (exportType: "chat" | "history", format: "pdf" | "txt") => {
    if (!user) {
      alert("Please sign in to export data")
      return
    }

    try {
      // Check if user can export this data
      const canExport = canUserExport(user.id, exportType, {})
      
      if (!canExport) {
        alert("You do not have permission to export this data")
        logExportAttempt(user.id, exportType, false, 0)
        return
      }

      // For demo purposes - in real app, this would connect to your backend
      const mockUserData = {
        sessions: [], // Would come from backend
        messages: []  // Would come from backend
      }

      // Sanitize the data to only include user's own content
      const safeData = sanitizeExportData(user.id, mockUserData.sessions, user)
      
      // Create export content
      let exportContent = ""
      let fileName = ""
      
      if (exportType === "chat") {
        exportContent = formatChatExport(safeData.userMessages, format)
        fileName = `chat-export-${Date.now()}.${format}`
      } else {
        exportContent = formatHistoryExport(safeData.userSessions, format)
        fileName = `history-export-${Date.now()}.${format}`
      }

      // Create and download file
      const blob = new Blob([exportContent], { 
        type: format === "pdf" ? "application/pdf" : "text/plain" 
      })
      
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = fileName
      link.click()
      URL.revokeObjectURL(url)

      // Log successful export
      logExportAttempt(user.id, exportType, true, blob.size)
      
    } catch (error) {
      console.error("Export failed:", error)
      alert("Export failed. Please try again.")
      logExportAttempt(user.id, exportType, false, 0)
    }
  }

  const formatChatExport = (messages: Message[], format: string): string => {
    if (format === "txt") {
      return messages.map(msg => 
        `[${msg.timestamp}] ${msg.role}: ${msg.content}`
      ).join("\n\n")
    }
    // For PDF, you'd use a PDF library - this is just placeholder
    return `PDF Export of Chat (${messages.length} messages)`
  }

  const formatHistoryExport = (sessions: Session[], format: string): string => {
    if (format === "txt") {
      return sessions.map(session => 
        `Session: ${session.title}\n` +
        session.messages.map((msg) => 
          `[${msg.timestamp}] ${msg.role}: ${msg.content}`
        ).join("\n") + "\n\n"
      ).join("\n---\n\n")
    }
    // For PDF, you'd use a PDF library
    return `PDF Export of History (${sessions.length} sessions)`
  }

  const tabs = [
    { id: 'appearance', name: 'Appearance' },
    { id: 'chat', name: 'Chat' },
    { id: 'voice', name: 'Voice & Audio' },
    { id: 'privacy', name: 'Data & Privacy' },
    { id: 'notifications', name: 'Notifications' },
    { id: 'accessibility', name: 'Shortcuts & Accessibility' },
    { id: 'advanced', name: 'Advanced' },
    { id: 'security', name: 'Security & Session' },
    { id: 'developer', name: 'Developer Tools' },
    { id: 'performance', name: 'Performance' }
  ]

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <h2 className="text-xl font-semibold text-white">Settings</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
            >
              <span className="sr-only">Close</span>
            </button>
          </div>

          <div className="flex h-[70vh]">
            {/* Sidebar Tabs */}
            <div className="w-64 bg-gray-950 border-r border-gray-700 overflow-y-auto">
              <div className="p-4">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors mb-1 ${
                      activeTab === tab.id
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                  >
                    {tab.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Appearance Tab */}
              {activeTab === 'appearance' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-white">Appearance</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Theme</label>
                      <select
                        value={settings.theme}
                        onChange={(e) => updateSetting('theme', e.target.value)}
                        className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white"
                      >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                        <option value="system">System</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Font Size</label>
                      <select
                        value={settings.fontSize}
                        onChange={(e) => updateSetting('fontSize', e.target.value)}
                        className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white"
                      >
                        <option value="small">Small</option>
                        <option value="medium">Medium</option>
                        <option value="large">Large</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-300">Compact Mode</label>
                      <button
                        onClick={() => updateSetting('compactMode', !settings.compactMode)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.compactMode ? 'bg-blue-600' : 'bg-gray-600'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.compactMode ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                      <select
                        value={settings.sidebarDefault}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateSetting('sidebarDefault', e.target.value)}
                        className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white"
                      >
                        <option value="expanded">Always Expanded</option>
                        <option value="collapsed">Always Collapsed</option>
                        <option value="remember">Remember Last State</option>
                      </select>
                    </div>

                    <div className="border-t border-gray-700 pt-4">
                      <h4 className="text-sm font-medium text-gray-300 mb-3">Avatar & Visual Style</h4>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Avatar Style</label>
                          <select
                            value={settings.userAvatar}
                            onChange={(e) => updateSetting('userAvatar', e.target.value)}
                            className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white"
                          >
                            <option value="initials">Initials (Default)</option>
                            <option value="uploaded">Upload Custom Image</option>
                            <option value="generated">AI Generated Avatar</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Avatar Color</label>
                          <select
                            value={settings.avatarColor}
                            onChange={(e) => updateSetting('avatarColor', e.target.value)}
                            className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white"
                          >
                            <option value="blue">Blue</option>
                            <option value="green">Green</option>
                            <option value="purple">Purple</option>
                            <option value="pink">Pink</option>
                            <option value="orange">Orange</option>
                            <option value="red">Red</option>
                            <option value="gray">Gray</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Chat Bubble Style</label>
                          <select
                            value={settings.chatBubbleStyle}
                            onChange={(e) => updateSetting('chatBubbleStyle', e.target.value)}
                            className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white"
                          >
                            <option value="modern">Modern (Rounded corners)</option>
                            <option value="classic">Classic (Square corners)</option>
                            <option value="minimal">Minimal (No borders)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Chat Width</label>
                          <select
                            value={settings.chatWidth}
                            onChange={(e) => updateSetting('chatWidth', e.target.value)}
                            className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white"
                          >
                            <option value="narrow">Narrow (Focused reading)</option>
                            <option value="medium">Medium (Balanced)</option>
                            <option value="wide">Wide (Maximum width)</option>
                          </select>
                        </div>
                      </div>
                      
                      {/* Advanced Appearance Settings */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-300 mb-3">Advanced Appearance</h4>
                        <div className="space-y-4">
                          {/* Interface Scale */}
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Interface Scale</label>
                            <select 
                              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              value={settings.interfaceScale}
                              onChange={(e) => updateSetting('interfaceScale', e.target.value)}
                            >
                              <option value="small">Small (90%)</option>
                              <option value="normal">Normal (100%)</option>
                              <option value="large">Large (110%)</option>
                            </select>
                          </div>
                          
                          {/* Animations */}
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-300">Enable Animations</span>
                            <button
                              onClick={() => updateSetting('animationsEnabled', !settings.animationsEnabled)}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                settings.animationsEnabled ? 'bg-blue-600' : 'bg-gray-600'
                              }`}
                            >
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                settings.animationsEnabled ? 'translate-x-6' : 'translate-x-1'
                              }`} />
                            </button>
                          </div>
                          
                          {/* Reduced Motion */}
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-300">Reduced Motion (Accessibility)</span>
                            <button
                              onClick={() => updateSetting('reducedMotion', !settings.reducedMotion)}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                settings.reducedMotion ? 'bg-blue-600' : 'bg-gray-600'
                              }`}
                            >
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                settings.reducedMotion ? 'translate-x-6' : 'translate-x-1'
                              }`} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Chat Preferences Tab */}
              {activeTab === 'chat' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-white">Chat Preferences</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Model (Provider)</label>
                      <select
                        value={settings.defaultModel}
                        onChange={(e) => {
                          updateSetting('defaultModel', e.target.value)
                          if (e.target.value !== 'default') {
                            window.localStorage.setItem('lastModel', e.target.value)
                          }
                        }}
                        className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white"
                      >
                        <option value="default">Default</option>
                        <optgroup label="OpenAI">
                          <option value="openai-gpt-3.5-turbo">OpenAI GPT-3.5 Turbo</option>
                          <option value="openai-gpt-4">OpenAI GPT-4</option>
                          <option value="openai-gpt-4-turbo">OpenAI GPT-4 Turbo</option>
                          <option value="openai-gpt-4o">OpenAI GPT-4o</option>
                        </optgroup>
                        <optgroup label="Anthropic">
                          <option value="anthropic-claude">Anthropic Claude</option>
                        </optgroup>
                        <optgroup label="Meta">
                          <option value="meta-llama-3">Meta Llama-3</option>
                        </optgroup>
                        <optgroup label="Qwen">
                          <option value="qwen2.5-7b">Qwen2.5-7B</option>
                        </optgroup>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Response Length</label>
                      <select
                        value={settings.responseLength}
                        onChange={(e) => updateSetting('responseLength', e.target.value)}
                        className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white"
                      >
                        <option value="concise">Concise</option>
                        <option value="balanced">Balanced</option>
                        <option value="detailed">Detailed</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-300">Auto-scroll to new messages</label>
                      <button
                        onClick={() => updateSetting('autoScroll', !settings.autoScroll)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.autoScroll ? 'bg-blue-600' : 'bg-gray-600'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.autoScroll ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-300">Show message timestamps</label>
                      <button
                        onClick={() => updateSetting('messageTimestamps', !settings.messageTimestamps)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.messageTimestamps ? 'bg-blue-600' : 'bg-gray-600'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.messageTimestamps ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-300">Code syntax highlighting</label>
                      <button
                        onClick={() => updateSetting('codeHighlighting', !settings.codeHighlighting)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.codeHighlighting ? 'bg-blue-600' : 'bg-gray-600'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.codeHighlighting ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>

                    <div className="border-t border-gray-700 pt-4">
                      <h4 className="text-sm font-medium text-gray-300 mb-3">Memory & Context</h4>
                      
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <label className="text-sm font-medium text-gray-300">AI Memory</label>
                          <p className="text-xs text-gray-400">Let AI remember context across conversations</p>
                        </div>
                        <button
                          onClick={() => updateSetting('memoryEnabled', !settings.memoryEnabled)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            settings.memoryEnabled ? 'bg-blue-600' : 'bg-gray-600'
                          }`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settings.memoryEnabled ? 'translate-x-6' : 'translate-x-1'
                          }`} />
                        </button>
                      </div>

                      {settings.memoryEnabled && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Memory Retention</label>
                            <select
                              value={settings.memoryRetention}
                              onChange={(e) => updateSetting('memoryRetention', e.target.value)}
                              className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white"
                            >
                              <option value="7days">7 days</option>
                              <option value="30days">30 days</option>
                              <option value="90days">90 days</option>
                              <option value="forever">Until manually deleted</option>
                            </select>
                          </div>
                          
                          <button
                            onClick={() => setShowMemoryManager(true)}
                            className="w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-md transition-colors text-sm"
                          >
                            Manage Memories
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-gray-700 pt-4">
                      <h4 className="text-sm font-medium text-gray-300 mb-3">AI Behavior</h4>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Response Creativity</label>
                        <select
                          value={settings.creativity}
                          onChange={(e) => updateSetting('creativity', e.target.value)}
                          className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white"
                        >
                          <option value="precise">Precise & Factual</option>
                          <option value="balanced">Balanced</option>
                          <option value="creative">Creative & Flexible</option>
                        </select>
                        <p className="text-xs text-gray-400 mt-1">Controls how creative vs factual the AI responses are</p>
                      </div>
                    </div>

                    <div className="border-t border-gray-700 pt-4">
                      <h4 className="text-sm font-medium text-gray-300 mb-3">Code Features</h4>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-300">Code Execution</label>
                          <p className="text-xs text-gray-400">Allow AI to run code snippets in sandbox</p>
                        </div>
                        <button
                          onClick={() => updateSetting('codeExecution', !settings.codeExecution)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            settings.codeExecution ? 'bg-blue-600' : 'bg-gray-600'
                          }`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settings.codeExecution ? 'translate-x-6' : 'translate-x-1'
                          }`} />
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-gray-700 pt-4">
                      <h4 className="text-sm font-medium text-gray-300 mb-3">File & Export Options</h4>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium text-gray-300">File Attachments</label>
                            <p className="text-xs text-gray-400">Allow uploading files to conversations</p>
                          </div>
                          <button
                            onClick={() => updateSetting('fileAttachments', !settings.fileAttachments)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              settings.fileAttachments ? 'bg-blue-600' : 'bg-gray-600'
                            }`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings.fileAttachments ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                          </button>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Max File Size</label>
                          <select
                            value={settings.maxFileSize}
                            onChange={(e) => updateSetting('maxFileSize', e.target.value)}
                            className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white"
                            disabled={!settings.fileAttachments}
                          >
                            <option value="5mb">5 MB</option>
                            <option value="10mb">10 MB</option>
                            <option value="25mb">25 MB</option>
                            <option value="50mb">50 MB (Premium)</option>
                          </select>
                        </div>

                        {/* Advanced Chat Features */}
                        <div className="mt-6">
                          <h4 className="text-sm font-medium text-gray-300 mb-3">Advanced Chat Features</h4>
                          <div className="space-y-4">
                            {/* Auto Save Interval */}
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">Auto Save Interval</label>
                              <select 
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={settings.autoSaveInterval}
                                onChange={(e) => updateSetting('autoSaveInterval', e.target.value)}
                              >
                                <option value="1min">Every 1 minute</option>
                                <option value="5min">Every 5 minutes</option>
                                <option value="10min">Every 10 minutes</option>
                              </select>
                            </div>
                            
                            {/* Spell Check */}
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-300">Spell Check</span>
                              <button
                                onClick={() => updateSetting('spellCheck', !settings.spellCheck)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                  settings.spellCheck ? 'bg-blue-600' : 'bg-gray-600'
                                }`}
                              >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                  settings.spellCheck ? 'translate-x-6' : 'translate-x-1'
                                }`} />
                              </button>
                            </div>
                            
                            {/* Auto Complete */}
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-300">Auto Complete Suggestions</span>
                              <button
                                onClick={() => updateSetting('autoComplete', !settings.autoComplete)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                  settings.autoComplete ? 'bg-blue-600' : 'bg-gray-600'
                                }`}
                              >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                  settings.autoComplete ? 'translate-x-6' : 'translate-x-1'
                                }`} />
                              </button>
                            </div>
                            
                            {/* Suggestion Shortcuts */}
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-300">Suggestion Shortcuts (Tab/Enter)</span>
                              <button
                                onClick={() => updateSetting('suggestionShortcuts', !settings.suggestionShortcuts)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                  settings.suggestionShortcuts ? 'bg-blue-600' : 'bg-gray-600'
                                }`}
                              >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                  settings.suggestionShortcuts ? 'translate-x-6' : 'translate-x-1'
                                }`} />
                              </button>
                            </div>
                            
                            {/* Markdown Preview */}
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-300">Live Markdown Preview</span>
                              <button
                                onClick={() => updateSetting('markdownPreview', !settings.markdownPreview)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                  settings.markdownPreview ? 'bg-blue-600' : 'bg-gray-600'
                                }`}
                              >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                  settings.markdownPreview ? 'translate-x-6' : 'translate-x-1'
                                }`} />
                              </button>
                            </div>
                          </div>
                        </div>

                        {user && canUserExport(user.id, "chat", {}) && (
                          <div className="mt-4 space-y-2">
                            <button onClick={() => handleSecureExport("chat", "pdf")} className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors text-sm">
                              Export Current Chat (PDF)
                            </button>
                            <button onClick={() => handleSecureExport("chat", "txt")} className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md transition-colors text-sm">
                              Export Current Chat (TXT)
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Voice & Audio Tab */}
              {activeTab === 'voice' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-white">Voice & Audio</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-300">Voice Input (Microphone)</label>
                      <button
                        onClick={() => updateSetting('voiceInput', !settings.voiceInput)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.voiceInput ? 'bg-blue-600' : 'bg-gray-600'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.voiceInput ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-300">Voice Output (Text-to-Speech)</label>
                      <button
                        onClick={() => updateSetting('voiceOutput', !settings.voiceOutput)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.voiceOutput ? 'bg-blue-600' : 'bg-gray-600'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.voiceOutput ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Voice Speed</label>
                      <select
                        value={settings.voiceSpeed}
                        onChange={(e) => updateSetting('voiceSpeed', e.target.value)}
                        className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white"
                      >
                        <option value="slow">Slow</option>
                        <option value="normal">Normal</option>
                        <option value="fast">Fast</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Voice Language</label>
                      <select
                        value={settings.voiceLanguage}
                        onChange={(e) => updateSetting('voiceLanguage', e.target.value)}
                        className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white"
                      >
                        <option value="en-US">English (US)</option>
                        <option value="en-GB">English (UK)</option>
                        <option value="es-ES">Spanish</option>
                        <option value="fr-FR">French</option>
                        <option value="de-DE">German</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Data & Privacy Tab */}
              {activeTab === 'privacy' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-white">Data & Privacy</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-300">Save Chat History</label>
                      <button
                        onClick={() => updateSetting('chatHistory', !settings.chatHistory)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.chatHistory ? 'bg-blue-600' : 'bg-gray-600'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.chatHistory ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Auto-delete Chats</label>
                      <select
                        value={settings.autoDelete}
                        onChange={(e) => updateSetting('autoDelete', e.target.value)}
                        className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white"
                      >
                        <option value="30days">After 30 days</option>
                        <option value="90days">After 90 days</option>
                        <option value="never">Never</option>
                      </select>
                    </div>

                    {/* Model Training & Data Usage Section */}
                    <div className="border-t border-gray-700 pt-4">
                      <h4 className="text-sm font-medium text-gray-300 mb-3">AI Model Training & Data Usage</h4>
                      <p className="text-xs text-gray-400 mb-4">Control how your conversations are used to improve AI models</p>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium text-gray-300">Allow Model Training</label>
                            <p className="text-xs text-gray-400">Use my conversations to train and improve AI models</p>
                            <p className="text-xs text-red-400">⚠️ When disabled, conversations are not used for training</p>
                          </div>
                          <button
                            onClick={() => updateSetting('allowModelTraining', !settings.allowModelTraining)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              settings.allowModelTraining ? 'bg-blue-600' : 'bg-gray-600'
                            }`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings.allowModelTraining ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium text-gray-300">Data Quality Improvement</label>
                            <p className="text-xs text-gray-400">Use interactions to improve response quality and safety</p>
                          </div>
                          <button
                            onClick={() => updateSetting('allowDataImprovement', !settings.allowDataImprovement)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              settings.allowDataImprovement ? 'bg-blue-600' : 'bg-gray-600'
                            }`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings.allowDataImprovement ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium text-gray-300">Anonymous Usage Data</label>
                            <p className="text-xs text-gray-400">Share anonymized usage patterns (no personal content)</p>
                          </div>
                          <button
                            onClick={() => updateSetting('anonymousUsage', !settings.anonymousUsage)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              settings.anonymousUsage ? 'bg-blue-600' : 'bg-gray-600'
                            }`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings.anonymousUsage ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                          </button>
                        </div>
                        
                        <div className="bg-gray-800 rounded-lg p-3 mt-4">
                          <p className="text-xs text-gray-300">
                            <strong>Data Privacy Notice:</strong> When model training is disabled, your conversations 
                            are only used to provide you with responses and are not stored for training purposes. 
                            This may affect the quality of future AI responses but ensures maximum privacy.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-gray-700 pt-4">
                      <h4 className="text-sm font-medium text-gray-300 mb-3">Analytics & Data Collection</h4>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium text-gray-300">Usage Analytics</label>
                            <p className="text-xs text-gray-400">Session duration, message counts, feature usage</p>
                          </div>
                          <button
                            onClick={() => updateSetting('analyticsUsageData', !settings.analyticsUsageData)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              settings.analyticsUsageData ? 'bg-blue-600' : 'bg-gray-600'
                            }`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings.analyticsUsageData ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium text-gray-300">Performance Data</label>
                            <p className="text-xs text-gray-400">App performance, load times, error reports</p>
                          </div>
                          <button
                            onClick={() => updateSetting('analyticsPerformance', !settings.analyticsPerformance)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              settings.analyticsPerformance ? 'bg-blue-600' : 'bg-gray-600'
                            }`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings.analyticsPerformance ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium text-gray-300">Error Reporting</label>
                            <p className="text-xs text-gray-400">Crash reports and bug data for fixing issues</p>
                          </div>
                          <button
                            onClick={() => updateSetting('analyticsErrorReporting', !settings.analyticsErrorReporting)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              settings.analyticsErrorReporting ? 'bg-blue-600' : 'bg-gray-600'
                            }`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings.analyticsErrorReporting ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium text-gray-300">Feature Usage Tracking</label>
                            <p className="text-xs text-gray-400">Which features are used most for improvements</p>
                          </div>
                          <button
                            onClick={() => updateSetting('analyticsFeatureUsage', !settings.analyticsFeatureUsage)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              settings.analyticsFeatureUsage ? 'bg-blue-600' : 'bg-gray-600'
                            }`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings.analyticsFeatureUsage ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                          </button>
                        </div>

                        <div className="bg-gray-800/50 border border-gray-600 rounded-md p-3 mt-3">
                          <p className="text-xs text-gray-400">
                            <strong>Note:</strong> Analytics data never includes conversation content or personal information. 
                            Only usage patterns and technical data are collected to improve the application.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-gray-700 pt-4">
                      <h4 className="text-sm font-medium text-gray-300 mb-3">Data Export & Management</h4>
                      
                      <div className="space-y-2">
                        {user && canUserExport(user.id, "history", {}) && (
                          <>
                            <button onClick={() => handleSecureExport("history", "pdf")} className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors">
                              Export Chat History (PDF)
                            </button>
                            <button onClick={() => handleSecureExport("history", "txt")} className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors">
                              Export Chat History (TXT)
                            </button>
                          </>
                        )}
                        <button className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors mt-4">
                          Clear All Chat History
                        </button>
                        <p className="text-xs text-gray-400 mt-2">⚠️ Clearing chat history cannot be undone</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-white">Notifications</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-300">Response Ready Notification</label>
                      <button
                        onClick={() => updateSetting('responseReady', !settings.responseReady)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.responseReady ? 'bg-blue-600' : 'bg-gray-600'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.responseReady ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-300">Show Typing Indicators</label>
                      <button
                        onClick={() => updateSetting('typingIndicators', !settings.typingIndicators)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.typingIndicators ? 'bg-blue-600' : 'bg-gray-600'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.typingIndicators ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>

                  </div>
                </div>
              )}

              {/* Shortcuts & Accessibility Tab */}
              {activeTab === 'accessibility' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-white">Shortcuts & Accessibility</h3>
                  
                  <div className="space-y-4">


                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-300">Screen Reader Mode</label>
                      <button
                        onClick={() => updateSetting('screenReader', !settings.screenReader)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.screenReader ? 'bg-blue-600' : 'bg-gray-600'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.screenReader ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-300">High Contrast Mode</label>
                      <button
                        onClick={() => updateSetting('highContrast', !settings.highContrast)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.highContrast ? 'bg-blue-600' : 'bg-gray-600'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.highContrast ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Advanced Settings Tab */}
              {activeTab === 'advanced' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-white">Advanced Settings</h3>
                  
                  <div className="space-y-6">
                    {/* Data Management */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-300 mb-3">Data Management</h4>
                      <div className="space-y-4">
                        {/* Export Format */}
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Default Export Format</label>
                          <select 
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={settings.exportFormat}
                            onChange={(e) => updateSetting('exportFormat', e.target.value)}
                          >
                            <option value="json">JSON (Structured data)</option>
                            <option value="csv">CSV (Spreadsheet compatible)</option>
                            <option value="xml">XML (Markup format)</option>
                          </select>
                        </div>
                        
                        {/* Storage Quota */}
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Storage Quota</label>
                          <select 
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={settings.storageQuota}
                            onChange={(e) => updateSetting('storageQuota', e.target.value)}
                          >
                            <option value="500mb">500 MB</option>
                            <option value="1gb">1 GB</option>
                            <option value="5gb">5 GB (Premium)</option>
                            <option value="unlimited">Unlimited (Enterprise)</option>
                          </select>
                        </div>
                        
                        {/* Bulk Delete */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-300">Enable Bulk Delete Operations</span>
                          <button
                            onClick={() => updateSetting('bulkDelete', !settings.bulkDelete)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              settings.bulkDelete ? 'bg-blue-600' : 'bg-gray-600'
                            }`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings.bulkDelete ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                          </button>
                        </div>
                        
                        {/* Offline Mode */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-300">Offline Mode (Cache conversations)</span>
                          <button
                            onClick={() => updateSetting('offlineMode', !settings.offlineMode)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              settings.offlineMode ? 'bg-blue-600' : 'bg-gray-600'
                            }`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings.offlineMode ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Security & Session Tab */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-white">Security & Session Management</h3>
                  
                  <div className="space-y-6">
                    {/* Session Settings */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-300 mb-3">Session Settings</h4>
                      <div className="space-y-4">
                        {/* Session Timeout */}
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Session Timeout</label>
                          <select 
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={settings.sessionTimeout}
                            onChange={(e) => updateSetting('sessionTimeout', e.target.value)}
                          >
                            <option value="15min">15 minutes</option>
                            <option value="30min">30 minutes</option>
                            <option value="1hour">1 hour</option>
                            <option value="never">Never expire</option>
                          </select>
                        </div>
                        
                        {/* Remember Login */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-300">Remember Me on Login</span>
                          <button
                            onClick={() => updateSetting('loginRememberMe', !settings.loginRememberMe)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              settings.loginRememberMe ? 'bg-blue-600' : 'bg-gray-600'
                            }`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings.loginRememberMe ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Security Features */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-300 mb-3">Security Features</h4>
                      <div className="space-y-4">
                        {/* Password for Settings */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-300">Require Password for Settings Changes</span>
                          <button
                            onClick={() => updateSetting('requirePasswordForSettings', !settings.requirePasswordForSettings)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              settings.requirePasswordForSettings ? 'bg-blue-600' : 'bg-gray-600'
                            }`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings.requirePasswordForSettings ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                          </button>
                        </div>
                        
                        {/* Two Factor Authentication */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-300">Two-Factor Authentication</span>
                          <button
                            onClick={() => updateSetting('twoFactorEnabled', !settings.twoFactorEnabled)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              settings.twoFactorEnabled ? 'bg-blue-600' : 'bg-gray-600'
                            }`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings.twoFactorEnabled ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Change Password */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-300 mb-3">Change Password</h4>
                      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                        <form onSubmit={handlePasswordChange} className="space-y-4">
                          {/* Status Messages */}
                          {passwordChangeStatus === 'success' && (
                            <div className="bg-green-600/20 border border-green-500/30 rounded-lg p-3">
                              <div className="flex items-center gap-2 text-green-300">
                                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                <span className="text-sm font-medium">Password changed successfully!</span>
                              </div>
                            </div>
                          )}
                          
                          {passwordErrors.general && (
                            <div className="bg-red-600/20 border border-red-500/30 rounded-lg p-3">
                              <div className="flex items-center gap-2 text-red-300">
                                <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                                <span className="text-sm">{passwordErrors.general}</span>
                              </div>
                            </div>
                          )}

                          {/* Current Password */}
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Current Password</label>
                            <input
                              type="password"
                              value={passwordForm.currentPassword}
                              onChange={(e) => updatePasswordForm('currentPassword', e.target.value)}
                              className={`w-full px-3 py-2 bg-gray-700 border rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                passwordErrors.currentPassword ? 'border-red-500' : 'border-gray-600'
                              }`}
                              placeholder="Enter your current password"
                            />
                            {passwordErrors.currentPassword && (
                              <p className="text-red-400 text-xs mt-1">{passwordErrors.currentPassword}</p>
                            )}
                          </div>

                          {/* New Password */}
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">New Password</label>
                            <input
                              type="password"
                              value={passwordForm.newPassword}
                              onChange={(e) => updatePasswordForm('newPassword', e.target.value)}
                              className={`w-full px-3 py-2 bg-gray-700 border rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                passwordErrors.newPassword ? 'border-red-500' : 'border-gray-600'
                              }`}
                              placeholder="Enter your new password"
                            />
                            {passwordErrors.newPassword && (
                              <p className="text-red-400 text-xs mt-1">{passwordErrors.newPassword}</p>
                            )}
                          </div>

                          {/* Confirm Password */}
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Confirm New Password</label>
                            <input
                              type="password"
                              value={passwordForm.confirmPassword}
                              onChange={(e) => updatePasswordForm('confirmPassword', e.target.value)}
                              className={`w-full px-3 py-2 bg-gray-700 border rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                passwordErrors.confirmPassword ? 'border-red-500' : 'border-gray-600'
                              }`}
                              placeholder="Confirm your new password"
                            />
                            {passwordErrors.confirmPassword && (
                              <p className="text-red-400 text-xs mt-1">{passwordErrors.confirmPassword}</p>
                            )}
                          </div>

                          {/* Submit Button */}
                          <div className="flex justify-end">
                            <button
                              type="submit"
                              disabled={passwordChangeStatus === 'success'}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              Change Password
                            </button>
                          </div>

                          <div className="text-xs text-gray-500">
                            <strong>Password Requirements:</strong> Minimum 8 characters, must be different from current password.
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Developer Tools Tab */}
              {activeTab === 'developer' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-white">Developer Tools</h3>
                  
                  <div className="space-y-6">
                    {/* User-Safe Developer Features */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-300 mb-3">Interface Development</h4>
                      <div className="space-y-4">
                        

                        {/* Interface Stats */}
                        <div className="bg-gray-700 rounded-lg p-4">
                          <h5 className="text-sm font-medium text-gray-300 mb-2">Interface Info</h5>
                          <div className="space-y-1 text-xs text-gray-400">
                            <div>Version: 1.0.0</div>
                            <div>React: 18.x</div>
                            <div>Next.js: 15.5.4</div>
                            <div>Theme: {settings.theme}</div>
                          </div>
                        </div>

                        {/* Export Options */}
                        <div className="bg-gray-700 rounded-lg p-4">
                          <h5 className="text-sm font-medium text-gray-300 mb-2">Your Data</h5>
                          <p className="text-xs text-gray-400 mb-3">
                            You can export your conversations and settings. All exports are secure and contain only your own data.
                          </p>
                          <div className="text-xs text-gray-500">
                            Export controls are managed by your administrator for security.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Performance Tab */}
              {activeTab === 'performance' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-white">Performance Settings</h3>
                  
                  <div className="space-y-6">
                    {/* Performance Optimizations */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-300 mb-3">Performance Optimizations</h4>
                      <div className="space-y-4">
                        {/* Preload Responses */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-300">Preload AI Responses</span>
                          <button
                            onClick={() => updateSetting('preloadResponses', !settings.preloadResponses)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              settings.preloadResponses ? 'bg-blue-600' : 'bg-gray-600'
                            }`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings.preloadResponses ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                          </button>
                        </div>
                        
                        {/* Cache Responses */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-300">Cache Responses Locally</span>
                          <button
                            onClick={() => updateSetting('cacheResponses', !settings.cacheResponses)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              settings.cacheResponses ? 'bg-blue-600' : 'bg-gray-600'
                            }`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings.cacheResponses ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                          </button>
                        </div>
                        
                        {/* Background Sync */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-300">Background Synchronization</span>
                          <button
                            onClick={() => updateSetting('backgroundSync', !settings.backgroundSync)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              settings.backgroundSync ? 'bg-blue-600' : 'bg-gray-600'
                            }`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings.backgroundSync ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                          </button>
                        </div>
                        
                        {/* Low Power Mode */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-300">Low Power Mode</span>
                          <button
                            onClick={() => updateSetting('lowPowerMode', !settings.lowPowerMode)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              settings.lowPowerMode ? 'bg-blue-600' : 'bg-gray-600'
                            }`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings.lowPowerMode ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Performance Info */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-300 mb-3">Performance Information</h4>
                      <div className="bg-gray-800 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Memory Usage:</span>
                          <span className="text-white">245 MB / 1 GB</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Cache Size:</span>
                          <span className="text-white">12.5 MB</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Active Sessions:</span>
                          <span className="text-white">3</span>
                        </div>
                        <button className="w-full mt-3 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md transition-colors text-sm">
                          Clear Cache & Optimize
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-700">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                // Here you would save the settings to localStorage or backend
                console.log('Saving settings:', settings)
                onClose()
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
      
      {/* Memory Manager Modal */}
      {showMemoryManager && (
        <MemoryManager 
          isOpen={showMemoryManager}
          onClose={() => setShowMemoryManager(false)}
          user={user}
        />
      )}
    </div>
  )
}