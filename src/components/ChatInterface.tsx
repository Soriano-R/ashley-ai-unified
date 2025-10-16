'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import Sidebar from './Sidebar'
import ChatArea from './ChatArea'
import SignIn from './SignIn'
import SettingsModal from './SettingsModal'
import AdminPanel from './AdminPanel'
import PersonaSelector from './PersonaSelector'
import ModelSelector from './ModelSelector'
import UserManager from './UserManager'
import { Message, ModelOption, PersonaOption, Session, User } from '@/types'
import { DEFAULT_PERSONA_ID } from '@/lib/personas'
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

  // User manager modal state
  const [isUserManagerOpen, setIsUserManagerOpen] = useState(false)

  // Chat generation/loading state
  const [isGenerating, setIsGenerating] = useState(false)

  // Handler to open UserManager modal
  const handleOpenUserManager = () => setIsUserManagerOpen(true)
  const handleCloseUserManager = () => setIsUserManagerOpen(false)
  
  // State for all chat sessions - starts with one default session
  const [sessions, setSessions] = useState<Session[]>([
    { id: '1', title: 'New Chat', messages: [], personaId: DEFAULT_PERSONA_ID, modelId: 'auto' }
  ])
  
  // State for which session is currently active/selected
  const [activeSessionId, setActiveSessionId] = useState('1')
  
  // State for messages in the current active session
  const [messages, setMessages] = useState<Message[]>([])

  // State for sidebar collapse/expand
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  // Persona & model catalog state
  const [personaOptions, setPersonaOptions] = useState<PersonaOption[]>([])
  const [personaCategories, setPersonaCategories] = useState<Record<string, { label: string; description: string }>>({})
  const [modelOptions, setModelOptions] = useState<ModelOption[]>([])
  const [modelCategories, setModelCategories] = useState<Record<string, { label: string; description: string }>>({})
  const [catalogLoaded, setCatalogLoaded] = useState(false)

  const [currentPersonaId, setCurrentPersonaId] = useState(DEFAULT_PERSONA_ID)
  const [currentModelId, setCurrentModelId] = useState('auto')

  const currentPersona = useMemo(
    () => personaOptions.find((persona) => persona.id === currentPersonaId) ?? null,
    [personaOptions, currentPersonaId]
  )

  const allowedModelIds = useMemo(() => {
    const allowed = currentPersona?.allowedModelIds
    if (allowed && allowed.length > 0) {
      return allowed
    }
    return ['auto']
  }, [currentPersona])

  // Store timeouts for session renaming to allow cleanup
  const [renamingTimeouts, setRenamingTimeouts] = useState<{ [sessionId: string]: ReturnType<typeof setTimeout> }>({})

  // AbortController for in-flight chat requests
  const chatAbortRef = useRef<AbortController | null>(null)

  const loadPersonaCatalog = useCallback(async () => {
    try {
      const catalog = await apiClient.getPersonas()

      setPersonaOptions(catalog.personas)
      setPersonaCategories(catalog.personaCategories || {})
      setModelOptions(catalog.models)
      setModelCategories(catalog.modelCategories || {})

      if (!catalog.personas.some((persona) => persona.id === currentPersonaId)) {
        const preferredPersona =
          catalog.personas.find((persona) => persona.id === DEFAULT_PERSONA_ID) ?? catalog.personas[0]

        if (preferredPersona) {
          const allowed = preferredPersona.allowedModelIds?.length
            ? preferredPersona.allowedModelIds
            : ['auto']
          const defaultModel =
            preferredPersona.defaultModel && allowed.includes(preferredPersona.defaultModel)
              ? preferredPersona.defaultModel
              : 'auto'

          setCurrentPersonaId(preferredPersona.id)
          setCurrentModelId(defaultModel ?? 'auto')
          setSessions([
            {
              id: '1',
              title: 'New Chat',
              messages: [],
              personaId: preferredPersona.id,
              modelId: defaultModel ?? 'auto',
            },
          ])
          setActiveSessionId('1')
          setMessages([])
        }
      }
    } catch (error) {
      console.error('Failed to load persona catalog:', error)
    } finally {
      setCatalogLoaded(true)
    }
  }, [currentPersonaId])

  const refreshPersonaCatalog = useCallback(async () => {
    setCatalogLoaded(false)
    await loadPersonaCatalog()
  }, [loadPersonaCatalog])

  useEffect(() => {
    loadPersonaCatalog()
  }, [loadPersonaCatalog])

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
      messages: [],
      personaId: currentPersonaId,
      modelId: currentModelId
    }
    // Add new session to the beginning of the array
    setSessions(prev => [newSession, ...prev])
    // Switch to the new session
    setActiveSessionId(newSession.id)
    // Clear messages for the new session
    setMessages([])
  }

  const applySessionSelection = useCallback(
    (session?: Session) => {
      if (!session) {
        setMessages([])
        return
      }

      setActiveSessionId(session.id)
      setMessages(session.messages || [])

      if (session.personaId) {
        setCurrentPersonaId(session.personaId)
        const personaMeta =
          personaOptions.find((persona) => persona.id === session.personaId) ?? null
        const allowed = personaMeta?.allowedModelIds?.length ? personaMeta.allowedModelIds : ['auto']
        const candidateModels = [
          session.modelId,
          personaMeta?.defaultModel,
          currentModelId,
          'auto',
        ].filter((value): value is string => Boolean(value))
        const resolvedModel =
          candidateModels.find((modelId) => allowed.includes(modelId)) ?? 'auto'
        setCurrentModelId(resolvedModel)
      } else if (session.modelId) {
        setCurrentModelId(session.modelId)
      }
    },
    [personaOptions, currentModelId]
  )

  /**
   * Handle selecting an existing session
   * Switches to the selected session and loads its messages
   */
  const handleSelectSession = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId)
    if (session) {
      applySessionSelection(session)
    } else {
      setActiveSessionId(sessionId)
      setMessages([])
    }
  }

  const handleRenameSession = useCallback(
    (sessionId: string, newTitle: string) => {
      if (!newTitle.trim()) return
      setSessions((prev) =>
        prev.map((session) =>
          session.id === sessionId ? { ...session, title: newTitle.trim() } : session
        )
      )
    },
    []
  )

  const handleDeleteSession = useCallback(
    (sessionId: string) => {
      let fallbackSession: Session | null = null
      let nextSession: Session | null = null
      setSessions((prev) => {
        const remaining = prev.filter((session) => session.id !== sessionId)
        if (remaining.length === 0) {
          fallbackSession = {
            id: Date.now().toString(),
            title: 'New Chat',
            messages: [],
            personaId: DEFAULT_PERSONA_ID,
            modelId: 'auto',
          }
          return [fallbackSession]
        }
        if (sessionId === activeSessionId) {
          nextSession = remaining[0]
        }
        return remaining
      })
      if (fallbackSession) {
        applySessionSelection(fallbackSession)
        setMessages([])
      } else if (nextSession) {
        applySessionSelection(nextSession)
      }
    },
    [activeSessionId, applySessionSelection]
  )

  /**
   * Handle voice response audio playback
   */
  const handleVoiceResponse = async (audioUrl: string, text: string) => {
    console.log('Voice response received:', { audioUrl, text })
    // TODO: Implement voice response handling (e.g., auto-play, save audio, etc.)
  }

  const handlePersonaChange = useCallback(
    (personaId: string) => {
      const personaMeta =
        personaOptions.find((persona) => persona.id === personaId) ?? null
      const allowed = personaMeta?.allowedModelIds?.length
        ? personaMeta.allowedModelIds
        : ['auto']
      const fallbackModel =
        personaMeta?.defaultModel && allowed.includes(personaMeta.defaultModel)
          ? personaMeta.defaultModel
          : 'auto'
      const resolvedModel = allowed.includes(currentModelId)
        ? currentModelId
        : fallbackModel

      setCurrentPersonaId(personaId)
      setCurrentModelId(resolvedModel)

      setSessions((prev) =>
        prev.map((session) =>
          session.id === activeSessionId
            ? {
                ...session,
                personaId,
                modelId:
                  session.modelId && allowed.includes(session.modelId)
                    ? session.modelId
                    : resolvedModel,
              }
            : session
        )
      )
    },
    [activeSessionId, currentModelId, personaOptions]
  )

  const handleModelChange = useCallback(
    (modelId: string) => {
      const allowed = allowedModelIds
      const resolved = allowed.includes(modelId) ? modelId : 'auto'
      setCurrentModelId(resolved)
      setSessions((prev) =>
        prev.map((session) =>
          session.id === activeSessionId ? { ...session, modelId: resolved } : session
        )
      )
    },
    [activeSessionId, allowedModelIds]
  )

  const handleSendMessage = async (content: string) => {
    // Guard: ignore empty or whitespace-only messages
    if (!content || !content.trim()) return
    // Guard: avoid overlapping sends
    if (isGenerating) return

    // Cancel any in-flight request
    if (chatAbortRef.current) {
      chatAbortRef.current.abort()
    }
    const controller = new AbortController()
    chatAbortRef.current = controller

    // Build user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
      personaId: currentPersonaId,
    }

    // Optimistically add the user message
    const pendingMessages = [...messages, userMessage]
    setMessages(pendingMessages)

    // Update the session with new messages and title (if it's the first message)
    setSessions(prev =>
      prev.map(session =>
        session.id === activeSessionId
          ? {
              ...session,
              messages: pendingMessages,
              title: session.messages.length === 0 ? 'New Chat' : session.title,
              personaId: currentPersonaId,
              modelId: currentModelId,
            }
          : session
      )
    )

    // Smart title rename timer for first message
    if (messages.length === 0) {
      if (renamingTimeouts[activeSessionId]) {
        clearTimeout(renamingTimeouts[activeSessionId])
      }
      const timeoutId = setTimeout(() => {
        setSessions(prev => prev.map(session => {
          if (session.id === activeSessionId && session.messages.length > 0) {
            const firstMessage = session.messages[0]?.content || content
            const smartTitle = firstMessage.length > 30
              ? firstMessage.slice(0, 30) + '...'
              : firstMessage
            return { ...session, title: smartTitle }
          }
          return session
        }))
        setRenamingTimeouts(prev => {
          const next = { ...prev }
          delete next[activeSessionId]
          return next
        })
      }, 60000)
      setRenamingTimeouts(prev => ({ ...prev, [activeSessionId]: timeoutId }))
    }

    // Call backend
    setIsGenerating(true)
    try {
      const outgoing = pendingMessages.map(m => ({ role: m.role, content: m.content }))
      const response = await apiClient.sendMessage(
        {
          messages: outgoing,
          persona: currentPersonaId,
          modelId: currentModelId,
        },
        controller.signal
      )

      const data = response as any
      const assistantText: string =
        typeof data?.message === 'string'
          ? data.message
          : Array.isArray(data?.messages) && typeof data.messages.at(-1)?.content === 'string'
            ? data.messages.at(-1).content
            : 'I received your message, but the server returned an unexpected format.'

      const responseMessages =
        Array.isArray(data?.messages) && data.messages.length > 0
          ? data.messages
          : [...outgoing, { role: 'assistant', content: assistantText }]

      const indexedBase = Date.now()
      const aiMessage: Message = {
        id: (indexedBase + 1).toString(),
        role: 'assistant',
        content: assistantText,
        timestamp: new Date(),
        personaId: currentPersonaId,
      }

      const finalMessages: Message[] = responseMessages.map((msg: { role: string; content: string }, index: number) => ({
        id: `${indexedBase}-${index}`,
        role: msg.role as Message['role'],
        content: msg.content,
        timestamp: new Date(),
        personaId: currentPersonaId,
      }))

      // Ensure assistant message appended if backend omitted
      if (!responseMessages.some((msg: { role: string }) => msg.role === 'assistant')) {
        finalMessages.push(aiMessage)
      }

      setMessages(finalMessages)
      setSessions(prev => prev.map(session =>
        session.id === activeSessionId
          ? { ...session, messages: finalMessages, personaId: currentPersonaId, modelId: currentModelId }
          : session
      ))
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        // Silently ignore aborted requests
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: `Sorry, I couldn’t reach the chat service. ${err?.message ? 'Details: ' + err.message : ''}`,
          timestamp: new Date(),
          personaId: currentPersonaId,
        }
        const finalMessages = [...pendingMessages, errorMessage]
        setMessages(finalMessages)
        setSessions(prev => prev.map(session =>
          session.id === activeSessionId
            ? { ...session, messages: finalMessages, personaId: currentPersonaId, modelId: currentModelId }
            : session
        ))
      }
    } finally {
      // Clear controller if it's still ours
      if (chatAbortRef.current === controller) {
        chatAbortRef.current = null
      }
      setIsGenerating(false)
    }
  }

  /**
   * Handle toggling sidebar collapse state
   */
  const handleToggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed)
  }

  /**
   * Handle user sign in
   * Tries real auth via /api/auth then falls back to demo accounts
   */
  const handleSignIn = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      // Attempt real auth via Next.js API proxy
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      })

      if (res.ok) {
        const data = await res.json()
        const user: User = data?.user ?? {
          id: data?.id || '1',
          email,
          name: data?.name || email.split('@')[0],
          role: (data?.role as User['role']) || 'user',
          createdAt: new Date()
        }
        setCurrentUser(user)
        setIsAuthenticated(true)
        setSessions([{
          id: '1',
          title: 'New Chat',
          messages: [],
          personaId: currentPersonaId,
          modelId: currentModelId,
        }])
        return
      }
      // If not OK, fall through to demo users
    } catch {
      // Network or parsing error — fall back to demo
    }

    // Demo fallback accounts
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 800))

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

      const account = demoUsers[email.toLowerCase()]
      if (account && account.password === password) {
        setCurrentUser(account.user)
        setIsAuthenticated(true)
        if (account.user.role === 'admin') {
          setSessions([
            {
              id: '1',
              title: 'Admin Dashboard',
              messages: [],
              personaId: currentPersonaId,
              modelId: currentModelId,
            },
            {
              id: '2',
              title: 'System Management',
              messages: [],
              personaId: currentPersonaId,
              modelId: currentModelId,
            }
          ])
        } else {
          setSessions([{
            id: '1',
            title: 'New Chat',
            messages: [],
            personaId: currentPersonaId,
            modelId: currentModelId,
          }])
        }
        return
      }
      throw new Error('Invalid email or password')
    } catch (error) {
      console.error('Sign in failed:', error)
      alert(`Sign in failed: ${error instanceof Error ? error.message : 'Unknown error'}. Try: admin@ashley.ai / admin123 or user@ashley.ai / user123`)
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Handle user sign out
   */
  const handleSignOut = () => {
    // Abort any in-flight chat request
    if (chatAbortRef.current) {
      chatAbortRef.current.abort()
      chatAbortRef.current = null
    }
    setIsAuthenticated(false)
    setCurrentUser(null)
    // Reset all state when signing out
    setCurrentPersonaId(DEFAULT_PERSONA_ID)
    setCurrentModelId('auto')
    setSessions([{
      id: '1',
      title: 'New Chat',
      messages: [],
      personaId: DEFAULT_PERSONA_ID,
      modelId: 'auto',
    }])
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
        onRenameSession={handleRenameSession}
        onDeleteSession={handleDeleteSession}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
        onSignOut={handleSignOut}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAdminPanel={() => setIsAdminPanelOpen(true)}
        onOpenUserManager={handleOpenUserManager}
        user={currentUser || undefined}
      />

      {/* Main content area */}
      <div className="flex flex-col flex-1">
        {/* Header with persona selector */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800">
          <h1 className="text-xl font-semibold text-white">Ashley AI</h1>
          <div className="flex items-center gap-3">
            {catalogLoaded && personaOptions.length > 0 ? (
              <>
                <PersonaSelector
                  personas={personaOptions}
                  categories={personaCategories}
                  currentPersonaId={currentPersonaId}
                  onPersonaChange={handlePersonaChange}
                />
                <ModelSelector
                  models={modelOptions}
                  categories={modelCategories}
                  allowedModelIds={allowedModelIds}
                  selectedModelId={currentModelId}
                  onModelChange={handleModelChange}
                />
              </>
            ) : (
              <span className="text-sm text-gray-400">Loading personas...</span>
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1">
          <ChatArea 
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isGenerating}
            persona={currentPersonaId}
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
          personas={personaOptions}
          personaCategories={personaCategories}
          models={modelOptions}
          onPersonaMutate={refreshPersonaCatalog}
        />
      )}

      {/* User Manager Modal - Only accessible to admin users */}
      {currentUser?.role === 'admin' && (
        <UserManager
          isOpen={isUserManagerOpen}
          onClose={handleCloseUserManager}
        />
      )}
    </div>
  )
}
