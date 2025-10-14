import { NextRequest, NextResponse } from 'next/server'

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://127.0.0.1:8001'
const REQUEST_TIMEOUT_MS = Number(process.env.PERSONA_REQUEST_TIMEOUT_MS ?? 5_000)

type CategoryMeta = { label: string; description: string }

const FALLBACK_PERSONA_CATEGORIES: Record<string, CategoryMeta> = {
  Professional: {
    label: 'Professional Ashley',
    description: 'Specialised work personas for analytics, engineering, and automation.',
  },
  Relationship: {
    label: 'Relationship Ashley',
    description: 'Companion personas focused on emotional support and intimacy.',
  },
}

const FALLBACK_MODEL_CATEGORIES: Record<string, CategoryMeta> = {
  general: {
    label: 'General Purpose',
    description: 'Balanced conversation routing without a dedicated model backend.',
  },
}

const FALLBACK_PERSONAS = [
  {
    id: 'ashley-girlfriend',
    label: 'Ashley - Girlfriend',
    files: ['Ashley.txt'],
    description: 'Warm, affectionate companion persona for everyday conversation.',
    tags: ['Romance', 'Supportive'],
    category: 'Relationship',
    nsfw: false,
    defaultModel: 'auto',
    allowedModelCategories: ['general'],
    allowedModelIds: ['auto'],
    categoryMeta: FALLBACK_PERSONA_CATEGORIES.Relationship,
  },
  {
    id: 'ashley-data-analyst',
    label: 'Ashley - Data Analyst',
    files: ['SQL_Server_Prompt.md', 'PowerShell_Prompt.md', 'Excel_VBA_Prompt.md'],
    description: 'Professional Ashley persona specialised in reporting, automation, and BI workflows.',
    tags: ['SQL', 'Excel', 'Automation'],
    category: 'Professional',
    nsfw: false,
    defaultModel: 'auto',
    allowedModelCategories: ['general'],
    allowedModelIds: ['auto'],
    categoryMeta: FALLBACK_PERSONA_CATEGORIES.Professional,
  },
  {
    id: 'ashley-data-scientist',
    label: 'Ashley - Data Scientist & ML/AI',
    files: [
      'ML_AI_Prompt.md',
      'MLOps_DevOps_Prompt.md',
      'Python_Data_Prompt.md',
      'Python_GUI_Prompt.md',
      'Python_OCR_Prompt.md',
    ],
    description: 'Technical Ashley persona focused on Python, machine learning research, and operations.',
    tags: ['Python', 'ML', 'Automation'],
    category: 'Professional',
    nsfw: false,
    defaultModel: 'auto',
    allowedModelCategories: ['general'],
    allowedModelIds: ['auto'],
    categoryMeta: FALLBACK_PERSONA_CATEGORIES.Professional,
  },
  {
    id: 'ashley-girlfriend-explicit',
    label: 'Ashley - Girlfriend (Explicit)',
    files: ['Ashley_raw_unfiltered.txt'],
    description: 'Explicit, uncensored companion persona. Restricted to mature users.',
    tags: ['NSFW', 'Explicit'],
    category: 'Relationship',
    nsfw: true,
    defaultModel: 'auto',
    allowedModelCategories: ['general'],
    allowedModelIds: ['auto'],
    categoryMeta: FALLBACK_PERSONA_CATEGORIES.Relationship,
  },
]

const FALLBACK_MODELS = [
  {
    id: 'auto',
    name: 'Auto Router',
    description:
      'Automatically selects the most appropriate model when the Python service is offline.',
    model_name: null,
    max_length: null,
    quantization: 'virtual',
    format: 'virtual',
    categories: ['general'],
    capabilities: ['routing'],
    loaded: false,
  },
]

function buildTimeout() {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  return { controller, timeout }
}

export async function POST(request: NextRequest) {
  const { controller, timeout } = buildTimeout()
  try {
    const body = await request.json()

    const response = await fetch(`${PYTHON_SERVICE_URL}/api/personas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`Python service error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Personas API error:', error)
    return NextResponse.json(
      {
        error: 'Failed to process persona request',
        detail: 'The Python service is unreachable. Start it with `npm run dev:python`.',
      },
      { status: 503 }
    )
  } finally {
    clearTimeout(timeout)
  }
}

export async function GET() {
  const { controller, timeout } = buildTimeout()
  try {
    const response = await fetch(`${PYTHON_SERVICE_URL}/api/personas`, {
      cache: 'no-store',
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`Python service error: ${response.status}`)
    }

    const models = await response.json()
    return NextResponse.json(models)
  } catch (error) {
    console.error('Personas GET error:', error)

    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        {
          error: 'Failed to get personas',
          detail: 'The Python service is unreachable.',
        },
        { status: 503 }
      )
    }

    return NextResponse.json({
      personas: FALLBACK_PERSONAS,
      models: FALLBACK_MODELS,
      persona_categories: FALLBACK_PERSONA_CATEGORIES,
      model_categories: FALLBACK_MODEL_CATEGORIES,
      warning:
        'Python service (persona backend) not reachable. Using static fallback personas and auto router.',
    })
  } finally {
    clearTimeout(timeout)
  }
}
