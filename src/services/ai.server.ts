import { GoogleGenAI } from "@google/genai";

let genAI: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured. Please add your API key in the AI Studio settings.");
    }
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
}

const DEFAULT_MODEL = "gemini-flash-latest";

export async function translateTextServer(text: string, sourceLang: string, targetLang: string, glossaryInstructions: string) {
  const sourceInfo = sourceLang === 'auto' ? 'detect the source language' : `from ${sourceLang}`;
  const prompt = `Translate the following text ${sourceInfo} to ${targetLang}. Return ONLY the translated text, no explanations or context.${glossaryInstructions}
  
  Text: ${text}`;

  const response = await getGenAI().models.generateContent({
    model: DEFAULT_MODEL,
    contents: prompt,
  });

  return response.text?.trim() || "Translation failed.";
}

export async function translateDocumentServer(data: string, mimeType: string, targetLang: string) {
  const prompt = `Perform OCR on this image to extract the text. Then, translate that text into ${targetLang}. 
  Return the result in the following format:
  ORIGINAL TEXT:
  [Extracted text]
  
  TRANSLATED TEXT:
  [Translated text]`;

  const response = await getGenAI().models.generateContent({
    model: DEFAULT_MODEL,
    contents: {
      parts: [
        { inlineData: { data, mimeType } },
        { text: prompt }
      ]
    },
  });

  return response.text || "";
}

export async function analyzeDocumentServer(contents: any) {
  const response = await getGenAI().models.generateContent({
    model: DEFAULT_MODEL,
    contents: contents,
  });

  return response.text || "{}";
}

export async function generatePhoneticServer(text: string, lang: string) {
  const prompt = `Provide a clear, easy-to-read phonetic pronunciation guide for the following text in ${lang}.
  
  Format guidelines:
  1. Use "sounds like" respelling (e.g., for French "Bonjour", return "bohn-ZHOOR").
  2. Break words into syllables with hyphens and capitalize stressed syllables.
  3. If the language has a standard romanization (like Pinyin for Chinese or Romaji for Japanese), include it in parentheses after the respelling.
  4. Return ONLY the phonetic result, no explanations or context.
  
  Text: ${text}`;

  const response = await getGenAI().models.generateContent({
    model: DEFAULT_MODEL,
    contents: prompt,
  });

  return response.text?.trim() || "Phonetic guide unavailable.";
}

export async function spellcheckTextServer(text: string, lang: string) {
  const prompt = `Act as an expert proofreader. Analyze the following text in ${lang} for spelling and grammar errors.
  Identify all misspelled words or grammatical errors.
  For each error, provide the original word/phrase and exactly 3 correction suggestions.
  
  Return the result as a JSON array of objects:
  [
    {
      "original": "mispeled",
      "suggestions": ["misspelled", "misspell", "misspells"]
    }
  ]
  
  If there are no errors, return an empty array [].
  Return ONLY the JSON array, no other text.
  
  Text: ${text}`;

  const response = await getGenAI().models.generateContent({
    model: DEFAULT_MODEL,
    contents: prompt,
  });

  const raw = response.text?.trim() || "[]";
  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : raw);
  } catch (e) {
    console.error("Failed to parse spellcheck result:", e);
    return [];
  }
}

export async function chatWithAIServer(messages: any[]) {
  const response = await getGenAI().models.generateContent({
    model: DEFAULT_MODEL,
    contents: messages,
  });

  return response.text?.trim() || "Communication breakdown. Please try again.";
}
