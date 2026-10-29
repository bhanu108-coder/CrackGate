import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  BookOpen,
  Calculator,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Cpu,
  Download,
  FileText,
  Flag,
  Play,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react';
import {
  BranchCode,
  MockQuestion,
  MockTestAttempt,
  QuestionResponseRecord,
  SyllabusSubject,
} from '../types/gate';
import { GATE_BRANCHES } from '../data/gateInitialData';
import { generateMockTestPdfReport } from '../utils/pdfReportGenerator';

interface MockTestViewProps {
  activeBranch: BranchCode;
  subjects: SyllabusSubject[];
  questions: MockQuestion[];
  testAttempts: MockTestAttempt[];
  preselectedSubjectId?: string;
  preselectedTopicFilter?: string;
  preselectedAiMode?: boolean;
  isFocusMode?: boolean;
  onAddCustomQuestions: (newQuestions: MockQuestion[]) => void;
  onSaveTestAttempt: (attempt: MockTestAttempt, logStudyMinutes?: boolean) => void;
}

export const MockTestView: React.FC<MockTestViewProps> = ({
  activeBranch,
  subjects,
  questions,
  testAttempts,
  preselectedSubjectId,
  preselectedTopicFilter,
  preselectedAiMode,
  isFocusMode = false,
  onAddCustomQuestions,
  onSaveTestAttempt,
}) => {
  const branchSubjects = subjects.filter((s) => s.branch === activeBranch);
  const branchQuestions = questions.filter((q) => q.branch === activeBranch);
  const branchAttempts = testAttempts.filter((a) => a.branch === activeBranch);
  const branchInfo = GATE_BRANCHES.find((b) => b.code === activeBranch) || GATE_BRANCHES[0];

  // Test Configurator State
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    preselectedSubjectId || 'ALL'
  );
  const [customTopicFocus, setCustomTopicFocus] = useState<string>(
    preselectedTopicFilter || ''
  );
  const [testMode, setTestMode] = useState<'ai' | 'pdf'>('ai');
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [difficulty, setDifficulty] = useState<string>('GATE Standard');
  const [isGeneratingAiTest, setIsGeneratingAiTest] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // PDF Mock Test Upload & Chapter-Wise Syllabus State
  const [uploadedPdfName, setUploadedPdfName] = useState<string>('');
  const [uploadedPdfSizeKb, setUploadedPdfSizeKb] = useState<number>(0);
  const [uploadedPdfBase64, setUploadedPdfBase64] = useState<string>('');
  const [selectedPdfChapter, setSelectedPdfChapter] = useState<string>('ALL');
  const [pdfExtractionMode, setPdfExtractionMode] = useState<
    'extract_and_adapt' | 'generate_from_notes'
  >('extract_and_adapt');
  const [isParsingPdf, setIsParsingPdf] = useState<boolean>(false);
  const [parsedPdfDeck, setParsedPdfDeck] = useState<{
    fileName: string;
    subjectId: string;
    subjectName: string;
    summary: string;
    questions: MockQuestion[];
  } | null>(null);

  // Active Exam Runner State
  const [activeExamQuestions, setActiveExamQuestions] = useState<MockQuestion[] | null>(null);
  const [activeExamTitle, setActiveExamTitle] = useState<string>('');
  const [activeExamSubjectId, setActiveExamSubjectId] = useState<string>('ALL');
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [draftAnswers, setDraftAnswers] = useState<Record<string, string[]>>({});
  const [markedForReview, setMarkedForReview] = useState<Record<string, boolean>>({});
  const [questionTimeSpent, setQuestionTimeSpent] = useState<Record<string, number>>({});
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [showCalculator, setShowCalculator] = useState<boolean>(false);
  const [calcExpr, setCalcExpr] = useState<string>('');
  const [calcResult, setCalcResult] = useState<string>('0');

  // Post-Test Review State
  const [reviewingAttempt, setReviewingAttempt] = useState<MockTestAttempt | null>(null);
  const [pdfReportDownloadedId, setPdfReportDownloadedId] = useState<string | null>(null);

  const handleDownloadPdfReport = (attempt: MockTestAttempt) => {
    generateMockTestPdfReport(attempt, branchInfo.name);
    setPdfReportDownloadedId(attempt.id);
    setTimeout(() => {
      setPdfReportDownloadedId((prev) => (prev === attempt.id ? null : prev));
    }, 2500);
  };

  useEffect(() => {
    if (preselectedSubjectId) setSelectedSubjectId(preselectedSubjectId);
    if (preselectedTopicFilter !== undefined) setCustomTopicFocus(preselectedTopicFilter);
    if (preselectedAiMode) setTestMode('ai');
  }, [preselectedSubjectId, preselectedTopicFilter, preselectedAiMode]);

  useEffect(() => {
    setSelectedSubjectId('ALL');
    setCustomTopicFocus('');
    setSelectedPdfChapter('ALL');
    setParsedPdfDeck(null);
  }, [activeBranch]);

  // Exam timer interval
  useEffect(() => {
    if (!activeExamQuestions) return;
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
      const currentQ = activeExamQuestions[currentIdx];
      if (currentQ) {
        setQuestionTimeSpent((prev) => ({
          ...prev,
          [currentQ.id]: (prev[currentQ.id] || 0) + 1,
        }));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [activeExamQuestions, currentIdx]);

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(remSecs).padStart(2, '0')}`;
  };

  const launchExamSession = (examQuestions: MockQuestion[], title: string, subjectId: string) => {
    setActiveExamQuestions(examQuestions);
    setActiveExamTitle(title);
    setActiveExamSubjectId(subjectId);
    setCurrentIdx(0);
    setDraftAnswers({});
    setMarkedForReview({});
    setQuestionTimeSpent({});
    setElapsedSeconds(0);
    setReviewingAttempt(null);
  };

  const handleStartCuratedTest = () => {
    setGenerationError(null);
    let pool =
      selectedSubjectId === 'ALL'
        ? branchQuestions
        : branchQuestions.filter((q) => q.subjectId === selectedSubjectId);

    if (pool.length === 0) {
      pool = branchQuestions;
    }

    const selected = pool.slice(0, Math.min(questionCount, pool.length));
    const subName =
      selectedSubjectId === 'ALL'
        ? `Full ${activeBranch} Core Diagnostic`
        : branchSubjects.find((s) => s.id === selectedSubjectId)?.name || activeBranch;

    launchExamSession(selected, `${subName} Mock Test`, selectedSubjectId);
  };

  const handleGenerateAndStartAiTest = async () => {
    setIsGeneratingAiTest(true);
    setGenerationError(null);

    try {
      const targetSub =
        selectedSubjectId === 'ALL'
          ? branchSubjects[0]
          : branchSubjects.find((s) => s.id === selectedSubjectId) || branchSubjects[0];

      const topicsList = customTopicFocus.trim()
        ? [customTopicFocus.trim()]
        : targetSub.topics.map((t) => t.name);

      const response = await fetch('/api/gemini/generate-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch: activeBranch,
          branchName: branchInfo.name,
          subjectName: targetSub.name,
          topics: topicsList,
          questionCount,
          difficulty,
        }),
      });

      const data = await response.json();
      if (!response.ok || !Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error(data.error || 'Failed to generate AI mock test questions.');
      }

      const generatedQuestions: MockQuestion[] = data.questions.map(
        (raw: {
          topicName: string;
          type: string;
          marks: number;
          questionText: string;
          options: string[];
          correctAnswer: string[];
          numericalMin: number;
          numericalMax: number;
          explanation: string;
        }, i: number) => {
          const qType =
            raw.type === 'MSQ' || raw.type === 'NAT' ? raw.type : 'MCQ';
          return {
            id: `ai-q-${Date.now()}-${i}`,
            branch: activeBranch,
            subjectId: targetSub.id,
            topicName: raw.topicName || targetSub.name,
            type: qType,
            marks: raw.marks === 1 ? 1 : 2,
            questionText: raw.questionText,
            options: Array.isArray(raw.options) ? raw.options : [],
            correctAnswer: Array.isArray(raw.correctAnswer)
              ? raw.correctAnswer.map(String)
              : [String(raw.correctAnswer)],
            numericalRange:
              qType === 'NAT'
                ? {
                    min: Number(raw.numericalMin) || 0,
                    max: Number(raw.numericalMax) || 0,
                  }
                : undefined,
            explanation: raw.explanation || 'Refer to standard GATE formula derivation.',
            isAiGenerated: true,
          };
        }
      );

      onAddCustomQuestions(generatedQuestions);
      launchExamSession(
        generatedQuestions,
        `AI Custom Mock: ${targetSub.name}${customTopicFocus ? ` (${customTopicFocus})` : ''}`,
        targetSub.id
      );
    } catch (err: unknown) {
      setGenerationError(
        err instanceof Error ? err.message : 'Error generating custom GATE questions.'
      );
    } finally {
      setIsGeneratingAiTest(false);
    }
  };

  const handlePdfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGenerationError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setGenerationError('Please upload a valid PDF file (.pdf).');
      return;
    }

    if (file.size > 18 * 1024 * 1024) {
      setGenerationError('PDF file is too large. Please upload a PDF under 18 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      setUploadedPdfName(file.name);
      setUploadedPdfSizeKb(Math.max(1, Math.round(file.size / 1024)));
      setUploadedPdfBase64(base64);
      setParsedPdfDeck(null);
    };
    reader.onerror = () => {
      setGenerationError('Could not read the selected PDF file.');
    };
    reader.readAsDataURL(file);
  };

  const handleParseUploadedPdf = async (autoLaunchAll = false) => {
    if (!uploadedPdfBase64) {
      setGenerationError('Please select a PDF file of mock tests or chapter notes first.');
      return;
    }

    setIsParsingPdf(true);
    setGenerationError(null);

    try {
      const targetSub =
        selectedSubjectId === 'ALL'
          ? branchSubjects[0]
          : branchSubjects.find((s) => s.id === selectedSubjectId) || branchSubjects[0];

      const chapterTopics = targetSub.topics.map((t) => t.name);

      const response = await fetch('/api/gemini/parse-pdf-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfBase64: uploadedPdfBase64,
          fileName: uploadedPdfName,
          branch: activeBranch,
          branchName: branchInfo.name,
          subjectName: targetSub.name,
          chapterTopics,
          selectedChapter: selectedPdfChapter,
          questionCount: Math.max(questionCount, 6),
          extractionMode: pdfExtractionMode,
        }),
      });

      const data = await response.json();
      if (!response.ok || !Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error(
          data.error || 'Could not extract or generate GATE questions from this PDF.'
        );
      }

      const extractedQuestions: MockQuestion[] = data.questions.map(
        (
          raw: {
            topicName: string;
            type: string;
            marks: number;
            questionText: string;
            options: string[];
            correctAnswer: string[];
            numericalMin: number;
            numericalMax: number;
            explanation: string;
          },
          i: number
        ) => {
          const qType =
            raw.type === 'MSQ' || raw.type === 'NAT' ? raw.type : 'MCQ';
          return {
            id: `pdf-q-${Date.now()}-${i}`,
            branch: activeBranch,
            subjectId: targetSub.id,
            topicName: raw.topicName || targetSub.topics[0]?.name || targetSub.name,
            type: qType,
            marks: raw.marks === 1 ? 1 : 2,
            questionText: raw.questionText,
            options: Array.isArray(raw.options) ? raw.options : [],
            correctAnswer: Array.isArray(raw.correctAnswer)
              ? raw.correctAnswer.map(String)
              : [String(raw.correctAnswer)],
            numericalRange:
              qType === 'NAT'
                ? {
                    min: Number(raw.numericalMin) || 0,
                    max: Number(raw.numericalMax) || 0,
                  }
                : undefined,
            explanation: raw.explanation || 'Step-by-step solution derived from uploaded PDF.',
            isAiGenerated: true,
          };
        }
      );

      onAddCustomQuestions(extractedQuestions);
      const deck = {
        fileName: uploadedPdfName,
        subjectId: targetSub.id,
        subjectName: targetSub.name,
        summary:
          data.pdfSummary ||
          `Extracted ${extractedQuestions.length} chapter-wise questions for ${targetSub.name}.`,
        questions: extractedQuestions,
      };
      setParsedPdfDeck(deck);

      if (autoLaunchAll) {
        launchExamSession(
          extractedQuestions,
          `PDF Chapter Mock: ${targetSub.name}${
            selectedPdfChapter !== 'ALL' ? ` — ${selectedPdfChapter}` : ''
          }`,
          targetSub.id
        );
      }
    } catch (err: unknown) {
      setGenerationError(
        err instanceof Error ? err.message : 'Failed to process uploaded PDF.'
      );
    } finally {
      setIsParsingPdf(false);
    }
  };

  const handleSelectOption = (question: MockQuestion, optionText: string) => {
    const current = draftAnswers[question.id] || [];
    if (question.type === 'MCQ') {
      setDraftAnswers({ ...draftAnswers, [question.id]: [optionText] });
    } else if (question.type === 'MSQ') {
      if (current.includes(optionText)) {
        setDraftAnswers({
          ...draftAnswers,
          [question.id]: current.filter((o) => o !== optionText),
        });
      } else {
        setDraftAnswers({
          ...draftAnswers,
          [question.id]: [...current, optionText],
        });
      }
    }
  };

  const handleNatInput = (question: MockQuestion, val: string) => {
    if (val.trim() === '') {
      const updated = { ...draftAnswers };
      delete updated[question.id];
      setDraftAnswers(updated);
    } else {
      setDraftAnswers({ ...draftAnswers, [question.id]: [val] });
    }
  };

  const evaluateQuestion = (
    q: MockQuestion,
    selected: string[]
  ): { isCorrect: boolean; marksAwarded: number; negativeMarksDeducted: number; status: 'correct' | 'incorrect' | 'unattempted' } => {
    if (!selected || selected.length === 0 || selected[0].trim() === '') {
      return {
        isCorrect: false,
        marksAwarded: 0,
        negativeMarksDeducted: 0,
        status: 'unattempted',
      };
    }

    let isCorrect = false;
    if (q.type === 'NAT') {
      const numVal = parseFloat(selected[0]);
      const exactNum = parseFloat(q.correctAnswer[0]);
      if (!Number.isNaN(numVal)) {
        if (q.numericalRange && (q.numericalRange.min !== 0 || q.numericalRange.max !== 0)) {
          isCorrect = numVal >= q.numericalRange.min && numVal <= q.numericalRange.max;
        } else if (!Number.isNaN(exactNum)) {
          isCorrect = Math.abs(numVal - exactNum) <= 0.05;
        }
      }
    } else if (q.type === 'MCQ') {
      isCorrect = selected[0] === q.correctAnswer[0];
    } else if (q.type === 'MSQ') {
      const normSelected = [...selected].sort();
      const normCorrect = [...q.correctAnswer].sort();
      isCorrect =
        normSelected.length === normCorrect.length &&
        normSelected.every((val, i) => val === normCorrect[i]);
    }

    if (isCorrect) {
      return {
        isCorrect: true,
        marksAwarded: q.marks,
        negativeMarksDeducted: 0,
        status: 'correct',
      };
    }

    // Wrong answer: Apply official GATE negative marking (only MCQ has negative marking: 1/3 for 1M, 2/3 for 2M)
    if (q.type === 'MCQ') {
      const penalty = q.marks === 1 ? 0.33 : 0.66;
      return {
        isCorrect: false,
        marksAwarded: -penalty,
        negativeMarksDeducted: penalty,
        status: 'incorrect',
      };
    }

    return {
      isCorrect: false,
      marksAwarded: 0,
      negativeMarksDeducted: 0,
      status: 'incorrect',
    };
  };

  const handleSubmitExam = () => {
    if (!activeExamQuestions) return;

    const responses: Record<string, QuestionResponseRecord> = {};
    let totalMarks = 0;
    let scoredMarks = 0;
    let negativeMarksLost = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    let unattemptedCount = 0;

    for (const q of activeExamQuestions) {
      totalMarks += q.marks;
      const sel = draftAnswers[q.id] || [];
      const evalRes = evaluateQuestion(q, sel);
      scoredMarks += evalRes.marksAwarded;
      negativeMarksLost += evalRes.negativeMarksDeducted;
      if (evalRes.status === 'correct') correctCount += 1;
      else if (evalRes.status === 'incorrect') incorrectCount += 1;
      else unattemptedCount += 1;

      responses[q.id] = {
        questionId: q.id,
        selectedAnswers: sel,
        markedForReview: Boolean(markedForReview[q.id]),
        timeSpentSeconds: questionTimeSpent[q.id] || 5,
        isCorrect: evalRes.isCorrect,
        marksAwarded: evalRes.marksAwarded,
        negativeMarksDeducted: evalRes.negativeMarksDeducted,
        status: evalRes.status,
      };
    }

    const attempt: MockTestAttempt = {
      id: `attempt-${Date.now()}`,
      timestamp: new Date().toISOString(),
      branch: activeBranch,
      subjectId: activeExamSubjectId,
      title: activeExamTitle,
      totalQuestions: activeExamQuestions.length,
      totalMarks,
      scoredMarks: Number(scoredMarks.toFixed(2)),
      negativeMarksLost: Number(negativeMarksLost.toFixed(2)),
      correctCount,
      incorrectCount,
      unattemptedCount,
      timeTakenSeconds: Math.max(elapsedSeconds, 10),
      questions: activeExamQuestions,
      responses,
    };

    onSaveTestAttempt(attempt, true);
    setActiveExamQuestions(null);
    setReviewingAttempt(attempt);
  };

  const handleRunScientificCalc = (op: string) => {
    try {
      const val = parseFloat(calcExpr || calcResult || '0');
      if (op === 'sqrt') setCalcResult(String(Number(Math.sqrt(val).toFixed(4))));
      else if (op === 'log2') setCalcResult(String(Number(Math.log2(val).toFixed(4))));
      else if (op === 'ln') setCalcResult(String(Number(Math.log(val).toFixed(4))));
      else if (op === 'sq') setCalcResult(String(Number((val * val).toFixed(4))));
      else if (op === 'inv') setCalcResult(String(Number((1 / val).toFixed(4))));
      else if (op === 'eval') {
        const sanitized = calcExpr.replace(/[^0-9+\-*/.()]/g, '');
        if (sanitized) {
          const evaluated = Function(`"use strict"; return (${sanitized})`)();
          setCalcResult(String(Number(Number(evaluated).toFixed(4))));
        }
      }
    } catch {
      setCalcResult('Error');
    }
  };

  // ==================== 1. ACTIVE GATE VIRTUAL EXAM RUNNER ====================
  if (activeExamQuestions && activeExamQuestions.length > 0) {
    const currentQ = activeExamQuestions[currentIdx];
    const currentSelection = draftAnswers[currentQ.id] || [];

    return (
      <div className="space-y-6">
        {/* Top Virtual Exam Header Bar */}
        <div className="bg-slate-900 text-white rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs text-slate-400 font-mono">
              {branchInfo.paperCode} Virtual Examination Terminal
            </div>
            <h1 className="text-base font-bold text-white mt-0.5">{activeExamTitle}</h1>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowCalculator(!showCalculator)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Calculator className="w-3.5 h-3.5" />
              GATE Virtual Calculator
            </button>

            <div className="px-3.5 py-1.5 bg-slate-800 rounded-lg flex items-center gap-2 font-mono tabular-nums text-sm">
              <Clock className="w-4 h-4 text-blue-400" />
              <span>{formatTimer(elapsedSeconds)}</span>
            </div>

            <button
              onClick={handleSubmitExam}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Submit Exam
            </button>
          </div>
        </div>

        {/* Optional GATE Scientific Calculator Strip */}
        {showCalculator && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <input
                type="text"
                value={calcExpr}
                onChange={(e) => setCalcExpr(e.target.value)}
                placeholder="Type arithmetic expression (e.g. 0.85*100 + 0.15*190) or number"
                className="flex-1 px-3 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg"
              />
              <button
                onClick={() => handleRunScientificCalc('eval')}
                className="px-3 py-1.5 bg-blue-600 text-white text-xs font-mono rounded-lg cursor-pointer"
              >
                =
              </button>
              <div className="px-3 py-1.5 bg-slate-900 text-emerald-400 font-mono text-xs rounded-lg min-w-[90px] text-right">
                {calcResult}
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <button
                onClick={() => handleRunScientificCalc('log2')}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
              >
                log₂(x)
              </button>
              <button
                onClick={() => handleRunScientificCalc('ln')}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
              >
                ln(x)
              </button>
              <button
                onClick={() => handleRunScientificCalc('sqrt')}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
              >
                √x
              </button>
              <button
                onClick={() => handleRunScientificCalc('sq')}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
              >
                x²
              </button>
              <button
                onClick={() => handleRunScientificCalc('inv')}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
              >
                1/x
              </button>
            </div>
          </div>
        )}

        {/* Exam 2-Column Split: Question Canvas (Left 8 cols) + Question Palette (Right 4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Question Canvas */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-100 text-xs">
              <div className="flex items-center gap-2 text-slate-600">
                <span className="font-mono font-bold text-slate-900">
                  Question {currentIdx + 1} of {activeExamQuestions.length}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-medium text-blue-700">{currentQ.type}</span>
                <span aria-hidden="true">·</span>
                <span>{currentQ.topicName}</span>
              </div>

              <div className="flex items-center gap-2 font-mono tabular-nums">
                <span className="text-emerald-700 font-semibold">+{currentQ.marks} Marks</span>
                <span aria-hidden="true">·</span>
                <span className="text-red-600">
                  {currentQ.type === 'MCQ'
                    ? `-${currentQ.marks === 1 ? '0.33' : '0.66'} Neg. Marking`
                    : '0 Neg. Marking'}
                </span>
              </div>
            </div>

            <div className="text-base text-slate-900 leading-relaxed font-normal whitespace-pre-line">
              {currentQ.questionText}
            </div>

            {/* Answer Input Area by Question Type */}
            {currentQ.type === 'NAT' ? (
              <div className="space-y-4 pt-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Numerical Answer Type (NAT) — Enter exact value or decimal:
                </label>
                <input
                  type="text"
                  value={currentSelection[0] || ''}
                  onChange={(e) => handleNatInput(currentQ, e.target.value)}
                  placeholder="Enter numerical answer (e.g. 113.5)"
                  className="w-full max-w-xs px-4 py-2.5 text-base font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                />
                {/* Virtual Numeric Keypad */}
                <div className="flex flex-wrap gap-1.5 max-w-xs">
                  {['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.', '-'].map((digit) => (
                    <button
                      key={digit}
                      type="button"
                      onClick={() =>
                        handleNatInput(currentQ, `${currentSelection[0] || ''}${digit}`)
                      }
                      className="w-10 h-9 bg-slate-100 hover:bg-slate-200 text-slate-900 font-mono text-sm font-medium rounded-md transition-colors cursor-pointer"
                    >
                      {digit}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      handleNatInput(
                        currentQ,
                        (currentSelection[0] || '').slice(0, -1)
                      )
                    }
                    className="px-3 h-9 bg-slate-200 hover:bg-slate-300 text-slate-800 font-mono text-xs rounded-md cursor-pointer"
                  >
                    Backspace
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <div className="text-xs text-slate-500">
                  {currentQ.type === 'MSQ'
                    ? 'Multiple Select Question (MSQ): Select ONE OR MORE correct options.'
                    : 'Multiple Choice Question (MCQ): Select EXACTLY ONE option.'}
                </div>
                {currentQ.options.map((option, idx) => {
                  const isSelected = currentSelection.includes(option);
                  const optionLetter = String.fromCharCode(65 + idx);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectOption(currentQ, option)}
                      className={`w-full text-left p-4 rounded-xl border transition-colors flex items-start gap-3 cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50/80 border-blue-600 text-slate-900'
                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    >
                      <span
                        className={`w-6 h-6 rounded-md font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {optionLetter}
                      </span>
                      <span className="text-sm leading-relaxed">{option}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Bottom Exam Navigation Controls */}
            <div className="pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setMarkedForReview({
                      ...markedForReview,
                      [currentQ.id]: !markedForReview[currentQ.id],
                    })
                  }
                  className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 cursor-pointer ${
                    markedForReview[currentQ.id]
                      ? 'bg-amber-50 border-amber-300 text-amber-800'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Flag className="w-3.5 h-3.5" />
                  {markedForReview[currentQ.id] ? 'Marked for Review' : 'Mark for Review'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const updated = { ...draftAnswers };
                    delete updated[currentQ.id];
                    setDraftAnswers(updated);
                  }}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Clear Response
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentIdx === 0}
                  onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                  className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>

                {currentIdx < activeExamQuestions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentIdx((i) => Math.min(activeExamQuestions.length - 1, i + 1))
                    }
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    Save &amp; Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmitExam}
                    className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer"
                  >
                    Finish &amp; Submit Test
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Question Palette Sidebar */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 space-y-5">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Question Palette</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Jump directly to any question in this test
              </p>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {activeExamQuestions.map((q, idx) => {
                const isAnswered =
                  draftAnswers[q.id] &&
                  draftAnswers[q.id].length > 0 &&
                  draftAnswers[q.id][0].trim() !== '';
                const isReview = markedForReview[q.id];
                const isCurrent = idx === currentIdx;

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentIdx(idx)}
                    className={`h-10 rounded-lg font-mono text-xs font-bold border transition-all cursor-pointer ${
                      isCurrent ? 'ring-2 ring-blue-600 ring-offset-1 ' : ''
                    }${
                      isReview
                        ? 'bg-amber-100 border-amber-400 text-amber-900'
                        : isAnswered
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600 font-mono">
              <div className="flex items-center justify-between">
                <span>Answered</span>
                <span className="font-bold text-emerald-600">
                  {
                    activeExamQuestions.filter(
                      (q) => draftAnswers[q.id] && draftAnswers[q.id][0]?.trim()
                    ).length
                  }
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Marked for Review</span>
                <span className="font-bold text-amber-600">
                  {activeExamQuestions.filter((q) => markedForReview[q.id]).length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Unattempted</span>
                <span className="font-bold text-slate-700">
                  {
                    activeExamQuestions.filter(
                      (q) => !draftAnswers[q.id] || !draftAnswers[q.id][0]?.trim()
                    ).length
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== 2. CONFIGURATOR + SOLUTION REVIEW + HISTORY ====================
  return (
    <div className="space-y-8">
      {/* Post-Test Detailed Review Banner (if an attempt is selected or just finished) */}
      {reviewingAttempt && (() => {
        const unattemptedCount = Math.max(
          0,
          reviewingAttempt.totalQuestions -
            reviewingAttempt.correctCount -
            reviewingAttempt.incorrectCount
        );
        const attemptedTotal =
          reviewingAttempt.correctCount + reviewingAttempt.incorrectCount;
        const accuracyPct =
          attemptedTotal > 0
            ? Math.round((reviewingAttempt.correctCount / attemptedTotal) * 100)
            : 0;
        const netScorePct =
          reviewingAttempt.totalMarks > 0
            ? Math.max(
                0,
                Math.round(
                  (reviewingAttempt.scoredMarks / reviewingAttempt.totalMarks) * 100
                )
              )
            : 0;

        let slowestQuestionIndex = 0;
        let slowestQuestionSecs = 0;
        let sumQuestionSecs = 0;
        reviewingAttempt.questions.forEach((q, idx) => {
          const secs = reviewingAttempt.responses[q.id]?.timeSpentSeconds || 0;
          sumQuestionSecs += secs;
          if (secs >= slowestQuestionSecs) {
            slowestQuestionSecs = secs;
            slowestQuestionIndex = idx + 1;
          }
        });
        const totalDurationSecs = Math.max(
          reviewingAttempt.timeTakenSeconds || 0,
          sumQuestionSecs
        );
        const avgTimePerQuestionSecs =
          reviewingAttempt.totalQuestions > 0
            ? Math.round(totalDurationSecs / reviewingAttempt.totalQuestions)
            : 0;

        return (
          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="text-xs text-blue-600 font-semibold">
                  Mock Test Completion &amp; Performance Report
                </div>
                <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                  {reviewingAttempt.title}
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="text-right font-mono tabular-nums mr-1">
                  <div className="text-xl font-bold text-slate-900">
                    {reviewingAttempt.scoredMarks} / {reviewingAttempt.totalMarks} Marks
                  </div>
                  <div className="text-xs text-red-600">
                    Neg. Marks Deducted: -{reviewingAttempt.negativeMarksLost}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDownloadPdfReport(reviewingAttempt)}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  {pdfReportDownloadedId === reviewingAttempt.id ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Downloaded PDF Report
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      Download PDF Report
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setReviewingAttempt(null)}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Close Review
                </button>
              </div>
            </div>

            {/* 4-Column Performance Summary Strip (Score, Correct/Incorrect, Time/Question, Negative Marking) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="text-[11px] font-medium text-slate-500">
                  Net Score &amp; Percentage
                </div>
                <div className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                  {reviewingAttempt.scoredMarks} / {reviewingAttempt.totalMarks}M ({netScorePct}%)
                </div>
                <div className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">
                  {reviewingAttempt.attemptedCount} of {reviewingAttempt.totalQuestions} Attempted
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="text-[11px] font-medium text-slate-500">
                  Correct / Incorrect Analysis
                </div>
                <div className="text-lg font-bold font-mono tabular-nums text-emerald-600 mt-0.5">
                  {reviewingAttempt.correctCount}C · {reviewingAttempt.incorrectCount}W ·{' '}
                  {unattemptedCount}U
                </div>
                <div className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">
                  {accuracyPct}% Attempt Accuracy
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="text-[11px] font-medium text-slate-500">
                  Time Per Question Analysis
                </div>
                <div className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                  {avgTimePerQuestionSecs}s / Question
                </div>
                <div className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">
                  Total {formatTimer(totalDurationSecs)} · Slowest Q{slowestQuestionIndex} (
                  {slowestQuestionSecs}s)
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="text-[11px] font-medium text-slate-500">
                  Negative Marking Audit
                </div>
                <div className="text-lg font-bold font-mono tabular-nums text-red-600 mt-0.5">
                  -{reviewingAttempt.negativeMarksLost} Marks
                </div>
                <div className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">
                  From {reviewingAttempt.incorrectCount} Wrong Responses
                </div>
              </div>
            </div>

            <div className="space-y-4">
            {reviewingAttempt.questions.map((q, i) => {
              const resp = reviewingAttempt.responses[q.id];
              const status = resp?.status || 'unattempted';
              return (
                <div
                  key={q.id}
                  className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900">Q{i + 1}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-medium text-slate-700">{q.topicName}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{q.type} ({q.marks}M)</span>
                    </div>

                    <div className="flex items-center gap-2 font-mono">
                      {status === 'correct' && (
                        <span className="text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Correct (+{resp.marksAwarded}M)
                        </span>
                      )}
                      {status === 'incorrect' && (
                        <span className="text-red-600 font-semibold flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" />
                          Incorrect ({resp.marksAwarded}M)
                        </span>
                      )}
                      {status === 'unattempted' && (
                        <span className="text-slate-500 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Unattempted (0M)
                        </span>
                      )}
                      <span aria-hidden="true">·</span>
                      <span className="text-slate-500">{resp?.timeSpentSeconds || 0}s</span>
                    </div>
                  </div>

                  <p className="text-sm text-slate-900 leading-relaxed">{q.questionText}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                    <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                      <span className="text-slate-500 block">Your Answer:</span>
                      <span className="font-mono font-semibold text-slate-900">
                        {resp?.selectedAnswers?.length
                          ? resp.selectedAnswers.join(', ')
                          : 'Not Attempted'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-200">
                      <span className="text-emerald-700 block">Official GATE Answer:</span>
                      <span className="font-mono font-semibold text-emerald-900">
                        {q.correctAnswer.join(', ')}
                        {q.type === 'NAT' && q.numericalRange
                          ? ` (Range: ${q.numericalRange.min} to ${q.numericalRange.max})`
                          : ''}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 leading-relaxed">
                    <span className="font-semibold text-slate-900 block mb-1">
                      Step-by-Step Solution Explanation:
                    </span>
                    {q.explanation}
                  </div>
                </div>
              );
            })}
            </div>
          </section>
        );
      })()}

      {/* Main 2-Column Split: Launch Subject-Wise Mock Test (Left) + Past Mock Test History (Right, hidden in Focus Mode) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Mock Test Configurator */}
        <div
          className={`${
            isFocusMode ? 'lg:col-span-12 max-w-3xl mx-auto w-full' : 'lg:col-span-6'
          } bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between space-y-6`}
        >
          <div className="space-y-4">
            <div className="pb-4 border-b border-slate-100">
              <h1 className="text-lg font-bold text-slate-900">
                Subject-Wise GATE Mock Test Arena
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Generate fresh AI mock tests on any syllabus topic or upload a PDF mock test paper for chapter-wise testing
              </p>
            </div>

            {/* Segmented Mode Toggle (2 Modes: AI Mock Generator & Upload PDF Chapter Test) */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setTestMode('ai');
                  setGenerationError(null);
                }}
                className={`py-2 px-3 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  testMode === 'ai'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="truncate">AI Custom Mock Generator</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTestMode('pdf');
                  setGenerationError(null);
                  if (selectedSubjectId === 'ALL' && branchSubjects[0]) {
                    setSelectedSubjectId(branchSubjects[0].id);
                  }
                }}
                className={`py-2 px-3 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  testMode === 'pdf'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="truncate">Upload PDF Mock</span>
              </button>
            </div>

            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Target Subject ({activeBranch})
                </label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => {
                    setSelectedSubjectId(e.target.value);
                    setSelectedPdfChapter('ALL');
                  }}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                >
                  {testMode !== 'pdf' && (
                    <option value="ALL">All {activeBranch} Core Subjects (Mixed Diagnostic)</option>
                  )}
                  {branchSubjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} ({sub.weightageMarks} Marks Weightage)
                    </option>
                  ))}
                </select>
              </div>

              {testMode === 'ai' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Specific Weak Topic Focus (Optional)
                    </label>
                    <input
                      type="text"
                      value={customTopicFocus}
                      onChange={(e) => setCustomTopicFocus(e.target.value)}
                      placeholder="e.g., Virtual Memory & TLB Hit Ratio, Eigenvalues, Carnot Cycle"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Number of Questions
                      </label>
                      <select
                        value={questionCount}
                        onChange={(e) => setQuestionCount(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg"
                      >
                        <option value={3}>3 Questions (Quick Drill)</option>
                        <option value={5}>5 Questions (Standard Set)</option>
                        <option value={8}>8 Questions (Extended Set)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Difficulty Level
                      </label>
                      <select
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                      >
                        <option value="GATE Standard">GATE Standard (1M &amp; 2M Mix)</option>
                        <option value="Hard IIT Level">Hard IIT Rank-Decider (2M Heavy)</option>
                        <option value="Conceptual Foundation">Conceptual &amp; Formula Recall</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {testMode === 'pdf' && (
                <div className="space-y-4">
                  {/* PDF Upload Dropzone */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Upload Mock Test Paper or Chapter Notes PDF
                    </label>
                    {!uploadedPdfName ? (
                      <label className="flex flex-col items-center justify-center gap-2 p-5 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl bg-slate-50/70 hover:bg-blue-50/30 transition-colors cursor-pointer text-center">
                        <Upload className="w-5 h-5 text-blue-600" />
                        <div className="text-xs font-semibold text-slate-800">
                          Click to upload a GATE Mock Test PDF or Chapter Notes
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Automatically classifies questions across your chapter-wise GATE syllabus (Max 18 MB)
                        </div>
                        <input
                          type="file"
                          accept="application/pdf,.pdf"
                          onChange={handlePdfFileChange}
                          className="hidden"
                        />
                      </label>
                    ) : (
                      <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-blue-50/60 border border-blue-200">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-slate-900 truncate">
                              {uploadedPdfName}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500">
                              {uploadedPdfSizeKb} KB · Ready for chapter-wise syllabus mapping
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setUploadedPdfName('');
                            setUploadedPdfBase64('');
                            setUploadedPdfSizeKb(0);
                            setParsedPdfDeck(null);
                          }}
                          className="p-1.5 text-slate-500 hover:text-red-600 rounded-lg transition-colors cursor-pointer shrink-0"
                          title="Remove PDF"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Chapter-Wise Syllabus Selector */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Chapter-Wise Syllabus Filter
                    </label>
                    <select
                      value={selectedPdfChapter}
                      onChange={(e) => setSelectedPdfChapter(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                    >
                      <option value="ALL">
                        All Syllabus Chapters (Auto-Group PDF Questions Chapter-Wise)
                      </option>
                      {(
                        branchSubjects.find((s) => s.id === selectedSubjectId) ||
                        branchSubjects[0]
                      )?.topics.map((topic) => (
                        <option key={topic.id} value={topic.name}>
                          Chapter: {topic.name} ({topic.targetHours}h Weightage)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* PDF Processing Mode + Question Count */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        PDF Test Mode
                      </label>
                      <select
                        value={pdfExtractionMode}
                        onChange={(e) =>
                          setPdfExtractionMode(
                            e.target.value as 'extract_and_adapt' | 'generate_from_notes'
                          )
                        }
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                      >
                        <option value="extract_and_adapt">
                          Extract &amp; Solve Mock Questions from PDF
                        </option>
                        <option value="generate_from_notes">
                          Generate Chapter Test from PDF Notes
                        </option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Target Questions
                      </label>
                      <select
                        value={questionCount}
                        onChange={(e) => setQuestionCount(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg"
                      >
                        <option value={5}>5 Questions</option>
                        <option value={8}>8 Questions</option>
                        <option value={10}>10 Questions</option>
                      </select>
                    </div>
                  </div>

                  {/* Parsed Chapter-Wise Syllabus Breakdown & Chapter Test Launcher */}
                  {parsedPdfDeck && (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                            Chapter-Wise Syllabus Breakdown ({parsedPdfDeck.questions.length} Qs)
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                            {parsedPdfDeck.summary}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            launchExamSession(
                              parsedPdfDeck.questions,
                              `PDF Mock (${parsedPdfDeck.subjectName}): ${parsedPdfDeck.fileName}`,
                              parsedPdfDeck.subjectId
                            )
                          }
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          Start Full PDF Test ({parsedPdfDeck.questions.length} Qs)
                        </button>
                      </div>

                      {/* Group by chapter topicName so student can take individual chapter tests */}
                      <div className="divide-y divide-slate-200/70 pt-2 border-t border-slate-200/80">
                        {Array.from(
                          parsedPdfDeck.questions.reduce((acc, q) => {
                            const list = acc.get(q.topicName) || [];
                            list.push(q);
                            acc.set(q.topicName, list);
                            return acc;
                          }, new Map<string, MockQuestion[]>())
                        ).map(([chapterName, chapterQs]) => (
                          <div
                            key={chapterName}
                            className="py-2 flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="min-w-0">
                              <span className="font-semibold text-slate-900">
                                {chapterName}
                              </span>
                              <span className="ml-2 font-mono text-slate-500">
                                ({chapterQs.length}{' '}
                                {chapterQs.length === 1 ? 'Question' : 'Questions'})
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                launchExamSession(
                                  chapterQs,
                                  `Chapter Mock: ${chapterName} (${parsedPdfDeck.fileName})`,
                                  parsedPdfDeck.subjectId
                                )
                              }
                              className="px-2.5 py-1 text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              Take Chapter Test
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-1">
                <div className="font-semibold text-slate-900">
                  Official GATE Marking Rules Applied:
                </div>
                <div>· 1-Mark MCQ: +1 for correct, -0.33 for wrong</div>
                <div>· 2-Mark MCQ: +2 for correct, -0.66 for wrong</div>
                <div>· MSQ &amp; NAT (Numerical Answer Type): +1 or +2 for correct, 0 negative marking</div>
              </div>

              {generationError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                  {generationError}
                </div>
              )}
            </div>
          </div>

          <div>
            {testMode === 'ai' && (
              <button
                type="button"
                disabled={isGeneratingAiTest}
                onClick={handleGenerateAndStartAiTest}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Cpu className={`w-4 h-4 ${isGeneratingAiTest ? 'animate-spin' : ''}`} />
                {isGeneratingAiTest
                  ? 'Generating Rigorous GATE Questions...'
                  : 'Generate & Launch AI Mock Test'}
              </button>
            )}

            {testMode === 'pdf' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={isParsingPdf || !uploadedPdfBase64}
                  onClick={() => handleParseUploadedPdf(false)}
                  className="w-full py-2.5 px-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <BookOpen className={`w-4 h-4 ${isParsingPdf ? 'animate-spin' : ''}`} />
                  {isParsingPdf
                    ? 'Mapping PDF to Chapters...'
                    : 'Analyze Chapter-Wise Breakdown'}
                </button>
                <button
                  type="button"
                  disabled={isParsingPdf || !uploadedPdfBase64}
                  onClick={() => handleParseUploadedPdf(true)}
                  className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-4 h-4" />
                  {isParsingPdf ? 'Preparing Exam...' : 'Parse PDF & Start Test Now'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Test Attempt History & Performance Log (Hidden in Focus Mode) */}
        {!isFocusMode && (
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Completed Mock Tests ({activeBranch})
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Click any past test to inspect step-by-step solutions and negative marking audit
                  </p>
                </div>
                <span className="text-xs font-mono tabular-nums text-slate-500">
                  {branchAttempts.length} Attempts
                </span>
              </div>

              {branchAttempts.length === 0 ? (
                <div className="py-16 text-center space-y-2">
                  <RotateCcw className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-sm font-medium text-slate-900">No mock tests completed yet</p>
                  <p className="text-xs text-slate-500">
                    Launch a curated or AI-generated subject mock test on the left to benchmark your accuracy.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto pr-1">
                  {branchAttempts.map((attempt) => {
                    const pct =
                      attempt.totalMarks > 0
                        ? Math.max(0, Math.round((attempt.scoredMarks / attempt.totalMarks) * 100))
                        : 0;
                    return (
                      <div
                        key={attempt.id}
                        className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span className="font-mono">
                              {new Date(attempt.timestamp).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">
                              {attempt.correctCount} Correct / {attempt.incorrectCount} Wrong
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono text-red-600">
                              -{attempt.negativeMarksLost} Neg.
                            </span>
                          </div>
                          <h3 className="text-sm font-semibold text-slate-900">{attempt.title}</h3>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right font-mono tabular-nums mr-1">
                            <div className="text-sm font-bold text-slate-900">
                              {attempt.scoredMarks} / {attempt.totalMarks}M
                            </div>
                            <div className="text-[11px] text-slate-500">{pct}% Net Score</div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDownloadPdfReport(attempt)}
                            title="Download PDF Summary Report"
                            className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            {pdfReportDownloadedId === attempt.id ? 'Saved' : 'PDF'}
                          </button>

                          <button
                            type="button"
                            onClick={() => setReviewingAttempt(attempt)}
                            className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                          >
                            Solution Review
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
