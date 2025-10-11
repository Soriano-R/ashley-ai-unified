# Ashley AI - Persona Integration System

## Overview

Ashley AI now features a comprehensive persona system that provides consistent personality, voice characteristics, and visual styling across all interaction modes including text chat, voice conversations, and image generation.

## ✨ Features Implemented

### 🎭 Persona System
- **6 Distinct Personas**: Ashley (default), Technical Expert, Creative Muse, Data Analyst, Business Consultant, Educational Guide
- **Consistent Personality**: Each persona has unique tone, expertise areas, and communication style
- **Voice Integration**: Persona-specific voice selection for speech synthesis
- **Visual Styling**: Custom UI themes and image generation styles per persona

### 🎙️ Voice Mode Integration
- **Persona-Aware Speech Synthesis**: Uses OpenAI TTS with persona-specific voice mapping
- **Audio Transcription**: Converts voice input to text using OpenAI Whisper
- **Voice Response Handling**: Automatic voice synthesis of AI responses when voice mode is active
- **Voice Character Mapping**:
  - Ashley → `verse` (warm, expressive)
  - Technical → `alloy` (clear, professional)
  - Creative → `aria` (expressive, artistic)
  - Analyst → `luna` (calm, analytical)
  - Consultant → `sol` (professional, confident)
  - Educator → `vivid` (clear, engaging)

### 🎨 Image Generation Integration
- **Persona-Enhanced Prompts**: Automatic prompt enhancement based on persona characteristics
- **Style Keywords**: Each persona contributes specific visual style elements
- **Color Palettes**: Persona-specific color schemes for consistent visual identity
- **Multiple Sizes**: Support for 1024x1024, 1792x1024, 1024x1792 image dimensions

## 🚀 API Endpoints

### Voice Endpoints
```
POST /api/voice/transcribe
- Transcribes audio files to text
- Supports: audio/wav, audio/mp3, audio/m4a

POST /api/voice/synthesize
- Synthesizes speech from text with persona awareness
- Body: { text, persona?, voice?, speed?, include_persona_context? }

GET /api/voice/voices
- Returns available voice options
```

### Image Generation Endpoints
```
POST /api/media/generate
- Generates images with persona-aware styling
- Body: { prompt, persona?, model?, size?, include_persona_context? }

POST /api/media/edit
- Edits existing images with persona context
- Form data: base_image, prompt, mask_image?, persona?, ...

POST /api/media/vision
- Analyzes images with persona-specific perspective
- Form data: image, prompt?, persona?, include_persona_context?
```

### Chat Endpoints
```
POST /api/chat
- Send messages with persona context
- Body: { message, persona?, session_id? }

GET /api/personas
- Get list of available personas
```

## 📁 File Structure

```
src/
├── components/
│   ├── ChatArea.tsx          # Voice controls & image generation modal
│   ├── ChatInterface.tsx     # Main interface with persona selector
│   ├── ImageGeneration.tsx   # Persona-aware image generation UI
│   └── PersonaSelector.tsx   # Persona switching component
├── lib/
│   ├── apiClient.ts         # HTTP client with typed interfaces
│   └── personas.ts          # Persona configurations & utilities
└── test/
    └── personaIntegrationTest.ts # Integration testing utilities

ashley-ai-backend/
├── api/routes/
│   ├── voice.py             # Voice transcription & synthesis
│   ├── media.py             # Image generation & editing
│   └── chat.py              # Chat with persona context
├── tools/
│   ├── voice.py             # Enhanced voice tools
│   └── image.py             # Image generation tools
└── app/
    └── personas.py          # Persona loading & management
```

## 🎯 Persona Configurations

Each persona includes:

```typescript
interface PersonaConfig {
  id: string                    // Unique identifier
  name: string                  // Display name
  description: string           // Full description
  shortDescription: string      // Brief summary
  voicePreference: string       // Preferred TTS voice
  imageStyle: {
    prompt_enhancement: string  // Style directive for images
    style_keywords: string[]    // Visual style keywords
    color_palette: string[]     // Brand colors
  }
  ui: {
    primaryColor: string        // UI primary color
    accentColor: string         // UI accent color
    icon: string               // Emoji icon
    gradient: string           // CSS gradient
  }
  personality: {
    tone: string               // Communication tone
    expertise: string[]        // Areas of expertise
    communication_style: string // How they communicate
  }
}
```

## 🔧 Implementation Details

### Frontend Integration
1. **PersonaSelector**: Dropdown component for persona switching
2. **Voice Controls**: Record button with persona-aware synthesis
3. **Image Generation**: Modal with persona style previews
4. **State Management**: Persona state flows through component hierarchy

### Backend Integration
1. **Persona Loading**: `load_persona_bundle()` function loads persona context
2. **Voice Mapping**: `get_persona_voice()` maps personas to optimal voices
3. **Prompt Enhancement**: `enhance_prompt_with_persona()` adds style context
4. **API Integration**: All endpoints accept optional `persona` parameter

### Voice Workflow
1. User speaks → Audio captured → Sent to `/api/voice/transcribe`
2. Text response generated with persona context
3. Response sent to `/api/voice/synthesize` with persona
4. Audio URL returned and played automatically

### Image Workflow
1. User enters prompt → Enhanced with persona style
2. Sent to `/api/media/generate` with persona context
3. Generated image reflects persona's visual characteristics
4. Displayed with persona-branded UI styling

## 🧪 Testing

Run the integration test to verify all features:

```typescript
import testPersonaIntegration from '@/test/personaIntegrationTest'

// Run in browser console
testPersonaIntegration()
```

The test verifies:
- API health and connectivity
- Persona configuration loading
- Voice synthesis with persona mapping
- Image generation with style enhancement

## 🎨 UI/UX Features

- **Dynamic Theming**: UI colors adapt to selected persona
- **Visual Feedback**: Icons and gradients reflect persona identity
- **Smooth Transitions**: Animated persona switching
- **Accessibility**: Proper contrast ratios and keyboard navigation
- **Responsive Design**: Works on desktop and mobile devices

## 🔮 Future Enhancements

- **Memory Integration**: Persona-specific conversation memory
- **Custom Personas**: User-created persona definitions
- **Voice Training**: Custom voice models per persona
- **Advanced Styling**: More sophisticated image style controls
- **Analytics**: Usage tracking per persona
- **A/B Testing**: Persona effectiveness metrics

## 📝 Usage Examples

### Voice Interaction
```typescript
// User speaks: "Create a technical diagram"
// System automatically:
// 1. Uses Technical persona's professional voice
// 2. Responds with technical precision
// 3. Synthesizes response in 'alloy' voice
```

### Image Generation
```typescript
// User: "Generate a landscape"
// Creative persona enhances to:
// "Generate a landscape. Create in an artistic, imaginative style 
//  with vibrant colors, creative composition, and inspiring aesthetics. 
//  Style: artistic, creative, vibrant."
```

### Chat Context
```typescript
// Technical persona automatically includes:
// - Precise, analytical tone
// - Code examples and technical details
// - Methodical problem-solving approach
```

This persona system creates a cohesive, personalized AI experience that adapts to user preferences and task requirements while maintaining consistency across all interaction modes.