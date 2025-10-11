/**
 * PersonaSelector component for switching between different AI personas
 */

import React, { useState, useRef, useEffect } from 'react'
import { PERSONAS, PERSONA_LIST, PersonaConfig, getPersonaConfig } from '@/lib/personas'

interface PersonaSelectorProps {
  currentPersona: string
  onPersonaChange: (personaId: string) => void
  compact?: boolean
  className?: string
}

export const PersonaSelector: React.FC<PersonaSelectorProps> = ({
  currentPersona,
  onPersonaChange,
  compact = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  const currentConfig = getPersonaConfig(currentPersona)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handlePersonaSelect = (personaId: string) => {
    onPersonaChange(personaId)
    setIsOpen(false)
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg
          bg-white/10 hover:bg-white/20 transition-colors
          border border-white/20 hover:border-white/30
          text-white font-medium
          ${compact ? 'text-sm' : 'text-base'}
        `}
        style={{
          background: `${currentConfig.ui.gradient}, rgba(255, 255, 255, 0.1)`
        }}
      >
        <span className="text-lg">{currentConfig.ui.icon}</span>
        {!compact && (
          <>
            <span>{currentConfig.name}</span>
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

      {/* Dropdown Menu */}
      {isOpen && (
        <div className={`
          absolute top-full mt-2 w-80 max-h-96 overflow-y-auto
          bg-white rounded-xl shadow-xl border border-gray-200
          z-50 ${compact ? 'right-0' : 'left-0'}
        `}>
          <div className="p-2">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-2">
              Select Persona
            </div>
            
            {PERSONA_LIST.map((personaId) => {
              const config = getPersonaConfig(personaId)
              const isSelected = currentPersona === personaId
              
              return (
                <button
                  key={personaId}
                  onClick={() => handlePersonaSelect(personaId)}
                  className={`
                    w-full text-left p-3 rounded-lg transition-colors
                    hover:bg-gray-50 group
                    ${isSelected ? 'bg-blue-50 border border-blue-200' : ''}
                  `}
                >
                  <div className="flex items-start gap-3">
                    {/* Persona Icon */}
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-medium text-white flex-shrink-0"
                      style={{ background: config.ui.gradient }}
                    >
                      {config.ui.icon}
                    </div>
                    
                    {/* Persona Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">
                          {config.name}
                        </span>
                        {isSelected && (
                          <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {config.shortDescription}
                      </p>
                      
                      {/* Expertise Tags */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {config.personality.expertise.slice(0, 3).map((skill) => (
                          <span
                            key={skill}
                            className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600"
                          >
                            {skill}
                          </span>
                        ))}
                        {config.personality.expertise.length > 3 && (
                          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                            +{config.personality.expertise.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
          
          {/* Footer */}
          <div className="border-t border-gray-100 p-3 bg-gray-50 rounded-b-xl">
            <p className="text-xs text-gray-500 text-center">
              Personas affect conversation style, voice, and image generation
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default PersonaSelector