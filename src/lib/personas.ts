/**
 * UI and media themes for personas. Backend provides behavioural metadata,
 * this file keeps client-side cosmetics such as icons and gradients.
 */

export interface PersonaTheme {
  icon: string
  gradient: string
  primaryColor: string
  accentColor: string
  voice?: string
  imageStyleDescription: string
}

export const DEFAULT_PERSONA_ID = 'ashley-girlfriend'

const PERSONA_THEMES: Record<string, PersonaTheme> = {
  'ashley-girlfriend': {
    icon: 'AG',
    gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)',
    primaryColor: '#ff9a9e',
    accentColor: '#fad0c4',
    voice: 'verse',
    imageStyleDescription:
      'Soft romantic aesthetics with warm lighting and intimate framing.',
  },
  'ashley-girlfriend-explicit': {
    icon: 'AE',
    gradient: 'linear-gradient(135deg, #ff6f61 0%, #d7263d 100%)',
    primaryColor: '#ff6f61',
    accentColor: '#d7263d',
    voice: 'sensual',
    imageStyleDescription:
      'Bold, high-contrast visuals with provocative styling for explicit content.',
  },
  'ashley-data-analyst': {
    icon: 'DA',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    primaryColor: '#667eea',
    accentColor: '#764ba2',
    voice: 'luna',
    imageStyleDescription:
      'Clean dashboards, spreadsheets, and business intelligence visuals.',
  },
  'ashley-data-scientist': {
    icon: 'DS',
    gradient: 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)',
    primaryColor: '#0072ff',
    accentColor: '#00c6ff',
    voice: 'alloy',
    imageStyleDescription:
      'Technical diagrams, Python notebooks, machine learning schematics.',
  },
}

export function getPersonaTheme(personaId: string | undefined): PersonaTheme {
  if (!personaId) {
    return PERSONA_THEMES[DEFAULT_PERSONA_ID]
  }
  return PERSONA_THEMES[personaId] ?? PERSONA_THEMES[DEFAULT_PERSONA_ID]
}

export function getPersonaIcon(personaId: string | undefined): string {
  return getPersonaTheme(personaId).icon
}

export function getPersonaImageStyleDescription(personaId: string | undefined): string {
  return getPersonaTheme(personaId).imageStyleDescription
}
