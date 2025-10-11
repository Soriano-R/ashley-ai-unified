'use client'

import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import ChatArea from './ChatArea'
import SignIn from './SignIn'
import SettingsModal from './SettingsModal'
import AdminPanel from './AdminPanel'
import PersonaSelector from './PersonaSelector'
import { Message, Session, User } from '@/types'
import { DEFAULT_PERSONA, getPersonaConfig } from '@/lib/personas'
import { apiClient } from '@/lib/apiClient'

/**
 * ChatInterface Component - Main container for the entire chat application
 * Manages state for sessions, messages, authentication, and coordinates between components
 */
export default function ChatInterface() {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  
  // Settings modal state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  
  // Admin panel state
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false)
  
  // FOR DEBUGGING: Uncomment the line below to bypass authentication
  // const [isAuthenticated, setIsAuthenticated] = useState(true)
  
  // State for all chat sessions - starts with one default session
  const [sessions, setSessions] = useState<Session[]>([
    { id: '1', title: 'New Chat', messages: [] }
  ])
  
  // State for which session is currently active/selected
  const [activeSessionId, setActiveSessionId] = useState('1')
  
  // State for messages in the current active session
  const [messages, setMessages] = useState<Message[]>([])

  // State for sidebar collapse/expand
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  // State for current persona
  const [currentPersona, setCurrentPersona] = useState(DEFAULT_PERSONA)

  // Store timeouts for session renaming to allow cleanup
  const [renamingTimeouts, setRenamingTimeouts] = useState<{ [sessionId: string]: NodeJS.Timeout }>({})

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      // Clear all pending timeouts when component unmounts
      Object.values(renamingTimeouts).forEach(timeout => {
        clearTimeout(timeout)
      })
    }
  }, [renamingTimeouts])

  /**
   * Handle creating a new chat session
   * Creates a new session and switches to it
   */
  const handleNewChat = () => {
    const newSession: Session = {
      id: Date.now().toString(), // Simple ID generation using timestamp
      title: 'New Chat',
      messages: []
    }
    // Add new session to the beginning of the array
    setSessions(prev => [newSession, ...prev])
    // Switch to the new session
    setActiveSessionId(newSession.id)
    // Clear messages for the new session
    setMessages([])
  }

  /**
   * Handle selecting an existing session
   * Switches to the selected session and loads its messages
   */
  const handleSelectSession = (sessionId: string) => {
    setActiveSessionId(sessionId)
    // Find the session and load its messages
    const session = sessions.find(s => s.id === sessionId)
    setMessages(session?.messages || [])
  }

  /**
   * Handle voice response audio playback
   */
  const handleVoiceResponse = async (audioUrl: string, text: string) => {
    console.log('Voice response received:', { audioUrl, text })
    // TODO: Implement voice response handling (e.g., auto-play, save audio, etc.)
  }

  /**
   * Handle sending a new message
   * Adds user message and simulates AI response
   */
  const handleSendMessage = (content: string) => {
    // Create user message object
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date()
    }

    // Add user message to current messages
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)

    // Update the session with new messages and title (if it's the first message)
    setSessions(prev => prev.map(session => 
      session.id === activeSessionId 
        ? { 
            ...session, 
            messages: newMessages, 
            // Keep title as "New Chat" initially - will be renamed after 1 minute
            title: session.messages.length === 0 ? 'New Chat' : session.title 
          }
        : session
    ))

    // Set up smart session renaming with 1-minute delay for first message
    if (messages.length === 0) {
      // Clear any existing timeout for this session
      if (renamingTimeouts[activeSessionId]) {
        clearTimeout(renamingTimeouts[activeSessionId])
      }

      // Set new timeout for smart renaming after 1 minute
      const timeoutId = setTimeout(() => {
        setSessions(prev => prev.map(session => {
          if (session.id === activeSessionId && session.messages.length > 0) {
            // Create a smart title based on conversation context
            const firstMessage = session.messages[0]?.content || content
            const smartTitle = firstMessage.length > 30 
              ? firstMessage.slice(0, 30) + '...'
              : firstMessage
            
            return { ...session, title: smartTitle }
          }
          return session
        }))

        // Clean up timeout reference
        setRenamingTimeouts(prev => {
          const newTimeouts = { ...prev }
          delete newTimeouts[activeSessionId]
          return newTimeouts
        })
      }, 60000) // 1 minute delay

      // Store timeout reference for cleanup
      setRenamingTimeouts(prev => ({
        ...prev,
        [activeSessionId]: timeoutId
      }))
    }

    // Simulate AI response after 1 second delay
    setTimeout(() => {
      // Enhanced AI responses based on user role with clear demo messaging
      let aiResponse = 'This is a demo response from Ashley AI. In the production version, I would connect to the Python backend with advanced AI capabilities including memory, voice features, and multi-modal support.'
      
      if (currentUser?.role === 'admin') {
        aiResponse = `🔧 **Admin Response**: I can assist you with system management, user administration, analytics, and advanced features. Your query: "${content}"\n\n*Note: This is a demo response. The production version will include real admin tools, user management, and system monitoring capabilities.*`
      } else if (currentUser?.role === 'user') {
        aiResponse = `💬 **Ashley AI Response**: I'm here to help with your questions and tasks. You asked: "${content}"\n\n*Note: This is a demo response. The production version will include advanced AI capabilities, memory of our conversations, voice features, and seamless integration with various tools.*`
      }
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(), // Ensure unique ID
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date()
      }
      
      // Add AI response to messages
      const finalMessages = [...newMessages, aiMessage]
      setMessages(finalMessages)
      
      // Update session with AI response
      setSessions(prev => prev.map(session => 
        session.id === activeSessionId 
          ? { ...session, messages: finalMessages }
          : session
      ))
    }, 1000)
  }

  /**
   * Handle toggling sidebar collapse state
   */
  const handleToggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed)
  }

  /**
   * Handle user sign in
   * Simulates authentication process with role-based access
   */
  const handleSignIn = async (email: string, password: string) => {
    setIsLoading(true)
    console.log('ChatInterface received sign in attempt:', { email, password })
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Demo user accounts with different roles
      const demoUsers: { [key: string]: { password: string; user: User } } = {
        'admin@ashley.ai': {
          password: 'admin123',
          user: {
            id: '1',
            email: 'admin@ashley.ai',
            name: 'Admin User',
            role: 'admin',
            createdAt: new Date()
          }
        },
        'user@ashley.ai': {
          password: 'user123',
          user: {
            id: '2',
            email: 'user@ashley.ai',
            name: 'Regular User',
            role: 'user',
            createdAt: new Date()
          }
        }
      }
      
      console.log('Available users:', Object.keys(demoUsers))
      console.log('Looking for user:', email.toLowerCase())
      
      // Check if user exists and password matches
      const userAccount = demoUsers[email.toLowerCase()]
      console.log('Found user account:', userAccount ? 'Yes' : 'No')
      
      if (userAccount && userAccount.password === password) {
        console.log('Password match successful')
        setCurrentUser(userAccount.user)
        setIsAuthenticated(true)
        console.log(`User signed in as ${userAccount.user.role}:`, userAccount.user)
        
        // Set different default sessions based on role
        if (userAccount.user.role === 'admin') {
          setSessions([
            { id: '1', title: 'Admin Dashboard', messages: [] },
            { id: '2', title: 'System Management', messages: [] }
          ])
        } else {
          setSessions([
            { id: '1', title: 'New Chat', messages: [] }
          ])
        }
      } else {
        console.log('Authentication failed - invalid credentials')
        throw new Error('Invalid email or password')
      }
    } catch (error) {
      console.error('Sign in failed:', error)
      alert(`Sign in failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please try: admin@ashley.ai / admin123 or user@ashley.ai / user123`)
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Handle user sign out
   */
  const handleSignOut = () => {
    setIsAuthenticated(false)
    setCurrentUser(null)
    // Reset all state when signing out
    setSessions([{ id: '1', title: 'New Chat', messages: [] }])
    setActiveSessionId('1')
    setMessages([])
    setIsSidebarCollapsed(false)
  }

  // Show sign-in screen if not authenticated
  if (!isAuthenticated) {
    return <SignIn onSignIn={handleSignIn} isLoading={isLoading} />
  }

  return (
    // Main application container - full height with dark background
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Left sidebar for session navigation */}
      <Sidebar 
        sessions={sessions}
        activeSessionId={activeSessionId}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
        onSignOut={handleSignOut}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAdminPanel={() => setIsAdminPanelOpen(true)}
        user={currentUser || undefined}
      />
      
      {/* Main content area */}
      <div className="flex flex-col flex-1">
        {/* Header with persona selector */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800">
          <h1 className="text-xl font-semibold text-white">Ashley AI</h1>
          <PersonaSelector 
            currentPersona={currentPersona}
            onPersonaChange={setCurrentPersona}
          />
        </div>
        
        {/* Chat area */}
        <div className="flex-1">
          <ChatArea 
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={false} // TODO: Add actual loading state when connecting to backend
            persona={currentPersona}
            onVoiceResponse={handleVoiceResponse}
          />
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        user={currentUser}
      />

      {/* Admin Panel - Only accessible to admin users */}
      {currentUser?.role === 'admin' && (
        <AdminPanel 
          isOpen={isAdminPanelOpen}
          onClose={() => setIsAdminPanelOpen(false)}
          user={currentUser}
        />
      )}
    </div>
  )
}