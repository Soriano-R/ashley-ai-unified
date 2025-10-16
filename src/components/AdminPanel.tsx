'use client'

import { useEffect, useMemo, useState } from 'react'
import UserManager from './UserManager'
import { ModelOption, PersonaOption, User } from '@/types'

interface AdminPanelProps {
  isOpen: boolean
  onClose: () => void
  user: User
  personas?: PersonaOption[]
  personaCategories?: Record<string, { label: string; description: string }>
  models?: ModelOption[]
  onPersonaMutate?: () => Promise<void> | void
}

export default function AdminPanel({
  isOpen,
  onClose,
  user,
  personas = [],
  personaCategories = {},
  models = [],
  onPersonaMutate,
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState('api-keys')
  const [showUserManager, setShowUserManager] = useState(false)
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>('')
  const [personaMessage, setPersonaMessage] = useState<string | null>(null)
  const [personaSaving, setPersonaSaving] = useState(false)

  const personaCategoriesList = useMemo(
    () => Object.keys(personaCategories).map((key) => ({ id: key, ...personaCategories[key] })),
    [personaCategories]
  )

  const modelCategoryOptions = useMemo(() => {
    const acc: Record<string, true> = {}
    models.forEach((model) => {
      model.categories?.forEach((cat) => {
        acc[cat] = true
      })
    })
    return Object.keys(acc)
  }, [models])

  type PersonaDraft = {
    id: string
    label: string
    description: string
    files: string
    tags: string
    category: string
    nsfw: boolean
    defaultModel: string
    allowedModelCategories: string[]
    allowedModelIds: string[]
    isNew: boolean
  }

  const toDraft = (persona?: PersonaOption): PersonaDraft => {
    if (!persona) {
      return {
        id: '',
        label: '',
        description: '',
        files: '',
        tags: '',
        category: personaCategoriesList[0]?.id ?? 'General',
        nsfw: false,
        defaultModel: 'auto',
        allowedModelCategories: [],
        allowedModelIds: [],
        isNew: true,
      }
    }

    return {
      id: persona.id,
      label: persona.label,
      description: persona.description,
      files: (persona.files ?? []).join('\n'),
      tags: persona.tags.join(', '),
      category: persona.category,
      nsfw: persona.nsfw,
      defaultModel: persona.defaultModel ?? 'auto',
      allowedModelCategories: persona.allowedModelCategories ?? [],
      allowedModelIds: persona.allowedModelIds ?? [],
      isNew: false,
    }
  }

  const [personaDraft, setPersonaDraft] = useState<PersonaDraft>(() => toDraft(personas[0]))

  const personaCategoryOptions = useMemo(() => {
    const categories = new Set(personaCategoriesList.map((item) => item.id))
    if (personaDraft.category) {
      categories.add(personaDraft.category)
    }
    return Array.from(categories)
  }, [personaCategoriesList, personaDraft.category])

  const modelIdOptions = useMemo(() => {
    const options = new Set<string>(['auto'])
    models.forEach((model) => options.add(model.id))
    personaDraft.allowedModelIds.forEach((id) => options.add(id))
    return Array.from(options)
  }, [models, personaDraft.allowedModelIds])

  useEffect(() => {
    if (personaDraft.isNew) return
    if (personas.length > 0) {
      const match = personas.find((p) => p.id === selectedPersonaId) ?? personas[0]
      if (match) {
        setSelectedPersonaId(match.id)
        setPersonaDraft(toDraft(match))
      }
    } else {
      setSelectedPersonaId('')
      setPersonaDraft(toDraft())
    }
  }, [personas])

  const handleSelectPersona = (value: string) => {
    setPersonaMessage(null)
    if (value === 'new') {
      setSelectedPersonaId('new')
      setPersonaDraft(toDraft())
      return
    }
    const match = personas.find((p) => p.id === value)
    if (match) {
      setSelectedPersonaId(match.id)
      setPersonaDraft(toDraft(match))
    }
  }

  const handlePersonaField = <K extends keyof PersonaDraft>(key: K, value: PersonaDraft[K]) => {
    setPersonaDraft((prev) => ({ ...prev, [key]: value }))
    setPersonaMessage(null)
  }

  const handlePersonaSave = async () => {
    if (!personaDraft.id.trim()) {
      setPersonaMessage('Persona ID is required.')
      return
    }
    if (!personaDraft.label.trim()) {
      setPersonaMessage('Persona label is required.')
      return
    }

    const files = personaDraft.files
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
    const tags = personaDraft.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)

    const payload = {
      action: personaDraft.isNew && !personas.find((p) => p.id === personaDraft.id) ? 'create' : 'update',
      persona: {
        id: personaDraft.id.trim(),
        label: personaDraft.label.trim(),
        files,
        description: personaDraft.description.trim(),
        tags,
        category: personaDraft.category || 'General',
        nsfw: personaDraft.nsfw,
        default_model: personaDraft.defaultModel || 'auto',
        allowed_model_categories: personaDraft.allowedModelCategories,
        allowed_model_ids: personaDraft.allowedModelIds.length ? personaDraft.allowedModelIds : null,
      },
    }

    try {
      setPersonaSaving(true)
      setPersonaMessage(null)
      const response = await fetch('/api/personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        throw new Error(errorBody?.error || `Request failed with status ${response.status}`)
      }
      setPersonaMessage('Persona saved successfully.')
      setPersonaDraft((prev) => ({ ...prev, isNew: false }))
      setSelectedPersonaId(personaDraft.id)
      if (onPersonaMutate) await onPersonaMutate()
    } catch (error: any) {
      setPersonaMessage(error.message || 'Failed to save persona.')
    } finally {
      setPersonaSaving(false)
    }
  }

  const handlePersonaDelete = async () => {
    if (personaDraft.isNew || !selectedPersonaId || !personas.find((p) => p.id === selectedPersonaId)) {
      setPersonaMessage('Select an existing persona to delete.')
      return
    }
    if (!confirm('Delete this persona? This action cannot be undone.')) return

    try {
      setPersonaSaving(true)
      setPersonaMessage(null)
      const response = await fetch('/api/personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', persona_id: selectedPersonaId }),
      })
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        throw new Error(errorBody?.error || `Request failed with status ${response.status}`)
      }
      setPersonaMessage('Persona deleted.')
      setSelectedPersonaId('new')
      setPersonaDraft(toDraft())
      if (onPersonaMutate) await onPersonaMutate()
    } catch (error: any) {
      setPersonaMessage(error.message || 'Failed to delete persona.')
    } finally {
      setPersonaSaving(false)
    }
  }

  // Admin Settings State
  const [adminSettings, setAdminSettings] = useState({
    // API Keys
    apiKeys: {
      openai: 'sk-...hidden',
      microsoftTranslator: '',
      googleTranslate: '',
      deepl: '',
      anthropic: ''
    },
    
    // Translation Settings
    translation: {
      defaultProvider: 'microsoft',
      monthlyLimitPerUser: 2000000, // 2M characters
      allowExceedLimit: false,
      premiumMultiplier: 5, // 10M for premium users
      enabledLanguages: ['en-US', 'es', 'fr', 'de', 'it', 'pt', 'zh-CN', 'ja', 'ko', 'ru']
    },
    
    // Token Limits
    tokenLimits: {
      defaultMaxTokens: 1000,
      maxTokensLimit: 4000,
      allowUserOverride: false,
      premiumMaxTokens: 8000
    },
    
    // Analytics
    analytics: {
      conversationContent: false,
      detailedBehaviorTracking: false,
      exportLogs: true,
      retentionDays: 90,
      anonymizeData: true
    },
    
    // Encryption
    encryption: {
      databaseEncryption: true,
      encryptionAlgorithm: 'AES-256-GCM',
      keyRotationDays: 90,
      endToEndEncryption: 'optional', // 'disabled', 'optional', 'required'
      encryptionProvider: 'aws-kms'
    },
    
    // Custom Models
    customModels: [
      {
        id: '1',
        name: 'Local LLaMA 3.1',
        endpoint: 'http://localhost:8080/v1/chat/completions',
        apiKey: 'local-key-123',
        enabled: true,
        maxTokens: 2048
      }
    ],
    
    // Webhooks
    webhooks: [
      {
        id: '1',
        name: 'Chat Completion',
        event: 'chat.completed',
        url: 'https://api.company.com/webhook/chat',
        secret: 'whsec_...hidden',
        enabled: true
      }
    ],
    
    // Export Controls
    exportControls: {
      // User Chat Exports
      currentChatPDF: true,        // Default: Allow
      currentChatTXT: true,        // Default: Allow  
      chatHistoryPDF: true,        // Default: Allow
      chatHistoryTXT: true,        // Default: Allow
      
      // Advanced Export Formats
      jsonExport: false,           // Default: Disallow
      csvExport: false,            // Default: Disallow
      xmlExport: false,            // Default: Disallow
      
      // System Data (Sensitive)
      userSettingsExport: true,    // Default: Allow
      sessionMetadata: false,      // Default: Disallow
      systemLogs: false,           // Default: Disallow
      
      // Additional Controls
      bulkExport: false,           // Default: Disallow
      exportWithMetadata: false,   // Default: Disallow
      crossUserExport: false       // Default: Disallow (admin only)
    }
  })

  const updateAdminSetting = (category: string, key: string, value: string | number | boolean) => {
    setAdminSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [key]: value
      }
    }))
  }

  const updateNestedSetting = (category: string, subCategory: string, key: string, value: string | number | boolean) => {
    setAdminSettings(prev => {
      const categoryData = prev[category as keyof typeof prev]
      if (typeof categoryData === 'object' && categoryData !== null && !Array.isArray(categoryData)) {
        if (!subCategory) {
          return {
            ...prev,
            [category]: {
              ...categoryData,
              [key]: value
            }
          }
        }
        const subCategoryData = (categoryData as Record<string, unknown>)[subCategory]
        return {
          ...prev,
          [category]: {
            ...categoryData,
            [subCategory]: {
              ...(typeof subCategoryData === 'object' ? subCategoryData : {}),
              [key]: value
            }
          }
        }
      }
      return prev
    })
  }

  const addCustomModel = () => {
    const newModel = {
      id: Date.now().toString(),
      name: 'New Model',
      endpoint: '',
      apiKey: '',
      enabled: false,
      maxTokens: 1000
    }
    setAdminSettings(prev => ({
      ...prev,
      customModels: [...prev.customModels, newModel]
    }))
  }

  const addWebhook = () => {
    const newWebhook = {
      id: Date.now().toString(),
      name: 'New Webhook',
      event: 'chat.completed',
      url: '',
      secret: '',
      enabled: false
    }
    setAdminSettings(prev => ({
      ...prev,
      webhooks: [...prev.webhooks, newWebhook]
    }))
  }

  const tabs = [
    { id: 'users', name: 'User Management' },
    { id: 'personas', name: 'Personas' },
    { id: 'api-keys', name: 'API Keys' },
    { id: 'export-controls', name: 'Export Controls' },
    { id: 'translation', name: 'Translation' },
    { id: 'analytics', name: 'Analytics' },
    { id: 'encryption', name: 'Security' },
    { id: 'models', name: 'Models' },
    { id: 'webhooks', name: 'Webhooks' },
    { id: 'system', name: 'System' }
  ]

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-gray-900 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-white">Admin Panel</h2>
              <span className="bg-red-600 text-white text-xs px-2 py-1 rounded">ADMIN ONLY</span>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <span className="sr-only">Close</span>
            </button>
          </div>

          {/* Content */}
          <div className="flex h-[calc(90vh-120px)]">
            {/* Sidebar Tabs */}
            <div className="w-64 bg-gray-800 border-r border-gray-700 overflow-y-auto">
              <div className="p-4">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors mb-1 ${
                      activeTab === tab.id
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    {tab.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-6">
              
              {/* User Management Tab */}
              {activeTab === 'users' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-white">User Management</h3>
                    <button
                      onClick={() => setShowUserManager(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Open User Manager
                    </button>
                  </div>
                  
                  <div className="bg-gray-700 rounded-lg p-6">
                    <h4 className="text-md font-medium text-white mb-4">Quick Overview</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-400">15</div>
                        <div className="text-sm text-gray-400">Total Users</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-400">12</div>
                        <div className="text-sm text-gray-400">Active Users</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-400">8</div>
                        <div className="text-sm text-gray-400">Premium Users</div>
                      </div>
                    </div>
                    
                    <div className="mt-6">
                      <h5 className="text-sm font-medium text-gray-300 mb-3">Available Features</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex items-center gap-2 text-gray-300">
                          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                          <span>User search and filtering</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-300">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span>Payment history tracking</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-300">
                          <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                          <span>User analytics and demographics</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-300">
                          <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                          <span>Bulk user operations</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-yellow-600/20 border border-yellow-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-yellow-300">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                      <span className="font-medium">Note:</span>
                    </div>
                    <p className="text-yellow-200 mt-1 text-sm">
                      The User Manager provides comprehensive tools for managing user accounts, tracking payments, 
                      and analyzing user behavior. Click &quot;Open User Manager&quot; to access the full interface.
                    </p>
                  </div>
                </div>
              )}

              {/* Personas Tab */}
              {activeTab === 'personas' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-white">Persona Management</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSelectPersona('new')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                      >
                        New Persona
                      </button>
                    </div>
                  </div>
                  {personaMessage && (
                    <div className="bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-200">
                      {personaMessage}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Persona</label>
                        <select
                          value={personaDraft.isNew ? 'new' : selectedPersonaId}
                          onChange={(event) => handleSelectPersona(event.target.value)}
                          className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-white"
                        >
                          {personas.map((persona) => (
                            <option key={persona.id} value={persona.id}>
                              {persona.label} ({persona.id})
                            </option>
                          ))}
                          <option value="new">+ Create new persona…</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Persona ID</label>
                        <input
                          value={personaDraft.id}
                          onChange={(event) => handlePersonaField('id', event.target.value)}
                          disabled={!personaDraft.isNew && personas.some((p) => p.id === personaDraft.id)}
                          className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Label</label>
                        <input
                          value={personaDraft.label}
                          onChange={(event) => handlePersonaField('label', event.target.value)}
                          className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
                        <input
                          list="persona-category-options"
                          value={personaDraft.category}
                          onChange={(event) => handlePersonaField('category', event.target.value)}
                          className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-white"
                        />
                        <datalist id="persona-category-options">
                          {personaCategoryOptions.map((category) => (
                            <option key={category} value={category} />
                          ))}
                        </datalist>
                      </div>

                      <label className="inline-flex items-center gap-2 text-sm text-gray-300">
                        <input
                          type="checkbox"
                          checked={personaDraft.nsfw}
                          onChange={(event) => handlePersonaField('nsfw', event.target.checked)}
                          className="rounded border-gray-600 bg-gray-800"
                        />
                        NSFW Persona
                      </label>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                        <textarea
                          value={personaDraft.description}
                          onChange={(event) => handlePersonaField('description', event.target.value)}
                          className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-white h-28"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Prompt Files (one per line)</label>
                        <textarea
                          value={personaDraft.files}
                          onChange={(event) => handlePersonaField('files', event.target.value)}
                          className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-white h-24 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Tags (comma separated)</label>
                        <input
                          value={personaDraft.tags}
                          onChange={(event) => handlePersonaField('tags', event.target.value)}
                          className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Default Model</label>
                        <select
                          value={personaDraft.defaultModel}
                          onChange={(event) => handlePersonaField('defaultModel', event.target.value)}
                          className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-white"
                        >
                          {modelIdOptions.map((modelId) => (
                            <option key={modelId} value={modelId}>
                              {modelId}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Allowed Model Categories</label>
                        <select
                          multiple
                          value={personaDraft.allowedModelCategories}
                          onChange={(event) => handlePersonaField(
                            'allowedModelCategories',
                            Array.from(event.target.selectedOptions, (option) => option.value)
                          )}
                          className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-white h-24"
                        >
                          {modelCategoryOptions.map((category) => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Allowed Model IDs</label>
                        <select
                          multiple
                          value={personaDraft.allowedModelIds}
                          onChange={(event) => handlePersonaField(
                            'allowedModelIds',
                            Array.from(event.target.selectedOptions, (option) => option.value)
                          )}
                          className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-white h-24"
                        >
                          {modelIdOptions.map((modelId) => (
                            <option key={modelId} value={modelId}>
                              {modelId}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3">
                    {!personaDraft.isNew && (
                      <button
                        onClick={handlePersonaDelete}
                        disabled={personaSaving}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-60"
                      >
                        Delete Persona
                      </button>
                    )}
                    <button
                      onClick={handlePersonaSave}
                      disabled={personaSaving}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60"
                    >
                      {personaSaving ? 'Saving…' : 'Save Persona'}
                    </button>
                  </div>
                </div>
              )}
              
              {/* API Keys Tab */}
              {activeTab === 'api-keys' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-white">API Keys Management</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">OpenAI API Key</label>
                      <input
                        type="password"
                        value={adminSettings.apiKeys.openai}
                        onChange={(e) => updateNestedSetting('apiKeys', '', 'openai', e.target.value)}
                        placeholder="sk-..."
                        className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Microsoft Translator Key</label>
                      <input
                        type="password"
                        value={adminSettings.apiKeys.microsoftTranslator}
                        onChange={(e) => updateNestedSetting('apiKeys', '', 'microsoftTranslator', e.target.value)}
                        placeholder="Enter Microsoft Translator subscription key"
                        className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white"
                      />
                      <p className="text-xs text-gray-400 mt-1">2M characters/month free, then $10/1M characters</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Google Translate API Key</label>
                      <input
                        type="password"
                        value={adminSettings.apiKeys.googleTranslate}
                        onChange={(e) => updateNestedSetting('apiKeys', '', 'googleTranslate', e.target.value)}
                        placeholder="Enter Google Cloud API key"
                        className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white"
                      />
                      <p className="text-xs text-gray-400 mt-1">$20/1M characters after $300 free credit</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">DeepL API Key</label>
                      <input
                        type="password"
                        value={adminSettings.apiKeys.deepl}
                        onChange={(e) => updateNestedSetting('apiKeys', '', 'deepl', e.target.value)}
                        placeholder="Enter DeepL API key"
                        className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white"
                      />
                      <p className="text-xs text-gray-400 mt-1">500K characters/month free, then €5.99/month</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Anthropic API Key</label>
                      <input
                        type="password"
                        value={adminSettings.apiKeys.anthropic}
                        onChange={(e) => updateNestedSetting('apiKeys', '', 'anthropic', e.target.value)}
                        placeholder="Enter Anthropic API key"
                        className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Export Controls Tab */}
              {activeTab === 'export-controls' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-white">Export Controls</h3>
                    <button
                      onClick={() => {
                        setAdminSettings(prev => ({
                          ...prev,
                          exportControls: {
                            currentChatPDF: true,
                            currentChatTXT: true,
                            chatHistoryPDF: true,
                            chatHistoryTXT: true,
                            jsonExport: false,
                            csvExport: false,
                            xmlExport: false,
                            userSettingsExport: true,
                            sessionMetadata: false,
                            systemLogs: false,
                            bulkExport: false,
                            exportWithMetadata: false,
                            crossUserExport: false
                          }
                        }))
                      }}
                      className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-md text-sm"
                    >
                      Reset to Defaults
                    </button>
                  </div>
                  
                  <div className="bg-gray-800 rounded-lg p-4 max-h-96 overflow-y-auto">
                    <div className="space-y-6">
                      
                      {/* User Chat Exports */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-300 mb-3 border-b border-gray-600 pb-2">👤 User Chat Exports</h4>
                        <div className="space-y-3">
                          
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-sm text-gray-300">Current Chat (PDF)</span>
                              <span className="text-xs text-gray-500 ml-2">Default: Allow</span>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => updateAdminSetting('exportControls', 'currentChatPDF', true)}
                                className={`px-3 py-1 rounded text-xs ${
                                  adminSettings.exportControls.currentChatPDF 
                                    ? 'bg-green-600 text-white' 
                                    : 'bg-gray-600 text-gray-300'
                                }`}
                              >
                                Allow
                              </button>
                              <button
                                onClick={() => updateAdminSetting('exportControls', 'currentChatPDF', false)}
                                className={`px-3 py-1 rounded text-xs ${
                                  !adminSettings.exportControls.currentChatPDF 
                                    ? 'bg-red-600 text-white' 
                                    : 'bg-gray-600 text-gray-300'
                                }`}
                              >
                                Disallow
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-sm text-gray-300">Current Chat (TXT)</span>
                              <span className="text-xs text-gray-500 ml-2">Default: Allow</span>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => updateAdminSetting('exportControls', 'currentChatTXT', true)}
                                className={`px-3 py-1 rounded text-xs ${
                                  adminSettings.exportControls.currentChatTXT 
                                    ? 'bg-green-600 text-white' 
                                    : 'bg-gray-600 text-gray-300'
                                }`}
                              >
                                Allow
                              </button>
                              <button
                                onClick={() => updateAdminSetting('exportControls', 'currentChatTXT', false)}
                                className={`px-3 py-1 rounded text-xs ${
                                  !adminSettings.exportControls.currentChatTXT 
                                    ? 'bg-red-600 text-white' 
                                    : 'bg-gray-600 text-gray-300'
                                }`}
                              >
                                Disallow
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-sm text-gray-300">Chat History (PDF)</span>
                              <span className="text-xs text-gray-500 ml-2">Default: Allow</span>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => updateAdminSetting('exportControls', 'chatHistoryPDF', true)}
                                className={`px-3 py-1 rounded text-xs ${
                                  adminSettings.exportControls.chatHistoryPDF 
                                    ? 'bg-green-600 text-white' 
                                    : 'bg-gray-600 text-gray-300'
                                }`}
                              >
                                Allow
                              </button>
                              <button
                                onClick={() => updateAdminSetting('exportControls', 'chatHistoryPDF', false)}
                                className={`px-3 py-1 rounded text-xs ${
                                  !adminSettings.exportControls.chatHistoryPDF 
                                    ? 'bg-red-600 text-white' 
                                    : 'bg-gray-600 text-gray-300'
                                }`}
                              >
                                Disallow
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-sm text-gray-300">Chat History (TXT)</span>
                              <span className="text-xs text-gray-500 ml-2">Default: Allow</span>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => updateAdminSetting('exportControls', 'chatHistoryTXT', true)}
                                className={`px-3 py-1 rounded text-xs ${
                                  adminSettings.exportControls.chatHistoryTXT 
                                    ? 'bg-green-600 text-white' 
                                    : 'bg-gray-600 text-gray-300'
                                }`}
                              >
                                Allow
                              </button>
                              <button
                                onClick={() => updateAdminSetting('exportControls', 'chatHistoryTXT', false)}
                                className={`px-3 py-1 rounded text-xs ${
                                  !adminSettings.exportControls.chatHistoryTXT 
                                    ? 'bg-red-600 text-white' 
                                    : 'bg-gray-600 text-gray-300'
                                }`}
                              >
                                Disallow
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Advanced Export Formats */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-300 mb-3 border-b border-gray-600 pb-2">🔧 Advanced Export Formats</h4>
                        <div className="space-y-3">
                          
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-sm text-gray-300">JSON Export</span>
                              <span className="text-xs text-gray-500 ml-2">Default: Disallow</span>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => updateAdminSetting('exportControls', 'jsonExport', true)}
                                className={`px-3 py-1 rounded text-xs ${
                                  adminSettings.exportControls.jsonExport 
                                    ? 'bg-green-600 text-white' 
                                    : 'bg-gray-600 text-gray-300'
                                }`}
                              >
                                Allow
                              </button>
                              <button
                                onClick={() => updateAdminSetting('exportControls', 'jsonExport', false)}
                                className={`px-3 py-1 rounded text-xs ${
                                  !adminSettings.exportControls.jsonExport 
                                    ? 'bg-red-600 text-white' 
                                    : 'bg-gray-600 text-gray-300'
                                }`}
                              >
                                Disallow
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-sm text-gray-300">CSV Export</span>
                              <span className="text-xs text-gray-500 ml-2">Default: Disallow</span>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => updateAdminSetting('exportControls', 'csvExport', true)}
                                className={`px-3 py-1 rounded text-xs ${
                                  adminSettings.exportControls.csvExport 
                                    ? 'bg-green-600 text-white' 
                                    : 'bg-gray-600 text-gray-300'
                                }`}
                              >
                                Allow
                              </button>
                              <button
                                onClick={() => updateAdminSetting('exportControls', 'csvExport', false)}
                                className={`px-3 py-1 rounded text-xs ${
                                  !adminSettings.exportControls.csvExport 
                                    ? 'bg-red-600 text-white' 
                                    : 'bg-gray-600 text-gray-300'
                                }`}
                              >
                                Disallow
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-sm text-gray-300">XML Export</span>
                              <span className="text-xs text-gray-500 ml-2">Default: Disallow</span>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => updateAdminSetting('exportControls', 'xmlExport', true)}
                                className={`px-3 py-1 rounded text-xs ${
                                  adminSettings.exportControls.xmlExport 
                                    ? 'bg-green-600 text-white' 
                                    : 'bg-gray-600 text-gray-300'
                                }`}
                              >
                                Allow
                              </button>
                              <button
                                onClick={() => updateAdminSetting('exportControls', 'xmlExport', false)}
                                className={`px-3 py-1 rounded text-xs ${
                                  !adminSettings.exportControls.xmlExport 
                                    ? 'bg-red-600 text-white' 
                                    : 'bg-gray-600 text-gray-300'
                                }`}
                              >
                                Disallow
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* System Data */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-300 mb-3 border-b border-gray-600 pb-2">🛡️ System Data (Sensitive)</h4>
                        <div className="space-y-3">
                          
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-sm text-gray-300">User Settings Export</span>
                              <span className="text-xs text-gray-500 ml-2">Default: Allow</span>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => updateAdminSetting('exportControls', 'userSettingsExport', true)}
                                className={`px-3 py-1 rounded text-xs ${
                                  adminSettings.exportControls.userSettingsExport 
                                    ? 'bg-green-600 text-white' 
                                    : 'bg-gray-600 text-gray-300'
                                }`}
                              >
                                Allow
                              </button>
                              <button
                                onClick={() => updateAdminSetting('exportControls', 'userSettingsExport', false)}
                                className={`px-3 py-1 rounded text-xs ${
                                  !adminSettings.exportControls.userSettingsExport 
                                    ? 'bg-red-600 text-white' 
                                    : 'bg-gray-600 text-gray-300'
                                }`}
                              >
                                Disallow
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-sm text-gray-300">Session Metadata</span>
                              <span className="text-xs text-gray-500 ml-2">Default: Disallow</span>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => updateAdminSetting('exportControls', 'sessionMetadata', true)}
                                className={`px-3 py-1 rounded text-xs ${
                                  adminSettings.exportControls.sessionMetadata 
                                    ? 'bg-green-600 text-white' 
                                    : 'bg-gray-600 text-gray-300'
                                }`}
                              >
                                Allow
                              </button>
                              <button
                                onClick={() => updateAdminSetting('exportControls', 'sessionMetadata', false)}
                                className={`px-3 py-1 rounded text-xs ${
                                  !adminSettings.exportControls.sessionMetadata 
                                    ? 'bg-red-600 text-white' 
                                    : 'bg-gray-600 text-gray-300'
                                }`}
                              >
                                Disallow
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-sm text-gray-300">System Logs</span>
                              <span className="text-xs text-gray-500 ml-2">Default: Disallow</span>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => updateAdminSetting('exportControls', 'systemLogs', true)}
                                className={`px-3 py-1 rounded text-xs ${
                                  adminSettings.exportControls.systemLogs 
                                    ? 'bg-green-600 text-white' 
                                    : 'bg-gray-600 text-gray-300'
                                }`}
                              >
                                Allow
                              </button>
                              <button
                                onClick={() => updateAdminSetting('exportControls', 'systemLogs', false)}
                                className={`px-3 py-1 rounded text-xs ${
                                  !adminSettings.exportControls.systemLogs 
                                    ? 'bg-red-600 text-white' 
                                    : 'bg-gray-600 text-gray-300'
                                }`}
                              >
                                Disallow
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-sm text-gray-300">Bulk Export</span>
                              <span className="text-xs text-gray-500 ml-2">Default: Disallow</span>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => updateAdminSetting('exportControls', 'bulkExport', true)}
                                className={`px-3 py-1 rounded text-xs ${
                                  adminSettings.exportControls.bulkExport 
                                    ? 'bg-green-600 text-white' 
                                    : 'bg-gray-600 text-gray-300'
                                }`}
                              >
                                Allow
                              </button>
                              <button
                                onClick={() => updateAdminSetting('exportControls', 'bulkExport', false)}
                                className={`px-3 py-1 rounded text-xs ${
                                  !adminSettings.exportControls.bulkExport 
                                    ? 'bg-red-600 text-white' 
                                    : 'bg-gray-600 text-gray-300'
                                }`}
                              >
                                Disallow
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Export Status Summary */}
                      <div className="bg-gray-700 rounded p-3 mt-4">
                        <h4 className="text-sm font-medium text-gray-300 mb-2">📊 Current Status</h4>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-green-400">Allowed: </span>
                            <span className="text-gray-300">
                              {Object.values(adminSettings.exportControls).filter(v => v === true).length}
                            </span>
                          </div>
                          <div>
                            <span className="text-red-400">Disallowed: </span>
                            <span className="text-gray-300">
                              {Object.values(adminSettings.exportControls).filter(v => v === false).length}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Translation Tab */}
              {activeTab === 'translation' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-white">Translation Settings</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Default Translation Provider</label>
                      <select
                        value={adminSettings.translation.defaultProvider}
                        onChange={(e) => updateAdminSetting('translation', 'defaultProvider', e.target.value)}
                        className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white"
                      >
                        <option value="microsoft">Microsoft Translator (Recommended)</option>
                        <option value="google">Google Translate</option>
                        <option value="deepl">DeepL</option>
                        <option value="libretranslate">LibreTranslate (Free)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Monthly Character Limit per User</label>
                      <input
                        type="number"
                        value={adminSettings.translation.monthlyLimitPerUser}
                        onChange={(e) => updateAdminSetting('translation', 'monthlyLimitPerUser', parseInt(e.target.value))}
                        className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white"
                      />
                      <p className="text-xs text-gray-400 mt-1">Default: 2M characters (≈400,000 words)</p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-300">Allow Premium Users to Exceed Limit</label>
                        <p className="text-xs text-gray-400">Premium users get 5x the character limit</p>
                      </div>
                      <button
                        onClick={() => updateAdminSetting('translation', 'allowExceedLimit', !adminSettings.translation.allowExceedLimit)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          adminSettings.translation.allowExceedLimit ? 'bg-blue-600' : 'bg-gray-600'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          adminSettings.translation.allowExceedLimit ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Premium User Multiplier</label>
                      <select
                        value={adminSettings.translation.premiumMultiplier}
                        onChange={(e) => updateAdminSetting('translation', 'premiumMultiplier', parseInt(e.target.value))}
                        className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white"
                        disabled={!adminSettings.translation.allowExceedLimit}
                      >
                        <option value="2">2x (4M characters)</option>
                        <option value="3">3x (6M characters)</option>
                        <option value="5">5x (10M characters)</option>
                        <option value="10">10x (20M characters)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Analytics Tab */}
              {activeTab === 'analytics' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-white">Advanced Analytics</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-300">Conversation Content Analysis</label>
                        <p className="text-xs text-gray-400">⚠️ Analyze actual conversation content for insights</p>
                      </div>
                      <button
                        onClick={() => updateAdminSetting('analytics', 'conversationContent', !adminSettings.analytics.conversationContent)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          adminSettings.analytics.conversationContent ? 'bg-blue-600' : 'bg-gray-600'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          adminSettings.analytics.conversationContent ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-300">Detailed Behavior Tracking</label>
                        <p className="text-xs text-gray-400">Track detailed user interaction patterns</p>
                      </div>
                      <button
                        onClick={() => updateAdminSetting('analytics', 'detailedBehaviorTracking', !adminSettings.analytics.detailedBehaviorTracking)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          adminSettings.analytics.detailedBehaviorTracking ? 'bg-blue-600' : 'bg-gray-600'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          adminSettings.analytics.detailedBehaviorTracking ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-300">Export Analytics Logs</label>
                        <p className="text-xs text-gray-400">Allow exporting analytics data</p>
                      </div>
                      <button
                        onClick={() => updateAdminSetting('analytics', 'exportLogs', !adminSettings.analytics.exportLogs)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          adminSettings.analytics.exportLogs ? 'bg-blue-600' : 'bg-gray-600'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          adminSettings.analytics.exportLogs ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Data Retention Period</label>
                      <select
                        value={adminSettings.analytics.retentionDays}
                        onChange={(e) => updateAdminSetting('analytics', 'retentionDays', parseInt(e.target.value))}
                        className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white"
                      >
                        <option value="30">30 days</option>
                        <option value="90">90 days</option>
                        <option value="180">6 months</option>
                        <option value="365">1 year</option>
                        <option value="0">Forever</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-300">Anonymize Data</label>
                        <p className="text-xs text-gray-400">Remove personal identifiers from analytics</p>
                      </div>
                      <button
                        onClick={() => updateAdminSetting('analytics', 'anonymizeData', !adminSettings.analytics.anonymizeData)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          adminSettings.analytics.anonymizeData ? 'bg-blue-600' : 'bg-gray-600'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          adminSettings.analytics.anonymizeData ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Security/Encryption Tab */}
              {activeTab === 'encryption' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-white">Encryption & Security</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-300">Database Encryption</label>
                        <p className="text-xs text-gray-400">Encrypt all stored data at rest</p>
                      </div>
                      <button
                        onClick={() => updateAdminSetting('encryption', 'databaseEncryption', !adminSettings.encryption.databaseEncryption)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          adminSettings.encryption.databaseEncryption ? 'bg-blue-600' : 'bg-gray-600'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          adminSettings.encryption.databaseEncryption ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Encryption Algorithm</label>
                      <select
                        value={adminSettings.encryption.encryptionAlgorithm}
                        onChange={(e) => updateAdminSetting('encryption', 'encryptionAlgorithm', e.target.value)}
                        className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white"
                        disabled={!adminSettings.encryption.databaseEncryption}
                      >
                        <option value="AES-256-GCM">AES-256-GCM (Recommended)</option>
                        <option value="AES-256-CBC">AES-256-CBC</option>
                        <option value="ChaCha20-Poly1305">ChaCha20-Poly1305</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Key Rotation Period</label>
                      <select
                        value={adminSettings.encryption.keyRotationDays}
                        onChange={(e) => updateAdminSetting('encryption', 'keyRotationDays', parseInt(e.target.value))}
                        className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white"
                        disabled={!adminSettings.encryption.databaseEncryption}
                      >
                        <option value="30">Every 30 days</option>
                        <option value="90">Every 90 days</option>
                        <option value="180">Every 6 months</option>
                        <option value="365">Annually</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">End-to-End Encryption</label>
                      <select
                        value={adminSettings.encryption.endToEndEncryption}
                        onChange={(e) => updateAdminSetting('encryption', 'endToEndEncryption', e.target.value)}
                        className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white"
                      >
                        <option value="disabled">Disabled</option>
                        <option value="optional">Optional (User Choice)</option>
                        <option value="required">Required for All Users</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Key Management Provider</label>
                      <select
                        value={adminSettings.encryption.encryptionProvider}
                        onChange={(e) => updateAdminSetting('encryption', 'encryptionProvider', e.target.value)}
                        className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white"
                        disabled={!adminSettings.encryption.databaseEncryption}
                      >
                        <option value="aws-kms">AWS KMS</option>
                        <option value="azure-keyvault">Azure Key Vault</option>
                        <option value="gcp-kms">Google Cloud KMS</option>
                        <option value="hashicorp-vault">HashiCorp Vault</option>
                        <option value="self-managed">Self-Managed</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Models Tab */}
              {activeTab === 'models' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-white">Custom Model Endpoints</h3>
                    <button
                      onClick={addCustomModel}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
                    >
                      Add Model
                    </button>
                  </div>

                  <div className="border-t border-gray-700 pt-4">
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-300 mb-2">Default Max Tokens</label>
                      <input
                        type="number"
                        value={adminSettings.tokenLimits.defaultMaxTokens}
                        onChange={(e) => updateAdminSetting('tokenLimits', 'defaultMaxTokens', parseInt(e.target.value))}
                        className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white"
                      />
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-300 mb-2">Maximum Token Limit</label>
                      <input
                        type="number"
                        value={adminSettings.tokenLimits.maxTokensLimit}
                        onChange={(e) => updateAdminSetting('tokenLimits', 'maxTokensLimit', parseInt(e.target.value))}
                        className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white"
                      />
                    </div>

                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <label className="text-sm font-medium text-gray-300">Allow User Token Override</label>
                        <p className="text-xs text-gray-400">Let users adjust token limits up to maximum</p>
                      </div>
                      <button
                        onClick={() => updateAdminSetting('tokenLimits', 'allowUserOverride', !adminSettings.tokenLimits.allowUserOverride)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          adminSettings.tokenLimits.allowUserOverride ? 'bg-blue-600' : 'bg-gray-600'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          adminSettings.tokenLimits.allowUserOverride ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {adminSettings.customModels.map((model, index) => (
                      <div key={model.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Model Name</label>
                            <input
                              type="text"
                              value={model.name}
                              onChange={(e) => {
                                const newModels = [...adminSettings.customModels]
                                newModels[index].name = e.target.value
                                setAdminSettings(prev => ({ ...prev, customModels: newModels }))
                              }}
                              className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Max Tokens</label>
                            <input
                              type="number"
                              value={model.maxTokens}
                              onChange={(e) => {
                                const newModels = [...adminSettings.customModels]
                                newModels[index].maxTokens = parseInt(e.target.value)
                                setAdminSettings(prev => ({ ...prev, customModels: newModels }))
                              }}
                              className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white"
                            />
                          </div>
                        </div>
                        
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-300 mb-2">Endpoint URL</label>
                          <input
                            type="text"
                            value={model.endpoint}
                            onChange={(e) => {
                              const newModels = [...adminSettings.customModels]
                              newModels[index].endpoint = e.target.value
                              setAdminSettings(prev => ({ ...prev, customModels: newModels }))
                            }}
                            placeholder="https://api.example.com/v1/chat/completions"
                            className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white"
                          />
                        </div>
                        
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-300 mb-2">API Key</label>
                          <input
                            type="password"
                            value={model.apiKey}
                            onChange={(e) => {
                              const newModels = [...adminSettings.customModels]
                              newModels[index].apiKey = e.target.value
                              setAdminSettings(prev => ({ ...prev, customModels: newModels }))
                            }}
                            className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white"
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={model.enabled}
                              onChange={(e) => {
                                const newModels = [...adminSettings.customModels]
                                newModels[index].enabled = e.target.checked
                                setAdminSettings(prev => ({ ...prev, customModels: newModels }))
                              }}
                              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded"
                            />
                            <label className="text-sm text-gray-300">Enabled</label>
                          </div>
                          <button
                            onClick={() => {
                              const newModels = adminSettings.customModels.filter(m => m.id !== model.id)
                              setAdminSettings(prev => ({ ...prev, customModels: newModels }))
                            }}
                            className="text-red-400 hover:text-red-300 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Webhooks Tab */}
              {activeTab === 'webhooks' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-white">Webhook Configuration</h3>
                    <button
                      onClick={addWebhook}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
                    >
                      Add Webhook
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {adminSettings.webhooks.map((webhook, index) => (
                      <div key={webhook.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Webhook Name</label>
                            <input
                              type="text"
                              value={webhook.name}
                              onChange={(e) => {
                                const newWebhooks = [...adminSettings.webhooks]
                                newWebhooks[index].name = e.target.value
                                setAdminSettings(prev => ({ ...prev, webhooks: newWebhooks }))
                              }}
                              className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Event Type</label>
                            <select
                              value={webhook.event}
                              onChange={(e) => {
                                const newWebhooks = [...adminSettings.webhooks]
                                newWebhooks[index].event = e.target.value
                                setAdminSettings(prev => ({ ...prev, webhooks: newWebhooks }))
                              }}
                              className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white"
                            >
                              <option value="chat.completed">Chat Completed</option>
                              <option value="user.joined">User Joined</option>
                              <option value="user.left">User Left</option>
                              <option value="error.occurred">Error Occurred</option>
                              <option value="settings.changed">Settings Changed</option>
                            </select>
                          </div>
                        </div>
                        
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-300 mb-2">Webhook URL</label>
                          <input
                            type="text"
                            value={webhook.url}
                            onChange={(e) => {
                              const newWebhooks = [...adminSettings.webhooks]
                              newWebhooks[index].url = e.target.value
                              setAdminSettings(prev => ({ ...prev, webhooks: newWebhooks }))
                            }}
                            placeholder="https://api.example.com/webhook"
                            className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white"
                          />
                        </div>
                        
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-300 mb-2">Secret Key</label>
                          <input
                            type="password"
                            value={webhook.secret}
                            onChange={(e) => {
                              const newWebhooks = [...adminSettings.webhooks]
                              newWebhooks[index].secret = e.target.value
                              setAdminSettings(prev => ({ ...prev, webhooks: newWebhooks }))
                            }}
                            placeholder="whsec_..."
                            className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white"
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={webhook.enabled}
                              onChange={(e) => {
                                const newWebhooks = [...adminSettings.webhooks]
                                newWebhooks[index].enabled = e.target.checked
                                setAdminSettings(prev => ({ ...prev, webhooks: newWebhooks }))
                              }}
                              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded"
                            />
                            <label className="text-sm text-gray-300">Enabled</label>
                          </div>
                          <button
                            onClick={() => {
                              const newWebhooks = adminSettings.webhooks.filter(w => w.id !== webhook.id)
                              setAdminSettings(prev => ({ ...prev, webhooks: newWebhooks }))
                            }}
                            className="text-red-400 hover:text-red-300 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* System Tab */}
              {activeTab === 'system' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-white">System Configuration</h3>
                  
                  <div className="space-y-4">
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-300 mb-3">System Status</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-400">Database Encryption</p>
                          <p className="text-sm text-green-400">✓ Active</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">API Keys Configured</p>
                          <p className="text-sm text-blue-400">2 of 5</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Active Webhooks</p>
                          <p className="text-sm text-blue-400">{adminSettings.webhooks.filter(w => w.enabled).length}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Custom Models</p>
                          <p className="text-sm text-blue-400">{adminSettings.customModels.filter(m => m.enabled).length}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-300 mb-3">Usage Statistics</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-400">Total Users</p>
                          <p className="text-lg font-semibold text-white">1,247</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Monthly API Calls</p>
                          <p className="text-lg font-semibold text-white">45,892</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Translation Characters</p>
                          <p className="text-lg font-semibold text-white">892K / 2M</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Storage Used</p>
                          <p className="text-lg font-semibold text-white">2.4 GB</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <button className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors">
                        Export System Configuration
                      </button>
                      <button className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md transition-colors">
                        Backup Database
                      </button>
                      <button className="w-full bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md transition-colors">
                        Test All Webhooks
                      </button>
                      <button className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors">
                        Reset All Settings
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end items-center gap-3 p-6 border-t border-gray-700">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                // Save admin settings to backend
                console.log('Saving admin settings:', adminSettings)
                onClose()
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>

      {/* User Manager Modal */}
      {showUserManager && (
        <UserManager
          isOpen={showUserManager}
          onClose={() => setShowUserManager(false)}
        />
      )}
    </div>
  )
}
