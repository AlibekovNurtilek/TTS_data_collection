import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";

interface WaveformProps {
  audioUrl: string | null;
  isPlaying: boolean;
  onPlayPause: () => void;
  onFinish?: () => void;
  onSeek?: (time: number) => void;
  height?: number;
  waveColor?: string;
  progressColor?: string;
  cursorColor?: string;
}

export function Waveform({
  audioUrl,
  isPlaying,
  onPlayPause,
  onFinish,
  onSeek,
  height = 100,
  waveColor = "#f97316",
  progressColor = "#ea580c",
  cursorColor = "#c2410c",
}: WaveformProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isReady, setIsReady] = useState(false);
  const isInternalUpdateRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || !audioUrl) {
      // Очищаем при отсутствии audioUrl
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
        setIsReady(false);
      }
      return;
    }

    // Уничтожаем предыдущий instance если есть
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
    }

    // Создаем новый WaveSurfer instance
    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      waveColor: waveColor,
      progressColor: progressColor,
      cursorColor: cursorColor,
      barWidth: 2,
      barRadius: 3,
      responsive: true,
      height: height,
      normalize: true,
      backend: "WebAudio",
      mediaControls: false,
      interact: true, // Разрешаем интерактивность (клик для перехода)
    });

    wavesurferRef.current = wavesurfer;

    // Загружаем аудио
    wavesurfer.load(audioUrl);

    wavesurfer.on("ready", () => {
      setIsReady(true);
    });

    wavesurfer.on("play", () => {
      if (!isInternalUpdateRef.current) {
        onPlayPause();
      }
    });

    wavesurfer.on("pause", () => {
      if (!isInternalUpdateRef.current) {
        onPlayPause();
      }
    });

    wavesurfer.on("finish", () => {
      // Сбрасываем позицию на начало для следующего воспроизведения
      wavesurfer.seekTo(0);
      if (!isInternalUpdateRef.current) {
        // Используем onFinish если есть, иначе onPlayPause
        if (onFinish) {
          onFinish();
        } else {
          onPlayPause();
        }
      }
    });

    // Обработка клика для перехода к нужному моменту
    if (onSeek) {
      wavesurfer.on("seek", (progress) => {
        const duration = wavesurfer.getDuration();
        if (duration) {
          onSeek(progress * duration);
        }
      });
    }

    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
      }
      setIsReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl]); // Зависимости только от audioUrl

  // Синхронизация воспроизведения
  useEffect(() => {
    if (!wavesurferRef.current || !isReady) return;

    isInternalUpdateRef.current = true;
    
    if (isPlaying) {
      wavesurferRef.current.play().catch(() => {
        // Игнорируем ошибки воспроизведения
      });
    } else {
      wavesurferRef.current.pause();
    }

    // Сбрасываем флаг после небольшой задержки
    setTimeout(() => {
      isInternalUpdateRef.current = false;
    }, 100);
  }, [isPlaying, isReady]);

  if (!audioUrl) {
    return (
      <div className="w-full h-24 bg-muted/30 rounded-lg flex items-center justify-center">
        <p className="text-muted-foreground text-sm">No audio available</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div ref={containerRef} className="w-full" />
      {!isReady && (
        <div className="w-full h-24 bg-muted/30 rounded-lg flex items-center justify-center">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
    </div>
  );
}

