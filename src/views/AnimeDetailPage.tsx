'use client';

import React, { useState } from 'react';
import { useParams, useLocation, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import {
  Star,
  Play,
  Bookmark,
  Share2,
  Calendar,
  Clock,
  Tv,
  Film,
  Sparkles,
  Download,
  Search,
  ListFilter,
  CheckCircle2,
  Info,
  Users,
  Flame,
  ArrowLeft,
  Dices,
} from 'lucide-react';
import { animeApi } from '../api/animeApi';
import { AnimeCard } from '../components/cards/AnimeCard';
import { useBookmarks } from '../hooks/useBookmarks';
import { useCyberSound } from '../hooks/useCyberSound';
import { ShareModal } from '../components/modals/ShareModal';
import { formatWatchHref, cleanEpisodeSlug } from '../utils/urlHelpers';

export const AnimeDetailPage: React.FC = () => {
  const params = useParams<{ slug?: string; '*'?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { playBlip } = useCyberSound();
  const { isBookmarked, toggleBookmark } = useBookmarks();

  const rawSlug = params.slug || params['*'] || '';
  const isDonghua = location.pathname.startsWith('/donghua');

  const [shareOpen, setShareOpen] = useState(false);
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);
  const [epSearchQuery, setEpSearchQuery] = useState('');
  const [epSortOrder, setEpSortOrder] = useState<'desc' | 'asc'>('desc');

  const { data: anime, isLoading, error } = useQuery({
    queryKey: ['anime', 'detail', rawSlug, isDonghua],
    queryFn: () => animeApi.getAnimeDetail(rawSlug, isDonghua),
    enabled: Boolean(rawSlug),
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

  if (error || !anime) {
    return (
      <div className="p-12 text-center rounded-3xl bg-zinc-900/60 border border-red-900/40 space-y-4">
        <Info className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold font-mono text-white">Anime Archive Not Found</h2>
        <p className="text-zinc-400 text-sm max-w-md mx-auto">
          The requested series telemetry is unavailable or the upstream database is synchronizing.
        </p>
        <div className="pt-2">
          <button
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-mono font-bold transition-all"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const bookmarked = isBookmarked(rawSlug);
  const episodeList = anime.episodeList || [];

  // Filter and sort episodes
  const filteredEpisodes = episodeList
    .filter((ep) => {
      const q = epSearchQuery.toLowerCase();
      return (
        ep.title.toLowerCase().includes(q) ||
        (ep.eps !== undefined && ep.eps.toString().includes(q))
      );
    })
    .sort((a, b) => {
      const epA = typeof a.eps === 'number' ? a.eps : parseInt(a.eps || '0', 10) || 0;
      const epB = typeof b.eps === 'number' ? b.eps : parseInt(b.eps || '0', 10) || 0;
      return epSortOrder === 'desc' ? epB - epA : epA - epB;
    });

  const firstEpisode = episodeList[episodeList.length - 1] || episodeList[0];
  const latestEpisode = episodeList[0];

  const handleRandomEpisode = () => {
    if (episodeList.length === 0) return;
    playBlip('success');
    const pick = episodeList[Math.floor(Math.random() * episodeList.length)];
    const epSlug = cleanEpisodeSlug(pick.episodeId || pick.href);
    navigate(`/watch/${epSlug}`);
  };

  return (
    <div className="space-y-10">
      {/* Back Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to feeds</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              playBlip('switch');
              toggleBookmark({
                id: rawSlug,
                title: anime.title,
                poster: anime.poster,
                slug: rawSlug,
                score: anime.score,
                status: anime.status,
                type: isDonghua ? 'donghua' : 'anime',
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
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
            title="Share Anime"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hero Header Section */}
      <div className="relative overflow-hidden rounded-3xl bg-zinc-900/80 border border-zinc-800/80 p-6 md:p-8 backdrop-blur-xl shadow-2xl">
        {/* Ambient poster blur background */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-10 blur-3xl pointer-events-none scale-125"
          style={{ backgroundImage: `url(${anime.poster})` }}
        />

        <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
          {/* Poster */}
          <div className="w-full sm:w-64 flex-shrink-0 mx-auto md:mx-0">
            <div className="relative aspect-[3/4.2] rounded-2xl overflow-hidden border border-zinc-700/80 shadow-[0_0_30px_rgba(0,0,0,0.8)] group">
              <img
                src={anime.poster}
                alt={anime.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://picsum.photos/seed/' + encodeURIComponent(rawSlug) + '/400/600';
                }}
              />
              {anime.score && (
                <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/80 backdrop-blur-md border border-amber-500/50 text-amber-400 text-xs font-mono font-bold">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <span>{anime.score}</span>
                </div>
              )}
            </div>

            {/* Quick Action buttons below poster on desktop */}
            <div className="mt-4 flex flex-col gap-2">
              {latestEpisode && (
                <Link
                  to={formatWatchHref(latestEpisode.episodeId || latestEpisode.href)}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Watch Latest (Ep {latestEpisode.eps || 'Latest'})</span>
                </Link>
              )}
              {firstEpisode && firstEpisode !== latestEpisode && (
                <Link
                  to={formatWatchHref(firstEpisode.episodeId || firstEpisode.href)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-mono text-xs font-semibold border border-zinc-800 transition-all"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Start from Ep 1</span>
                </Link>
              )}
              {episodeList.length > 1 && (
                <button
                  onClick={handleRandomEpisode}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-white font-mono text-xs border border-zinc-800/80 transition-all"
                >
                  <Dices className="w-3.5 h-3.5" />
                  <span>Random Episode</span>
                </button>
              )}
            </div>
          </div>

          {/* Details Column */}
          <div className="flex-1 space-y-5">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full bg-red-950/80 border border-red-800/60 text-red-400 text-xs font-mono">
                  {anime.status || 'Broadcasting'}
                </span>
                {anime.type && (
                  <span className="px-2.5 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-mono">
                    {anime.type}
                  </span>
                )}
                {anime.season && (
                  <span className="px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-800/60 text-cyan-400 text-xs font-mono">
                    {anime.season}
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white font-mono tracking-tight">
                {anime.title}
              </h1>
              {anime.japanese && (
                <p className="text-zinc-400 font-mono text-xs sm:text-sm mt-1">{anime.japanese}</p>
              )}
            </div>

            {/* Spec Matrix Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 text-xs font-mono">
              <div>
                <span className="text-zinc-500 uppercase block text-[10px]">Episodes</span>
                <span className="text-zinc-200 font-semibold">{anime.episodes || episodeList.length || 'Ongoing'}</span>
              </div>
              <div>
                <span className="text-zinc-500 uppercase block text-[10px]">Studio</span>
                <span className="text-zinc-200 font-semibold line-clamp-1">{anime.studios || 'Production Desk'}</span>
              </div>
              <div>
                <span className="text-zinc-500 uppercase block text-[10px]">Duration</span>
                <span className="text-zinc-200 font-semibold">{anime.duration || '24 min'}</span>
              </div>
              <div>
                <span className="text-zinc-500 uppercase block text-[10px]">Aired</span>
                <span className="text-zinc-200 font-semibold">{anime.aired || 'Winter 2026'}</span>
              </div>
              <div>
                <span className="text-zinc-500 uppercase block text-[10px]">Rating</span>
                <span className="text-zinc-200 font-semibold">{anime.rating || 'PG-13'}</span>
              </div>
              <div>
                <span className="text-zinc-500 uppercase block text-[10px]">Demographic</span>
                <span className="text-zinc-200 font-semibold">{anime.demographics || 'Shounen'}</span>
              </div>
            </div>

            {/* Genre Chips */}
            {anime.genreList && anime.genreList.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {anime.genreList.map((g) => (
                  <Link
                    key={g.title}
                    to={`/genres?slug=${g.title.toLowerCase()}`}
                    className="px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-red-600/60 text-xs font-mono transition-colors"
                  >
                    #{g.title}
                  </Link>
                ))}
              </div>
            )}

            {/* Synopsis */}
            {anime.synopsis && (
              <div className="space-y-2">
                <h3 className="text-xs font-mono uppercase text-zinc-400 font-bold tracking-wider">
                  Synopsis / Overview
                </h3>
                <p
                  className={`text-sm text-zinc-300 leading-relaxed font-sans ${
                    !synopsisExpanded ? 'line-clamp-4' : ''
                  }`}
                >
                  {typeof anime.synopsis === 'string' ? anime.synopsis : JSON.stringify(anime.synopsis)}
                </p>
                {typeof anime.synopsis === 'string' && anime.synopsis.length > 250 && (
                  <button
                    onClick={() => setSynopsisExpanded(!synopsisExpanded)}
                    className="text-xs font-mono text-red-400 hover:text-red-300 underline underline-offset-4"
                  >
                    {synopsisExpanded ? 'Show less' : 'Read full synopsis'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Episodes Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800/80">
          <div className="flex items-center gap-2">
            <Tv className="w-5 h-5 text-red-500" />
            <h2 className="text-xl font-bold font-mono text-white">
              Episodes Stream Matrix ({episodeList.length})
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Episode Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
              <input
                type="text"
                value={epSearchQuery}
                onChange={(e) => setEpSearchQuery(e.target.value)}
                placeholder="Find episode..."
                className="pl-8 pr-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-red-500 w-36 sm:w-48"
              />
            </div>

            {/* Sort Toggle */}
            <button
              onClick={() => setEpSortOrder(epSortOrder === 'desc' ? 'asc' : 'desc')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300 hover:text-white"
            >
              <ListFilter className="w-3.5 h-3.5 text-red-400" />
              <span>{epSortOrder === 'desc' ? 'Newest' : 'Oldest'}</span>
            </button>
          </div>
        </div>

        {filteredEpisodes.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-zinc-900/30 border border-zinc-800">
            <p className="text-zinc-500 font-mono text-xs">No episodes match your search criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredEpisodes.map((ep) => {
              const epSlug = cleanEpisodeSlug(ep.episodeId || ep.href);
              return (
                <Link
                  key={ep.episodeId || ep.title}
                  to={`/watch/${epSlug}`}
                  className="group relative flex items-center justify-between p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-red-600/60 hover:bg-zinc-900 hover:shadow-[0_0_20px_rgba(220,38,38,0.2)] transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-zinc-800 group-hover:bg-red-600 flex items-center justify-center flex-shrink-0 transition-colors">
                      <Play className="w-3.5 h-3.5 text-zinc-300 group-hover:text-white fill-current" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-mono font-bold text-zinc-200 group-hover:text-white truncate">
                        {ep.title}
                      </h4>
                      <span className="text-[10px] font-mono text-zinc-500 block">
                        {ep.date || 'Broadcasting'}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Voice Actors Showcase */}
      {anime.voiceActors && anime.voiceActors.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-800/80">
            <Users className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
              Character & Seiyuu Dossier
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {anime.voiceActors.map((cast, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/80 font-mono text-xs space-y-1"
              >
                <span className="text-red-400 font-bold block truncate">{cast.character}</span>
                <span className="text-zinc-300 block truncate">{cast.seiyuu}</span>
                <span className="text-[10px] text-zinc-500 block">{cast.role}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Batch Downloads if available */}
      {anime.batch && (
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Download className="w-5 h-5 text-red-500" />
            <div>
              <h4 className="text-sm font-bold font-mono text-white">{anime.batch.title}</h4>
              <p className="text-xs text-zinc-400 font-mono">Full season archive high-speed batch download</p>
            </div>
          </div>
          <a
            href={anime.batch.href}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-mono transition-colors"
          >
            Download Batch
          </a>
        </div>
      )}

      {/* Related anime */}
      {anime.relatedMatches && anime.relatedMatches.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold font-mono text-white">Related Broadcasts</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            {anime.relatedMatches.slice(0, 6).map((rel) => (
              <AnimeCard
                key={rel.animeId || rel.title}
                id={rel.animeId}
                title={rel.title}
                poster={rel.poster}
                href={rel.href}
              />
            ))}
          </div>
        </div>
      )}

      {/* Share Modal */}
      <ShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        title={anime.title}
        url={typeof window !== 'undefined' ? window.location.href : ''}
      />
    </div>
  );
};

export default AnimeDetailPage;
