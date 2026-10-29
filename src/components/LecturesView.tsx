import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  Link2,
  Loader2,
  Play,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  Video,
  BookOpen,
} from 'lucide-react';
import {
  BranchCode,
  LectureItem,
  LectureWatchStatus,
  SyllabusSubject,
} from '../types/gate';
import { extractYouTubeVideoId } from '../utils/analytics';

interface LecturesViewProps {
  activeBranch: BranchCode;
  subjects: SyllabusSubject[];
  lectures: LectureItem[];
  initialSelectedLectureId?: string;
  initialSubjectFilter?: string;
  isFocusMode?: boolean;
  onAddLecture: (lecture: Omit<LectureItem, 'id' | 'addedAt'>) => void;
  onUpdateLecture: (
    id: string,
    updates: Partial<
      Pick<LectureItem, 'watchedMinutes' | 'durationMinutes' | 'status' | 'notes'>
    >
  ) => void;
  onDeleteLecture: (id: string) => void;
  onCompleteAndLogLecture: (lecture: LectureItem) => void;
}

function isLikelyYouTubeLink(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return true;
  return trimmed.includes('youtube.com/') || trimmed.includes('youtu.be/');
}

function formatDurationReadable(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}m (${mins}m)` : `${hrs}h (${mins}m)`;
}

export const LecturesView: React.FC<LecturesViewProps> = ({
  activeBranch,
  subjects,
  lectures,
  initialSelectedLectureId,
  initialSubjectFilter,
  onAddLecture,
  onUpdateLecture,
  onDeleteLecture,
  onCompleteAndLogLecture,
}) => {
  const branchSubjects = subjects.filter((s) => s.branch === activeBranch);
  const branchLectures = lectures.filter((l) => l.branch === activeBranch);

  const [subjectFilter, setSubjectFilter] = useState<string>(initialSubjectFilter || 'ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | LectureWatchStatus>('ALL');
  const [activeLectureId, setActiveLectureId] = useState<string>(
    initialSelectedLectureId || branchLectures[0]?.id || ''
  );
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [loggedSyncToast, setLoggedSyncToast] = useState<boolean>(false);

  // Instant Paste & Auto-Fetch State
  const [quickPasteUrl, setQuickPasteUrl] = useState<string>('');
  const [isAutoFetching, setIsAutoFetching] = useState<boolean>(false);
  const [autoSaveBanner, setAutoSaveBanner] = useState<{
    title: string;
    channelName: string;
    subjectName: string;
    topicName: string;
    durationMinutes: number;
  } | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Manual / Custom Form State
  const [newTitle, setNewTitle] = useState<string>('');
  const [newUrl, setNewUrl] = useState<string>('');
  const [newChannel, setNewChannel] = useState<string>('NPTEL / GATE Faculty');
  const [newPlaylist, setNewPlaylist] = useState<string>('Custom GATE Playlist');
  const [newSubjectId, setNewSubjectId] = useState<string>(branchSubjects[0]?.id || '');
  const [newTopicName, setNewTopicName] = useState<string>(
    branchSubjects[0]?.topics[0]?.name || ''
  );
  const [newDuration, setNewDuration] = useState<number>(60);

  useEffect(() => {
    const firstLec =
      branchLectures.find((l) => l.id === initialSelectedLectureId) || branchLectures[0];
    setActiveLectureId(firstLec?.id || '');
    setSubjectFilter(initialSubjectFilter || 'ALL');
    setNewSubjectId(branchSubjects[0]?.id || '');
    setNewTopicName(branchSubjects[0]?.topics[0]?.name || '');
  }, [activeBranch, initialSelectedLectureId, initialSubjectFilter]);

  const activeLecture =
    branchLectures.find((l) => l.id === activeLectureId) || branchLectures[0] || null;

  // Listen to YouTube IFrame Player API postMessage events to automatically capture the EXACT full video duration (and live playback time)
  useEffect(() => {
    if (!activeLecture) return;

    const handleYouTubeMessage = (event: MessageEvent) => {
      if (!event.origin.includes('youtube.com')) return;
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data && data.event === 'infoDelivery' && data.info) {
          // 1. Automatically sync exact full video duration from YouTube Player
          if (typeof data.info.duration === 'number' && data.info.duration > 0) {
            const exactFullMins = Math.max(1, Math.round(data.info.duration / 60));
            if (exactFullMins !== activeLecture.durationMinutes) {
              onUpdateLecture(activeLecture.id, {
                durationMinutes: exactFullMins,
              });
            }
          }
          // 2. Automatically sync watched progress as the student watches the video
          if (typeof data.info.currentTime === 'number' && data.info.currentTime > 30) {
            const currentWatchedMins = Math.floor(data.info.currentTime / 60);
            if (currentWatchedMins > activeLecture.watchedMinutes) {
              const totalDur = activeLecture.durationMinutes || 60;
              const newStatus: LectureWatchStatus =
                currentWatchedMins >= totalDur ? 'completed' : 'in_progress';
              onUpdateLecture(activeLecture.id, {
                watchedMinutes: Math.min(totalDur, currentWatchedMins),
                status: newStatus,
              });
            }
          }
        }
      } catch {
        // Ignore non-JSON messages
      }
    };

    window.addEventListener('message', handleYouTubeMessage);
    return () => window.removeEventListener('message', handleYouTubeMessage);
  }, [activeLecture, onUpdateLecture]);

  const handleIframeLoad = () => {
    // Subscribe to YouTube IFrame JS API infoDelivery events for duration & currentTime
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }),
        '*'
      );
    }
  };

  const filteredLectures = branchLectures.filter((l) => {
    const matchesSub = subjectFilter === 'ALL' || l.subjectId === subjectFilter;
    const matchesStatus = statusFilter === 'ALL' || l.status === statusFilter;
    return matchesSub && matchesStatus;
  });

  // Core function that fetches metadata (including full video duration) for a YouTube URL and automatically saves it
  const fetchAndAutoSaveYouTubeLink = async (rawUrl: string) => {
    const trimmed = rawUrl.trim();
    if (!trimmed) return;

    const videoId = extractYouTubeVideoId(trimmed);
    setIsAutoFetching(true);
    setFetchError(null);
    setAutoSaveBanner(null);

    try {
      const response = await fetch('/api/youtube/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          youtubeUrl: trimmed,
          videoId,
          branch: activeBranch,
          subjects: branchSubjects.map((s) => ({
            id: s.id,
            name: s.name,
            topics: s.topics.map((t) => t.name),
          })),
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.metadata) {
        throw new Error(data.error || 'Could not fetch video metadata.');
      }

      const meta = data.metadata;
      const matchedSub =
        branchSubjects.find((s) => s.id === meta.subjectId) || branchSubjects[0];
      const fullDurationMins = Math.max(1, Number(meta.durationMinutes) || 60);

      onAddLecture({
        branch: activeBranch,
        subjectId: matchedSub?.id || meta.subjectId,
        topicName: meta.topicName || matchedSub?.topics[0]?.name || 'Core Syllabus Topic',
        title: meta.title,
        channelName: meta.channelName,
        playlistTitle: meta.playlistTitle || `GATE ${activeBranch} Playlist`,
        youtubeUrl: meta.youtubeUrl || trimmed,
        videoId: meta.videoId || videoId,
        durationMinutes: fullDurationMins,
        watchedMinutes: 0,
        status: 'unwatched',
        notes: meta.notes || '',
      });

      setQuickPasteUrl('');
      setAutoSaveBanner({
        title: meta.title,
        channelName: meta.channelName,
        subjectName: matchedSub?.name || activeBranch,
        topicName: meta.topicName,
        durationMinutes: fullDurationMins,
      });
    } catch {
      const fallbackSub = branchSubjects[0];
      const fallbackTitle = `GATE ${activeBranch} Lecture (${videoId})`;
      onAddLecture({
        branch: activeBranch,
        subjectId: fallbackSub?.id || '',
        topicName: fallbackSub?.topics[0]?.name || 'Core Syllabus Topic',
        title: fallbackTitle,
        channelName: 'YouTube GATE Lecture',
        playlistTitle: `GATE ${activeBranch} Playlist`,
        youtubeUrl: trimmed.startsWith('http')
          ? trimmed
          : `https://www.youtube.com/watch?v=${videoId}`,
        videoId,
        durationMinutes: 60,
        watchedMinutes: 0,
        status: 'unwatched',
        notes: '',
      });
      setQuickPasteUrl('');
      setAutoSaveBanner({
        title: fallbackTitle,
        channelName: 'YouTube GATE Lecture',
        subjectName: fallbackSub?.name || activeBranch,
        topicName: fallbackSub?.topics[0]?.name || 'Core Topic',
        durationMinutes: 60,
      });
    } finally {
      setIsAutoFetching(false);
    }
  };

  // Trigger auto-fetch immediately when the user pastes a YouTube URL
  const handleQuickPasteEvent = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text');
    if (pastedText && isLikelyYouTubeLink(pastedText)) {
      e.preventDefault();
      setQuickPasteUrl(pastedText.trim());
      fetchAndAutoSaveYouTubeLink(pastedText.trim());
    }
  };

  // Support uploading a .txt / .csv / .json file containing one or more YouTube links
  const handleFileUploadLinks = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const content = await file.text();
      const urlMatches =
        content.match(
          /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=[a-zA-Z0-9_-]{11}|youtu\.be\/[a-zA-Z0-9_-]{11}|youtube\.com\/embed\/[a-zA-Z0-9_-]{11})/g
        ) || [];
      const uniqueLinks = Array.from(new Set(urlMatches)).slice(0, 5);
      if (uniqueLinks.length === 0) {
        setFetchError('No valid YouTube video links found in the uploaded file.');
        return;
      }
      for (const link of uniqueLinks) {
        await fetchAndAutoSaveYouTubeLink(link);
      }
    } catch {
      setFetchError('Could not read uploaded file.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAddLectureSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newUrl.trim() || !newSubjectId) return;

    const videoId = extractYouTubeVideoId(newUrl);
    onAddLecture({
      branch: activeBranch,
      subjectId: newSubjectId,
      topicName: newTopicName || 'Core Syllabus Topic',
      title: newTitle.trim(),
      channelName: newChannel.trim() || 'YouTube Educator',
      playlistTitle: newPlaylist.trim() || 'GATE Preparation Playlist',
      youtubeUrl: newUrl.trim(),
      videoId,
      durationMinutes: Math.max(1, Number(newDuration) || 60),
      watchedMinutes: 0,
      status: 'unwatched',
      notes: '',
    });

    setNewTitle('');
    setNewUrl('');
    setShowAddForm(false);
  };

  const handleCompleteAndSync = (lec: LectureItem) => {
    onCompleteAndLogLecture(lec);
    setLoggedSyncToast(true);
    setTimeout(() => setLoggedSyncToast(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Instant Paste / Upload YouTube Link Bar (Auto-Fetch & Auto-Save) */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              Curated YouTube Lecture Playlists &amp; Watch Studio ({activeBranch})
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Paste any YouTube video link below — automatically fetches the full lecture duration, title, channel, and GATE subject/topic
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.csv,.json,.md"
              onChange={handleFileUploadLinks}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isAutoFetching}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
              title="Upload a .txt, .csv, or .json file containing YouTube lecture URLs"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Links File
            </button>

            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              {showAddForm ? 'Hide Manual Editor' : 'Manual Editor'}
            </button>
          </div>
        </div>

        {/* Instant Paste Input Box */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (quickPasteUrl.trim()) {
              fetchAndAutoSaveYouTubeLink(quickPasteUrl);
            }
          }}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
        >
          <div className="relative flex-1">
            <Link2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={quickPasteUrl}
              onPaste={handleQuickPasteEvent}
              onChange={(e) => setQuickPasteUrl(e.target.value)}
              disabled={isAutoFetching}
              placeholder="Paste any YouTube video URL here (e.g. https://www.youtube.com/watch?v=...) to auto-fetch full lecture..."
              className="w-full pl-10 pr-4 py-2.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isAutoFetching || !quickPasteUrl.trim()}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isAutoFetching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Fetching Full Lecture...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Fetch &amp; Auto-Save
              </>
            )}
          </button>
        </form>

        {/* Live Auto-Saved Confirmation Banner */}
        {autoSaveBanner && (
          <div className="p-3.5 rounded-xl bg-emerald-50/90 border border-emerald-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-start sm:items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <span className="font-semibold text-emerald-950">
                  Auto-Fetched &amp; Saved Full Lecture:{' '}
                </span>
                <span className="font-medium text-emerald-900">
                  {autoSaveBanner.title}
                </span>
                <span className="text-emerald-700">
                  {' '}
                  · {autoSaveBanner.channelName} · {autoSaveBanner.subjectName} (
                  {autoSaveBanner.topicName}) · Full Length:{' '}
                  {formatDurationReadable(autoSaveBanner.durationMinutes)}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAutoSaveBanner(null)}
              className="text-emerald-700 hover:text-emerald-950 font-medium cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {fetchError && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            {fetchError}
          </div>
        )}
      </section>

      {/* Optional Manual Custom Lecture Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddLectureSubmit}
          className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
        >
          <h2 className="text-sm font-bold text-slate-900">
            Manual Lecture Details Override
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Lecture Title
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g., Dijkstra & Bellman-Ford Proof & GATE PYQs"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                YouTube Video URL or Video ID
              </label>
              <input
                type="text"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                GATE Subject ({activeBranch})
              </label>
              <select
                value={newSubjectId}
                onChange={(e) => {
                  const subId = e.target.value;
                  setNewSubjectId(subId);
                  const sub = branchSubjects.find((s) => s.id === subId);
                  setNewTopicName(sub?.topics[0]?.name || '');
                }}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
              >
                {branchSubjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Linked Syllabus Topic
              </label>
              <input
                type="text"
                value={newTopicName}
                onChange={(e) => setNewTopicName(e.target.value)}
                placeholder="e.g., Shortest Paths & Minimum Spanning Trees"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Channel / Playlist Name
              </label>
              <input
                type="text"
                value={newChannel}
                onChange={(e) => setNewChannel(e.target.value)}
                placeholder="e.g., NPTEL IIT Madras"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>

            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Full Duration (Mins)
                </label>
                <input
                  type="number"
                  min={1}
                  max={2000}
                  value={newDuration}
                  onChange={(e) => setNewDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <button
                type="submit"
                className="py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Save to Playlist
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Main 2-Zone Lecture Studio: Embedded Player & Notes (Left 7 cols) + Playlist Queue (Right 5 cols) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Theater Video Player + Watch Progress & Concept Scratchpad */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
          {activeLecture ? (
            <div>
              {/* 16:9 Embedded YouTube Iframe with enablejsapi=1 for full-duration & playback sync */}
              <div className="aspect-video w-full bg-slate-950 relative">
                <iframe
                  ref={iframeRef}
                  key={activeLecture.videoId}
                  onLoad={handleIframeLoad}
                  src={`https://www.youtube.com/embed/${activeLecture.videoId}?enablejsapi=1&rel=0`}
                  title={activeLecture.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>

              <div className="p-6 space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-medium text-blue-600">
                        {activeLecture.playlistTitle}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{activeLecture.channelName}</span>
                      <span aria-hidden="true">·</span>
                      <span>{activeLecture.topicName}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono font-semibold text-slate-700">
                        Full Lecture: {formatDurationReadable(activeLecture.durationMinutes)}
                      </span>
                    </div>
                    <h2 className="text-base font-bold text-slate-900">
                      {activeLecture.title}
                    </h2>
                  </div>

                  <a
                    href={activeLecture.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    Open on YouTube
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                {/* Watch Progress Slider, Editable Full Duration & Status Controls */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex flex-wrap items-center gap-3">
                      <label
                        htmlFor="watch-slider"
                        className="font-semibold text-slate-800"
                      >
                        Watched:{' '}
                        <span className="font-mono tabular-nums text-blue-600">
                          {activeLecture.watchedMinutes}m / {activeLecture.durationMinutes}m (
                          {Math.round(
                            (activeLecture.watchedMinutes /
                              Math.max(1, activeLecture.durationMinutes)) *
                              100
                          )}
                          %)
                        </span>
                      </label>

                      <div className="flex items-center gap-1.5 text-slate-600">
                        <span>Full Length (mins):</span>
                        <input
                          type="number"
                          min={1}
                          max={2000}
                          value={activeLecture.durationMinutes}
                          onChange={(e) => {
                            const newTotal = Math.max(1, Number(e.target.value) || 1);
                            onUpdateLecture(activeLecture.id, {
                              durationMinutes: newTotal,
                              watchedMinutes: Math.min(activeLecture.watchedMinutes, newTotal),
                            });
                          }}
                          className="w-16 px-2 py-0.5 text-xs font-mono bg-white border border-slate-200 rounded"
                          title="Full lecture length in minutes (auto-detected from YouTube or editable)"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {loggedSyncToast && (
                        <span className="text-emerald-600 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Added {activeLecture.durationMinutes}m to Study Progress
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleCompleteAndSync(activeLecture)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Complete Full Lecture ({activeLecture.durationMinutes}m)
                      </button>
                    </div>
                  </div>

                  <input
                    id="watch-slider"
                    type="range"
                    min={0}
                    max={activeLecture.durationMinutes}
                    value={activeLecture.watchedMinutes}
                    onChange={(e) => {
                      const mins = Number(e.target.value);
                      const newStatus: LectureWatchStatus =
                        mins === 0
                          ? 'unwatched'
                          : mins >= activeLecture.durationMinutes
                          ? 'completed'
                          : 'in_progress';
                      onUpdateLecture(activeLecture.id, {
                        watchedMinutes: mins,
                        status: newStatus,
                      });
                    }}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>

                {/* Lecture Concept & Formula Notes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                    Lecture Formula &amp; Concept Notes (Auto-Saved)
                  </label>
                  <textarea
                    rows={3}
                    value={activeLecture.notes}
                    onChange={(e) =>
                      onUpdateLecture(activeLecture.id, { notes: e.target.value })
                    }
                    placeholder="Write key derivations, edge cases, or timestamps while watching..."
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 leading-relaxed"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center space-y-2">
              <Video className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-medium text-slate-900">No lecture selected</p>
              <p className="text-xs text-slate-500">
                Paste a YouTube URL above or select a lecture from the playlist on the right.
              </p>
            </div>
          )}
        </div>

        {/* Right: Playlist Queue & Filters */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="space-y-3 pb-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">
                {activeBranch} Lecture Playlist
              </h2>
              <span className="text-xs font-mono tabular-nums text-slate-500">
                {filteredLectures.length} Videos
              </span>
            </div>

            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
            >
              <option value="ALL">All {activeBranch} Subjects</option>
              {branchSubjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(['ALL', 'unwatched', 'in_progress', 'completed'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`flex-1 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    statusFilter === st
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st === 'ALL'
                    ? 'All'
                    : st === 'unwatched'
                    ? 'Unwatched'
                    : st === 'in_progress'
                    ? 'In Progress'
                    : 'Completed'}
                </button>
              ))}
            </div>
          </div>

          {filteredLectures.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <BookOpen className="w-7 h-7 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500">
                No lectures match the current filter. Paste a YouTube link above to auto-fetch and save one.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto pr-1">
              {filteredLectures.map((lec) => {
                const isSelected = activeLecture?.id === lec.id;
                const pct = Math.round(
                  (lec.watchedMinutes / Math.max(1, lec.durationMinutes)) * 100
                );

                return (
                  <div
                    key={lec.id}
                    className={`py-3.5 px-3 rounded-lg transition-colors flex items-start justify-between gap-3 ${
                      isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveLectureId(lec.id)}
                      className="text-left flex-1 min-w-0 space-y-1 cursor-pointer"
                    >
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <span className="font-medium text-slate-700 truncate">
                          {lec.channelName}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums shrink-0">
                          {lec.watchedMinutes}/{lec.durationMinutes}m ({pct}%)
                        </span>
                      </div>

                      <div className="text-xs font-semibold text-slate-900 line-clamp-2">
                        {lec.title}
                      </div>

                      <div className="flex items-center gap-2 text-[11px]">
                        {lec.status === 'completed' && (
                          <span className="text-emerald-600 font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Completed
                          </span>
                        )}
                        {lec.status === 'in_progress' && (
                          <span className="text-amber-600 font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            In Progress
                          </span>
                        )}
                        {lec.status === 'unwatched' && (
                          <span className="text-slate-500 flex items-center gap-1">
                            <Play className="w-3 h-3" />
                            Unwatched
                          </span>
                        )}
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        <span className="text-slate-500 truncate">{lec.topicName}</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteLecture(lec.id)}
                      title="Remove lecture"
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded transition-colors shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
