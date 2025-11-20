import { useEffect, useRef, useState, useCallback } from "react";

interface RecordingWaveformProps {
  stream: MediaStream | null;
  isRecording: boolean;
  duration: number; // in seconds
}

const SAMPLES_PER_SECOND = 60; // Частота сэмплирования для сбора данных
const VIEW_WINDOW_SECONDS = 10; // 5 секунд влево + 5 секунд вправо
const SECONDS_PER_SIDE = 5; // Секунд в каждую сторону от центра
const WAVEFORM_HEIGHT = 160; // Высота вейвформы в пикселях
const CANVAS_DPI = 2; // Для retina displays

interface WaveformSample {
  data: Float32Array; // Данные вейвформы для этого сэмпла
  timestamp: number; // Время сэмпла
}

export function RecordingWaveform({
  stream,
  isRecording,
  duration,
}: RecordingWaveformProps) {
  const [waveformSamples, setWaveformSamples] = useState<WaveformSample[]>([]);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const [containerWidth, setContainerWidth] = useState(600);

  // Format time helper
  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const deciseconds = Math.floor((totalSeconds % 1) * 10);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${deciseconds}`;
  };

  // Update container width on resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  // Draw waveform on canvas
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pixelsPerSecond = (containerWidth / 2) / SECONDS_PER_SIDE;
    const sampleWidth = pixelsPerSecond / SAMPLES_PER_SECOND;
    
    // Устанавливаем размеры canvas с учетом DPI
    const canvasWidth = Math.max(
      waveformSamples.length * sampleWidth + SECONDS_PER_SIDE * pixelsPerSecond + 100,
      containerWidth + 200
    );
    canvas.width = canvasWidth * CANVAS_DPI;
    canvas.height = WAVEFORM_HEIGHT * CANVAS_DPI;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${WAVEFORM_HEIGHT}px`;
    
    ctx.scale(CANVAS_DPI, CANVAS_DPI);
    
    // Очищаем canvas
    ctx.clearRect(0, 0, canvasWidth, WAVEFORM_HEIGHT);
    
    const centerY = Math.round(WAVEFORM_HEIGHT / 2);
    
    // Если нет данных, просто выходим (горизонтальная линия рисуется отдельно)
    if (waveformSamples.length === 0) {
      return;
    }

    const maxAmplitude = WAVEFORM_HEIGHT / 2 - 10; // Оставляем отступы сверху и снизу

    // Собираем все точки вейвформы в один массив
    const topPoints: { x: number; y: number }[] = [];
    const bottomPoints: { x: number; y: number }[] = [];
    let currentX = 0;
    
    // Для каждого сэмпла используем все точки данных для построения вейвформы
    for (let i = 0; i < waveformSamples.length; i++) {
      const sample = waveformSamples[i];
      const sampleData = sample.data;
      
      if (sampleData.length > 0) {
        // Используем все точки данных из сэмпла
        const dataPointsPerPixel = sampleData.length / sampleWidth;
        const step = Math.max(1, Math.floor(dataPointsPerPixel));
        
        for (let j = 0; j < sampleData.length; j += step) {
          const amplitude = sampleData[j] * maxAmplitude;
          const x = currentX + (j / sampleData.length) * sampleWidth;
          
          topPoints.push({
            x,
            y: centerY - amplitude,
          });
          
          bottomPoints.push({
            x,
            y: centerY + amplitude,
          });
        }
      }
      
      currentX += sampleWidth;
    }
    
    // Если нет точек, просто выходим (горизонтальная линия рисуется отдельно)
    if (topPoints.length === 0) {
      return;
    }

    // Рисуем заполненную вейвформу
    ctx.beginPath();
    ctx.moveTo(topPoints[0].x, topPoints[0].y);
    
    // Верхняя часть
    for (let i = 1; i < topPoints.length; i++) {
      ctx.lineTo(topPoints[i].x, topPoints[i].y);
    }
    
    // Нижняя часть (в обратном порядке)
    for (let i = bottomPoints.length - 1; i >= 0; i--) {
      ctx.lineTo(bottomPoints[i].x, bottomPoints[i].y);
    }
    
    ctx.closePath();
    ctx.fillStyle = "rgba(255, 107, 53, 0.3)"; // Оранжевый с прозрачностью
    ctx.fill();
    
    // Рисуем контур
    ctx.strokeStyle = "#ff6b35"; // Оранжевый цвет
    ctx.lineWidth = 1.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    
    // Верхняя линия
    ctx.beginPath();
    ctx.moveTo(topPoints[0].x, topPoints[0].y);
    for (let i = 1; i < topPoints.length; i++) {
      ctx.lineTo(topPoints[i].x, topPoints[i].y);
    }
    ctx.stroke();
    
    // Нижняя линия
    ctx.beginPath();
    ctx.moveTo(bottomPoints[0].x, bottomPoints[0].y);
    for (let i = 1; i < bottomPoints.length; i++) {
      ctx.lineTo(bottomPoints[i].x, bottomPoints[i].y);
    }
    ctx.stroke();
    
    // Горизонтальная линия рисуется отдельно как фиксированный элемент
  }, [waveformSamples, containerWidth]);

  // Redraw waveform when data or container width changes
  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

  // Animation Loop for Data Collection
  const collectData = useCallback(() => {
    if (!analyserRef.current || !isRecording) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
      return;
    }

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteTimeDomainData(dataArray);

    // Конвертируем в Float32Array и нормализуем от -1 до 1
    const floatData = new Float32Array(bufferLength);
    for (let i = 0; i < bufferLength; i++) {
      floatData[i] = (dataArray[i] - 128) / 128;
    }

    // Ограничиваем частоту обновления до SAMPLES_PER_SECOND
    const now = Date.now();
    const minInterval = 1000 / SAMPLES_PER_SECOND;
    
    if (now - lastUpdateTimeRef.current >= minInterval) {
      lastUpdateTimeRef.current = now;
      
      setWaveformSamples((prev) => {
        const newSample: WaveformSample = {
          data: new Float32Array(floatData),
          timestamp: now,
        };
        
        const newSamples = [...prev, newSample];
        // Ограничиваем размер массива до VIEW_WINDOW_SECONDS секунд данных
        const maxSamples = VIEW_WINDOW_SECONDS * SAMPLES_PER_SECOND;
        if (newSamples.length > maxSamples) {
          return newSamples.slice(-maxSamples);
        }
        return newSamples;
      });
    }
    
    animationFrameRef.current = requestAnimationFrame(collectData);
  }, [isRecording]);

  // Setup audio analysis when stream starts
  useEffect(() => {
    if (stream && isRecording) {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048; // Увеличиваем для более детальной вейвформы
      analyser.smoothingTimeConstant = 0.3;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      setWaveformSamples([]);
      lastUpdateTimeRef.current = 0;
      collectData();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [stream, isRecording, collectData]);

  // Центр экрана
  const centerX = containerWidth / 2;
  
  // Рассчитываем пикселей в секунду
  const pixelsPerSecond = (containerWidth / 2) / SECONDS_PER_SIDE;
  
  // Количество сэмплов, которые мы показываем
  const totalSamples = waveformSamples.length;
  
  // Позиция последнего сэмпла (правый конец) должна быть в центре
  // Если нет записи, показываем пустую вейвформу (translateX = centerX)
  const lastSamplePosition = totalSamples * (pixelsPerSecond / SAMPLES_PER_SECOND);
  const translateX = isRecording && totalSamples > 0 ? centerX - lastSamplePosition : centerX;

  // Генерируем временные метки: от -5 до +5 секунд относительно центра
  const timeMarkers = [];
  const startTime = -SECONDS_PER_SIDE;
  const endTime = SECONDS_PER_SIDE;
  const markerInterval = 1;
  
  for (let time = startTime; time <= endTime; time += markerInterval) {
    const markerPositionOnTrack = lastSamplePosition + (time * pixelsPerSecond);
    const markerPositionOnScreen = markerPositionOnTrack + translateX;
    
    if (markerPositionOnScreen >= -100 && markerPositionOnScreen <= containerWidth + 100) {
      let timeLabel: string;
      if (time === 0) {
        timeLabel = "0:00";
      } else {
      const absTime = Math.abs(time);
      const minutes = Math.floor(absTime / 60);
      const seconds = absTime % 60;
        timeLabel = time < 0 
        ? `-${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
        : `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
      }
      
      timeMarkers.push({
        position: markerPositionOnTrack,
        label: timeLabel,
        time,
      });
    }
  }

  const canvasWidth = Math.max(
    lastSamplePosition + SECONDS_PER_SIDE * pixelsPerSecond + 100,
    containerWidth + 200
  );

  return (
    <div className="w-full" ref={containerRef}>
      {/* Timeline Container */}
      <div className="relative w-full h-48 flex items-center justify-center overflow-hidden">
        {/* Fixed Horizontal Line - всегда в центре, видна в обе стороны */}
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[1px] z-10 pointer-events-none" style={{ backgroundColor: 'rgba(255, 107, 53, 0.4)' }}></div>
        
        {/* Fixed Playhead (The "Cursor") - всегда в центре */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-24 z-30 pointer-events-none">
          {/* Line with gradient fade effect */}
          <div 
            className="absolute left-1/2 top-0 -translate-x-1/2 w-[2px] h-full bg-orange-500"
            style={{
              maskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,1) 15%, rgba(0,0,0,1) 85%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,1) 15%, rgba(0,0,0,1) 85%, transparent 100%)'
            }}
          ></div>
        </div>

        {/* Moving Track (Ruler + Waveform) */}
        <div
          className="absolute left-0 h-full flex items-center will-change-transform"
          style={{ 
            transform: `translateX(${translateX}px)`,
            transition: "none"
          }}
        >
          {/* Ruler Layer - временные метки */}
          <div className="absolute top-8 left-[-10px] h-full pointer-events-none" style={{ width: `${canvasWidth}px` }}>
            {timeMarkers.map((marker, idx) => (
              <div
                key={idx}
                className="absolute top-0 flex flex-col items-center"
                style={{ left: marker.position }}
              >
                <span className="text-[10px] mb-1 text-muted-foreground opacity-60">
                  {marker.label}
                </span>
                <div className="w-[1px] h-2 bg-border"></div>
              </div>
            ))}
          </div>

          {/* Waveform Canvas */}
          <div className="absolute left-0" style={{ top: "50%", transform: "translateY(-50%)" }}>
            <canvas
              ref={canvasRef}
              className="block"
              style={{ height: `${WAVEFORM_HEIGHT}px` }}
            />
          </div>
        </div>

        {/* Gradient Fades on Edges */}
        <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-background to-transparent z-20 pointer-events-none"></div>
        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-background to-transparent z-20 pointer-events-none"></div>
      </div>

      {/* Timer Display - показываем только во время записи */}
      {isRecording && (
        <div className="mt-4 text-center">
          <span className="text-5xl font-normal tracking-wider text-foreground font-mono tabular-nums">
            {formatTime(duration)}
          </span>
        </div>
      )}
    </div>
  );
}

