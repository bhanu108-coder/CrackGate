import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '25mb' }));

function getGeminiClient() {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// POST /api/gemini/generate-test
// Generates authentic GATE-style MCQ, MSQ, and NAT questions for a branch and subject/topic
app.post('/api/gemini/generate-test', async (req, res) => {
  try {
    const { branch, branchName, subjectName, topics, questionCount = 5, difficulty = 'GATE Standard' } = req.body;

    if (!branch || !subjectName) {
      res.status(400).json({ error: 'Branch and subjectName are required.' });
      return;
    }

    const ai = getGeminiClient();
    const topicContext = Array.isArray(topics) && topics.length > 0
      ? `Focus specifically on these syllabus topics: ${topics.join(', ')}.`
      : `Cover high-weightage core GATE topics within ${subjectName}.`;

    const prompt = `You are a senior IIT professor setting questions for the Graduate Aptitude Test in Engineering (GATE) in ${branchName || branch} (${branch}).
Generate ${Math.min(Math.max(Number(questionCount) || 5, 3), 10)} original, rigorous GATE-level questions for the subject "${subjectName}".
${topicContext}
Difficulty level: ${difficulty}.

Include a realistic mix of:
1. "MCQ" (Multiple Choice Questions with 4 options, exactly one correct option text matching one of the 4 options)
2. "MSQ" (Multiple Select Questions with 4 options, where 2 or 3 options are correct; no negative marking)
3. "NAT" (Numerical Answer Type questions requiring a number answer, with no options, and a valid numericalRange [min, max] allowing rounding tolerance)

Assign either 1 or 2 marks per question according to conceptual depth and calculation steps. Provide a rigorous step-by-step mathematical or conceptual explanation for every question.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          description: 'List of generated GATE mock test questions.',
          items: {
            type: Type.OBJECT,
            properties: {
              topicName: {
                type: Type.STRING,
                description: 'Specific GATE syllabus topic name.',
              },
              type: {
                type: Type.STRING,
                description: 'Question type: must be MCQ, MSQ, or NAT.',
              },
              marks: {
                type: Type.INTEGER,
                description: 'Marks awarded: either 1 or 2.',
              },
              questionText: {
                type: Type.STRING,
                description: 'Complete technical question statement with all given parameters and units.',
              },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Exactly 4 distinct options for MCQ and MSQ. Empty array for NAT.',
              },
              correctAnswer: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'For MCQ: array with 1 exact matching option string. For MSQ: array with 2-3 exact matching option strings. For NAT: array with 1 string representing the exact numerical value (e.g. ["42.5"]).',
              },
              numericalMin: {
                type: Type.NUMBER,
                description: 'Minimum acceptable numerical answer for NAT questions (use 0 for MCQ/MSQ).',
              },
              numericalMax: {
                type: Type.NUMBER,
                description: 'Maximum acceptable numerical answer for NAT questions (use 0 for MCQ/MSQ).',
              },
              explanation: {
                type: Type.STRING,
                description: 'Step-by-step GATE solution derivation and key formula used.',
              },
            },
            required: [
              'topicName',
              'type',
              'marks',
              'questionText',
              'options',
              'correctAnswer',
              'numericalMin',
              'numericalMax',
              'explanation',
            ],
          },
        },
      },
    });

    const rawText = response.text || '[]';
    const parsed = JSON.parse(rawText);
    res.json({ questions: parsed });
  } catch (error: unknown) {
    console.error('Error generating GATE questions:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate GATE questions via Gemini API.';
    res.status(500).json({ error: message });
  }
});

// POST /api/gemini/parse-pdf-test
// Parses an uploaded PDF of mock tests or chapter notes and organizes/generates GATE questions mapped to the chapter-wise syllabus
app.post('/api/gemini/parse-pdf-test', async (req, res) => {
  try {
    const {
      pdfBase64,
      fileName = 'uploaded-mock-test.pdf',
      branch,
      branchName,
      subjectName,
      chapterTopics = [],
      selectedChapter = 'ALL',
      questionCount = 6,
      extractionMode = 'extract_and_adapt',
    } = req.body;

    if (!pdfBase64 || typeof pdfBase64 !== 'string') {
      res.status(400).json({ error: 'Uploaded PDF data (pdfBase64) is required.' });
      return;
    }

    const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, '').trim();
    const targetCount = Math.min(Math.max(Number(questionCount) || 6, 3), 12);
    const chaptersList = Array.isArray(chapterTopics) && chapterTopics.length > 0
      ? chapterTopics.join(', ')
      : subjectName;

    const chapterInstruction =
      selectedChapter && selectedChapter !== 'ALL'
        ? `Filter and focus specifically on questions/concepts belonging to the syllabus chapter: "${selectedChapter}". Set every question's topicName to "${selectedChapter}".`
        : `Classify and map each question to its exact matching chapter from the official GATE chapter-wise syllabus for ${subjectName}: [${chaptersList}]. Ensure questions span across the relevant chapters present in the PDF.`;

    const modeInstruction =
      extractionMode === 'generate_from_notes'
        ? `Analyze the concepts, formulas, theorems, and examples inside the uploaded PDF ("${fileName}") and create ${targetCount} rigorous, original GATE-level questions (MCQ, MSQ, and NAT) organized by chapter.`
        : `Extract up to ${targetCount} questions from the uploaded mock test / question paper PDF ("${fileName}"). If the PDF contains fewer than ${targetCount} questions or has incomplete options/solutions, solve each question step-by-step and supplement with additional GATE-standard questions from the same PDF chapters so the student gets a complete ${targetCount}-question chapter-wise mock test.`;

    const prompt = `You are an expert IIT GATE Examination Setter for ${branchName || branch} (${branch}), Subject: "${subjectName}".
${modeInstruction}
${chapterInstruction}

Requirements for every question:
1. "topicName": Must be the clean chapter/topic name from the GATE syllabus (${chaptersList}).
2. "type": Must be "MCQ" (4 options, 1 correct), "MSQ" (4 options, 2-3 correct), or "NAT" (numerical answer, empty options array, valid numericalMin and numericalMax).
3. "marks": 1 or 2 marks.
4. "correctAnswer": Array of exact matching option string(s) for MCQ/MSQ, or single numeric string (e.g. ["12.5"]) for NAT.
5. "explanation": Complete, step-by-step mathematical or conceptual solution derivation so the student can learn from the PDF mock test.`;

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'application/pdf',
              data: cleanBase64,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            pdfSummary: {
              type: Type.STRING,
              description: '1-2 sentence summary of the uploaded PDF and the GATE syllabus chapters detected.',
            },
            questions: {
              type: Type.ARRAY,
              description: 'List of extracted or generated chapter-wise GATE mock test questions.',
              items: {
                type: Type.OBJECT,
                properties: {
                  topicName: {
                    type: Type.STRING,
                    description: 'Exact chapter/syllabus topic name this question belongs to.',
                  },
                  type: {
                    type: Type.STRING,
                    description: 'MCQ, MSQ, or NAT.',
                  },
                  marks: {
                    type: Type.INTEGER,
                    description: '1 or 2.',
                  },
                  questionText: {
                    type: Type.STRING,
                    description: 'Complete question statement.',
                  },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: '4 options for MCQ/MSQ, or empty array [] for NAT.',
                  },
                  correctAnswer: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'Exact matching option text(s) for MCQ/MSQ, or numeric string for NAT.',
                  },
                  numericalMin: {
                    type: Type.NUMBER,
                    description: 'Lower bound for NAT answer (0 for MCQ/MSQ).',
                  },
                  numericalMax: {
                    type: Type.NUMBER,
                    description: 'Upper bound for NAT answer (0 for MCQ/MSQ).',
                  },
                  explanation: {
                    type: Type.STRING,
                    description: 'Detailed step-by-step GATE solution.',
                  },
                },
                required: [
                  'topicName',
                  'type',
                  'marks',
                  'questionText',
                  'options',
                  'correctAnswer',
                  'numericalMin',
                  'numericalMax',
                  'explanation',
                ],
              },
            },
          },
          required: ['pdfSummary', 'questions'],
        },
      },
    });

    const rawText = response.text || '{"pdfSummary":"","questions":[]}';
    const parsed = JSON.parse(rawText);
    res.json(parsed);
  } catch (error: unknown) {
    console.error('Error parsing PDF mock test:', error);
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to analyze the uploaded PDF mock test.';
    res.status(500).json({ error: message });
  }
});

// POST /api/gemini/diagnostics
// Analyzes student's test attempts, accuracy, negative marking losses, and study hours to generate a personalized weak-area remediation plan
app.post('/api/gemini/diagnostics', async (req, res) => {
  try {
    const { branch, branchName, subjectMetrics, weakTopics, totalStudyHours, recentTestSummary } = req.body;

    const ai = getGeminiClient();
    const prompt = `You are an elite GATE Exam Coach analyzing the preparation telemetry of a student preparing for GATE ${branchName || branch} (${branch}).

Student Preparation Telemetry:
- Total Logged Study Hours: ${totalStudyHours ?? 0} hours
- Subject Performance Breakdown: ${JSON.stringify(subjectMetrics || [])}
- Identified Weak / Low-Accuracy Topics: ${JSON.stringify(weakTopics || [])}
- Recent Mock Test Summary: ${JSON.stringify(recentTestSummary || {})}

Analyze their accuracy, negative marking losses, syllabus coverage vs. test conversion, and speed. Provide a concrete, high-impact diagnostic report in JSON format.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            executiveSummary: {
              type: Type.STRING,
              description: 'Direct 2-3 sentence assessment of current GATE readiness, accuracy trend, and negative marking discipline.',
            },
            estimatedGateScoreBand: {
              type: Type.STRING,
              description: 'Projected score band out of 100 marks based on current accuracy and coverage (e.g., "58 - 64 Marks / 100").',
            },
            rootCauseAnalysis: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  issueTitle: { type: Type.STRING },
                  severity: { type: Type.STRING, description: 'Critical, Moderate, or Nominal' },
                  diagnosis: { type: Type.STRING },
                  fixAction: { type: Type.STRING },
                },
                required: ['issueTitle', 'severity', 'diagnosis', 'fixAction'],
              },
            },
            sevenDayPlan: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  dayLabel: { type: Type.STRING, description: 'e.g., Day 1-2' },
                  focusSubject: { type: Type.STRING },
                  targetTopic: { type: Type.STRING },
                  actionPlan: { type: Type.STRING },
                  targetMetric: { type: Type.STRING, description: 'e.g., Solve 15 NAT questions with 80% accuracy' },
                },
                required: ['dayLabel', 'focusSubject', 'targetTopic', 'actionPlan', 'targetMetric'],
              },
            },
          },
          required: ['executiveSummary', 'estimatedGateScoreBand', 'rootCauseAnalysis', 'sevenDayPlan'],
        },
      },
    });

    const rawText = response.text || '{}';
    const parsed = JSON.parse(rawText);
    res.json({ diagnostic: parsed });
  } catch (error: unknown) {
    console.error('Error generating GATE diagnostics:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate AI diagnostic report.';
    res.status(500).json({ error: message });
  }
});

// POST /api/youtube/metadata
// Ultra-fast (<300ms) YouTube metadata fetcher using lightweight oEmbed JSON + instant deterministic GATE topic matching
app.post('/api/youtube/metadata', async (req, res) => {
  try {
    const { youtubeUrl, videoId, branch, subjects } = req.body;
    const cleanVideoId = String(videoId || '').trim();
    if (!cleanVideoId) {
      res.status(400).json({ error: 'Valid YouTube videoId is required.' });
      return;
    }

    const canonicalWatchUrl = `https://www.youtube.com/watch?v=${cleanVideoId}`;
    let fetchedTitle = '';
    let fetchedAuthor = '';
    let fetchedDurationMinutes = 0;

    // 1. Fast oEmbed fetch for title and channel name
    const fetchOembed = async (url: string) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      try {
        const r = await fetch(url, {
          signal: controller.signal,
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GatePulse/1.0)' },
        });
        if (!r.ok) throw new Error('Non-200');
        const data = (await r.json()) as { title?: string; author_name?: string };
        if (!data.title) throw new Error('No title');
        return data;
      } finally {
        clearTimeout(timeout);
      }
    };

    // 2. Parallel fast extraction of exact video duration (lengthSeconds / approxDurationMs)
    const fetchExactDuration = async (): Promise<{ durationMins: number; fallbackTitle: string; fallbackAuthor: string }> => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2400);
      try {
        const pageRes = await fetch(canonicalWatchUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
          },
        });
        if (!pageRes.ok) return { durationMins: 0, fallbackTitle: '', fallbackAuthor: '' };
        const html = await pageRes.text();

        let durationMins = 0;
        const lenSecMatch = html.match(/"lengthSeconds"\s*:\s*"(\d+)"/);
        if (lenSecMatch && lenSecMatch[1]) {
          const secs = parseInt(lenSecMatch[1], 10);
          if (secs > 0) durationMins = Math.max(1, Math.round(secs / 60));
        }
        if (!durationMins) {
          const approxMsMatch = html.match(/"approxDurationMs"\s*:\s*"(\d+)"/);
          if (approxMsMatch && approxMsMatch[1]) {
            const ms = parseInt(approxMsMatch[1], 10);
            if (ms > 0) durationMins = Math.max(1, Math.round(ms / 60000));
          }
        }
        if (!durationMins) {
          const isoMatch = html.match(/itemprop="duration"\s+content="PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?"/);
          if (isoMatch) {
            const hrs = parseInt(isoMatch[1] || '0', 10);
            const mins = parseInt(isoMatch[2] || '0', 10);
            const secs = parseInt(isoMatch[3] || '0', 10);
            const total = hrs * 60 + mins + Math.round(secs / 60);
            if (total > 0) durationMins = total;
          }
        }

        const tMatch = html.match(/<title>(.*?) - YouTube<\/title>/);
        const aMatch = html.match(/"ownerChannelName"\s*:\s*"([^"]+)"/);

        return {
          durationMins,
          fallbackTitle: tMatch?.[1]?.trim() || '',
          fallbackAuthor: aMatch?.[1]?.trim() || '',
        };
      } catch {
        return { durationMins: 0, fallbackTitle: '', fallbackAuthor: '' };
      } finally {
        clearTimeout(timeout);
      }
    };

    const [oembedResult, durationResult] = await Promise.allSettled([
      Promise.any([
        fetchOembed(
          `https://www.youtube.com/oembed?url=${encodeURIComponent(canonicalWatchUrl)}&format=json`
        ),
        fetchOembed(
          `https://noembed.com/embed?url=${encodeURIComponent(canonicalWatchUrl)}`
        ),
      ]),
      fetchExactDuration(),
    ]);

    if (oembedResult.status === 'fulfilled') {
      fetchedTitle = oembedResult.value.title || '';
      fetchedAuthor = oembedResult.value.author_name || '';
    }
    if (durationResult.status === 'fulfilled') {
      fetchedDurationMinutes = durationResult.value.durationMins;
      if (!fetchedTitle && durationResult.value.fallbackTitle) {
        fetchedTitle = durationResult.value.fallbackTitle;
      }
      if (!fetchedAuthor && durationResult.value.fallbackAuthor) {
        fetchedAuthor = durationResult.value.fallbackAuthor;
      }
    }

    const subjectList: { id: string; name: string; topics: string[] }[] = Array.isArray(subjects)
      ? subjects
      : [];
    const defaultSub = subjectList[0] || {
      id: `${String(branch || 'cs').toLowerCase()}-01`,
      name: `GATE ${branch || 'CS'} Core Subject`,
      topics: ['Core Syllabus Topic'],
    };

    // Instant (<1ms) deterministic keyword scoring to match GATE Subject & Syllabus Topic
    let matchedSubjectId = defaultSub.id;
    let matchedTopicName = defaultSub.topics?.[0] || 'Core Syllabus Topic';
    let matchedSubjectName = defaultSub.name;

    const lowerTitle = `${fetchedTitle} ${fetchedAuthor}`.toLowerCase();
    let bestScore = 0;

    for (const s of subjectList) {
      const subWords = s.name
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length >= 3 && w !== 'and' && w !== 'the' && w !== 'for');

      let subScore = 0;
      for (const w of subWords) {
        if (lowerTitle.includes(w)) subScore += 2;
      }

      if (subScore > bestScore) {
        bestScore = subScore;
        matchedSubjectId = s.id;
        matchedSubjectName = s.name;
        matchedTopicName = s.topics?.[0] || s.name;
      }

      for (const t of s.topics || []) {
        const topicWords = t
          .toLowerCase()
          .split(/[^a-z0-9]+/)
          .filter((w) => w.length >= 3 && w !== 'and' && w !== 'the');
        let tScore = subScore;
        for (const tw of topicWords) {
          if (lowerTitle.includes(tw)) tScore += 3;
        }
        if (tScore > bestScore) {
          bestScore = tScore;
          matchedSubjectId = s.id;
          matchedSubjectName = s.name;
          matchedTopicName = t;
        }
      }
    }

    const playlistTitle = `GATE ${branch || 'CS'} — ${matchedSubjectName}`;

    res.json({
      metadata: {
        videoId: cleanVideoId,
        youtubeUrl: canonicalWatchUrl,
        title: fetchedTitle || `GATE ${branch || 'CS'} Lecture (${cleanVideoId})`,
        channelName: fetchedAuthor || 'YouTube GATE Educator',
        subjectId: matchedSubjectId,
        topicName: matchedTopicName,
        playlistTitle,
        durationMinutes: fetchedDurationMinutes > 0 ? fetchedDurationMinutes : 60,
        notes: `Key concepts from "${fetchedTitle || matchedTopicName}" (${fetchedAuthor || 'YouTube'}).`,
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching YouTube metadata:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch YouTube metadata.';
    res.status(500).json({ error: message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GATE Pulse server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
