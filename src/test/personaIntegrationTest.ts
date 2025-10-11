/**
 * Simple integration test script to verify persona-aware voice and image generation
 * Run this after starting the backend server
 */

import { apiClient } from '../lib/apiClient'
import { PERSONA_LIST, getPersonaConfig } from '../lib/personas'

async function testPersonaIntegration() {
  console.log('🧪 Testing Persona Integration System...\n')

  try {
    // Test 1: Health check
    console.log('1. Testing API health...')
    const health = await apiClient.checkHealth()
    console.log('✅ Health check:', health)

    // Test 2: Get available personas
    console.log('\n2. Testing persona configurations...')
    console.log('📋 Available personas:', PERSONA_LIST)
    
    PERSONA_LIST.forEach(personaId => {
      const config = getPersonaConfig(personaId)
      console.log(`   ${config.ui.icon} ${config.name}: ${config.shortDescription}`)
      console.log(`     Voice: ${config.voicePreference}`)
      console.log(`     Style: ${config.imageStyle.style_keywords.slice(0, 3).join(', ')}`)
    })

    // Test 3: Voice synthesis with different personas
    console.log('\n3. Testing persona-aware voice synthesis...')
    const testText = "Hello! I'm here to help you with your tasks today."
    
    for (const personaId of PERSONA_LIST.slice(0, 3)) { // Test first 3 personas
      console.log(`   Testing ${personaId} persona...`)
      try {
        const voiceResponse = await apiClient.synthesizeSpeech({
          text: testText,
          persona: personaId,
          include_persona_context: true
        })
        console.log(`   ✅ ${personaId}: Voice ${voiceResponse.voice_used}, Persona: ${voiceResponse.persona_used}`)
      } catch (error: any) {
        console.log(`   ❌ ${personaId}: ${error.message}`)
      }
    }

    // Test 4: Image generation with different personas
    console.log('\n4. Testing persona-aware image generation...')
    const testPrompt = "A beautiful landscape with mountains and a lake"
    
    for (const personaId of PERSONA_LIST.slice(0, 2)) { // Test first 2 personas
      console.log(`   Testing ${personaId} persona...`)
      try {
        const imageResponse = await apiClient.generateImage({
          prompt: testPrompt,
          persona: personaId,
          size: '1024x1024',
          include_persona_context: true
        })
        console.log(`   ✅ ${personaId}: Image generated, Persona: ${imageResponse.persona_used}`)
        console.log(`     Enhanced prompt: ${imageResponse.prompt_used.slice(0, 100)}...`)
      } catch (error: any) {
        console.log(`   ❌ ${personaId}: ${error.message}`)
      }
    }

    console.log('\n🎉 Integration test completed!')

  } catch (error: any) {
    console.error('❌ Test failed:', error.message)
    console.log('\n💡 Make sure the backend server is running at http://localhost:8000')
  }
}

// Export for use in development
export default testPersonaIntegration