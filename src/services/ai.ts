import { GoogleGenAI } from "@google/genai";

let genAI: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured. Please add your API key in the AI Studio settings.");
    }
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
}

// Offline support: Cache for previous translations and a basic dictionary
const OFFLINE_CACHE_KEY = 'translation_cache';
const COMMON_DICTIONARY: Record<string, Record<string, string>> = {
  'en-es': { 'hello': 'hola', 'goodbye': 'adiós', 'thank you': 'gracias', 'please': 'por favor', 'yes': 'sí', 'no': 'no' },
  'en-fr': { 'hello': 'bonjour', 'goodbye': 'au revoir', 'thank you': 'merci', 'please': 's' + 'il vous plaît', 'yes': 'oui', 'no': 'non' },
  'es-en': { 'hola': 'hello', 'adiós': 'goodbye', 'gracias': 'thank you', 'por favor': 'please', 'sí': 'yes', 'no': 'no' },
  // ... more can be added
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

export async function translateText(text: string, sourceLang: string, targetLang: string, glossary: Array<{ source: string, target: string }> = []): Promise<string> {
  if (!text.trim()) return "";

  // Check connectivity
  const isOffline = !navigator.onLine;

  if (isOffline) {
    // Try cache first
    const cached = getFromCache(text, sourceLang, targetLang);
    if (cached) return cached;

    // Try common dictionary
    const pair = `${sourceLang}-${targetLang}`;
    const dict = COMMON_DICTIONARY[pair];
    if (dict) {
      const lower = text.toLowerCase().trim();
      if (dict[lower]) return dict[lower];
    }

    // Try basic glossary matching offline (if any)
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

    throw new Error("Translation unavailable offline. Please download language pack or check connection.");
  }
  
  const sourceInfo = sourceLang === 'auto' ? 'detect the source language' : `from ${sourceLang}`;
  
  let glossaryInstructions = "";
  if (glossary.length > 0) {
    glossaryInstructions = `
    
    IMPORTANT GLOSSARY OVERRIDES:
    The following terms MUST be translated as specified, regardless of context:
    ${glossary.map(g => `- "${g.source}" -> "${g.target}"`).join('\n')}
    
    Ensure these specific translations are used exactly as provided.`;
  }

  const prompt = `Translate the following text ${sourceInfo} to ${targetLang}. Return ONLY the translated text, no explanations or context.${glossaryInstructions}
  
  Text: ${text}`;

  const response = await getGenAI().models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
  });

  const translation = response.text?.trim() || "Translation failed.";
  
  if (translation !== "Translation failed.") {
    saveToCache(text, sourceLang, targetLang, translation);
  }

  return translation;
}

export async function translateDocument(base64Image: string, targetLang: string): Promise<{ text: string; translation: string }> {
  // Extracting MIME type from base64 if it exists, default to image/png
  const mimeType = base64Image.match(/data:(.*?);base64/)?.[1] || "image/png";
  const data = base64Image.replace(/^data:image\/\w+;base64,/, "");

  const prompt = `Perform OCR on this image to extract the text. Then, translate that text into ${targetLang}. 
  Return the result in the following format:
  ORIGINAL TEXT:
  [Extracted text]
  
  TRANSLATED TEXT:
  [Translated text]`;

  const response = await getGenAI().models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        { inlineData: { data, mimeType } },
        { text: prompt }
      ]
    },
  });

  const fullText = response.text || "";
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

  const response = await getGenAI().models.generateContent({
    model: "gemini-3-flash-preview",
    contents: contents,
  });

  try {
    const text = response.text || "{}";
    // Search for JSON block if Gemini includes markdown
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
  
  const prompt = `Provide a clear, easy-to-read phonetic pronunciation guide for the following text in ${lang}.
  
  Format guidelines:
  1. Use "sounds like" respelling (e.g., for French "Bonjour", return "bohn-ZHOOR").
  2. Break words into syllables with hyphens and capitalize stressed syllables.
  3. If the language has a standard romanization (like Pinyin for Chinese or Romaji for Japanese), include it in parentheses after the respelling.
  4. Return ONLY the phonetic result, no explanations or context.
  
  Text: ${text}`;

  const response = await getGenAI().models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
  });

  return response.text?.trim() || "Phonetic guide unavailable.";
}

export async function chatWithAI(messages: { role: 'user' | 'model', parts: { text: string }[] }[]): Promise<string> {
  const response = await getGenAI().models.generateContent({
    model: "gemini-3-flash-preview",
    contents: messages,
  });

  return response.text?.trim() || "Communication breakdown. Please try again.";
}
