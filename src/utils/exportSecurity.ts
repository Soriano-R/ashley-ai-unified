/**
 * Export Security Controls
 * Defines what data users can safely export vs admin-only data
 */

import { Message, Session, User } from '../types'

// Define what data users can safely export
export interface SafeExportData {
  userMessages: Message[]      // Only messages from/to this user
  userSessions: Session[]      // Only sessions belonging to this user
  userPreferences: UserPreferences // User's personal settings only
  timestamp: Date             // When export was generated
  exportId: string            // Unique export identifier
}

// Safe user preferences (no sensitive data)
interface UserPreferences {
  name: string
  theme?: string
  language?: string
  // Add other safe preferences here
}

// Data that should NEVER be exported to users
export interface RestrictedData {
  apiKeys: string[]           // Backend API keys
  databaseConfig: unknown     // Database connection strings
  otherUsersData: unknown[]   // Other users' conversations
  systemLogs: unknown[]       // Application logs
  adminSettings: unknown      // System configuration
  internalMetrics: unknown    // Analytics and performance data
  serverDetails: unknown      // Server configuration
}

/**
 * Sanitizes export data to only include user's own content
 */
export function sanitizeExportData(
  userId: string, 
  sessions: Session[], 
  user: User
): SafeExportData {
  
  // Filter to only user's own sessions
  const userSessions = sessions.filter(session => 
    // Add logic to check if session belongs to user
    // This would come from your backend session management
    session.messages.some(msg => msg.id.includes(userId))
  )
  
  // Extract only user's messages
  const userMessages = userSessions.flatMap(session => 
    session.messages.filter(() => 
      // Only include messages in user's conversations
      true // Your backend should validate this
    )
  )
  
  // Return only safe data
  return {
    userMessages,
    userSessions,
    userPreferences: extractSafeUserPreferences(user),
    timestamp: new Date(),
    exportId: generateExportId(userId)
  }
}

/**
 * Extract only safe user preferences (no sensitive settings)
 */
function extractSafeUserPreferences(user: User): UserPreferences {
  return {
    name: user.name,
    // Theme preferences, language settings, etc.
    // NO API keys, admin settings, or system config
  }
}

/**
 * Generate unique export ID for tracking
 */
function generateExportId(userId: string): string {
  return `export_${userId}_${Date.now()}`
}

// Admin export controls interface
interface AdminExportControls {
  currentChatPDF: boolean
  currentChatTXT: boolean
  chatHistoryPDF: boolean
  chatHistoryTXT: boolean
  jsonExport: boolean
  csvExport: boolean
  xmlExport: boolean
  userSettingsExport: boolean
  sessionMetadata: boolean
  systemLogs: boolean
}

/**
 * Validates if user can export specific data based on admin settings
 */
export function canUserExport(
  userId: string, 
  dataType: 'chat' | 'history' | 'settings',
  targetData: unknown,
  adminExportControls?: Partial<AdminExportControls>
): boolean {
  
  // If no admin controls provided, use secure defaults
  const defaults: AdminExportControls = {
    currentChatPDF: true,
    currentChatTXT: true,
    chatHistoryPDF: true,
    chatHistoryTXT: true,
    jsonExport: false,
    csvExport: false,
    xmlExport: false,
    userSettingsExport: true,
    sessionMetadata: false,
    systemLogs: false
  }
  
  const controls = { ...defaults, ...adminExportControls }
  
  switch (dataType) {
    case 'chat':
      // Check admin permission for chat exports
      return controls.currentChatPDF && controls.currentChatTXT && validateChatOwnership(userId, targetData)
    
    case 'history':
      // Check admin permission for history exports
      return controls.chatHistoryPDF && controls.chatHistoryTXT && validateHistoryOwnership(userId, targetData)
    
    case 'settings':
      // Check admin permission for settings export
      return controls.userSettingsExport && validateSettingsOwnership(userId, targetData)
    
    default:
      return false
  }
}

/**
 * Check specific export format permissions
 */
export function canUserExportFormat(
  userId: string,
  exportType: 'currentChatPDF' | 'currentChatTXT' | 'chatHistoryPDF' | 'chatHistoryTXT' | 'json' | 'csv' | 'xml',
  adminExportControls?: Partial<AdminExportControls>
): boolean {
  
  // Default secure settings
  const defaults: AdminExportControls = {
    currentChatPDF: true,
    currentChatTXT: true,
    chatHistoryPDF: true,
    chatHistoryTXT: true,
    jsonExport: false,
    csvExport: false,
    xmlExport: false,
    userSettingsExport: true,
    sessionMetadata: false,
    systemLogs: false
  }
  
  const controls = { ...defaults, ...adminExportControls }
  
  // Map export types to control keys
  const controlMapping: Record<string, keyof AdminExportControls> = {
    'currentChatPDF': 'currentChatPDF',
    'currentChatTXT': 'currentChatTXT',
    'chatHistoryPDF': 'chatHistoryPDF',
    'chatHistoryTXT': 'chatHistoryTXT',
    'json': 'jsonExport',
    'csv': 'csvExport',
    'xml': 'xmlExport'
  }
  
  const controlKey = controlMapping[exportType]
  return controlKey ? controls[controlKey] : false
}

function validateChatOwnership(userId: string, chatData: unknown): boolean {
  // Implement your logic to verify chat belongs to user
  // This should check against your backend/database
  console.log('Validating chat ownership for:', userId, chatData)
  return true // Placeholder
}

function validateHistoryOwnership(userId: string, historyData: unknown): boolean {
  // Implement your logic to verify all history belongs to user
  console.log('Validating history ownership for:', userId, historyData)
  return true // Placeholder
}

function validateSettingsOwnership(userId: string, settingsData: unknown): boolean {
  // Only allow user's own settings, never system/admin settings
  console.log('Validating settings ownership for:', userId, settingsData)
  return true // Placeholder
}

/**
 * Admin-only export functions
 */
export function adminCanExport(adminUser: User, dataType: string): boolean {
  if (adminUser.role !== 'admin') {
    return false
  }
  
  // Admins can export system data, but it should be logged
  console.log('Admin export authorized for:', adminUser.id, dataType)
  return true
}

/**
 * Log export attempts for security monitoring
 */
export function logExportAttempt(
  userId: string, 
  dataType: string, 
  success: boolean,
  size: number
): void {
  // Log to your backend for security monitoring
  console.log(`Export attempt: ${userId} tried to export ${dataType}, success: ${success}, size: ${size}`)
}
