'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import {
  Flame,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react';
import { animeApi } from '../api/animeApi';
import { AnimeCard } from '../components/cards/AnimeCard';
import { SkeletonGrid } from '../components/cards/SkeletonCard';
import { FilterSortBar, SortOption } from '../components/ui/FilterSortBar';
import { useCyberSound } from '../hooks/useCyberSound';

export const OngoingPage: React.FC = () => {
  const { playBlip } = useCyberSound();
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortBy, setSortBy] = useState<SortOption>('latest');

  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['anime', 'ongoing', currentPage],
    queryFn: () => animeApi.getOngoing(currentPage),
    placeholderData: (previousData) => previousData,
  });

  const animeList = data?.animeList || [];
  const pagination = data?.pagination;

  // Sorting
  const sortedAnimeList = [...animeList].sort((a, b) => {
    if (sortBy === 'title') {
      return a.title.localeCompare(b.title);
    }
    if (sortBy === 'score') {
      const scoreA = parseFloat(a.score || '0');
      const scoreB = parseFloat(b.score || '0');
      return scoreB - scoreA;
    }
    return 0; // Default latest as received from server
  });

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
              <Flame className="w-3.5 h-3.5 text-red-500 animate-pulse" />
              <span>ACTIVE SIMULCASTS</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-white font-mono flex items-center gap-3">
              Ongoing Anime Series
            </h1>
            <p className="text-zinc-400 text-sm md:text-base max-w-2xl">
              Currently airing weekly anime broadcasts with latest Indonesian subtitles.
              Fresh episodes updated as soon as they air.
            </p>
          </div>

          <div className="px-4 py-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-right font-mono">
            <span className="text-xs text-zinc-500 uppercase block">Active Page</span>
            <span className="text-xl font-bold text-red-400">Page {currentPage}</span>
          </div>
        </div>
      </div>

      {/* Filter and Sort Toolbar */}
      <FilterSortBar
        sortBy={sortBy}
        onSortChange={(sort) => {
          playBlip('switch');
          setSortBy(sort);
        }}
        totalCount={animeList.length}
      />

      {/* Grid */}
      {isLoading ? (
        <SkeletonGrid count={12} />
      ) : sortedAnimeList.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-zinc-900/30 border border-zinc-800">
          <Flame className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-zinc-300 font-mono">No Ongoing Anime Found</h3>
          <p className="text-zinc-500 text-sm mt-1">Check back soon for new broadcast seasons.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {sortedAnimeList.map((anime) => (
            <AnimeCard
              key={anime.animeId || anime.title}
              id={anime.animeId}
              title={anime.title}
              poster={anime.poster}
              episodes={anime.episodes}
              latestReleaseDate={anime.latestReleaseDate}
              releaseDay={anime.releaseDay}
              status="Ongoing"
              href={anime.href}
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

export default OngoingPage;
