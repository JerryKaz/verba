# Verba: Professional Linguistic Environment

Verba is a high-performance, AI-driven linguistic workstation designed for professional translation, document analysis, and conversational language refinement. Powered by Google Gemini and advanced OCR technology, it provides a seamless bridge between visual documentation and semantic understanding.

## Core Features

- **Linguistic Assistant**: A conversational AI chatbot powered by Gemini 1.5, specialized in deep language analysis, nuance extraction, and translation refinement.
- **Semantic Document Analysis**: Enterprise-grade extraction for PDFs, DOCX, and images, providing automated executive summaries, thematic mapping, and complexity assessment.
- **Translation Engine**: Real-time professional translation across dozens of languages with integrated phonetic guides and vocal synthesis.
- **Glossary Overrides**: Custom terminology management that allows users to force specific translations for brand names, technical jargon, or specialized vocabulary.
- **Document Scanner**: Precision OCR engine for digitizing and translating text from live camera feeds or static image assets.
- **Hybrid Offline Support**: Intelligent caching and local pack management ensure core utility is maintained even in low-connectivity environments.

## Technical Architecture

- **AI Core**: Integrated with `@google/generative-ai` using `gemini-3-flash-preview` for high-speed analysis and `gemini-1.5-flash` for conversational logic.
- **Document Processing**: Utilizes `mammoth` for high-fidelity DOCX extraction and native browser APIs for PDF/Image handling.
- **UI Framework**: Built with **React 18** and **Tailwind CSS**, featuring a mobile-first, "app-like" responsive architecture and fluid animations via `motion`.
- **Linguistic Data**: Managed through a persistent local history engine and custom glossary system.

## Recent Updates

- **Conversational Core**: Launched the "Assistant" tab, enabling a direct dialogue with a linguistic AI to explore idioms, grammar, and complex translations.
- **Semantic Overhaul**: Added deep document analysis that extracts 5+ key themes and estimates semantic complexity for uploaded files.
- **Audio Feedback**: Integrated instantaneous auditory pronunciation samples directly within the phonetic guide interface.
- **Mobile Precision**: Optimized touch targets and component density for a superior experience on iOS and Android devices.
- **Glossary Management**: Empowered users to define "Linguistic Overrides" that persist across sessions to maintain brand/technical consistency.

## Environment Configuration

Verba requires a valid `GEMINI_API_KEY` configured in the environment to enable its advanced analytical and conversational capabilities.
