'use client';

import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import {
  Layers,
  ChevronLeft,
  ChevronRight,
  Filter,
  Sparkles,
  Tag,
} from 'lucide-react';
import { animeApi } from '../api/animeApi';
import { AnimeCard } from '../components/cards/AnimeCard';
import { SkeletonGrid } from '../components/cards/SkeletonCard';
import { useCyberSound } from '../hooks/useCyberSound';

export const GenrePage: React.FC = () => {
  const { playBlip } = useCyberSound();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedGenreSlug = searchParams.get('slug') || 'action';
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Fetch all genres
  const { data: genresData, isLoading: isGenresLoading } = useQuery({
    queryKey: ['anime', 'genres'],
    queryFn: animeApi.getGenres,
    staleTime: 1000 * 60 * 60, // 1 hour cache
  });

  const genresList = genresData || [];

  // Fetch anime for selected genre
  const {
    data: genreAnimeData,
    isLoading: isAnimeLoading,
    isPlaceholderData,
  } = useQuery({
    queryKey: ['anime', 'byGenre', selectedGenreSlug, currentPage],
    queryFn: () => animeApi.getByGenre(selectedGenreSlug, currentPage),
    enabled: Boolean(selectedGenreSlug),
    placeholderData: (prev) => prev,
  });

  const animeList = genreAnimeData?.animeList || [];
  const pagination = genreAnimeData?.pagination;

  const handleSelectGenre = (slug: string) => {
    playBlip('switch');
    setCurrentPage(1);
    setSearchParams({ slug });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1) return;
    playBlip('switch');
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Find human readable title for the selected genre safely
  const selectedGenreObj = genresList.find((g: any) => {
    if (!g) return false;
    const gSlug =
      g.slug ||
      (typeof g.href === 'string'
        ? g.href.replace(/^\/anime\/genre\//, '').replace(/^\/genre\//, '').replace(/^\//, '')
        : '');
    const gName = typeof g === 'string' ? g : g.genre || g.name || g.title || '';
    return (
      (gSlug && gSlug.toLowerCase() === selectedGenreSlug.toLowerCase()) ||
      (typeof gName === 'string' && gName.toLowerCase() === selectedGenreSlug.toLowerCase()) ||
      (typeof g.href === 'string' && g.href.toLowerCase().includes(selectedGenreSlug.toLowerCase()))
    );
  });

  const activeGenreTitle =
    (typeof selectedGenreObj === 'string'
      ? selectedGenreObj
      : selectedGenreObj?.genre || selectedGenreObj?.name || selectedGenreObj?.title) ||
    selectedGenreSlug.replace(/-/g, ' ');

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-950/40 via-zinc-900 to-zinc-950 p-6 md:p-8 border border-zinc-800/80 shadow-2xl">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-red-600/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/80 border border-red-800/50 text-red-400 text-xs font-mono">
              <Layers className="w-3.5 h-3.5 text-red-500" />
              <span>GENRE DIRECTORY</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-white font-mono flex items-center gap-3 capitalize">
              Genre: {activeGenreTitle}
            </h1>
            <p className="text-zinc-400 text-sm md:text-base max-w-2xl">
              Browse anime categorised by thematic tags, demographic categories, and tropes.
            </p>
          </div>

          <div className="px-4 py-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-right font-mono">
            <span className="text-xs text-zinc-500 uppercase block">Category Index</span>
            <span className="text-xl font-bold text-red-400 capitalize">{activeGenreTitle}</span>
          </div>
        </div>
      </div>

      {/* Genre Pills Carousel / Matrix */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
          <Tag className="w-3.5 h-3.5 text-red-400" />
          <span>Select Categories ({genresList.length}):</span>
        </div>

        {isGenresLoading ? (
          <div className="flex gap-2 overflow-hidden py-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-8 w-24 bg-zinc-800/60 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1.5 rounded-xl bg-zinc-900/50 border border-zinc-800/80 scrollbar-thin">
            {genresList.map((g: any, idx: number) => {
              if (!g) return null;
              const genreName =
                typeof g === 'string'
                  ? g
                  : g.genre || g.name || g.title || `Genre ${idx + 1}`;
              const slug =
                g.slug ||
                (typeof g.href === 'string' && g.href
                  ? g.href.replace(/^\/anime\/genre\//, '').replace(/^\/genre\//, '').replace(/^\//, '')
                  : typeof genreName === 'string'
                  ? genreName.toLowerCase().replace(/\s+/g, '-')
                  : `genre-${idx}`);
              const isSelected = selectedGenreSlug.toLowerCase() === slug.toLowerCase();

              return (
                <button
                  key={slug || genreName || idx}
                  onClick={() => handleSelectGenre(slug)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                    isSelected
                      ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)] ring-1 ring-red-400'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800'
                  }`}
                >
                  {genreName}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Anime List Grid */}
      {isAnimeLoading ? (
        <SkeletonGrid count={12} />
      ) : animeList.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-zinc-900/30 border border-zinc-800">
          <Layers className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-zinc-300 font-mono">No Anime in {activeGenreTitle}</h3>
          <p className="text-zinc-500 text-sm mt-1">Try selecting another genre tag above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {animeList.map((anime) => (
            <AnimeCard
              key={anime.animeId || anime.title}
              id={anime.animeId}
              title={anime.title}
              poster={anime.poster}
              episodes={anime.episodes}
              score={anime.score}
              href={anime.href}
            />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      <div className="flex items-center justify-center gap-3 pt-6 border-t border-zinc-800/80">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage <= 1 || isAnimeLoading}
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

export default GenrePage;
