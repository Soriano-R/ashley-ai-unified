import React, { useEffect, useMemo, useRef, useState } from 'react'

import { getPersonaIcon, getPersonaTheme } from '@/lib/personas'
import { PersonaOption } from '@/types'

interface PersonaSelectorProps {
  personas: PersonaOption[]
  categories: Record<string, { label: string; description: string }>
  currentPersonaId: string
  onPersonaChange: (personaId: string) => void
  compact?: boolean
  className?: string
}

export const PersonaSelector: React.FC<PersonaSelectorProps> = ({
  personas,
  categories,
  currentPersonaId,
  onPersonaChange,
  compact = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const currentPersona = useMemo(
    () => personas.find((p) => p.id === currentPersonaId) ?? personas[0],
    [currentPersonaId, personas]
  )
  const currentTheme = getPersonaTheme(currentPersona?.id)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const groupedPersonas = useMemo(() => {
    return personas.reduce<Record<string, PersonaOption[]>>((acc, persona) => {
      const key = persona.category || 'Other'
      acc[key] = acc[key] ? [...acc[key], persona] : [persona]
      return acc
    }, {})
  }, [personas])

  const handlePersonaSelect = (personaId: string) => {
    onPersonaChange(personaId)
    setIsOpen(false)
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg
          bg-white/10 hover:bg-white/20 transition-colors
          border border-white/20 hover:border-white/30
          text-white font-medium
          ${compact ? 'text-sm' : 'text-base'}
        `}
        style={{
          background: `${currentTheme.gradient}, rgba(255, 255, 255, 0.1)`
        }}
      >
        <span className="text-lg">{currentTheme.icon}</span>
        {!compact && (
          <>
            <span>{currentPersona?.label ?? 'Select Persona'}</span>
            <svg
              className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </button>

      {isOpen && (
        <div
          className={`
            absolute top-full mt-2 w-96 max-h-[28rem] overflow-y-auto
            bg-white rounded-xl shadow-xl border border-gray-200
            z-50 ${compact ? 'right-0' : 'left-0'}
          `}
        >
          <div className="p-3">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-2">
              Select Persona
            </div>

            {Object.entries(groupedPersonas).map(([group, personaItems]) => {
              const groupMeta = categories[group] ?? { label: group, description: '' }
              return (
                <div key={group} className="mb-4 last:mb-0">
                  <div className="px-3 py-1">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {groupMeta.label}
                    </div>
                    {groupMeta.description && (
                      <p className="text-xs text-gray-400">{groupMeta.description}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    {personaItems.map((persona) => {
                      const isSelected = currentPersonaId === persona.id
                      const theme = getPersonaTheme(persona.id)

                      return (
                        <button
                          key={persona.id}
                          onClick={() => handlePersonaSelect(persona.id)}
                          className={`
                            w-full text-left p-3 rounded-lg transition-colors
                            hover:bg-gray-50 group border border-transparent
                            ${isSelected ? 'bg-blue-50 border-blue-200' : ''}
                          `}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-medium text-white flex-shrink-0"
                              style={{ background: theme.gradient }}
                            >
                              {getPersonaIcon(persona.id)}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-900">
                                  {persona.label}
                                </span>
                                {persona.nsfw && (
                                  <span className="text-[10px] font-semibold uppercase text-red-500 bg-red-100 px-2 py-0.5 rounded-full">
                                    NSFW
                                  </span>
                                )}
                                {isSelected && (
                                  <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path
                                      fillRule="evenodd"
                                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                )}
                              </div>

                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                {persona.description}
                              </p>

                              {persona.tags?.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {persona.tags.slice(0, 4).map((tag) => (
                                    <span
                                      key={tag}
                                      className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="border-t border-gray-100 p-3 bg-gray-50 rounded-b-xl">
            <p className="text-xs text-gray-500 text-center">
              Personas adapt tone, memory, and available models for your session.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default PersonaSelector
