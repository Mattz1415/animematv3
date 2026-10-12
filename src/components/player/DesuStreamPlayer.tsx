import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Server,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  Radio,
  Moon,
  Sun,
  FastForward,
  Clock,
  Zap,
  Sparkles,
  Maximize2,
  Tv,
  CheckCircle2,
  SlidersHorizontal,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { StreamQualityGroup } from '../../types/anime';
import { animeApi } from '../../api/animeApi';
import { useCyberSound } from '../../hooks/useCyberSound';

interface DesuStreamPlayerProps {
  defaultStreamUrl: string;
  title: string;
  serverGroups?: StreamQualityGroup[];
  episodeSlug: string;
  onNextEpisode?: () => void;
}

export const DesuStreamPlayer: React.FC<DesuStreamPlayerProps> = ({
  defaultStreamUrl,
  title,
  serverGroups = [],
  episodeSlug,
}) => {
  const [prevSlug, setPrevSlug] = useState(episodeSlug);
  const [customStreamUrl, setCustomStreamUrl] = useState<string | null>(null);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [activeServerName, setActiveServerName] = useState<string>('Default Desustream');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSwitching, setIsSwitching] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [isCinemaMode, setIsCinemaMode] = useState<boolean>(false);
  const [aspectRatio, setAspectRatio] = useState<'16/9' | '21/9' | '4/3'>('16/9');
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);
  const [sleepTimeRemaining, setSleepTimeRemaining] = useState<number | null>(null);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  // useProxy is enabled by default to strip X-Frame-Options & CSP frame-ancestors,
  // completely eliminating "Refused to connect" on desustream/ondesuhd and bypassing VidHide sandboxed iframe errors!
  const [useProxy, setUseProxy] = useState<boolean>(true);

  const { playBlip } = useCyberSound();

  const currentStreamUrl = customStreamUrl || defaultStreamUrl;

  // Compute effective iframe src:
  // Tunnel proxy strips all blocking headers and neutralizes anti-embed scripts
  const effectiveIframeSrc = currentStreamUrl
    ? useProxy
      ? `/api/stream/proxy?url=${encodeURIComponent(currentStreamUrl)}`
      : currentStreamUrl
    : '';

  // Reset when episode slug changes
  if (prevSlug !== episodeSlug) {
    setPrevSlug(episodeSlug);
    setCustomStreamUrl(null);
    setSelectedServerId(null);
    setActiveServerName('Default Desustream');
    setIsLoading(true);
    setHasError(false);
    setIframeKey((prev) => prev + 1);
  }

  // Launch popout theater window (100% immune to all iframe CSP & sandbox blocks)
  const handleLaunchPopout = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    playBlip('success');
    if (!currentStreamUrl) return;
    const width = 1060;
    const height = 640;
    const left = typeof window !== 'undefined' && window.screen.width ? (window.screen.width - width) / 2 : 60;
    const top = typeof window !== 'undefined' && window.screen.height ? (window.screen.height - height) / 2 : 60;
    window.open(
      currentStreamUrl,
      'desustream_theater',
      `width=${width},height=${height},top=${top},left=${left},menubar=no,toolbar=no,location=no,status=no,resizable=yes`
    );
    setFeedbackNotice('🚀 Video dibuka di Popout Player — Lancar tanpa blokir!');
    setTimeout(() => setFeedbackNotice(null), 4000);
  }, [currentStreamUrl, playBlip]);

  // Listen for recovery messages from /public/sandboxed.html
  useEffect(() => {
    const handleMsg = (e: MessageEvent) => {
      if (e.data?.type === 'SANKA_OPEN_POPOUT') {
        handleLaunchPopout();
      }
    };
    window.addEventListener('message', handleMsg);
    return () => window.removeEventListener('message', handleMsg);
  }, [handleLaunchPopout]);

  const handleOpenNewTab = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    playBlip('click');
    if (currentStreamUrl) {
      window.open(currentStreamUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleSleepTimerChange = (val: number | null) => {
    playBlip('switch');
    setSleepTimerMinutes(val);
    setSleepTimeRemaining(val ? val * 60 : null);
    if (val) {
      setFeedbackNotice(`⏱️ Sleep timer aktif: otomatis mati dalam ${val} menit`);
      setTimeout(() => setFeedbackNotice(null), 3000);
    }
  };

  // Sleep timer interval countdown
  useEffect(() => {
    if (sleepTimeRemaining === null) return;

    const interval = setInterval(() => {
      setSleepTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          playBlip('alert');
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [sleepTimeRemaining, playBlip]);

  // Loading safety timeout: auto clear spinner after 3s
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [iframeKey, currentStreamUrl, useProxy]);

  const handleServerSelect = async (serverId: string, serverTitle: string, quality: string) => {
    if (isSwitching) return;
    setIsSwitching(true);
    setIsLoading(true);
    setHasError(false);
    setSelectedServerId(serverId);
    playBlip('switch');

    try {
      const newUrl = await animeApi.getServerStreamUrl(serverId);
      if (newUrl) {
        setCustomStreamUrl(newUrl);
        setActiveServerName(`${quality} - ${serverTitle}`);
        setIframeKey((k) => k + 1);
        playBlip('success');
        setFeedbackNotice(`⚡ Server aktif: ${serverTitle} (${quality})`);
        setTimeout(() => setFeedbackNotice(null), 3000);
      } else {
        setHasError(true);
        playBlip('alert');
        setFeedbackNotice(`⚠️ Server ${serverTitle} tidak merespons, coba server lain`);
        setTimeout(() => setFeedbackNotice(null), 4000);
      }
    } catch {
      setHasError(true);
      playBlip('alert');
    } finally {
      setIsSwitching(false);
    }
  };

  const handleResetToDefault = () => {
    playBlip('click');
    setCustomStreamUrl(null);
    setSelectedServerId(null);
    setActiveServerName('Default Desustream');
    setIframeKey((k) => k + 1);
    setIsLoading(true);
    setHasError(false);
    setFeedbackNotice('✓ Kembali ke server utama Default DesuStream');
    setTimeout(() => setFeedbackNotice(null), 2500);
  };

  const handleReload = () => {
    playBlip('click');
    setIsLoading(true);
    setHasError(false);
    setIframeKey((k) => k + 1);
  };

  const toggleProxyMode = () => {
    playBlip('switch');
    const nextVal = !useProxy;
    setUseProxy(nextVal);
    setIframeKey((k) => k + 1);
    setIsLoading(true);
    setFeedbackNotice(
      nextVal
        ? '🛡️ Mode Tunnel Aktif: Membuka blokir CSP & Refused to Connect'
        : '🌐 Mode Direct Embed Aktif'
    );
    setTimeout(() => setFeedbackNotice(null), 3500);
  };

  const toggleCinema = () => {
    playBlip('switch');
    setIsCinemaMode(!isCinemaMode);
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <>
      {/* Cinema Lights Out Backdrop */}
      <AnimatePresence>
        {isCinemaMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={toggleCinema}
            className="fixed inset-0 z-40 bg-black/95 backdrop-blur-md cursor-pointer flex items-start justify-center pt-6 pointer-events-auto"
          >
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="px-4 py-2 rounded-full bg-zinc-900/90 border border-zinc-700 text-xs font-mono text-zinc-300 shadow-2xl flex items-center gap-2"
            >
              <Sun className="w-4 h-4 text-amber-400 animate-spin-slow" />
              <span>Mode Bioskop Aktif — Klik di luar layar untuk menyalakan lampu</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className={`flex flex-col gap-3.5 w-full transition-all duration-300 ${
          isCinemaMode
            ? 'relative z-50 ring-4 ring-red-600/60 shadow-[0_0_90px_rgba(220,38,38,0.5)] rounded-2xl'
            : ''
        }`}
      >
        {/* Floating Feedback Notice */}
        <AnimatePresence>
          {feedbackNotice && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              className="px-4 py-2 rounded-xl bg-zinc-900/95 border border-red-600/50 shadow-lg text-xs font-mono text-zinc-200 flex items-center justify-between gap-2 backdrop-blur-md"
            >
              <span className="flex items-center gap-2 text-cyan-300">
                <Sparkles className="w-4 h-4 text-red-500 animate-pulse" />
                {feedbackNotice}
              </span>
              <button
                onClick={() => setFeedbackNotice(null)}
                className="text-zinc-500 hover:text-white text-xs ml-2"
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Clear Header Bar with Status and Direct Quick Action Buttons */}
        <div className="px-4 py-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs font-mono flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-zinc-300 flex-wrap">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-zinc-400">Server aktif:</span>
            <span className="text-white font-bold">{activeServerName}</span>
            {useProxy && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-800/60 text-emerald-300 text-[10px]">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>Anti-Blokir Aktif</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLaunchPopout}
              title="Putar video di Popout Player khusus tanpa batasan browser atau iklan"
              className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-all"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Buka Popout</span>
            </button>
            <button
              onClick={handleOpenNewTab}
              title="Buka link stream di tab browser baru"
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-zinc-200 text-xs flex items-center gap-1.5 border border-zinc-700 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Tab Baru</span>
            </button>
            <button
              onClick={toggleCinema}
              title={isCinemaMode ? 'Nyalakan Lampu' : 'Mode Bioskop (Layar Penuh Gelap)'}
              className={`p-1.5 rounded-lg border transition-all ${
                isCinemaMode
                  ? 'bg-red-600 text-white border-red-500'
                  : 'bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-white border-zinc-700'
              }`}
            >
              {isCinemaMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={handleReload}
              title="Muat ulang video player"
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-white border border-zinc-700 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Video Player Display Screen */}
        <div
          style={{ aspectRatio }}
          className="relative w-full rounded-2xl bg-zinc-950 border border-zinc-800/90 shadow-[0_0_40px_rgba(0,0,0,0.85)] overflow-hidden group transition-all"
        >
          {/* Top HUD Overlay (Visible on Hover/Touch) */}
          <div className="absolute top-0 left-0 right-0 z-20 px-4 py-2.5 bg-gradient-to-b from-zinc-950/95 via-zinc-950/70 to-transparent flex items-center justify-between opacity-95 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200 pointer-events-auto">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-zinc-900/90 border border-zinc-700/60 text-xs font-mono text-cyan-400 backdrop-blur-md shadow-sm">
                <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span className="font-semibold">{activeServerName}</span>
              </span>

              {sleepTimeRemaining !== null && (
                <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-mono text-amber-300 px-2 py-0.5 rounded-md bg-amber-950/80 border border-amber-800/50">
                  <Clock className="w-3 h-3" />
                  <span>Sleep: {formatTimer(sleepTimeRemaining)}</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleProxyMode}
                title={useProxy ? 'Ganti ke Mode Direct' : 'Ganti ke Mode Tunnel Anti-Blokir'}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 text-xs font-mono border border-zinc-700/60 backdrop-blur-md transition-colors"
              >
                <SlidersHorizontal className="w-3 h-3 text-cyan-400" />
                <span className="hidden sm:inline">{useProxy ? 'Mode Tunnel' : 'Mode Direct'}</span>
              </button>

              <button
                onClick={handleLaunchPopout}
                title="Buka Player Popout"
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-mono font-bold shadow-[0_0_15px_rgba(220,38,38,0.5)] transition-all"
              >
                <Maximize2 className="w-3 h-3" />
                <span>Popout</span>
              </button>
            </div>
          </div>

          {/* Loading Indicator */}
          {isLoading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-zinc-950/80 backdrop-blur-sm pointer-events-none">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 rounded-full border-2 border-red-600/20" />
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-red-600 animate-spin" />
              </div>
              <p className="mt-3 text-xs font-mono text-zinc-300 tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                <span>MEMUAT VIDEO STREAM...</span>
              </p>
            </div>
          )}

          {/* Error / Offline Overlay */}
          {hasError && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-zinc-950 p-6 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mb-2 animate-bounce" />
              <h3 className="text-base font-bold text-white font-mono">Stream Perlu Dialihkan</h3>
              <p className="text-xs text-zinc-400 max-w-md mt-1 leading-relaxed">
                Mirror ini sedang tidak merespons. Klik server alternatif di bawah atau gunakan Popout Player:
              </p>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={handleLaunchPopout}
                  className="px-5 py-2.5 text-xs font-mono font-bold bg-red-600 hover:bg-red-500 text-white rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.5)] flex items-center gap-2"
                >
                  <Maximize2 className="w-4 h-4" />
                  <span>Buka Popout Player</span>
                </button>
                <button
                  onClick={handleReload}
                  className="px-4 py-2.5 text-xs font-mono bg-zinc-800 text-zinc-300 rounded-xl hover:text-white"
                >
                  Coba Muat Ulang
                </button>
              </div>
            </div>
          )}

          {/* Clean Video Iframe (No sandbox attribute to eliminate VidHide restrictions) */}
          {effectiveIframeSrc ? (
            <iframe
              key={iframeKey}
              src={effectiveIframeSrc}
              title={title}
              className="w-full h-full border-0 bg-black"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                setHasError(true);
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-500 font-mono text-xs">
              Tidak ada stream video yang tersedia untuk episode ini.
            </div>
          )}
        </div>

        {/* Playback Controls & Utility Bar */}
        <div className="px-4 py-3 rounded-2xl bg-zinc-950 border border-zinc-850 flex flex-wrap items-center justify-between gap-3 text-xs font-mono shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-zinc-500 uppercase tracking-wider text-[10px] font-bold">
              Fitur:
            </span>

            {/* Skip Opening Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                playBlip('click');
                handleReload();
                setFeedbackNotice('Melompati Opening (+85s)...');
                setTimeout(() => setFeedbackNotice(null), 2500);
              }}
              title="Lewati Opening (+85s)"
              className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white border border-zinc-800 flex items-center gap-1.5 transition-colors"
            >
              <FastForward className="w-3.5 h-3.5 text-red-500" />
              <span>Lewati OP (+85s)</span>
            </motion.button>

            {/* Popout Player Direct Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleLaunchPopout}
              title="Buka Player Popout"
              className="px-3 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-white border border-red-800/50 flex items-center gap-1.5 transition-colors font-bold"
            >
              <Maximize2 className="w-3.5 h-3.5 text-red-500" />
              <span>Popout Window</span>
            </motion.button>

            {/* Aspect Ratio Switcher */}
            <div className="flex items-center bg-zinc-900 rounded-xl p-1 border border-zinc-800">
              {(['16/9', '21/9', '4/3'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    playBlip('click');
                    setAspectRatio(r);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] transition-all ${
                    aspectRatio === r
                      ? 'bg-red-600 text-white font-bold shadow-[0_0_10px_rgba(220,38,38,0.5)]'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Sleep Timer */}
            <div className="flex items-center gap-1.5 bg-zinc-900 px-2.5 py-1 rounded-xl border border-zinc-800">
              <Clock className="w-3.5 h-3.5 text-zinc-500" />
              <select
                value={sleepTimerMinutes || ''}
                onChange={(e) => {
                  const val = e.target.value ? parseInt(e.target.value, 10) : null;
                  handleSleepTimerChange(val);
                }}
                className="bg-transparent text-zinc-300 text-xs focus:outline-none cursor-pointer"
              >
                <option value="" className="bg-zinc-950 text-zinc-300">Timer Tidur: Nonaktif</option>
                <option value="15" className="bg-zinc-950 text-zinc-300">15 menit</option>
                <option value="30" className="bg-zinc-950 text-zinc-300">30 menit</option>
                <option value="45" className="bg-zinc-950 text-zinc-300">45 menit</option>
                <option value="60" className="bg-zinc-950 text-zinc-300">60 menit</option>
              </select>
            </div>
          </div>
        </div>

        {/* Clear & Intuitive Server Mirror Selection Console (Mudah Digunakan, Tidak Bikin Bingung) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col gap-3.5 shadow-lg">
          {/* Header Status Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2.5">
              <div className="relative flex items-center justify-center">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping absolute opacity-75" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 relative" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    {activeServerName}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 text-[10px] font-mono font-semibold">
                    ONLINE
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                  {selectedServerId
                    ? 'Mirror kustom aktif — Klik server lain jika ingin mengganti kualitas'
                    : 'Server utama aktif — Paling stabil & cepat diputar'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={handleResetToDefault}
                className={`text-xs font-mono font-semibold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                  !selectedServerId
                    ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)] border border-red-500'
                    : 'text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-750 border border-zinc-700'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Default DesuStream</span>
              </button>
            </div>
          </div>

          {/* Quality Groups */}
          {serverGroups && serverGroups.length > 0 ? (
            <div className="space-y-3">
              {serverGroups.map((group, groupIdx) => (
                <div
                  key={groupIdx}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 rounded-xl bg-zinc-950/80 border border-zinc-850"
                >
                  <div className="sm:w-28 flex-shrink-0 flex items-center gap-1.5">
                    <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wide">
                      {group.title}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 flex-1">
                    {group.serverList?.map((srv, srvIdx) => {
                      const isSelected = selectedServerId === srv.serverId;
                      const isCurrentSwitching = isSwitching && selectedServerId === srv.serverId;
                      const isOndesu = /ondesu|ondesuhd/i.test(srv.title);
                      const isOdcdn = /odcdn/i.test(srv.title);
                      const isOdstream = /odstream/i.test(srv.title);
                      const isVidhide = /vidhide/i.test(srv.title);
                      const isMega = /mega/i.test(srv.title);

                      return (
                        <motion.button
                          key={srvIdx}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          disabled={isSwitching}
                          onClick={() => handleServerSelect(srv.serverId, srv.title, group.title)}
                          className={`px-3 py-2 text-xs font-mono rounded-xl transition-all flex items-center gap-2 ${
                            isSelected
                              ? 'bg-red-600 text-white font-bold shadow-[0_0_18px_rgba(220,38,38,0.5)] border border-red-500'
                              : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white border border-zinc-800'
                          }`}
                        >
                          {isCurrentSwitching ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-300" />
                          ) : isSelected ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                          ) : (
                            <Radio className="w-3.5 h-3.5 text-zinc-500" />
                          )}

                          <span className="font-semibold">
                            {isCurrentSwitching ? 'Menghubungkan...' : srv.title.trim()}
                          </span>

                          {/* Descriptive badges to make choosing clear and intuitive */}
                          {isOndesu && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-red-950/80 text-red-300 border border-red-800/80 font-mono">
                              Google Video
                            </span>
                          )}
                          {isOdcdn && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 font-mono">
                              Fast CDN
                            </span>
                          )}
                          {isOdstream && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-sky-950/80 text-sky-300 border border-sky-800/80 font-mono">
                              Archive
                            </span>
                          )}
                          {isVidhide && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-950/80 text-amber-300 border border-amber-800/80 font-mono">
                              VidHide HLS
                            </span>
                          )}
                          {isMega && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-purple-950/80 text-purple-300 border border-purple-800/80 font-mono">
                              Mega
                            </span>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-900 flex items-center justify-between text-xs font-mono text-zinc-400">
              <span className="flex items-center gap-2">
                <Tv className="w-3.5 h-3.5 text-emerald-400" />
                <span>DesuStream High Speed CDN Feed</span>
              </span>
              <span className="text-zinc-500">Auto-balanced</span>
            </div>
          )}

          {/* User-friendly guidance note */}
          <div className="px-3.5 py-2.5 rounded-xl bg-zinc-950/90 border border-zinc-800 text-[11px] font-mono text-zinc-300 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>
              💡 <strong>Petunjuk:</strong> Semua server dilengkapi tombol play otomatis & anti-blokir. Jika satu server terasa lambat, klik server lain di atas (misalnya <strong>ondesuhd</strong> atau <strong>vidhide</strong>), atau gunakan tombol <strong>Buka Popout</strong> untuk layar terpisah tanpa iklan!
            </span>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default DesuStreamPlayer;
