/**
 * Simple integration test script to verify persona-aware voice and image generation
 * Run this after starting the backend server
 */

import { apiClient } from '../lib/apiClient'
import { getPersonaIcon, getPersonaImageStyleDescription } from '../lib/personas'

async function testPersonaIntegration() {
  console.log('🧪 Testing Persona Integration System...\n')

  try {
    // Test 1: Health check
    console.log('1. Testing API health...')
    const health = await apiClient.checkHealth()
    console.log('✅ Health check:', health)

    // Test 2: Get available personas
    console.log('\n2. Testing persona configurations...')
    const catalog = await apiClient.getPersonas()
    const personaList = catalog.personas

    console.log('📋 Available personas:', personaList.map(persona => persona.id))
    
    personaList.forEach(persona => {
      const icon = getPersonaIcon(persona.id)
      const styleDescription = getPersonaImageStyleDescription(persona.id)
      console.log(`   ${icon} ${persona.label}: ${persona.description}`)
      console.log(`     Default model: ${persona.defaultModel}`)
      console.log(`     Allowed models: ${(persona.allowedModelIds ?? []).join(', ')}`)
      console.log(`     Image style: ${styleDescription}`)
    })

    // Test 3: Voice synthesis with different personas
    console.log('\n3. Testing persona-aware voice synthesis...')
    const testText = "Hello! I'm here to help you with your tasks today."
    
    for (const persona of personaList.slice(0, 3)) { // Test first 3 personas
      const personaId = persona.id
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
    
    for (const persona of personaList.slice(0, 2)) { // Test first 2 personas
      const personaId = persona.id
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
