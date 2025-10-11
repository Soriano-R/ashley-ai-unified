/**
 * Type Definitions for the Chat Application
 * These interfaces define the structure of data used throughout the app
 */

// User roles for role-based access control
export type UserRole = 'admin' | 'user'

// User information interface
export interface User {
  id: string                    // Unique identifier for the user
  email: string                 // User's email address
  name: string                  // User's display name
  role: UserRole                // User's role (admin or user)
  createdAt: Date              // When the account was created
}

// Represents a single chat message
export interface Message {
  id: string                    // Unique identifier for the message
  role: 'user' | 'assistant'    // Who sent the message
  content: string               // The actual message text
  timestamp: Date               // When the message was sent
}

// Represents a chat session/conversation
export interface Session {
  id: string                    // Unique identifier for the session
  title: string                 // Display title for the session (usually first message preview)
  messages: Message[]           // Array of all messages in this session
}

// Props for the ChatArea component
export interface ChatProps {
  messages: Message[]                           // Messages to display
  onSendMessage: (content: string) => void     // Function to handle sending new messages
  isLoading: boolean                           // Whether AI is currently responding
  persona?: string                             // Current persona (Ashley, Technical, Creative, etc.)
  onVoiceResponse?: (audioUrl: string, text: string) => void // Handle voice synthesis responses
}

// Props for the Sidebar component
export interface SidebarProps {
  sessions: Session[]                           // All available chat sessions
  activeSessionId: string                       // ID of the currently selected session
  onNewChat: () => void                        // Function to create a new chat session
  onSelectSession: (sessionId: string) => void // Function to switch to a different session
  isCollapsed: boolean                          // Whether the sidebar is collapsed
  onToggleCollapse: () => void                 // Function to toggle sidebar collapse state
  onSignOut?: () => void                       // Optional function to handle sign out
  onOpenSettings?: () => void                  // Optional function to open settings modal
  onOpenAdminPanel?: () => void                // Optional function to open admin panel (admin only)
  user?: User                                  // Current user information
}