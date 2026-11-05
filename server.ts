import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '5mb' }));

function getGenAIClient() {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

app.post('/api/summarize-q2-q3', async (req, res) => {
  try {
    const { calculationPayload } = req.body || {};
    if (!calculationPayload || !calculationPayload.topChangedRegion) {
      return res.status(400).json({
        error: 'Missing calculated Q2-to-Q3 sales metrics payload.',
      });
    }

    const ai = getGenAIClient();

    const systemInstruction = [
      'You are a precise financial and sales operations analyst.',
      'Your task is to write a three-sentence summary explaining which region changed most in revenue from Q2 to Q3, and why.',
      'STRICT RULES:',
      '1. Output EXACTLY three sentences (sentence 1, sentence 2, sentence 3).',
      '2. Use ONLY the exact numbers provided in the JSON calculation payload calculated by the application.',
      '3. Do NOT invent, extrapolate, or estimate any numbers that are not explicitly present in the provided JSON.',
      '4. Sentence 1 must state which region changed the most from Q2 to Q3, citing its Q2 revenue, Q3 revenue, absolute dollar change, and percentage change, and optionally comparing it against the next closest region.',
      '5. Sentence 2 must explain the primary product and channel revenue drivers behind that Q2-to-Q3 shift in that region using the exact calculated dollar and percentage changes.',
      '6. Sentence 3 must explain the operational volume (units sold) and pricing/discounting (average discount_pct) shifts from Q2 to Q3 in that region using the exact calculated figures.',
    ].join('\n');

    const prompt = `Write the three-sentence Q2-to-Q3 regional revenue change summary using ONLY these app-calculated numbers:\n\n${JSON.stringify(
      calculationPayload,
      null,
      2
    )}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.1,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sentence1: {
              type: Type.STRING,
              description:
                'First sentence identifying the region that changed most from Q2 to Q3 with exact Q2 revenue, Q3 revenue, dollar change, and percentage change.',
            },
            sentence2: {
              type: Type.STRING,
              description:
                'Second sentence explaining why the change occurred by citing the exact calculated product and channel revenue shifts in that region.',
            },
            sentence3: {
              type: Type.STRING,
              description:
                'Third sentence explaining the exact calculated unit volume and average discount percentage changes in that region from Q2 to Q3.',
            },
          },
          required: ['sentence1', 'sentence2', 'sentence3'],
        },
      },
    });

    const rawText = response.text ? response.text.trim() : '';
    if (!rawText) {
      return res.status(502).json({
        error: 'The AI model returned an empty response.',
      });
    }

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      const sentences = rawText
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter(Boolean);
      parsed = {
        sentence1: sentences[0] || rawText,
        sentence2: sentences[1] || '',
        sentence3: sentences.slice(2).join(' ') || '',
      };
    }

    const sentences = [
      parsed.sentence1?.trim(),
      parsed.sentence2?.trim(),
      parsed.sentence3?.trim(),
    ].filter(Boolean);

    return res.json({
      summary: sentences.join(' '),
      sentences,
    });
  } catch (error) {
    console.error('Error generating Q2-Q3 summary:', error);
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to generate AI summary from calculated numbers.';
    return res.status(500).json({ error: message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
