'use client';

import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import {
  BookOpen,
  Star,
  Bookmark,
  Share2,
  ArrowLeft,
  Search,
  ListFilter,
  Clock,
  Sparkles,
  Info,
  CheckCircle,
} from 'lucide-react';
import { comicApi } from '../api/comicApi';
import { ComicCard } from '../components/cards/ComicCard';
import { useBookmarks } from '../hooks/useBookmarks';
import { useReadingHistory } from '../hooks/useReadingHistory';
import { useCyberSound } from '../hooks/useCyberSound';
import { ShareModal } from '../components/modals/ShareModal';

export const ComicDetailPage: React.FC = () => {
  const params = useParams<{ slug?: string; '*'?: string }>();
  const navigate = useNavigate();
  const { playBlip } = useCyberSound();
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const { readingHistory } = useReadingHistory();

  const rawSlug = params.slug || params['*'] || '';
  const cleanSlug = rawSlug.replace(/^\/comic\//, '').replace(/^\/komik\//, '').replace(/^\//, '');

  const [shareOpen, setShareOpen] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [chapterSearch, setChapterSearch] = useState('');
  const [chapterSort, setChapterSort] = useState<'desc' | 'asc'>('desc');

  const { data: comic, isLoading, error } = useQuery({
    queryKey: ['comic', 'detail', cleanSlug],
    queryFn: () => comicApi.getDetail(cleanSlug),
    enabled: Boolean(cleanSlug),
  });

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-80 w-full bg-zinc-900 rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="h-64 bg-zinc-900 rounded-2xl" />
          <div className="h-64 bg-zinc-900 rounded-2xl md:col-span-2" />
        </div>
      </div>
    );
  }

  if (error || !comic) {
    return (
      <div className="p-12 text-center rounded-3xl bg-zinc-900/60 border border-red-900/40 space-y-4">
        <Info className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold font-mono text-white">Comic Telemetry Not Found</h2>
        <p className="text-zinc-400 text-sm max-w-md mx-auto">
          The requested scanlation archive could not be retrieved from the server.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-mono font-bold"
        >
          Go Back
        </button>
      </div>
    );
  }

  const bookmarked = isBookmarked(cleanSlug);
  const chapters = comic.chapters || [];

  // Find if user was reading this comic before
  const previousRead = readingHistory.find((item) => item.comicSlug === cleanSlug);

  // Filter and sort chapters
  const filteredChapters = chapters
    .filter((ch) => {
      const q = chapterSearch.toLowerCase();
      return ch.title.toLowerCase().includes(q) || ch.slug.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (chapterSort === 'asc') {
        return a.title.localeCompare(b.title, undefined, { numeric: true });
      } else {
        return b.title.localeCompare(a.title, undefined, { numeric: true });
      }
    });

  const firstChapterSlug = comic.firstChapter?.slug || (chapters.length > 0 ? chapters[chapters.length - 1].slug : null);
  const latestChapterSlug = comic.latestChapter?.slug || (chapters.length > 0 ? chapters[0].slug : null);

  return (
    <div className="space-y-10">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to comics</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              playBlip('switch');
              toggleBookmark({
                id: cleanSlug,
                title: comic.title,
                poster: comic.image,
                slug: cleanSlug,
                score: comic.rating,
                type: 'comic',
              });
            }}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-mono transition-all ${
              bookmarked
                ? 'bg-red-600/20 border-red-500 text-red-400 shadow-[0_0_15px_rgba(220,38,38,0.25)]'
                : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${bookmarked ? 'fill-red-500 text-red-500' : ''}`} />
            <span>{bookmarked ? 'Bookmarked' : 'Add to Library'}</span>
          </button>

          <button
            onClick={() => setShareOpen(true)}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
            title="Share Comic"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-zinc-900/80 border border-zinc-800/80 p-6 md:p-8 backdrop-blur-xl shadow-2xl">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-10 blur-3xl pointer-events-none scale-125"
          style={{ backgroundImage: `url(${comic.image})` }}
        />

        <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
          {/* Cover Art */}
          <div className="w-full sm:w-60 flex-shrink-0 mx-auto md:mx-0">
            <div className="relative aspect-[3/4.2] rounded-2xl overflow-hidden border border-zinc-700/80 shadow-[0_0_30px_rgba(0,0,0,0.8)]">
              <img
                src={comic.image}
                alt={comic.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://picsum.photos/seed/' + encodeURIComponent(cleanSlug) + '/400/600';
                }}
              />
              {comic.rating && (
                <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/80 backdrop-blur-md border border-amber-500/50 text-amber-400 text-xs font-mono font-bold">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <span>{comic.rating}</span>
                </div>
              )}
            </div>

            {/* Quick Read Actions */}
            <div className="mt-4 flex flex-col gap-2">
              {previousRead ? (
                <Link
                  to={`/read/${previousRead.chapterSlug}`}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Resume ({previousRead.chapterTitle || 'Previous'})</span>
                </Link>
              ) : firstChapterSlug ? (
                <Link
                  to={`/read/${firstChapterSlug}`}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Start Chapter 1</span>
                </Link>
              ) : null}

              {latestChapterSlug && (
                <Link
                  to={`/read/${latestChapterSlug}`}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-mono text-xs font-semibold border border-zinc-800 transition-all"
                >
                  <span>Read Latest Chapter</span>
                </Link>
              )}
            </div>
          </div>

          {/* Details Column */}
          <div className="flex-1 space-y-5">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {comic.detail?.type && (
                  <span className="px-2.5 py-0.5 rounded-full bg-red-950/80 border border-red-800/60 text-red-400 text-xs font-mono">
                    {comic.detail.type}
                  </span>
                )}
                {comic.detail?.status && (
                  <span className="px-2.5 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-mono">
                    {comic.detail.status}
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white font-mono tracking-tight">
                {comic.title}
              </h1>
              {comic.detail?.alternativeTitle && (
                <p className="text-zinc-400 font-mono text-xs sm:text-sm mt-1">
                  Alt: {comic.detail.alternativeTitle}
                </p>
              )}
            </div>

            {/* Spec Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 text-xs font-mono">
              <div>
                <span className="text-zinc-500 uppercase block text-[10px]">Author</span>
                <span className="text-zinc-200 font-semibold">{comic.detail?.author || 'Unknown'}</span>
              </div>
              <div>
                <span className="text-zinc-500 uppercase block text-[10px]">Artist</span>
                <span className="text-zinc-200 font-semibold">{comic.detail?.illustrator || 'Unknown'}</span>
              </div>
              <div>
                <span className="text-zinc-500 uppercase block text-[10px]">Total Chapters</span>
                <span className="text-zinc-200 font-semibold">{chapters.length} Chapters</span>
              </div>
            </div>

            {/* Genres */}
            {comic.genres && comic.genres.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {comic.genres.map((g) => (
                  <span
                    key={g.slug || g.name}
                    className="px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-mono"
                  >
                    #{g.name}
                  </span>
                ))}
              </div>
            )}

            {/* Description */}
            {comic.description && (
              <div className="space-y-2">
                <h3 className="text-xs font-mono uppercase text-zinc-400 font-bold tracking-wider">
                  Storyline Synopsis
                </h3>
                <p
                  className={`text-sm text-zinc-300 leading-relaxed ${
                    !descExpanded ? 'line-clamp-4' : ''
                  }`}
                >
                  {comic.description}
                </p>
                {comic.description.length > 250 && (
                  <button
                    onClick={() => setDescExpanded(!descExpanded)}
                    className="text-xs font-mono text-red-400 hover:text-red-300 underline underline-offset-4"
                  >
                    {descExpanded ? 'Show less' : 'Read full description'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chapters Index */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800/80">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-red-500" />
            <h2 className="text-xl font-bold font-mono text-white">
              Chapters Index ({chapters.length})
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
              <input
                type="text"
                value={chapterSearch}
                onChange={(e) => setChapterSearch(e.target.value)}
                placeholder="Find chapter..."
                className="pl-8 pr-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-red-500 w-36 sm:w-48"
              />
            </div>

            <button
              onClick={() => setChapterSort(chapterSort === 'desc' ? 'asc' : 'desc')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300 hover:text-white"
            >
              <ListFilter className="w-3.5 h-3.5 text-red-400" />
              <span>{chapterSort === 'desc' ? 'Newest First' : 'Oldest First'}</span>
            </button>
          </div>
        </div>

        {filteredChapters.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-zinc-900/30 border border-zinc-800">
            <p className="text-zinc-500 font-mono text-xs">No chapters found matching search filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-[600px] overflow-y-auto p-1 scrollbar-thin">
            {filteredChapters.map((ch) => {
              const isRead = readingHistory.some((item) => item.chapterSlug === ch.slug);

              return (
                <Link
                  key={ch.slug}
                  to={`/read/${ch.slug}`}
                  className={`group flex items-center justify-between p-3 rounded-xl border text-xs font-mono transition-all ${
                    isRead
                      ? 'bg-zinc-900/40 border-zinc-800/60 text-zinc-400 hover:border-zinc-700'
                      : 'bg-zinc-900/80 border-zinc-800 hover:border-red-600/60 hover:bg-zinc-900 text-zinc-200 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {isRead ? (
                      <CheckCircle className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                    ) : (
                      <BookOpen className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                    )}
                    <span className="truncate">{ch.title}</span>
                  </div>
                  {ch.releaseTime && (
                    <span className="text-[10px] text-zinc-500 flex-shrink-0 ml-2">
                      {ch.releaseTime}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Similar Comics */}
      {comic.similarManga && comic.similarManga.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold font-mono text-white">Recommended Comics</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            {comic.similarManga.slice(0, 6).map((sim) => (
              <ComicCard
                key={sim.slug}
                slug={sim.slug}
                title={sim.title}
                image={sim.image}
              />
            ))}
          </div>
        </div>
      )}

      {/* Share Modal */}
      <ShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        title={comic.title}
        url={typeof window !== 'undefined' ? window.location.href : ''}
      />
    </div>
  );
};

export default ComicDetailPage;
