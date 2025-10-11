import { useState, useRef, useEffect } from 'react'
import { ChatProps, Message } from '@/types'
import { PlusIcon, MicrophoneIcon, ArrowUpIcon } from '@heroicons/react/24/outline'

/**
 * Voice Mode Component - Replicates ChatGPT's voice functionality
 * Shows tooltip and handles voice mode toggle
 * Changes to send button when user is typing
 */
function VoiceControls({ hasText, onSend }: { hasText: boolean; onSend: () => void }) {
  const [isVoiceMode, setIsVoiceMode] = useState(false)
  const [isDictating, setIsDictating] = useState(false)
  const [showTooltip, setShowTooltip] = useState<'voice' | 'dictate' | 'send' | null>(null)

  // Voice waveform icon (replicating ChatGPT's sound bars)
  const SoundBarsIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v20M8 6v12M16 6v12M4 10v4M20 10v4"/>
    </svg>
  )

  const handleVoiceMode = () => {
    setIsVoiceMode(!isVoiceMode)
    console.log('Voice mode toggled:', !isVoiceMode)
    // TODO: Implement actual voice mode functionality
  }

  const handleDictate = () => {
    setIsDictating(!isDictating)
    console.log('Dictation toggled:', !isDictating)
    // TODO: Implement actual dictation functionality
  }

  const handleSend = () => {
    onSend()
  }

  return (
    <div className="flex items-center gap-1">
      {/* Microphone button for dictation */}
      <div className="relative">
        <button
          type="button"
          onClick={handleDictate}
          onMouseEnter={() => setShowTooltip('dictate')}
          onMouseLeave={() => setShowTooltip(null)}
          className={`p-2 transition-colors rounded-full ${
            isDictating 
              ? 'text-blue-500 bg-blue-500/20' 
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
        >
          <MicrophoneIcon className="w-5 h-5" />
        </button>
        
        {/* Dictate tooltip */}
        {showTooltip === 'dictate' && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-black text-white text-sm rounded-lg whitespace-nowrap">
            Dictate
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black"></div>
          </div>
        )}
      </div>

      {/* Sound bars button for voice mode OR send button when typing */}
      <div className="relative">
        {hasText ? (
          /* Send button when user has typed text */
          <button
            type="button"
            onClick={handleSend}
            onMouseEnter={() => setShowTooltip('send')}
            onMouseLeave={() => setShowTooltip(null)}
            className="p-2 text-white bg-blue-600 hover:bg-blue-700 transition-colors rounded-full"
          >
            <ArrowUpIcon className="w-5 h-5" />
          </button>
        ) : (
          /* Voice mode button when no text */
          <button
            type="button"
            onClick={handleVoiceMode}
            onMouseEnter={() => setShowTooltip('voice')}
            onMouseLeave={() => setShowTooltip(null)}
            className={`p-2 transition-colors rounded-full ${
              isVoiceMode 
                ? 'text-blue-500 bg-blue-500/20' 
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <SoundBarsIcon />
          </button>
        )}
        
        {/* Tooltips */}
        {showTooltip === 'voice' && !hasText && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-black text-white text-sm rounded-lg whitespace-nowrap">
            Use voice mode
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black"></div>
          </div>
        )}
        
        {showTooltip === 'send' && hasText && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-black text-white text-sm rounded-lg whitespace-nowrap">
            Send message
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black"></div>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * PlusDropdown Component - Creates the ChatGPT-style plus menu
 * Displays a dropdown with various action options when the plus button is clicked
 */
function PlusDropdown() {
  // State to track if dropdown is open or closed
  const [isOpen, setIsOpen] = useState(false)
  // Ref to track the dropdown element for outside click detection
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Effect to handle clicking outside the dropdown to close it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // If click is outside the dropdown, close it
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    // Add event listener when component mounts
    document.addEventListener('mousedown', handleClickOutside)
    // Clean up event listener when component unmounts
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Menu items configuration - matches ChatGPT's options
  const menuItems = [
    { icon: '📎', label: 'Add photos & files', shortcut: '' },
    { icon: '🔍', label: 'Deep research', shortcut: '' },
    { icon: '🎨', label: 'Create image', shortcut: '' },
    { icon: '🤖', label: 'Agent mode', shortcut: '' },
    { icon: '📚', label: 'Add sources', shortcut: '' },
    { icon: '🌐', label: 'Web Search', shortcut: '' }
  ]

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Plus button that toggles the dropdown */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-700"
      >
        <PlusIcon className="w-5 h-5" />
      </button>
      
      {/* Dropdown menu - only shows when isOpen is true */}
      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-64 bg-gray-800 border border-gray-600 rounded-lg shadow-lg py-2 z-50">
          {/* Map through menu items and create buttons */}
          {menuItems.map((item, index) => (
            <button
              key={index}
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setIsOpen(false) // Close dropdown when item is clicked
                // TODO: Add actual functionality here for each menu item
                console.log(`Clicked: ${item.label}`)
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left text-white hover:bg-gray-700 transition-colors"
            >
              {/* Icon for the menu item */}
              <span className="text-lg">{item.icon}</span>
              {/* Label text */}
              <span className="flex-1 text-sm">{item.label}</span>
              {/* Keyboard shortcut (if available) */}
              {item.shortcut && (
                <span className="text-xs text-gray-400">{item.shortcut}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * MessageBubble Component - Displays individual chat messages
 * Styles messages differently based on whether they're from user or assistant
 */
function MessageBubble({ message }: { message: Message }) {
  return (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
      {/* Message container with conditional styling based on sender */}
      <div className={`max-w-3xl ${message.role === 'user' ? 'bg-blue-600' : 'bg-gray-700'} rounded-lg p-4`}>
        {/* Message content with preserved line breaks */}
        <div className="text-white whitespace-pre-wrap">{message.content}</div>
        {/* Timestamp display */}
        <div className="text-xs text-gray-300 mt-2">
          {message.timestamp.toLocaleTimeString()}
        </div>
      </div>
    </div>
  )
}

/**
 * ChatArea Component - Main chat interface
 * Handles message display, input, and user interactions
 */
export default function ChatArea({ messages, onSendMessage, isLoading }: ChatProps) {
  // State for the current input text
  const [input, setInput] = useState('')
  // Ref to scroll to the bottom of messages
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Function to scroll to the bottom of the chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Effect to auto-scroll when new messages are added
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Handle form submission (sending a message)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim()) {
      onSendMessage(input.trim()) // Send message to parent component
      setInput('') // Clear input field
    }
  }

  // Handle keyboard shortcuts (Enter to send, Shift+Enter for new line)
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-900">
      {/* Demo Mode Banner */}
      <div className="bg-blue-600/20 border-b border-blue-500/30 px-4 py-2">
        <div className="flex items-center justify-center text-sm text-blue-300">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <span className="font-medium">Demo Mode</span>
            <span className="text-blue-400">•</span>
            <span className="text-gray-300">
              This is a demonstration. The production version will connect to the Python backend with full AI capabilities.
            </span>
          </div>
        </div>
      </div>

      {/* Messages Display Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Show welcome message when no messages exist */}
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-3xl font-bold text-white mb-4">
                Welcome to Ashley AI
              </h2>
              <p className="text-gray-400 text-lg mb-6">
                Your intelligent AI assistant ready to help with questions, tasks, and conversations.
              </p>
              <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-gray-200 mb-3">What I can help you with:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
                  <div className="flex items-center gap-2 text-gray-300">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <span>Answer questions and provide information</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-300">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span>Help with writing and creative tasks</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-300">
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    <span>Coding and technical assistance</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-300">
                    <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                    <span>Problem-solving and analysis</span>
                  </div>
                </div>
              </div>
              <p className="text-gray-500 mt-4 text-sm">
                Start a conversation by typing a message below.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Render all chat messages */}
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            
            {/* Loading indicator with animated dots */}
            {isLoading && (
              <div className="flex justify-start mb-4">
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="flex gap-1">
                    {/* Three animated dots to show AI is typing */}
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            {/* Invisible element to scroll to */}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area - Bottom section for typing messages */}
      <div className="border-t border-gray-700 p-4">
        <form onSubmit={handleSubmit} className="flex gap-2 items-end">
          {/* Text input area with integrated action buttons */}
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask anything"
              className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 pl-12 pr-20 text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={1}
              style={{ minHeight: '44px', maxHeight: '120px' }}
            />
            
            {/* Plus button on the left side of input */}
            <div className="absolute left-3 bottom-3">
              <PlusDropdown />
            </div>
            
            {/* Voice controls on the right side of input */}
            <div className="absolute right-3 bottom-3">
              <VoiceControls 
                hasText={input.trim().length > 0} 
                onSend={() => {
                  if (input.trim()) {
                    onSendMessage(input.trim())
                    setInput('')
                  }
                }} 
              />
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}