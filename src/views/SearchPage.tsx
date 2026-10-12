'use client';

import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import {
  Search,
  Tv,
  BookOpen,
  Filter,
  Sparkles,
  Layers,
  X,
  TrendingUp,
  Dices,
} from 'lucide-react';
import { animeApi } from '../api/animeApi';
import { comicApi } from '../api/comicApi';
import { AnimeCard } from '../components/cards/AnimeCard';
import { ComicCard } from '../components/cards/ComicCard';
import { SkeletonGrid } from '../components/cards/SkeletonCard';
import { useCyberSound } from '../hooks/useCyberSound';

type SearchFilterTab = 'all' | 'anime' | 'comic';

const POPULAR_SEARCH_KEYWORDS = [
  'One Piece',
  'Solo Leveling',
  'Jujutsu Kaisen',
  'Sousou no Frieren',
  'Bleach',
  'Kimetsu no Yaiba',
  'Chainsaw Man',
  'Naruto',
  'Attack on Titan',
  'Martial Peak',
];

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  const typeParam = (searchParams.get('type') as SearchFilterTab) || 'all';

  const { playBlip } = useCyberSound();
  const [inputVal, setInputVal] = useState(queryParam);
  const activeFilter = typeParam;

  const hasSearch = queryParam.trim().length >= 2;

  // Search Anime
  const { data: animeResults, isLoading: isAnimeLoading } = useQuery({
    queryKey: ['search', 'anime', queryParam],
    queryFn: () => animeApi.searchAnime(queryParam.trim()),
    enabled: hasSearch && (activeFilter === 'all' || activeFilter === 'anime'),
    staleTime: 1000 * 60 * 5,
  });

  // Search Comics
  const { data: comicData, isLoading: isComicLoading } = useQuery({
    queryKey: ['search', 'comic', queryParam],
    queryFn: () => comicApi.searchComic(queryParam.trim()),
    enabled: hasSearch && (activeFilter === 'all' || activeFilter === 'comic'),
    staleTime: 1000 * 60 * 5,
  });

  const animeList = animeResults || [];
  const comicList = comicData?.komikList || [];

  const isLoading =
    hasSearch &&
    ((activeFilter === 'all' && (isAnimeLoading || isComicLoading)) ||
      (activeFilter === 'anime' && isAnimeLoading) ||
      (activeFilter === 'comic' && isComicLoading));

  const totalResults =
    (activeFilter === 'all' || activeFilter === 'anime' ? animeList.length : 0) +
    (activeFilter === 'all' || activeFilter === 'comic' ? comicList.length : 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim().length >= 2) {
      playBlip('click');
      setSearchParams({ q: inputVal.trim(), type: activeFilter });
    }
  };

  const handleSelectKeyword = (kw: string) => {
    playBlip('switch');
    setInputVal(kw);
    setSearchParams({ q: kw, type: activeFilter });
  };

  return (
    <div className="space-y-8">
      {/* Header Search Box */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-950/40 via-zinc-900 to-zinc-950 p-6 md:p-8 border border-zinc-800/80 shadow-2xl">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-red-600/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl mx-auto space-y-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/80 border border-red-800/50 text-red-400 text-xs font-mono">
            <Search className="w-3.5 h-3.5 text-red-500" />
            <span>GLOBAL NEXUS SEARCH</span>
          </div>

          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-white font-mono">
            Query Anime, Donghua & Comics
          </h1>

          {/* Search Form */}
          <form onSubmit={handleSubmit} className="relative flex items-center shadow-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Search across all anime, donghua, manga, and manhwa..."
              className="w-full pl-12 pr-28 py-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-700 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 font-mono"
            />
            {inputVal && (
              <button
                type="button"
                onClick={() => {
                  setInputVal('');
                  setSearchParams({});
                }}
                className="absolute right-20 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-mono font-bold shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-all"
            >
              Search
            </button>
          </form>

          {/* Filter Tabs */}
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() => {
                playBlip('switch');
                setSearchParams({ ...(queryParam ? { q: queryParam } : {}), type: 'all' });
              }}
              className={`px-4 py-1.5 rounded-xl text-xs font-mono font-medium transition-all ${
                activeFilter === 'all'
                  ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.3)]'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              All Channels ({totalResults})
            </button>
            <button
              onClick={() => {
                playBlip('switch');
                setSearchParams({ ...(queryParam ? { q: queryParam } : {}), type: 'anime' });
              }}
              className={`px-4 py-1.5 rounded-xl text-xs font-mono font-medium transition-all ${
                activeFilter === 'anime'
                  ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.3)]'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              Anime Only ({animeList.length})
            </button>
            <button
              onClick={() => {
                playBlip('switch');
                setSearchParams({ ...(queryParam ? { q: queryParam } : {}), type: 'comic' });
              }}
              className={`px-4 py-1.5 rounded-xl text-xs font-mono font-medium transition-all ${
                activeFilter === 'comic'
                  ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.3)]'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              Comics Only ({comicList.length})
            </button>
          </div>
        </div>
      </div>

      {/* Suggested keywords when idle */}
      {!hasSearch && (
        <div className="space-y-4 max-w-3xl mx-auto p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 text-center">
          <div className="flex items-center justify-center gap-2 text-xs font-mono text-zinc-400">
            <TrendingUp className="w-4 h-4 text-red-500" />
            <span>Popular Trending Queries</span>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {POPULAR_SEARCH_KEYWORDS.map((kw) => (
              <button
                key={kw}
                onClick={() => handleSelectKeyword(kw)}
                className="px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-red-600/50 text-xs font-mono text-zinc-300 hover:text-white transition-all"
              >
                {kw}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results Section */}
      {isLoading ? (
        <SkeletonGrid count={12} />
      ) : hasSearch && totalResults === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-zinc-900/30 border border-zinc-800">
          <Search className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-zinc-300 font-mono">No Matching Media</h3>
          <p className="text-zinc-500 text-sm mt-1">
            No anime or comics found for &ldquo;{queryParam}&rdquo;. Try broadening your query terms.
          </p>
        </div>
      ) : hasSearch ? (
        <div className="space-y-10">
          {/* Anime Results */}
          {(activeFilter === 'all' || activeFilter === 'anime') && animeList.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-zinc-800/80">
                <Tv className="w-4 h-4 text-red-500" />
                <h3 className="text-base font-bold font-mono text-white">
                  Anime Matches ({animeList.length})
                </h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {animeList.map((anime) => (
                  <AnimeCard
                    key={anime.animeId || anime.title}
                    id={anime.animeId}
                    title={anime.title}
                    poster={anime.poster}
                    score={anime.score}
                    href={anime.href}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Comic Results */}
          {(activeFilter === 'all' || activeFilter === 'comic') && comicList.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-zinc-800/80">
                <BookOpen className="w-4 h-4 text-cyan-500" />
                <h3 className="text-base font-bold font-mono text-white">
                  Comic Matches ({comicList.length})
                </h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {comicList.map((comic) => (
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
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default SearchPage;
