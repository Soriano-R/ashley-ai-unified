import { useState } from 'react'
import { PhotoIcon, PaintBrushIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'

interface ImageGenerationProps {
  isOpen: boolean
  onClose: () => void
  persona: string
}

interface ImageGenerationRequest {
  prompt: string
  persona: string
  size: '1024x1024' | '1792x1024' | '1024x1792'
  include_persona_context: boolean
}

export default function ImageGeneration({ isOpen, onClose, persona }: ImageGenerationProps) {
  const [prompt, setPrompt] = useState('')
  const [size, setSize] = useState<'1024x1024' | '1792x1024' | '1024x1792'>('1024x1024')
  const [includePersonaContext, setIncludePersonaContext] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleGenerate = async () => {
    if (!prompt.trim()) return

    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch('/api/media/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          persona,
          size,
          include_persona_context: includePersonaContext
        } as ImageGenerationRequest),
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Image generation failed')
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Image generation failed')
      }

      setGeneratedImage(result.image_url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsGenerating(false)
    }
  }

  const getPersonaStyleDescription = () => {
    switch (persona.toLowerCase()) {
      case 'ashley':
        return 'Warm, approachable, and technically sophisticated aesthetics with clean, modern design'
      case 'technical':
        return 'Precise, technical accuracy with professional documentation-style clarity'
      case 'creative':
        return 'Artistic flair with creative interpretation and imaginative elements'
      default:
        return `Custom ${persona} style preferences`
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <PhotoIcon className="w-6 h-6 text-purple-400" />
            <div>
              <h2 className="text-xl font-semibold text-white">Image Generation</h2>
              <p className="text-sm text-gray-400">
                Generate images with {persona} persona styling
              </p>
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

        {/* Prompt Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Image Description
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the image you want to create..."
            className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            rows={3}
          />
        </div>

        {/* Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Image Size
            </label>
            <select
              value={size}
              onChange={(e) => setSize(e.target.value as any)}
              className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="1024x1024">Square (1024×1024)</option>
              <option value="1792x1024">Landscape (1792×1024)</option>
              <option value="1024x1792">Portrait (1024×1792)</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-300">
                Use {persona} Style
              </label>
              <p className="text-xs text-gray-400">
                Apply persona-specific aesthetics
              </p>
            </div>
            <button
              onClick={() => setIncludePersonaContext(!includePersonaContext)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                includePersonaContext ? 'bg-purple-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  includePersonaContext ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Persona Style Preview */}
        {includePersonaContext && (
          <div className="mb-4 p-3 bg-purple-900/20 border border-purple-500/30 rounded-md">
            <div className="flex items-center gap-2 mb-1">
              <PaintBrushIcon className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-purple-300">{persona} Style Guide</span>
            </div>
            <p className="text-xs text-purple-200">
              {getPersonaStyleDescription()}
            </p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-md">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Generated Image */}
        {generatedImage && (
          <div className="mb-4">
            <h3 className="text-lg font-medium text-white mb-2">Generated Image</h3>
            <div className="bg-gray-800 rounded-lg p-4">
              <img
                src={generatedImage}
                alt="Generated image"
                className="w-full rounded-md"
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md transition-colors flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Generating...
              </>
            ) : (
              <>
                <PhotoIcon className="w-4 h-4" />
                Generate Image
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}