'use client';

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bookmark,
  Clock,
  BookOpen,
  Trash2,
  Download,
  Sparkles,
  Play,
  Film,
  ExternalLink,
  HardDrive,
  CheckCircle2,
  FolderHeart,
} from 'lucide-react';
import { useBookmarks } from '../hooks/useBookmarks';
import { useWatchHistory } from '../hooks/useWatchHistory';
import { useReadingHistory } from '../hooks/useReadingHistory';
import { useCyberSound } from '../hooks/useCyberSound';
import { LibraryBackupModal } from '../components/modals/LibraryBackupModal';
import { AnimeCard } from '../components/cards/AnimeCard';
import { ComicCard } from '../components/cards/ComicCard';
import { formatWatchHref } from '../utils/urlHelpers';

type LibraryTab = 'bookmarks' | 'watch_history' | 'reading_history';
type BookmarkFilter = 'all' | 'anime' | 'comic' | 'donghua';

export const LibraryPage: React.FC = () => {
  const { playBlip } = useCyberSound();
  const { bookmarks, toggleBookmark } = useBookmarks();
  const { history: watchHistory, clearHistory: clearWatchHistory, removeItem: removeWatchItem } = useWatchHistory();
  const { readingHistory, clearReadingHistory, removeItem: removeReadingItem } = useReadingHistory();

  const [activeTab, setActiveTab] = useState<LibraryTab>('bookmarks');
  const [bmFilter, setBmFilter] = useState<BookmarkFilter>('all');
  const [backupModalOpen, setBackupModalOpen] = useState(false);

  // Filter bookmarks
  const filteredBookmarks = bookmarks.filter((b) => {
    if (bmFilter === 'all') return true;
    return b.type === bmFilter;
  });

  const handleClearHistory = () => {
    playBlip('switch');
    if (activeTab === 'watch_history') {
      if (window.confirm('Clear all watch history?')) {
        clearWatchHistory();
      }
    } else if (activeTab === 'reading_history') {
      if (window.confirm('Clear all reading history?')) {
        clearReadingHistory();
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-950/40 via-zinc-900 to-zinc-950 p-6 md:p-8 border border-zinc-800/80 shadow-2xl">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-red-600/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/80 border border-red-800/50 text-red-400 text-xs font-mono">
              <FolderHeart className="w-3.5 h-3.5 text-red-500" />
              <span>OFFLINE STORAGE VAULT</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-white font-mono flex items-center gap-3">
              User Data & Archive Vault
            </h1>
            <p className="text-zinc-400 text-sm md:text-base max-w-2xl">
              Access your saved bookmarks, stream replay history, and chapter reading progress
              safely stored in your browser&apos;s persistent cache.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                playBlip('click');
                setBackupModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-mono hover:text-white transition-colors"
            >
              <HardDrive className="w-4 h-4 text-red-400" />
              <span>Backup / Restore</span>
            </button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="mt-6 pt-6 border-t border-zinc-800/80 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
          <div className="flex items-center gap-1.5 bg-zinc-900 p-1 rounded-xl border border-zinc-800 font-mono text-xs">
            <button
              onClick={() => {
                playBlip('switch');
                setActiveTab('bookmarks');
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'bookmarks'
                  ? 'bg-red-600 text-white font-bold shadow-[0_0_15px_rgba(220,38,38,0.3)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Bookmarks ({bookmarks.length})</span>
            </button>

            <button
              onClick={() => {
                playBlip('switch');
                setActiveTab('watch_history');
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'watch_history'
                  ? 'bg-red-600 text-white font-bold shadow-[0_0_15px_rgba(220,38,38,0.3)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Watch History ({watchHistory.length})</span>
            </button>

            <button
              onClick={() => {
                playBlip('switch');
                setActiveTab('reading_history');
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'reading_history'
                  ? 'bg-red-600 text-white font-bold shadow-[0_0_15px_rgba(220,38,38,0.3)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Reading History ({readingHistory.length})</span>
            </button>
          </div>

          {/* Tab Sub-actions */}
          {activeTab === 'bookmarks' && (
            <div className="flex items-center gap-1 font-mono text-xs">
              <button
                onClick={() => setBmFilter('all')}
                className={`px-2.5 py-1 rounded-lg ${
                  bmFilter === 'all' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setBmFilter('anime')}
                className={`px-2.5 py-1 rounded-lg ${
                  bmFilter === 'anime' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Anime
              </button>
              <button
                onClick={() => setBmFilter('comic')}
                className={`px-2.5 py-1 rounded-lg ${
                  bmFilter === 'comic' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Comics
              </button>
              <button
                onClick={() => setBmFilter('donghua')}
                className={`px-2.5 py-1 rounded-lg ${
                  bmFilter === 'donghua' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Donghua
              </button>
            </div>
          )}

          {activeTab !== 'bookmarks' && (
            <button
              onClick={handleClearHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono text-zinc-400 hover:text-red-400 hover:bg-zinc-900 border border-transparent hover:border-red-900/40 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>
      </div>

      {/* Bookmarks Tab Content */}
      {activeTab === 'bookmarks' && (
        <div>
          {filteredBookmarks.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-zinc-900/30 border border-zinc-800 space-y-3">
              <Bookmark className="w-12 h-12 text-zinc-600 mx-auto" />
              <h3 className="text-lg font-bold text-zinc-300 font-mono">No Bookmarks Saved</h3>
              <p className="text-zinc-500 text-sm max-w-sm mx-auto">
                Click the bookmark badge on any anime or comic card to keep it in your offline library.
              </p>
              <div className="pt-2">
                <Link
                  to="/"
                  className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-mono font-bold"
                >
                  Explore Catalog
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filteredBookmarks.map((bm) => {
                if (bm.type === 'comic') {
                  return (
                    <ComicCard
                      key={bm.id}
                      slug={bm.slug}
                      title={bm.title}
                      image={bm.poster}
                      rating={bm.score}
                    />
                  );
                }
                return (
                  <AnimeCard
                    key={bm.id}
                    id={bm.id}
                    title={bm.title}
                    poster={bm.poster}
                    score={bm.score}
                    status={bm.status}
                    type={bm.type === 'donghua' ? 'donghua' : 'anime'}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Watch History Tab Content */}
      {activeTab === 'watch_history' && (
        <div>
          {watchHistory.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-zinc-900/30 border border-zinc-800 space-y-3">
              <Clock className="w-12 h-12 text-zinc-600 mx-auto" />
              <h3 className="text-lg font-bold text-zinc-300 font-mono">No Watch History Yet</h3>
              <p className="text-zinc-500 text-sm max-w-sm mx-auto">
                Episodes you stream will be automatically logged here so you never lose your place.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {watchHistory.map((item) => (
                <div
                  key={item.episodeId}
                  className="group relative flex items-center justify-between p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800 hover:border-red-600/60 transition-all hover:shadow-[0_0_20px_rgba(220,38,38,0.2)]"
                >
                  <Link
                    to={formatWatchHref(item.episodeId)}
                    className="flex items-center gap-3 min-w-0 flex-1"
                  >
                    <div className="w-10 h-10 rounded-lg bg-zinc-800 group-hover:bg-red-600 flex items-center justify-center flex-shrink-0 transition-colors">
                      <Play className="w-4 h-4 text-zinc-300 group-hover:text-white fill-current" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-mono font-bold text-zinc-200 group-hover:text-white truncate">
                        {item.episodeTitle || item.animeTitle}
                      </h4>
                      <span className="text-[10px] font-mono text-zinc-500 block truncate">
                        {new Date(item.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  </Link>

                  <button
                    onClick={() => removeWatchItem(item.episodeId)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors ml-2"
                    title="Remove from history"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reading History Tab Content */}
      {activeTab === 'reading_history' && (
        <div>
          {readingHistory.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-zinc-900/30 border border-zinc-800 space-y-3">
              <BookOpen className="w-12 h-12 text-zinc-600 mx-auto" />
              <h3 className="text-lg font-bold text-zinc-300 font-mono">No Reading History Yet</h3>
              <p className="text-zinc-500 text-sm max-w-sm mx-auto">
                Comic and manga chapters you read are logged here with your last scroll progress.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {readingHistory.map((item) => (
                <div
                  key={item.chapterSlug}
                  className="group relative flex flex-col p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800 hover:border-red-600/60 transition-all hover:shadow-[0_0_20px_rgba(220,38,38,0.2)]"
                >
                  <div className="flex items-center justify-between">
                    <Link
                      to={`/read/${item.chapterSlug}`}
                      className="flex items-center gap-3 min-w-0 flex-1"
                    >
                      <div className="w-10 h-10 rounded-lg bg-zinc-800 group-hover:bg-red-600 flex items-center justify-center flex-shrink-0 transition-colors">
                        <BookOpen className="w-4 h-4 text-zinc-300 group-hover:text-white" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-mono font-bold text-zinc-200 group-hover:text-white truncate">
                          {item.chapterTitle || item.comicTitle}
                        </h4>
                        <span className="text-[10px] font-mono text-zinc-500 block truncate">
                          {item.comicTitle}
                        </span>
                      </div>
                    </Link>

                    <button
                      onClick={() => removeReadingItem(item.chapterSlug)}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors ml-2"
                      title="Remove from history"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {item.scrollProgress !== undefined && (
                    <div className="mt-2.5 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] font-mono">
                      <span className="text-zinc-500">Progress</span>
                      <span className="text-red-400 font-bold">{item.scrollProgress}%</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Backup & Restore Modal */}
      <LibraryBackupModal
        isOpen={backupModalOpen}
        onClose={() => setBackupModalOpen(false)}
        onDataImported={() => window.location.reload()}
      />
    </div>
  );
};

export default LibraryPage;
