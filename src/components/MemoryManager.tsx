'use client'

import { useState } from 'react'
import { TrashIcon, CpuChipIcon, CalendarDaysIcon } from '@heroicons/react/24/outline'

interface Memory {
  id: string
  content: string
  category: 'personal' | 'preference' | 'fact' | 'context'
  timestamp: Date
  source: string // Which conversation it came from
}

interface MemoryManagerProps {
  isOpen: boolean
  onClose: () => void
  user: {
    id: string
    email: string
    name: string
    role: string
  } | null
}

export default function MemoryManager({ isOpen, onClose }: MemoryManagerProps) {
  // Mock memory data - this would come from your backend
  const [memories, setMemories] = useState<Memory[]>([
    {
      id: '1',
      content: 'User prefers React over Vue.js for frontend development',
      category: 'preference',
      timestamp: new Date('2025-10-09'),
      source: 'Chat about frontend frameworks'
    },
    {
      id: '2',
      content: 'Working on a ChatGPT-style interface project called Ashley AI',
      category: 'context',
      timestamp: new Date('2025-10-10'),
      source: 'Current project discussion'
    },
    {
      id: '3',
      content: 'Lives in timezone PST, prefers morning meetings',
      category: 'personal',
      timestamp: new Date('2025-10-08'),
      source: 'Scheduling conversation'
    },
    {
      id: '4',
      content: 'Uses TypeScript and prefers functional components',
      category: 'preference',
      timestamp: new Date('2025-10-09'),
      source: 'Code review discussion'
    },
    {
      id: '5',
      content: 'Company uses Next.js 15 with Turbopack for development',
      category: 'fact',
      timestamp: new Date('2025-10-10'),
      source: 'Technical setup discussion'
    }
  ])

  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const deleteMemory = (id: string) => {
    setMemories(prev => prev.filter(memory => memory.id !== id))
  }

  const getCategoryColor = (category: Memory['category']) => {
    switch (category) {
      case 'personal': return 'bg-green-500/10 text-green-400 border-green-500/20'
      case 'preference': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      case 'fact': return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
      case 'context': return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
    }
  }

  const filteredMemories = selectedCategory === 'all' 
    ? memories 
    : memories.filter(memory => memory.category === selectedCategory)

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
            <div className="flex items-center gap-3">
              <CpuChipIcon className="w-6 h-6 text-blue-400" />
              <div>
                <h2 className="text-xl font-semibold text-white">AI Memory</h2>
                <p className="text-sm text-gray-400">View and manage what the AI remembers about you</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-6">
            {/* Filter Tabs */}
            <div className="flex space-x-2 mb-6 border-b border-gray-700">
              {[
                { key: 'all', label: 'All Memories', count: memories.length },
                { key: 'personal', label: 'Personal', count: memories.filter(m => m.category === 'personal').length },
                { key: 'preference', label: 'Preferences', count: memories.filter(m => m.category === 'preference').length },
                { key: 'fact', label: 'Facts', count: memories.filter(m => m.category === 'fact').length },
                { key: 'context', label: 'Context', count: memories.filter(m => m.category === 'context').length }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setSelectedCategory(tab.key)}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                    selectedCategory === tab.key
                      ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-800/50'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/30'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>

            {/* Memory List */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredMemories.length === 0 ? (
                <div className="text-center py-8">
                  <CpuChipIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No memories found in this category</p>
                </div>
              ) : (
                filteredMemories.map((memory) => (
                  <div
                    key={memory.id}
                    className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:bg-gray-800/70 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getCategoryColor(memory.category)}`}>
                            {memory.category}
                          </span>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <CalendarDaysIcon className="w-3 h-3" />
                            {memory.timestamp.toLocaleDateString()}
                          </div>
                        </div>
                        <p className="text-gray-300 text-sm mb-2">{memory.content}</p>
                        <p className="text-xs text-gray-500">From: {memory.source}</p>
                      </div>
                      <button
                        onClick={() => deleteMemory(memory.id)}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors ml-4"
                        title="Delete memory"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer Info */}
            <div className="mt-6 p-4 bg-gray-800/30 border border-gray-700 rounded-lg">
              <div className="flex items-start gap-3">
                <CpuChipIcon className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-gray-400">
                  <p className="font-medium text-gray-300 mb-1">How AI Memory Works</p>
                  <ul className="space-y-1 text-xs">
                    <li>• <strong>Personal:</strong> Information about you (timezone, preferences, etc.)</li>
                    <li>• <strong>Preferences:</strong> Your choices and preferred approaches</li>
                    <li>• <strong>Facts:</strong> Factual information from your conversations</li>
                    <li>• <strong>Context:</strong> Current projects and ongoing work</li>
                  </ul>
                  <p className="mt-2 text-xs text-gray-500">
                    The AI automatically creates memories from conversations when memory is enabled. 
                    You can delete any memory you do not want the AI to remember.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}