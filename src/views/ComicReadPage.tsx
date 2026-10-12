'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Maximize2,
  Minimize2,
  RotateCcw,
  Sparkles,
  Info,
} from 'lucide-react';
import { comicApi } from '../api/comicApi';
import { ChapterReader } from '../components/reader/ChapterReader';
import { ReaderControls, ReaderFilter } from '../components/reader/ReaderControls';
import { useReadingHistory } from '../hooks/useReadingHistory';
import { useCyberSound } from '../hooks/useCyberSound';
import { ShortcutsModal } from '../components/modals/ShortcutsModal';

export const ComicReadPage: React.FC = () => {
  const params = useParams<{ chapterSlug?: string; '*'?: string }>();
  const navigate = useNavigate();
  const { playBlip } = useCyberSound();
  const { addReadingItem } = useReadingHistory();

  const rawSlug = params.chapterSlug || params['*'] || '';
  const cleanSlug = rawSlug
    .replace(/^\/comic\/chapter\//, '')
    .replace(/^\/chapter\//, '')
    .replace(/^\/read\//, '')
    .replace(/^\//, '');

  const [readingMode, setReadingMode] = useState<'cascade' | 'paged'>('cascade');
  const [zoom, setZoom] = useState<number>(100);
  const [filterMode, setFilterMode] = useState<ReaderFilter>('normal');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch chapter images and navigation
  const { data: chapter, isLoading, error } = useQuery({
    queryKey: ['comic', 'chapter', cleanSlug],
    queryFn: () => comicApi.getChapter(cleanSlug),
    enabled: Boolean(cleanSlug),
  });

  // Track progress and update history
  useEffect(() => {
    if (chapter) {
      const comicSlug = chapter.komikInfo?.slug || cleanSlug.split('-chapter-')[0];
      const comicTitle = chapter.komikInfo?.title || cleanSlug.replace(/-/g, ' ');

      addReadingItem({
        comicSlug,
        comicTitle,
        chapterSlug: cleanSlug,
        chapterTitle: chapter.title,
        image: chapter.images?.[0]?.url || chapter.thumbnail,
        scrollProgress,
      });
    }
  }, [chapter, cleanSlug, scrollProgress, addReadingItem]);

  // Fullscreen handler
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const hasPrev = Boolean(chapter?.navigation?.prev);
  const hasNext = Boolean(chapter?.navigation?.next);

  const handlePrevChapter = () => {
    if (chapter?.navigation?.prev) {
      playBlip('switch');
      navigate(`/read/${chapter.navigation.prev}`);
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  const handleNextChapter = () => {
    if (chapter?.navigation?.next) {
      playBlip('switch');
      navigate(`/read/${chapter.navigation.next}`);
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-mono text-zinc-400">Loading scanlation pages...</p>
      </div>
    );
  }

  if (error || !chapter) {
    return (
      <div className="p-12 text-center rounded-3xl bg-zinc-900/60 border border-red-900/40 space-y-4 max-w-lg mx-auto">
        <Info className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold font-mono text-white">Chapter Offline</h2>
        <p className="text-zinc-400 text-sm">
          Failed to load chapter imagery. The chapter may have been archived or is restricted.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-mono font-bold"
        >
          Return to Details
        </button>
      </div>
    );
  }

  const images = chapter.images || [];
  const parentComicSlug = chapter.komikInfo?.slug || cleanSlug.replace(/-chapter-.*$/, '');

  return (
    <div ref={containerRef} className="space-y-4 max-w-4xl mx-auto">
      {/* Top Navbar */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 backdrop-blur-md sticky top-16 z-30 shadow-xl">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to={`/comic/${parentComicSlug}`}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
            title="Back to comic details"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm font-mono font-bold text-white truncate">
              {chapter.title}
            </h1>
            {chapter.komikInfo && (
              <span className="text-[10px] font-mono text-zinc-400 block truncate">
                {chapter.komikInfo.title}
              </span>
            )}
          </div>
        </div>

        {/* Progress badge */}
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] font-mono text-red-400">
            {images.length} Pages
          </span>
        </div>
      </div>

      {/* Reader Controls Toolbar */}
      <ReaderControls
        currentChapterTitle={chapter.title}
        comicTitle={chapter.komikInfo?.title}
        hasPrev={hasPrev}
        hasNext={hasNext}
        onPrev={handlePrevChapter}
        onNext={handleNextChapter}
        readingMode={readingMode}
        onToggleMode={(mode) => {
          playBlip('switch');
          setReadingMode(mode);
        }}
        zoom={zoom}
        onZoomChange={(newZoom) => setZoom(newZoom)}
        filterMode={filterMode}
        onFilterChange={(newFilter) => setFilterMode(newFilter)}
        onToggleFullscreen={handleToggleFullscreen}
        isFullscreen={isFullscreen}
        onOpenShortcuts={() => setShortcutsOpen(true)}
      />

      {/* Chapter Reader Canvas */}
      <div className="rounded-2xl overflow-hidden bg-black border border-zinc-850 p-2 sm:p-4 min-h-[600px] flex justify-center">
        <ChapterReader
          images={images}
          readingMode={readingMode}
          zoom={zoom}
          filterMode={filterMode}
          onScrollProgress={setScrollProgress}
          onNextChapter={handleNextChapter}
          onPrevChapter={handlePrevChapter}
          hasNextChapter={hasNext}
          hasPrevChapter={hasPrev}
        />
      </div>

      {/* Bottom Navigation Buttons */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800">
        <button
          onClick={handlePrevChapter}
          disabled={!hasPrev}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-mono disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous Chapter</span>
        </button>

        <Link
          to={`/comic/${parentComicSlug}`}
          className="px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs font-mono transition-colors"
        >
          All Chapters
        </Link>

        <button
          onClick={handleNextChapter}
          disabled={!hasNext}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-mono font-bold disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(220,38,38,0.3)] transition-all"
        >
          <span>Next Chapter</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Shortcuts Modal */}
      <ShortcutsModal isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  );
};

export default ComicReadPage;
