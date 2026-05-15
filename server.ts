import express from "express";
import path from "path";
import "dotenv/config";
import { createServer as createViteServer } from "vite";
import { 
  translateTextServer, 
  translateDocumentServer, 
  analyzeDocumentServer, 
  generatePhoneticServer, 
  spellcheckTextServer,
  chatWithAIServer 
} from "./src/services/ai.server";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON
  app.use(express.json({ limit: '50mb' }));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/translate", async (req, res) => {
    try {
      const { text, sourceLang, targetLang, glossaryInstructions } = req.body;
      const result = await translateTextServer(text, sourceLang, targetLang, glossaryInstructions);
      res.json({ translation: result });
    } catch (error: any) {
      console.error("Translation error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/translate-document", async (req, res) => {
    try {
      const { data, mimeType, targetLang } = req.body;
      const result = await translateDocumentServer(data, mimeType, targetLang);
      res.json({ result });
    } catch (error: any) {
      console.error("Document translation error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/analyze-document", async (req, res) => {
    try {
      const { contents } = req.body;
      const result = await analyzeDocumentServer(contents);
      res.json({ result });
    } catch (error: any) {
      console.error("Analysis error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/generate-phonetic", async (req, res) => {
    try {
      const { text, lang } = req.body;
      const result = await generatePhoneticServer(text, lang);
      res.json({ result });
    } catch (error: any) {
      console.error("Phonetic generation error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/spellcheck", async (req, res) => {
    try {
      const { text, lang } = req.body;
      const result = await spellcheckTextServer(text, lang);
      res.json({ errors: result });
    } catch (error: any) {
      console.error("Spellcheck error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { messages } = req.body;
      const result = await chatWithAIServer(messages);
      res.json({ response: result });
    } catch (error: any) {
      console.error("Chat error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
