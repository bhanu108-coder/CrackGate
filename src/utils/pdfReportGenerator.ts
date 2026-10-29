import { jsPDF } from 'jspdf';
import { MockTestAttempt } from '../types/gate';

function sanitizePdfText(input: string): string {
  return (input || '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[—–]/g, '-')
    .replace(/·/g, '|')
    .replace(/×/g, 'x')
    .replace(/÷/g, '/')
    .replace(/≤/g, '<=')
    .replace(/≥/g, '>=')
    .replace(/≠/g, '!=')
    .replace(/≈/g, '~=')
    .replace(/→/g, '->')
    .replace(/←/g, '<-')
    .replace(/λ/g, 'lambda')
    .replace(/μ/g, 'mu')
    .replace(/σ/g, 'sigma')
    .replace(/π/g, 'pi')
    .replace(/[^\x20-\x7E\n]/g, '');
}

function formatDurationMinSec(seconds: number): string {
  const safeSecs = Math.max(0, Math.round(seconds || 0));
  const mins = Math.floor(safeSecs / 60);
  const remSecs = safeSecs % 60;
  if (mins === 0) return `${remSecs}s`;
  return `${mins}m ${remSecs}s`;
}

export function generateMockTestPdfReport(
  attempt: MockTestAttempt,
  branchFullName?: string
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2; // 182mm
  let cursorY = 14;

  const ensureSpace = (neededHeightMm: number) => {
    if (cursorY + neededHeightMm > pageHeight - 16) {
      doc.addPage();
      cursorY = 16;
    }
  };

  const unattemptedCount = Math.max(
    0,
    attempt.totalQuestions - attempt.correctCount - attempt.incorrectCount
  );
  const netScorePct =
    attempt.totalMarks > 0
      ? Math.max(0, Math.round((attempt.scoredMarks / attempt.totalMarks) * 100))
      : 0;
  const attemptedTotal = attempt.correctCount + attempt.incorrectCount;
  const accuracyPct =
    attemptedTotal > 0
      ? Math.round((attempt.correctCount / attemptedTotal) * 100)
      : 0;

  const totalQuestionTime = attempt.questions.reduce((acc, q) => {
    return acc + (attempt.responses[q.id]?.timeSpentSeconds || 0);
  }, 0);
  const effectiveTotalSeconds = Math.max(attempt.timeTakenSeconds || 0, totalQuestionTime);
  const avgTimePerQuestion =
    attempt.totalQuestions > 0
      ? Math.round(effectiveTotalSeconds / attempt.totalQuestions)
      : 0;

  // ==================== 1. HEADER BANNER ====================
  doc.setFillColor(15, 23, 42); // #0F172A Slate 900
  doc.roundedRect(marginX, cursorY, contentWidth, 26, 2.5, 2.5, 'F');

  doc.setTextColor(148, 163, 184); // Slate 400
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(
    sanitizePdfText(
      `CRACKGATE // OFFICIAL MOCK TEST PERFORMANCE REPORT — GATE ${attempt.branch}${
        branchFullName ? ` (${branchFullName})` : ''
      }`
    ),
    marginX + 5,
    cursorY + 7
  );

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  const cleanTitle = sanitizePdfText(attempt.title || `GATE ${attempt.branch} Mock Test`);
  doc.text(cleanTitle.slice(0, 75), marginX + 5, cursorY + 15);

  doc.setTextColor(203, 213, 225); // Slate 300
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const formattedDate = new Date(attempt.timestamp).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.text(
    sanitizePdfText(
      `Completed: ${formattedDate}   |   Total Questions: ${attempt.totalQuestions}   |   Total Duration: ${formatDurationMinSec(
        effectiveTotalSeconds
      )}`
    ),
    marginX + 5,
    cursorY + 22
  );

  cursorY += 31;

  // ==================== 2. 4-COLUMN KPI SCORECARD ====================
  const cardGap = 3.5;
  const cardWidth = (contentWidth - cardGap * 3) / 4;
  const cardHeight = 22;

  const kpiCards = [
    {
      label: 'NET GATE SCORE',
      primary: `${attempt.scoredMarks} / ${attempt.totalMarks} M`,
      sub: `${netScorePct}% Net Marks`,
      accentColor: [37, 99, 235] as [number, number, number], // Blue 600
    },
    {
      label: 'CORRECT / WRONG / SKIP',
      primary: `${attempt.correctCount}C / ${attempt.incorrectCount}W / ${unattemptedCount}U`,
      sub: `${accuracyPct}% Attempt Accuracy`,
      accentColor: [22, 163, 74] as [number, number, number], // Emerald 600
    },
    {
      label: 'NEGATIVE MARKS LOST',
      primary: `-${attempt.negativeMarksLost} M`,
      sub: `${attempt.incorrectCount} Wrong Attempts`,
      accentColor: [220, 38, 38] as [number, number, number], // Red 600
    },
    {
      label: 'TIME PER QUESTION',
      primary: `${avgTimePerQuestion}s / Q`,
      sub: `Total: ${formatDurationMinSec(effectiveTotalSeconds)}`,
      accentColor: [15, 23, 42] as [number, number, number], // Slate 900
    },
  ];

  kpiCards.forEach((card, idx) => {
    const x = marginX + idx * (cardWidth + cardGap);
    doc.setFillColor(248, 250, 252); // #F8FAFC
    doc.setDrawColor(226, 232, 240); // #E2E8F0
    doc.roundedRect(x, cursorY, cardWidth, cardHeight, 2, 2, 'FD');

    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(card.label, x + 3.5, cursorY + 5.5);

    doc.setTextColor(...card.accentColor);
    doc.setFont('courier', 'bold');
    doc.setFontSize(11);
    doc.text(card.primary, x + 3.5, cursorY + 13);

    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(card.sub, x + 3.5, cursorY + 18.5);
  });

  cursorY += cardHeight + 7;

  // ==================== 3. CHAPTER / TOPIC-WISE ACCURACY & TIME ANALYSIS ====================
  const chapterMap = new Map<
    string,
    {
      total: number;
      correct: number;
      incorrect: number;
      unattempted: number;
      scoredMarks: number;
      maxMarks: number;
      totalTimeSecs: number;
    }
  >();

  attempt.questions.forEach((q) => {
    const topic = sanitizePdfText(q.topicName || 'Core Syllabus');
    const resp = attempt.responses[q.id];
    const status = resp?.status || 'unattempted';
    const current = chapterMap.get(topic) || {
      total: 0,
      correct: 0,
      incorrect: 0,
      unattempted: 0,
      scoredMarks: 0,
      maxMarks: 0,
      totalTimeSecs: 0,
    };

    current.total += 1;
    current.maxMarks += q.marks;
    current.scoredMarks = Number((current.scoredMarks + (resp?.marksAwarded || 0)).toFixed(2));
    current.totalTimeSecs += resp?.timeSpentSeconds || 0;
    if (status === 'correct') current.correct += 1;
    else if (status === 'incorrect') current.incorrect += 1;
    else current.unattempted += 1;

    chapterMap.set(topic, current);
  });

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('1. Chapter-Wise Syllabus Accuracy & Time Breakdown', marginX, cursorY);
  cursorY += 3.5;

  // Table Header
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.rect(marginX, cursorY, contentWidth, 7, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text('Chapter / Syllabus Topic', marginX + 3, cursorY + 4.8);
  doc.text('Qs', marginX + 96, cursorY + 4.8);
  doc.text('Correct / Wrong / Skip', marginX + 108, cursorY + 4.8);
  doc.text('Net Marks', marginX + 145, cursorY + 4.8);
  doc.text('Avg Time/Q', marginX + 165, cursorY + 4.8);
  cursorY += 7;

  Array.from(chapterMap.entries()).forEach(([topic, stats], rowIdx) => {
    ensureSpace(8);
    if (rowIdx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(marginX, cursorY, contentWidth, 6.8, 'F');
    }
    doc.setDrawColor(226, 232, 240);
    doc.line(marginX, cursorY + 6.8, marginX + contentWidth, cursorY + 6.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(topic.slice(0, 48), marginX + 3, cursorY + 4.7);

    doc.setFont('courier', 'normal');
    doc.text(String(stats.total), marginX + 96, cursorY + 4.7);
    doc.text(
      `${stats.correct}C / ${stats.incorrect}W / ${stats.unattempted}U`,
      marginX + 108,
      cursorY + 4.7
    );
    doc.text(`${stats.scoredMarks}/${stats.maxMarks}M`, marginX + 145, cursorY + 4.7);
    const avgSecs = stats.total > 0 ? Math.round(stats.totalTimeSecs / stats.total) : 0;
    doc.text(`${avgSecs}s`, marginX + 165, cursorY + 4.7);

    cursorY += 6.8;
  });

  cursorY += 7;

  // ==================== 4. QUESTION-BY-QUESTION TIMING & SOLUTION AUDIT ====================
  ensureSpace(15);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(
    '2. Question-by-Question Performance, Time Spent & Solution Key',
    marginX,
    cursorY
  );
  cursorY += 4.5;

  attempt.questions.forEach((q, idx) => {
    const resp = attempt.responses[q.id];
    const status = resp?.status || 'unattempted';
    const timeSpent = resp?.timeSpentSeconds || 0;
    const marksAwarded = resp?.marksAwarded ?? 0;

    const qStatement = sanitizePdfText(q.questionText);
    const qLines = doc.splitTextToSize(qStatement, contentWidth - 8);

    const userAnsText = sanitizePdfText(
      resp?.selectedAnswers?.length ? resp.selectedAnswers.join(', ') : 'Not Attempted'
    );
    const officialAnsText = sanitizePdfText(
      `${q.correctAnswer.join(', ')}${
        q.type === 'NAT' && q.numericalRange
          ? ` (Acceptable Range: ${q.numericalRange.min} to ${q.numericalRange.max})`
          : ''
      }`
    );

    const explanationClean = sanitizePdfText(
      q.explanation || 'Refer to standard GATE formula derivation.'
    );
    const expLines = doc.splitTextToSize(
      `Solution: ${explanationClean}`,
      contentWidth - 8
    );

    const boxHeight = 16 + qLines.length * 4 + expLines.length * 3.8;
    ensureSpace(boxHeight + 4);

    // Question Container Box
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(marginX, cursorY, contentWidth, boxHeight, 1.8, 1.8, 'FD');

    // Question Top Metadata Strip
    doc.setFillColor(248, 250, 252);
    doc.rect(marginX + 0.3, cursorY + 0.3, contentWidth - 0.6, 6.8, 'F');

    doc.setFont('courier', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(
      sanitizePdfText(`Q${idx + 1} [${q.type} | ${q.marks}M] - ${q.topicName.slice(0, 38)}`),
      marginX + 3.5,
      cursorY + 4.8
    );

    // Right-aligned Status, Marks Awarded & Time Spent
    const statusLabel =
      status === 'correct'
        ? `CORRECT (+${marksAwarded}M)`
        : status === 'incorrect'
        ? `INCORRECT (${marksAwarded}M)`
        : 'UNATTEMPTED (0M)';

    if (status === 'correct') {
      doc.setTextColor(22, 163, 74); // Emerald
    } else if (status === 'incorrect') {
      doc.setTextColor(220, 38, 38); // Red
    } else {
      doc.setTextColor(100, 116, 139); // Slate
    }

    const paceNote =
      timeSpent > 90
        ? ' [Slow Pace]'
        : status === 'incorrect' && timeSpent > 0 && timeSpent < 15
        ? ' [Rushed Error]'
        : '';

    const rightMeta = `${statusLabel}  |  Time: ${timeSpent}s${paceNote}`;
    doc.text(rightMeta, marginX + contentWidth - 3.5, cursorY + 4.8, { align: 'right' });

    let innerY = cursorY + 11;

    // Question Text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(qLines, marginX + 4, innerY);
    innerY += qLines.length * 4 + 1.5;

    // Your Answer vs Official Answer Line
    doc.setFont('courier', 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(51, 65, 85);
    doc.text(
      `Your Answer: ${userAnsText.slice(0, 48)}   |   Official Answer: ${officialAnsText.slice(
        0,
        52
      )}`,
      marginX + 4,
      innerY
    );
    innerY += 4.5;

    // Explanation
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(71, 85, 105);
    doc.text(expLines, marginX + 4, innerY);

    cursorY += boxHeight + 3.5;
  });

  // ==================== 5. FOOTER PAGE NUMBERS ====================
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `CrackGate Performance Telemetry — ${attempt.branch} Mock Report`,
      marginX,
      pageHeight - 7
    );
    doc.text(`Page ${p} of ${pageCount}`, pageWidth - marginX, pageHeight - 7, {
      align: 'right',
    });
  }

  const dateSlug = new Date(attempt.timestamp).toISOString().split('T')[0];
  const fileSlug = `crackgate-${attempt.branch.toLowerCase()}-mock-report-${dateSlug}.pdf`;
  doc.save(fileSlug);
}
