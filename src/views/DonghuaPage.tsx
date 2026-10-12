'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import {
  Sparkles,
  Flame,
  Search,
  Tv,
  Film,
  TrendingUp,
  Layers,
  Zap,
} from 'lucide-react';
import { animeApi } from '../api/animeApi';
import { AnimeCard } from '../components/cards/AnimeCard';
import { SkeletonGrid } from '../components/cards/SkeletonCard';
import { useCyberSound } from '../hooks/useCyberSound';

export const DonghuaPage: React.FC = () => {
  const { playBlip } = useCyberSound();
  const [activeTab, setActiveTab] = useState<'latest' | 'ongoing'>('latest');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: homeData, isLoading: isHomeLoading } = useQuery({
    queryKey: ['donghua', 'home'],
    queryFn: animeApi.getDonghuaHome,
    staleTime: 1000 * 60 * 15,
  });

  const { data: ongoingData, isLoading: isOngoingLoading } = useQuery({
    queryKey: ['donghua', 'ongoing'],
    queryFn: animeApi.getDonghuaOngoing,
    staleTime: 1000 * 60 * 15,
  });

  const latestReleases = homeData?.latest_release || [];
  const ongoingDonghua = ongoingData || [];

  const currentList = activeTab === 'latest' ? latestReleases : ongoingDonghua;

  const filteredList = currentList.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isLoading = activeTab === 'latest' ? isHomeLoading : isOngoingLoading;

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-950/40 via-zinc-900 to-zinc-950 p-6 md:p-8 border border-zinc-800/80 shadow-2xl">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800/50 text-cyan-400 text-xs font-mono">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>CHINESE ANIMATION SECTOR</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-white font-mono flex items-center gap-3">
              Donghua Nexus
            </h1>
            <p className="text-zinc-400 text-sm md:text-base max-w-2xl">
              High-fidelity 3D cultivation, xianxia, martial arts, and wuxia Chinese animations
              with daily Indonesian sub sync via Anichin feeds.
            </p>
          </div>

          <div className="px-4 py-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-right font-mono">
            <span className="text-xs text-zinc-500 uppercase block">Broadcast Engine</span>
            <span className="text-xl font-bold text-cyan-400">Anichin Sync</span>
          </div>
        </div>

        {/* Tab switcher & Search */}
        <div className="mt-6 pt-6 border-t border-zinc-800/80 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
          <div className="flex items-center gap-2 bg-zinc-900 p-1 rounded-xl border border-zinc-800 font-mono text-xs">
            <button
              onClick={() => {
                playBlip('switch');
                setActiveTab('latest');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                activeTab === 'latest'
                  ? 'bg-cyan-600 text-white font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Latest Releases ({latestReleases.length})</span>
            </button>
            <button
              onClick={() => {
                playBlip('switch');
                setActiveTab('ongoing');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                activeTab === 'ongoing'
                  ? 'bg-cyan-600 text-white font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Ongoing Series ({ongoingDonghua.length})</span>
            </button>
          </div>

          {/* Quick search */}
          <div className="relative min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Donghua titles..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <SkeletonGrid count={12} />
      ) : filteredList.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-zinc-900/30 border border-zinc-800">
          <Film className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-zinc-300 font-mono">No Donghua Found</h3>
          <p className="text-zinc-500 text-sm mt-1">Try refining your search keyword or switching tabs.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredList.map((item) => {
            const rawId =
              item.slug ||
              (item.href ? item.href.replace(/^.*\/detail\//, '').replace(/^\//, '') : '');
            const id = rawId.startsWith('donghua-') ? rawId : `donghua-${rawId}`;

            return (
              <AnimeCard
                key={id || item.title}
                id={id}
                title={item.title}
                poster={item.poster || ''}
                episodes={item.current_episode}
                status={item.status || 'Ongoing'}
                type="donghua"
                href={`/donghua/${id}`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DonghuaPage;
