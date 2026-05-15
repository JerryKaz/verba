// Client-side AI service proxy
// Calls server API endpoints to protect the API key

// Cache for previous translations
const OFFLINE_CACHE_KEY = 'translation_cache';
const ANALYSIS_CACHE_KEY = 'analysis_cache';
const COMMON_DICTIONARY: Record<string, Record<string, string>> = {
  'en-es': { 'hello': 'hola', 'goodbye': 'adiós', 'thank you': 'gracias', 'please': 'por favor', 'yes': 'sí', 'no': 'no' },
  'en-fr': { 'hello': 'bonjour', 'goodbye': 'au revoir', 'thank you': 'merci', 'please': 's' + 'il vous plaît', 'yes': 'oui', 'no': 'non' },
  'es-en': { 'hola': 'hello', 'adiós': 'goodbye', 'gracias': 'thank you', 'por favor': 'please', 'sí': 'yes', 'no': 'no' },
};

function getFromCache(text: string, sourceLang: string, targetLang: string): string | null {
  try {
    const cache = JSON.parse(localStorage.getItem(OFFLINE_CACHE_KEY) || '{}');
    const key = `${sourceLang}-${targetLang}-${text.toLowerCase().trim()}`;
    return cache[key] || null;
  } catch {
    return null;
  }
}

function saveToCache(text: string, sourceLang: string, targetLang: string, translation: string) {
  try {
    const cache = JSON.parse(localStorage.getItem(OFFLINE_CACHE_KEY) || '{}');
    const key = `${sourceLang}-${targetLang}-${text.toLowerCase().trim()}`;
    cache[key] = translation;
    localStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.error('Failed to save to cache', e);
  }
}

export function clearTranslationCache() {
  try {
    localStorage.removeItem(OFFLINE_CACHE_KEY);
  } catch (e) {
    console.error('Failed to clear translation cache', e);
  }
}

export function clearAnalysisCache() {
  try {
    localStorage.removeItem(ANALYSIS_CACHE_KEY);
  } catch (e) {
    console.error('Failed to clear analysis cache', e);
  }
}

async function apiCall(endpoint: string, body: any) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }
  
  return response.json();
}

export async function translateText(text: string, sourceLang: string, targetLang: string, glossary: Array<{ source: string, target: string }> = []): Promise<string> {
  if (!text.trim()) return "";

  const isOffline = !navigator.onLine;

  if (isOffline) {
    const cached = getFromCache(text, sourceLang, targetLang);
    if (cached) return cached;

    const pair = `${sourceLang}-${targetLang}`;
    const dict = COMMON_DICTIONARY[pair];
    if (dict) {
      const lower = text.toLowerCase().trim();
      if (dict[lower]) return dict[lower];
    }

    let offlineResult = text;
    let replaced = false;
    for (const entry of glossary) {
      const regex = new RegExp(`\\b${entry.source}\\b`, 'gi');
      if (regex.test(offlineResult)) {
        offlineResult = offlineResult.replace(regex, entry.target);
        replaced = true;
      }
    }
    if (replaced) return offlineResult;

    throw new Error("Translation unavailable offline. Please check connection.");
  }
  
  let glossaryInstructions = "";
  if (glossary.length > 0) {
    glossaryInstructions = `
    
    IMPORTANT GLOSSARY OVERRIDES:
    The following terms MUST be translated as specified, regardless of context:
    ${glossary.map(g => `- "${g.source}" -> "${g.target}"`).join('\n')}
    
    Ensure these specific translations are used exactly as provided.`;
  }

  const data = await apiCall('/api/translate', { 
    text, 
    sourceLang, 
    targetLang, 
    glossaryInstructions 
  });
  
  const translation = data.translation;
  saveToCache(text, sourceLang, targetLang, translation);
  return translation;
}

export async function translateDocument(base64Image: string, targetLang: string): Promise<{ text: string; translation: string }> {
  const mimeType = base64Image.match(/data:(.*?);base64/)?.[1] || "image/png";
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");

  const data = await apiCall('/api/translate-document', { 
    data: base64Data, 
    mimeType, 
    targetLang 
  });

  const fullText = data.result;
  const parts = fullText.split("TRANSLATED TEXT:");
  const original = parts[0]?.replace("ORIGINAL TEXT:", "").trim() || "";
  const translation = parts[1]?.trim() || "";

  return { text: original, translation };
}

export async function analyzeDocument(content: string | { data: string; mimeType: string }): Promise<{ summary: string; themes: string[]; wordCount: number; complexity: string }> {
  let prompt = `Analyze the linguistic content of the following document. provide:
  1. A concise summary of the content (max 3 sentences).
  2. A list of 5 key themes or topics addressed.
  3. An estimation of the linguistic complexity (e.g., Simple, Moderate, Advanced).
  4. The approximate word count.

  Return the result in JSON format:
  {
    "summary": "...",
    "themes": ["...", "..."],
    "complexity": "...",
    "wordCount": 0
  }`;

  let contents: any;
  if (typeof content === 'string') {
    prompt += `\n\nDocument Text:\n${content}`;
    contents = prompt;
  } else {
    contents = {
      parts: [
        { inlineData: content },
        { text: prompt }
      ]
    };
  }

  const data = await apiCall('/api/analyze-document', { contents });
  const text = data.result;
  
  if (text) {
    try {
      const cache = JSON.parse(localStorage.getItem(ANALYSIS_CACHE_KEY) || '{}');
      // Use a hash or a snippet of the content as key
      const contentKey = typeof content === 'string' 
        ? content.substring(0, 100) 
        : content.data.substring(0, 100);
      cache[contentKey] = text;
      localStorage.setItem(ANALYSIS_CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
      console.error("Failed to cache analysis", e);
    }
  }

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : text;
    return JSON.parse(jsonString);
  } catch (e) {
    console.error("Failed to parse document analysis", e);
    return {
      summary: "Analysis failed to parse.",
      themes: [],
      wordCount: 0,
      complexity: "Unknown"
    };
  }
}

export async function generatePhonetic(text: string, lang: string): Promise<string> {
  if (!text.trim()) return "";
  
  const data = await apiCall('/api/generate-phonetic', { text, lang });
  return data.result || "Phonetic guide unavailable.";
}

export async function spellcheckText(text: string, lang: string): Promise<Array<{ original: string, suggestions: string[] }>> {
  if (!text.trim()) return [];
  
  const data = await apiCall('/api/spellcheck', { text, lang });
  return data.errors || [];
}

export async function chatWithAI(messages: { role: 'user' | 'model', parts: { text: string }[] }[]): Promise<string> {
  const data = await apiCall('/api/chat', { messages });
  return data.response || "Communication breakdown. Please try again.";
}
