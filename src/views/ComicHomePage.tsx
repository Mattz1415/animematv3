'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  BookOpen,
  Search,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Filter,
  Layers,
  Flame,
} from 'lucide-react';
import { comicApi } from '../api/comicApi';
import { ComicCard } from '../components/cards/ComicCard';
import { SkeletonGrid } from '../components/cards/SkeletonCard';
import { useCyberSound } from '../hooks/useCyberSound';

type ComicTypeFilter = 'all' | 'manga' | 'manhwa' | 'manhua';

export const ComicHomePage: React.FC = () => {
  const navigate = useNavigate();
  const { playBlip } = useCyberSound();
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [typeFilter, setTypeFilter] = useState<ComicTypeFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch Latest Comics
  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['comic', 'latest', currentPage],
    queryFn: () => comicApi.getLatest(currentPage),
    placeholderData: (prev) => prev,
    staleTime: 1000 * 60 * 10,
  });

  // Fetch Genres
  const { data: genresData } = useQuery({
    queryKey: ['comic', 'genres'],
    queryFn: comicApi.getGenres,
    staleTime: 1000 * 60 * 60,
  });

  const comics = data?.komikList || [];
  const pagination = data?.pagination;
  const genres = genresData || [];

  // Filter comics by type and search query
  const filteredComics = comics.filter((comic) => {
    if (typeFilter !== 'all') {
      const cType = (comic.type || '').toLowerCase();
      if (!cType.includes(typeFilter)) return false;
    }
    if (searchQuery.trim()) {
      return comic.title.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim().length >= 2) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}&type=comic`);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1) return;
    playBlip('switch');
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-950/40 via-zinc-900 to-zinc-950 p-6 md:p-8 border border-zinc-800/80 shadow-2xl">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-red-600/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/80 border border-red-800/50 text-red-400 text-xs font-mono">
              <BookOpen className="w-3.5 h-3.5 text-red-500" />
              <span>DIGITAL SCANLATION VAULT</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-white font-mono flex items-center gap-3">
              Manga & Webtoon Nexus
            </h1>
            <p className="text-zinc-400 text-sm md:text-base max-w-2xl">
              High-resolution Japanese Manga, Korean Manhwa, and Chinese Manhua scanlations
              integrated with smooth cascade reading and page flip modes.
            </p>
          </div>

          <div className="px-4 py-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-right font-mono">
            <span className="text-xs text-zinc-500 uppercase block">Engine Sync</span>
            <span className="text-xl font-bold text-red-400">Komikindo Live</span>
          </div>
        </div>

        {/* Filter controls */}
        <div className="mt-6 pt-6 border-t border-zinc-800/80 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          {/* Format pills */}
          <div className="flex items-center gap-1.5 bg-zinc-900 p-1 rounded-xl border border-zinc-800 font-mono text-xs">
            <button
              onClick={() => {
                playBlip('switch');
                setTypeFilter('all');
              }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                typeFilter === 'all'
                  ? 'bg-red-600 text-white font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              All Formats
            </button>
            <button
              onClick={() => {
                playBlip('switch');
                setTypeFilter('manga');
              }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                typeFilter === 'manga'
                  ? 'bg-red-600 text-white font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Manga (JP)
            </button>
            <button
              onClick={() => {
                playBlip('switch');
                setTypeFilter('manhwa');
              }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                typeFilter === 'manhwa'
                  ? 'bg-cyan-600 text-white font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Manhwa (KR)
            </button>
            <button
              onClick={() => {
                playBlip('switch');
                setTypeFilter('manhua');
              }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                typeFilter === 'manhua'
                  ? 'bg-amber-600 text-white font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Manhua (CN)
            </button>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="relative min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search comics, manhwa..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-red-500"
            />
          </form>
        </div>
      </div>

      {/* Genre Carousel if available */}
      {genres.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {genres.slice(0, 16).map((g) => (
            <button
              key={g.slug || g.name}
              onClick={() => {
                setSearchQuery(g.name);
              }}
              className="px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white text-xs font-mono whitespace-nowrap transition-colors"
            >
              #{g.name}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <SkeletonGrid count={12} />
      ) : filteredComics.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-zinc-900/30 border border-zinc-800">
          <BookOpen className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-zinc-300 font-mono">No Comics Found</h3>
          <p className="text-zinc-500 text-sm mt-1">Try resetting your filter or searching for another title.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredComics.map((comic) => (
            <ComicCard
              key={comic.slug || comic.title}
              slug={comic.slug}
              title={comic.title}
              image={comic.image}
              type={comic.type}
              rating={comic.rating || comic.score}
              latestChapter={comic.latestChapter}
            />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      <div className="flex items-center justify-center gap-3 pt-6 border-t border-zinc-800/80">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage <= 1 || isLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300 hover:text-white hover:border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>

        <span className="px-4 py-2 rounded-xl bg-zinc-950 border border-red-900/40 text-xs font-mono text-red-400 font-semibold shadow-inner">
          Page {currentPage}
        </span>

        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={(pagination && !pagination.hasNextPage) || isPlaceholderData}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300 hover:text-white hover:border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default ComicHomePage;
