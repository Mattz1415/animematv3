'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Flame,
  CheckCircle,
  Sparkles,
  ChevronRight,
  Play,
  BookOpen,
  Star,
  Zap,
  Dices,
  Tv,
  Film,
  TrendingUp,
} from 'lucide-react';
import { animeApi } from '../api/animeApi';
import { comicApi } from '../api/comicApi';
import { AnimeCard } from '../components/cards/AnimeCard';
import { SkeletonGrid } from '../components/cards/SkeletonCard';
import { ComicCard } from '../components/cards/ComicCard';

type HomeTab = 'all' | 'ongoing' | 'completed' | 'donghua' | 'comics';

export const HomePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<HomeTab>('all');

  const { data: homeData, isLoading: isAnimeLoading } = useQuery({
    queryKey: ['anime', 'home'],
    queryFn: animeApi.getHome,
  });

  const { data: donghuaData, isLoading: isDonghuaLoading } = useQuery({
    queryKey: ['donghua', 'home'],
    queryFn: animeApi.getDonghuaHome,
  });

  const { data: comicData, isLoading: isComicLoading } = useQuery({
    queryKey: ['comic', 'latest', 1],
    queryFn: () => comicApi.getLatest(1),
  });

  const ongoingList = homeData?.ongoing?.animeList || [];
  const completedList = homeData?.completed?.animeList || [];
  const donghuaList = donghuaData?.latest_release || [];
  const latestComics = comicData?.komikList?.slice(0, 6) || [];

  // Hero Spotlight item
  const spotlightAnime = ongoingList[0];

  const tabs: { id: HomeTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'all', label: 'All Feeds', icon: TrendingUp },
    { id: 'ongoing', label: 'Ongoing', icon: Flame },
    { id: 'completed', label: 'Completed', icon: CheckCircle },
    { id: 'donghua', label: 'Donghua', icon: Sparkles },
    { id: 'comics', label: 'Comics', icon: BookOpen },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-10"
    >
      {/* Hero Spotlight Section */}
      {spotlightAnime && (
        <section className="relative w-full rounded-3xl overflow-hidden bg-zinc-950 border border-zinc-800/80 shadow-[0_0_60px_rgba(220,38,38,0.2)]">
          <div className="relative aspect-[21/9] min-h-[380px] md:min-h-[460px] w-full">
            {/* Background Backdrop Image */}
            <img
              src={spotlightAnime.poster}
              alt={spotlightAnime.title}
              className="absolute inset-0 w-full h-full object-cover object-center filter blur-md brightness-35 scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/75 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/60 to-transparent" />

            {/* Spotlight Content */}
            <div className="relative z-10 h-full max-w-7xl mx-auto px-6 sm:px-10 flex flex-col md:flex-row items-center md:items-end pb-10 pt-16 gap-8">
              {/* Poster frame */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="hidden sm:block w-44 md:w-56 aspect-[3/4.2] rounded-2xl overflow-hidden border-2 border-red-600/60 shadow-[0_0_35px_rgba(220,38,38,0.45)] flex-shrink-0"
              >
                <img
                  src={spotlightAnime.poster}
                  alt={spotlightAnime.title}
                  className="w-full h-full object-cover"
                />
              </motion.div>

              {/* Text details */}
              <div className="flex-1 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-lg text-xs font-mono font-bold uppercase tracking-wider bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.6)]">
                    FEATURED ONGOING
                  </span>
                  {spotlightAnime.releaseDay && (
                    <span className="text-xs font-mono text-cyan-400">
                      Drops every {spotlightAnime.releaseDay}
                    </span>
                  )}
                </div>

                <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight line-clamp-2">
                  {spotlightAnime.title}
                </h1>

                <div className="flex items-center gap-2 text-xs sm:text-sm text-zinc-300 font-mono">
                  <span className="text-red-400 font-bold">
                    Latest: Ep {spotlightAnime.episodes}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{spotlightAnime.latestReleaseDate || 'Broadcast live'}</span>
                  {spotlightAnime.score && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="flex items-center gap-1 text-amber-400 font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        {spotlightAnime.score}
                      </span>
                    </>
                  )}
                </div>

                {/* CTAs */}
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                    <Link
                      to={`/anime/${spotlightAnime.animeId}`}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm shadow-[0_0_25px_rgba(220,38,38,0.5)] transition-all"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>Watch Series</span>
                    </Link>
                  </motion.div>

                  <Link
                    to="/schedule"
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/60 text-sm font-semibold transition-colors"
                  >
                    <span>Release Schedule</span>
                  </Link>

                  <Link
                    to="/anime/one-piece-sub-indo"
                    className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-950/70 hover:bg-amber-900 text-amber-300 border border-amber-800/60 text-sm font-mono font-semibold transition-colors"
                  >
                    <Dices className="w-4 h-4" />
                    <span>Surprise Me</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Easy Filter Tabs Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-850 overflow-x-auto no-scrollbar gap-2">
        <div className="flex items-center gap-1.5 p-1 bg-zinc-950 rounded-2xl border border-zinc-850">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                  isActive
                    ? 'text-white bg-red-600 shadow-[0_0_20px_rgba(220,38,38,0.4)]'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-zinc-500">
          <span>Synced with Otakudesu & Komikindo</span>
        </div>
      </div>

      {/* Ongoing Anime Section */}
      {(activeTab === 'all' || activeTab === 'ongoing') && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Flame className="w-5 h-5 text-red-500 animate-pulse" />
              <h2 className="text-lg sm:text-xl font-bold text-zinc-100 uppercase tracking-wider font-mono">
                Ongoing Releases
              </h2>
              <span className="text-xs text-zinc-500 font-mono hidden sm:inline">
                (Otakudesu Live Feeds)
              </span>
            </div>
            <Link
              to="/ongoing"
              className="flex items-center gap-1 text-xs font-mono text-zinc-400 hover:text-red-400 transition-colors"
            >
              <span>View All ({ongoingList.length})</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {isAnimeLoading ? (
            <SkeletonGrid count={6} />
          ) : ongoingList.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {ongoingList.slice(0, 12).map((item) => (
                <AnimeCard
                  key={item.animeId}
                  id={item.animeId}
                  title={item.title}
                  poster={item.poster}
                  episodes={item.episodes}
                  releaseDay={item.releaseDay}
                  latestReleaseDate={item.latestReleaseDate}
                  href={item.href}
                />
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-zinc-500 font-mono">
              No ongoing anime data available.
            </div>
          )}
        </section>
      )}

      {/* Completed Anime Section */}
      {(activeTab === 'all' || activeTab === 'completed') && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CheckCircle className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg sm:text-xl font-bold text-zinc-100 uppercase tracking-wider font-mono">
                Completed Series
              </h2>
              <span className="text-xs text-zinc-500 font-mono hidden sm:inline">
                (Binge Ready)
              </span>
            </div>
            <Link
              to="/ongoing?type=completed"
              className="flex items-center gap-1 text-xs font-mono text-zinc-400 hover:text-cyan-400 transition-colors"
            >
              <span>View All</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {isAnimeLoading ? (
            <SkeletonGrid count={6} />
          ) : completedList.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {completedList.slice(0, 12).map((item) => (
                <AnimeCard
                  key={item.animeId}
                  id={item.animeId}
                  title={item.title}
                  poster={item.poster}
                  episodes={item.episodes}
                  score={item.score}
                  status="Completed"
                  latestReleaseDate={item.lastReleaseDate}
                  href={item.href}
                />
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-zinc-500 font-mono">
              No completed series available.
            </div>
          )}
        </section>
      )}

      {/* Donghua Showcase */}
      {(activeTab === 'all' || activeTab === 'donghua') && donghuaList.length > 0 && (
        <section className="space-y-4 p-6 rounded-3xl bg-zinc-950 border border-cyan-900/40 shadow-[0_0_35px_rgba(6,182,212,0.1)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg sm:text-xl font-bold text-zinc-100 uppercase tracking-wider font-mono">
                Donghua Spotlight (Anichin)
              </h2>
            </div>
            <Link
              to="/donghua"
              className="flex items-center gap-1 text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <span>Explore All Donghua</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {donghuaList.slice(0, 6).map((item) => (
              <AnimeCard
                key={item.slug}
                id={item.slug}
                title={item.title}
                poster={item.poster}
                episodes={item.current_episode}
                status={item.status}
                type="donghua"
              />
            ))}
          </div>
        </section>
      )}

      {/* Latest Manga / Comics Preview */}
      {(activeTab === 'all' || activeTab === 'comics') && latestComics.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <BookOpen className="w-5 h-5 text-red-500" />
              <h2 className="text-lg sm:text-xl font-bold text-zinc-100 uppercase tracking-wider font-mono">
                Trending Comics & Manga
              </h2>
              <span className="text-xs text-zinc-500 font-mono hidden sm:inline">
                (Komikindo)
              </span>
            </div>
            <Link
              to="/comics"
              className="flex items-center gap-1 text-xs font-mono text-zinc-400 hover:text-red-400 transition-colors"
            >
              <span>Browse All Comics</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {latestComics.map((comic) => (
              <ComicCard
                key={comic.slug}
                slug={comic.slug}
                title={comic.title}
                image={comic.image}
                type={comic.type}
                rating={comic.rating}
                latestChapter={comic.latestChapter}
              />
            ))}
          </div>
        </section>
      )}
    </motion.div>
  );
};

export default HomePage;
