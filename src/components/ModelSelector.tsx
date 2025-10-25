import React, { useEffect, useMemo, useRef, useState } from 'react'

import { ModelOption } from '@/types'

interface ModelSelectorProps {
  models: ModelOption[]
  categories: Record<string, { label: string; description: string }>
  allowedModelIds: string[]
  selectedModelId: string
  onModelChange: (modelId: string) => void
  className?: string
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  models,
  categories,
  allowedModelIds,
  selectedModelId,
  onModelChange,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const allowedModels = useMemo(() => {
    const allowedSet = new Set(allowedModelIds)
    const filtered = models.filter((model) => allowedSet.has(model.id))
    // Ensure Auto option exists
    const includeAuto = allowedSet.has('auto')
    return { list: filtered, includeAuto }
  }, [allowedModelIds, models])

  const selectedModel = useMemo(
    () => models.find((model) => model.id === selectedModelId),
    [models, selectedModelId]
  )

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const groupedModels = useMemo(() => {
    return allowedModels.list.reduce<Record<string, ModelOption[]>>((acc, model) => {
      const modelCategories = model.categories?.length ? model.categories : ['uncategorised']
      modelCategories.forEach((category) => {
        acc[category] = acc[category] ? [...acc[category], model] : [model]
      })
      return acc
    }, {})
  }, [allowedModels.list])

  const handleModelSelect = (modelId: string) => {
    onModelChange(modelId)
    setIsOpen(false)
  }

  const renderModelRow = (model: ModelOption) => {
    const isSelected = selectedModelId === model.id
    return (
      <button
        key={model.id}
        onClick={() => handleModelSelect(model.id)}
        className={`
          w-full text-left p-3 rounded-lg transition-colors border border-transparent
          hover:bg-gray-50
          ${isSelected ? 'bg-blue-50 border-blue-200' : ''}
        `}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">{model.name}</span>
              <span className="text-[10px] uppercase tracking-wide text-gray-400">
                {model.format?.toUpperCase() ?? model.quantization?.toUpperCase()}
              </span>
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
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{model.description}</p>
            {model.capabilities?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {model.capabilities.slice(0, 4).map((capability) => (
                  <span
                    key={capability}
                    className="text-[10px] px-2 py-1 rounded-full bg-gray-100 text-gray-600 uppercase tracking-wide"
                  >
                    {capability}
                  </span>
                ))}
              </div>
            )}
          </div>
          {model.max_length && (
            <div className="text-xs text-gray-400 whitespace-nowrap">
              {model.max_length.toLocaleString()} ctx
            </div>
          )}
        </div>
      </button>
    )
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors border border-white/20 hover:border-white/30 text-white text-sm font-medium"
      >
        <span>
          {selectedModelId === 'auto'
            ? 'Model: Auto'
            : `Model: ${selectedModel?.name ?? 'Select Model'}`}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-[26rem] max-h-[28rem] overflow-y-auto bg-white rounded-xl shadow-xl border border-gray-200 z-50">
          <div className="p-3 space-y-3">
            {allowedModels.includeAuto && (
              <button
                onClick={() => handleModelSelect('auto')}
                className={`
                  w-full text-left p-3 rounded-lg transition-colors border border-transparent
                  hover:bg-gray-50
                  ${selectedModelId === 'auto' ? 'bg-blue-50 border-blue-200' : ''}
                `}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-gray-900">Auto (Recommended)</div>
                    <p className="text-xs text-gray-500">
                      Automatically selects the best model for this persona and request.
                    </p>
                  </div>
                  {selectedModelId === 'auto' && (
                    <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
              </button>
            )}

            {Object.entries(groupedModels).map(([categoryId, modelsInCategory]) => {
              const meta = categories[categoryId] ?? {
                label: categoryId,
                description: '',
              }
              return (
                <div key={categoryId}>
                  <div className="px-1 pb-1">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {meta.label}
                    </div>
                    {meta.description && (
                      <p className="text-xs text-gray-400">{meta.description}</p>
                    )}
                  </div>
                  <div className="space-y-2">{modelsInCategory.map(renderModelRow)}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default ModelSelector
