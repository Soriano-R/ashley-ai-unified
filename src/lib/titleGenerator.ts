/**
 * Utility functions for generating smart chat session titles
 */

/**
 * Remove emojis and special symbols from text
 */
export function removeEmojis(text: string): string {
  return text
    // Remove emoji characters
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emoticons
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // Misc Symbols and Pictographs
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transport and Map
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '') // Flags
    .replace(/[\u{2600}-\u{26FF}]/gu, '')   // Misc symbols
    .replace(/[\u{2700}-\u{27BF}]/gu, '')   // Dingbats
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // Supplemental Symbols and Pictographs
    .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '') // Chess Symbols
    .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '') // Symbols and Pictographs Extended-A
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')   // Variation Selectors
    .replace(/[\u{200D}]/gu, '')            // Zero Width Joiner
    // Remove common symbol characters
    .replace(/[❤️💕💖💗💓💞💘💝💟❣️]/g, '')
    .replace(/[⭐️✨🌟💫⚡️]/g, '')
    .replace(/[🔥💥💢💯]/g, '')
    // Clean up multiple spaces
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Generate a smart title based on conversation content
 * Similar to ChatGPT's auto-title generation
 */
export function generateSmartTitle(messages: Array<{ role: string; content: string }>): string {
  if (messages.length === 0) return 'New Chat'

  // Get the first user message
  const firstUserMessage = messages.find(m => m.role === 'user')
  if (!firstUserMessage) return 'New Chat'

  let content = firstUserMessage.content.trim()

  // Remove emojis and symbols
  content = removeEmojis(content)

  // Extract key topics/questions
  // Look for question marks, key verbs, nouns
  const cleaned = content
    .replace(/^(hi|hello|hey|greetings)[,!.]?\s*/i, '') // Remove greetings
    .replace(/^(can you|could you|please|would you)\s+/i, '') // Remove polite prefixes
    .replace(/\?+$/, '') // Remove trailing question marks
    .trim()

  if (!cleaned) {
    // Fallback to original content if cleaning removed everything
    content = firstUserMessage.content.trim()
  } else {
    content = cleaned
  }

  // Capitalize first letter
  content = content.charAt(0).toUpperCase() + content.slice(1)

  // Truncate intelligently at word boundaries
  const maxLength = 40
  if (content.length > maxLength) {
    // Try to cut at last complete word before maxLength
    const truncated = content.slice(0, maxLength)
    const lastSpace = truncated.lastIndexOf(' ')

    if (lastSpace > maxLength * 0.7) {
      // If we have a reasonable word break point, use it
      return truncated.slice(0, lastSpace) + '...'
    } else {
      // Otherwise just truncate
      return truncated + '...'
    }
  }

  return content
}

/**
 * Generate title from conversation context (for use after a few messages)
 * This provides a more contextual title based on the discussion
 */
export function generateContextualTitle(messages: Array<{ role: string; content: string }>): string {
  if (messages.length < 2) {
    return generateSmartTitle(messages)
  }

  // Collect all user messages to understand the topic
  const userMessages = messages
    .filter(m => m.role === 'user')
    .map(m => removeEmojis(m.content))
    .join(' ')

  // Extract potential topic keywords
  const words = userMessages
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 3) // Filter short words
    .filter(w => !['what', 'how', 'why', 'when', 'where', 'could', 'would', 'should', 'can', 'will', 'the', 'this', 'that', 'with', 'for', 'and', 'but', 'not'].includes(w))

  // Find most common meaningful words (topic indicators)
  const wordFreq = new Map<string, number>()
  words.forEach(w => wordFreq.set(w, (wordFreq.get(w) || 0) + 1))

  // Get top 2-3 keywords
  const topWords = Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([word]) => word)

  if (topWords.length > 0) {
    // Create title from top keywords
    let title = topWords
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')

    // Add context from first message if title is too short
    if (title.length < 15) {
      const firstMsg = generateSmartTitle(messages)
      title = firstMsg
    }

    return title.slice(0, 40) + (title.length > 40 ? '...' : '')
  }

  // Fallback to smart title from first message
  return generateSmartTitle(messages)
}
