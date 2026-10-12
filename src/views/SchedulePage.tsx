'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  Clock,
  Sparkles,
  Play,
  Film,
  Search,
  CheckCircle,
  Radio,
  ChevronRight,
} from 'lucide-react';
import { animeApi } from '../api/animeApi';
import { AnimeCard } from '../components/cards/AnimeCard';
import { SkeletonGrid } from '../components/cards/SkeletonCard';
import { useCyberSound } from '../hooks/useCyberSound';

const DAYS_OF_WEEK = [
  { id: 'all', label: 'All Days', short: 'ALL' },
  { id: 'senin', label: 'Senin / Monday', short: 'MON' },
  { id: 'selasa', label: 'Selasa / Tuesday', short: 'TUE' },
  { id: 'rabu', label: 'Rabu / Wednesday', short: 'WED' },
  { id: 'kamis', label: 'Kamis / Thursday', short: 'THU' },
  { id: 'jumat', label: 'Jumat / Friday', short: 'FRI' },
  { id: 'sabtu', label: 'Sabtu / Saturday', short: 'SAT' },
  { id: 'minggu', label: 'Minggu / Sunday', short: 'SUN' },
];

export const SchedulePage: React.FC = () => {
  const { playBlip } = useCyberSound();
  const [selectedDay, setSelectedDay] = useState<string>('all');
  const [filterQuery, setFilterQuery] = useState<string>('');

  const { data: scheduleData, isLoading, error } = useQuery({
    queryKey: ['anime', 'schedule'],
    queryFn: animeApi.getSchedule,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  const allDays = scheduleData || [];

  // Filter by selected day or show all
  const filteredSchedule = allDays
    .filter((dayGroup) => {
      if (selectedDay === 'all') return true;
      return dayGroup.day.toLowerCase().includes(selectedDay.toLowerCase());
    })
    .map((dayGroup) => {
      const list = dayGroup.animeList || dayGroup.anime_list || [];
      const filteredAnime = list.filter((anime) =>
        anime.title.toLowerCase().includes(filterQuery.toLowerCase())
      );
      return {
        ...dayGroup,
        animeList: filteredAnime,
      };
    })
    .filter((dayGroup) => dayGroup.animeList && dayGroup.animeList.length > 0);

  const totalAiring = allDays.reduce(
    (acc, day) => acc + (day.animeList?.length || day.anime_list?.length || 0),
    0
  );

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-950/40 via-zinc-900 to-zinc-950 p-6 md:p-8 border border-zinc-800/80 shadow-2xl">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-red-600/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/80 border border-red-800/50 text-red-400 text-xs font-mono">
              <Radio className="w-3.5 h-3.5 animate-pulse text-red-500" />
              <span>LIVE BROADCAST SCHEDULE</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-white font-mono flex items-center gap-3">
              <Calendar className="w-7 h-7 md:w-9 md:h-9 text-red-500" />
              Anime Airing Matrix
            </h1>
            <p className="text-zinc-400 text-sm md:text-base max-w-2xl">
              Track weekly ongoing simulcasts across Japanese networks and Indonesian fansubs.
              Synchronized daily with Otakudesu broadcast schedules.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="px-4 py-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-right font-mono">
              <span className="text-xs text-zinc-500 uppercase block">Weekly Active Airing</span>
              <span className="text-xl font-bold text-red-400">{totalAiring} Series</span>
            </div>
          </div>
        </div>

        {/* Filter controls */}
        <div className="mt-6 pt-6 border-t border-zinc-800/80 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          {/* Day selection tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
            {DAYS_OF_WEEK.map((day) => {
              const active = selectedDay === day.id;
              return (
                <button
                  key={day.id}
                  onClick={() => {
                    playBlip('switch');
                    setSelectedDay(day.id);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium whitespace-nowrap transition-all ${
                    active
                      ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]'
                      : 'bg-zinc-900/90 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-800'
                  }`}
                >
                  <span className="md:hidden">{day.short}</span>
                  <span className="hidden md:inline">{day.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick search inside schedule */}
          <div className="relative min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter weekly titles..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-zinc-900/90 border border-zinc-800 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-red-500 text-xs font-mono"
            />
          </div>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-8">
          <div className="h-8 w-48 bg-zinc-800 rounded animate-pulse" />
          <SkeletonGrid count={8} />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-8 rounded-2xl bg-zinc-900/50 border border-red-900/50 text-center space-y-4">
          <p className="text-red-400 font-mono text-sm">Failed to connect to broadcast satellite server.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-mono hover:bg-red-700"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Content list by day */}
      {!isLoading && filteredSchedule.length === 0 && (
        <div className="p-12 text-center rounded-2xl bg-zinc-900/30 border border-zinc-800">
          <Film className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-zinc-300 font-mono">No Scheduled Anime Found</h3>
          <p className="text-zinc-500 text-sm mt-1">Try clearing your search query or selecting a different broadcast day.</p>
        </div>
      )}

      {!isLoading && (
        <div className="space-y-10">
          {filteredSchedule.map((dayGroup) => {
            const list = dayGroup.animeList || [];
            return (
              <motion.section
                key={dayGroup.day}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                {/* Day Header */}
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 ring-4 ring-red-500/20" />
                    <h2 className="text-xl font-bold font-mono tracking-tight text-white flex items-center gap-2">
                      {dayGroup.day}
                      <span className="text-xs px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 font-normal">
                        {list.length} Airing
                      </span>
                    </h2>
                  </div>
                </div>

                {/* Day anime grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {list.map((anime) => {
                    const id =
                      anime.slug ||
                      anime.animeId ||
                      (anime.url ? anime.url.replace(/^\/anime\/anime\//, '').replace(/^\/anime\//, '').replace(/^\//, '') : '');

                    return (
                      <AnimeCard
                        key={id || anime.title}
                        id={id}
                        title={anime.title}
                        poster={anime.poster || ''}
                        releaseDay={dayGroup.day}
                        href={anime.url || anime.href}
                      />
                    );
                  })}
                </div>
              </motion.section>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SchedulePage;
