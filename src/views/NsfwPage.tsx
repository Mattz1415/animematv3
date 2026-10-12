'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lock,
  Unlock,
  ShieldAlert,
  Flame,
  Search,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Play,
  Film,
  Sparkles,
  Eye,
  EyeOff,
  X,
} from 'lucide-react';
import { nsfwApi } from '../api/nsfwApi';
import { useNsfwSafeGate } from '../hooks/useNsfwSafeGate';
import { AgeGateModal } from '../components/modals/AgeGateModal';
import { useCyberSound } from '../hooks/useCyberSound';
import { NsfwItem, NekoReleaseItem, NsfwDetail } from '../types/nsfw';

type NsfwTab = 'hentai' | 'jav' | 'neko';

export const NsfwPage: React.FC = () => {
  const { playBlip } = useCyberSound();
  const { isNsfwUnlocked, isModalOpen, triggerToggle, confirmAge, declineAge } = useNsfwSafeGate();

  const [activeTab, setActiveTab] = useState<NsfwTab>('hentai');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDetail, setSelectedDetail] = useState<{ title: string; url: string } | null>(null);

  // Queries for Hentai, JAV, Neko
  const { data: hentaiData, isLoading: isHentaiLoading } = useQuery({
    queryKey: ['nsfw', 'hentai', currentPage],
    queryFn: () => nsfwApi.getLatestHentai(currentPage),
    enabled: isNsfwUnlocked && activeTab === 'hentai' && !searchQuery,
  });

  const { data: javData, isLoading: isJavLoading } = useQuery({
    queryKey: ['nsfw', 'jav', currentPage],
    queryFn: () => nsfwApi.getLatestJav(currentPage),
    enabled: isNsfwUnlocked && activeTab === 'jav' && !searchQuery,
  });

  const { data: nekoData, isLoading: isNekoLoading } = useQuery({
    queryKey: ['nsfw', 'neko', currentPage],
    queryFn: () => nsfwApi.getNekoReleases(currentPage),
    enabled: isNsfwUnlocked && activeTab === 'neko' && !searchQuery,
  });

  // Search query
  const { data: searchResults, isLoading: isSearchLoading } = useQuery({
    queryKey: ['nsfw', 'search', searchQuery],
    queryFn: () => nsfwApi.searchNeko(searchQuery),
    enabled: isNsfwUnlocked && searchQuery.trim().length >= 2,
  });

  // Detail Modal query
  const { data: streamDetail, isLoading: isDetailLoading } = useQuery({
    queryKey: ['nsfw', 'detail', selectedDetail?.url],
    queryFn: () => (selectedDetail ? nsfwApi.getNekoDetail(selectedDetail.url) : null),
    enabled: Boolean(selectedDetail),
  });

  const isLoading =
    searchQuery.trim().length >= 2
      ? isSearchLoading
      : activeTab === 'hentai'
      ? isHentaiLoading
      : activeTab === 'jav'
      ? isJavLoading
      : isNekoLoading;

  // Locked Vault State
  if (!isNsfwUnlocked) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto space-y-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-3xl bg-red-950/60 border border-red-800/80 flex items-center justify-center shadow-[0_0_30px_rgba(220,38,38,0.3)]">
            <Lock className="w-10 h-10 text-red-500" />
          </div>
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-white text-[10px] font-bold">
            18+
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold font-mono text-white">Restricted Content Vault</h1>
          <p className="text-zinc-400 text-sm leading-relaxed">
            This module contains mature 18+ animation and content. Access is restricted under
            age verification compliance policies.
          </p>
        </div>

        <button
          onClick={() => {
            playBlip('switch');
            triggerToggle();
          }}
          className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all"
        >
          <Unlock className="w-4 h-4" />
          <span>Verify Age 18+ to Unlock</span>
        </button>

        <AgeGateModal
          isOpen={isModalOpen}
          onConfirm={() => confirmAge()}
          onDecline={() => declineAge()}
        />
      </div>
    );
  }

  // Active items
  const items = searchQuery.trim().length >= 2
    ? (searchResults || []).map((i) => ({ ...i, category: 'neko' as const }))
    : activeTab === 'hentai'
    ? hentaiData?.items || []
    : activeTab === 'jav'
    ? javData?.items || []
    : (nekoData?.items || []).map((i) => ({
        title: i.title,
        slug: i.url,
        url: i.url,
        thumbnail: i.thumb || i.thumbnail || '',
        date: i.upload_date,
        type: i.type,
        category: 'neko' as const,
      }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-950/60 via-zinc-900 to-zinc-950 p-6 md:p-8 border border-red-900/40 shadow-2xl">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-red-600/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/90 border border-red-800 text-red-400 text-xs font-mono">
              <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
              <span>MATURE ARCHIVE [UNLOCKED]</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-white font-mono flex items-center gap-3">
              18+ Mature Nexus
            </h1>
            <p className="text-zinc-400 text-sm md:text-base max-w-2xl">
              Nekopoi adult animation archive with stream links and direct media servers.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                playBlip('switch');
                triggerToggle(); // will lock
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-mono transition-colors"
            >
              <Lock className="w-4 h-4 text-red-400" />
              <span>Lock Vault</span>
            </button>
          </div>
        </div>

        {/* Tab switcher & Search */}
        <div className="mt-6 pt-6 border-t border-zinc-800/80 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
          <div className="flex items-center gap-1.5 bg-zinc-900 p-1 rounded-xl border border-zinc-800 font-mono text-xs">
            <button
              onClick={() => {
                playBlip('switch');
                setActiveTab('hentai');
                setSearchQuery('');
              }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'hentai' && !searchQuery
                  ? 'bg-red-600 text-white font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Latest Hentai
            </button>
            <button
              onClick={() => {
                playBlip('switch');
                setActiveTab('jav');
                setSearchQuery('');
              }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'jav' && !searchQuery
                  ? 'bg-red-600 text-white font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Latest JAV
            </button>
            <button
              onClick={() => {
                playBlip('switch');
                setActiveTab('neko');
                setSearchQuery('');
              }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'neko' && !searchQuery
                  ? 'bg-red-600 text-white font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Neko Releases
            </button>
          </div>

          {/* Adult Search */}
          <div className="relative min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search adult archive..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-red-500"
            />
          </div>
        </div>
      </div>

      {/* Content Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 animate-pulse">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-[3/4.2] bg-zinc-900 rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-zinc-900/30 border border-zinc-800">
          <Film className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-zinc-300 font-mono">No Archive Records</h3>
          <p className="text-zinc-500 text-sm mt-1">Adult telemetry upstream feeds may be syncing.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {items.map((item, idx) => {
            const thumb = item.thumbnail || 'https://picsum.photos/seed/nsfw' + idx + '/400/600';
            return (
              <div
                key={item.url || idx}
                onClick={() => setSelectedDetail({ title: item.title, url: item.url })}
                className="group relative cursor-pointer flex flex-col rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-red-600/60 transition-all hover:shadow-[0_0_20px_rgba(220,38,38,0.25)]"
              >
                <div className="relative aspect-[3/4.2] overflow-hidden bg-zinc-950">
                  <img
                    src={thumb}
                    alt={item.title}
                    className="w-full h-full object-cover blur-sm group-hover:blur-0 transition-all duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://picsum.photos/seed/nsfw' + idx + '/400/600';
                    }}
                  />
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors flex items-center justify-center">
                    <div className="p-3 rounded-full bg-red-600/80 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-4 h-4 fill-white" />
                    </div>
                  </div>
                </div>

                <div className="p-2.5 space-y-1">
                  <h4 className="text-xs font-mono font-bold text-zinc-200 group-hover:text-white line-clamp-2">
                    {item.title}
                  </h4>
                  {item.date && (
                    <span className="text-[10px] font-mono text-zinc-500 block truncate">
                      {item.date}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!searchQuery && (
        <div className="flex items-center justify-center gap-3 pt-6 border-t border-zinc-800/80">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1 || isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300 hover:text-white disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
          <span className="px-4 py-2 rounded-xl bg-zinc-950 border border-red-900/40 text-xs font-mono text-red-400 font-semibold">
            Page {currentPage}
          </span>
          <button
            onClick={() => setCurrentPage((p) => p + 1)}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300 hover:text-white"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Detail / Stream Modal */}
      {selectedDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-xl bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <button
              onClick={() => setSelectedDetail(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold font-mono text-white pr-8">
              {selectedDetail.title}
            </h3>

            {isDetailLoading ? (
              <div className="py-12 text-center font-mono text-xs text-zinc-400 animate-pulse">
                Resolving stream satellites...
              </div>
            ) : streamDetail ? (
              <div className="space-y-4">
                {streamDetail.streamUrl && (
                  <div className="aspect-video rounded-xl overflow-hidden bg-black border border-zinc-800">
                    <iframe
                      src={streamDetail.streamUrl}
                      className="w-full h-full border-0"
                      allowFullScreen
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}

                {streamDetail.synopsis && (
                  <p className="text-xs text-zinc-300 font-sans">{streamDetail.synopsis}</p>
                )}

                {streamDetail.streamServers && streamDetail.streamServers.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-mono text-zinc-400 uppercase">Stream Mirrors:</span>
                    <div className="flex flex-wrap gap-2">
                      {streamDetail.streamServers.map((srv, i) => (
                        <a
                          key={i}
                          href={srv.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono text-red-400 hover:border-red-600"
                        >
                          {srv.name || `Mirror ${i + 1}`}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-6 text-center space-y-3">
                <p className="text-xs text-zinc-400 font-mono">
                  Direct playback stream unavailable. Open via external upstream gateway.
                </p>
                <a
                  href={selectedDetail.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-mono font-bold"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open Stream Mirror</span>
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NsfwPage;
