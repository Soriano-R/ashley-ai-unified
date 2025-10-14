import { SidebarProps } from '@/types'
import {
  PlusIcon,
  ChatBubbleLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  BookOpenIcon,
  CogIcon,
  UsersIcon,
  ChevronDownIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { useState, useRef, useEffect, MouseEvent as ReactMouseEvent } from 'react'

/**
 * Sidebar Component - Left navigation panel
 * Displays session history and provides navigation between chats
 * Can be collapsed to save space - when collapsed, only shows core navigation
 * Shows different features based on user role (admin vs user)
 */
export default function Sidebar({
  sessions,
  activeSessionId,
  onNewChat,
  onSelectSession,
  isCollapsed,
  onToggleCollapse,
  onSignOut,
  onOpenSettings,
  onOpenAdminPanel,
  onOpenUserManager,
  onRenameSession,
  onDeleteSession,
  user
}: SidebarProps) {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [contextMenu, setContextMenu] = useState<{ sessionId: string; x: number; y: number } | null>(null)

  // Function to get user initials (first letter of first and last name)
  const getUserInitials = (name: string): string => {
    const words = name.trim().split(' ')
    if (words.length === 1) {
      // If only one word, return first two characters
      return words[0].substring(0, 2).toUpperCase()
    }
    // Return first letter of first word + first letter of last word
    const firstInitial = words[0].charAt(0)
    const lastInitial = words[words.length - 1].charAt(0)
    return (firstInitial + lastInitial).toUpperCase()
  }

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: globalThis.MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
    }

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showUserMenu])

  useEffect(() => {
    if (!contextMenu) return
    const handleGlobalClick = () => setContextMenu(null)
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setContextMenu(null)
      }
    }
    document.addEventListener('click', handleGlobalClick)
    document.addEventListener('contextmenu', handleGlobalClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('click', handleGlobalClick)
      document.removeEventListener('contextmenu', handleGlobalClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [contextMenu])

  const handleSessionContextMenu = (event: ReactMouseEvent<HTMLButtonElement>, sessionId: string) => {
    event.preventDefault()
    event.stopPropagation()
    const menuWidth = 192
    const menuHeight = 96
    const offset = 8
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const clampedX = Math.min(event.clientX, viewportWidth - menuWidth - offset)
    const clampedY = Math.min(event.clientY, viewportHeight - menuHeight - offset)
    setContextMenu({
      sessionId,
      x: Math.max(offset, clampedX),
      y: Math.max(offset, clampedY),
    })
  }

  const handleRename = () => {
    if (!contextMenu || !onRenameSession) return
    const currentSession = sessions.find((session) => session.id === contextMenu.sessionId)
    const proposed = window.prompt('Rename chat session', currentSession?.title ?? '')
    const trimmed = proposed?.trim()
    if (trimmed) {
      onRenameSession(contextMenu.sessionId, trimmed)
    }
    setContextMenu(null)
  }

  const handleDelete = () => {
    if (!contextMenu || !onDeleteSession) return
    const confirmed = window.confirm('Delete this chat session? This action cannot be undone.')
    if (confirmed) {
      onDeleteSession(contextMenu.sessionId)
    }
    setContextMenu(null)
  }

  return (
    <>
    <div className={`${isCollapsed ? 'w-16' : 'w-64'} bg-gray-950 flex flex-col h-screen transition-all duration-300`}>
      {/* Header Section - Contains the New Chat button and collapse toggle */}
      <div className="p-3 border-b border-gray-700">
        {!isCollapsed ? (
          // Expanded header with new chat button
          <div className="flex items-center gap-2">
            <button
              onClick={onNewChat}
              className="flex-1 flex items-center gap-3 px-3 py-2 text-sm rounded-md border border-gray-600 hover:bg-gray-800 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              New Chat
            </button>
            <button
              onClick={onToggleCollapse}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
              title="Collapse sidebar"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </button>
          </div>
        ) : (
          // Collapsed header with core navigation icons only
          <div className="flex flex-col gap-3">
            <button
              onClick={onToggleCollapse}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
              title="Open sidebar"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </button>
            <button
              onClick={onNewChat}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
              title="New chat ⌘⇧O"
            >
              <PlusIcon className="w-4 h-4" />
            </button>
            <button
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
              title="Search chats ⌘K"
            >
              <MagnifyingGlassIcon className="w-4 h-4" />
            </button>
            <button
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
              title="Library"
            >
              <BookOpenIcon className="w-4 h-4" />
            </button>
            {/* Admin-only features when collapsed */}
            {user?.role === 'admin' && (
              <>
                <button
                  onClick={onOpenAdminPanel ?? (() => alert('Admin panel currently unavailable'))}
                  className="p-2 text-red-400 hover:text-red-300 hover:bg-gray-800 rounded-md transition-colors"
                  title="Admin Settings"
                >
                  <CogIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={onOpenUserManager ?? (() => alert('User management currently unavailable'))}
                  className="p-2 text-red-400 hover:text-red-300 hover:bg-gray-800 rounded-md transition-colors"
                  title="User Management"
                >
                  <UsersIcon className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Sessions List - Only show when expanded */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto p-2">
          {/* Admin Features Section */}
          {user?.role === 'admin' && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-700 rounded-lg">
              <h3 className="text-xs font-semibold text-red-400 mb-2 uppercase">Admin Tools</h3>
              <div className="space-y-1">
                <button 
                  onClick={typeof onOpenUserManager === 'function' ? onOpenUserManager : () => alert('User Management not implemented')}
                  className="w-full flex items-center gap-2 px-2 py-1 text-sm text-red-300 hover:text-red-200 hover:bg-red-800/30 rounded transition-colors"
                >
                  <UsersIcon className="w-3 h-3" />
                  User Management
                </button>
              </div>
            </div>
          )}
          
          {/* Chat Sessions */}
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              onContextMenu={(event) => handleSessionContextMenu(event, session.id)}
              className={`w-full text-left p-3 rounded-md mb-1 transition-colors ${
                session.id === activeSessionId
                  ? 'bg-gray-800 text-white' // Active session styling
                  : 'hover:bg-gray-800 text-gray-300' // Inactive session styling
              }`}
            >
              <div className="flex items-center gap-3">
                <ChatBubbleLeftIcon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate text-sm">{session.title}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Spacer for collapsed mode */}
      {isCollapsed && <div className="flex-1"></div>}

      {/* Footer Section - User initials */}
      <div className="p-3 border-t border-gray-700" ref={menuRef}>
        {!isCollapsed ? (
          <div className="relative">
            {/* User's full name and clickable area */}
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white ${
                  user?.role === 'admin' ? 'bg-red-500' : 'bg-blue-500'
                }`}>
                  {user ? getUserInitials(user.name) : 'A'}
                </div>
                <span>{user?.name || 'Ashley AI Frontend'}</span>
              </div>
              <ChevronDownIcon className={`w-4 h-4 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown menu */}
            {showUserMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-gray-800 border border-gray-600 rounded-md shadow-lg">
                <div className="p-3 border-b border-gray-600">
                  <div className="text-sm font-medium text-white">{user?.name}</div>
                  <div className="text-xs text-gray-400">{user?.email}</div>
                  <div className="text-xs text-gray-500 capitalize">{user?.role} Account</div>
                </div>
                <div className="p-2">
                  <button 
                    onClick={onOpenSettings}
                    className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
                  >
                    Settings
                  </button>
                  <button 
                    onClick={() => {
                      if (onOpenSettings) {
                        onOpenSettings()
                      }
                      // TODO: Auto-navigate to Security tab when settings modal opens
                      setShowUserMenu(false)
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
                  >
                    Change Password
                  </button>
                  {user?.role === 'admin' && onOpenAdminPanel && (
                    <button 
                      onClick={onOpenAdminPanel}
                      className="w-full text-left px-3 py-2 text-sm text-red-300 hover:text-white hover:bg-red-600/20 rounded transition-colors"
                    >
                      Admin Panel
                    </button>
                  )}
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors">
                    Help & Support
                  </button>
                  <button 
                    onClick={onSignOut}
                    className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            {/* User's initials in circle when collapsed - clickable */}
            {user ? (
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white hover:opacity-80 transition-opacity relative ${
                  user.role === 'admin' ? 'bg-red-500' : 'bg-blue-500'
                }`} 
                title={`${user.name} (${user.role})`}
              >
                {getUserInitials(user.name)}
                
                {/* Mini dropdown for collapsed mode */}
                {showUserMenu && (
                  <div className="absolute bottom-full left-full ml-2 mb-2 bg-gray-800 border border-gray-600 rounded-md shadow-lg whitespace-nowrap z-50">
                    <div className="p-3 border-b border-gray-600">
                      <div className="text-sm font-medium text-white">{user.name}</div>
                      <div className="text-xs text-gray-400">{user.email}</div>
                      <div className="text-xs text-gray-500 capitalize">{user.role} Account</div>
                    </div>
                    <div className="p-2">
                      <button 
                        onClick={onOpenSettings}
                        className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
                      >
                        Settings
                      </button>
                      <button 
                        onClick={() => {
                          if (onOpenSettings) {
                            onOpenSettings()
                          }
                          setShowUserMenu(false)
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
                      >
                        Change Password
                      </button>
                      <button className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors">
                        Help & Support
                      </button>
                      <button 
                        onClick={onSignOut}
                        className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
                      >
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </button>
            ) : (
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            )}
          </div>
        )}
      </div>
    </div>
    {contextMenu && (
      <div className="fixed inset-0 z-50" onClick={() => setContextMenu(null)}>
        <div
          className="absolute bg-gray-800 border border-gray-600 rounded-md shadow-xl w-48 py-2"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            onClick={handleRename}
            className="w-full px-3 py-2 text-left text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2"
          >
            <PencilSquareIcon className="w-4 h-4" />
            Rename
          </button>
          <button
            onClick={handleDelete}
            className="w-full px-3 py-2 text-left text-sm text-red-200 hover:bg-red-700/40 flex items-center gap-2"
          >
            <TrashIcon className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>
    )}
    </>
  )
}
