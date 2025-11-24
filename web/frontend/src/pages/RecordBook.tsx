import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAppSelector } from "@/store/hooks";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useBook } from "@/contexts/BookContext";
import { speakersService } from "@/services/speakers";
import { recordingsService } from "@/services/recordings";
import { Waveform } from "@/components/Waveform";
import { RecordingWaveform } from "@/components/RecordingWaveform";
import {
  Mic,
  Square,
  Play,
  Pause,
  Upload,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Save,
} from "lucide-react";
import type { SpeakerChunk, Book } from "@/types";

export default function RecordBook() {
  const { bookId } = useParams<{ bookId: string }>();
  const [searchParams] = useSearchParams();
  const chunkIdParam = searchParams.get("chunk_id");
  const isRerecording = chunkIdParam !== null;

  const [book, setBook] = useState<Book | null>(null);
  const [chunk, setChunk] = useState<SpeakerChunk | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [allRecorded, setAllRecorded] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { toast } = useToast();
  const navigate = useNavigate();
  const { setCurrentBookTitle } = useBook();

  // Получаем сохраненное состояние для возврата на страницу списка
  const PAGINATION_KEY = `speakerBookChunks-${bookId}`;
  const savedState = useAppSelector((state) => state.pagination[PAGINATION_KEY]);

  useEffect(() => {
    if (bookId) {
      loadBookData();
      loadNextChunk();
    }

    // Cleanup: clear book title when leaving the page
    return () => {
      setCurrentBookTitle(null);
    };
  }, [bookId, chunkIdParam, setCurrentBookTitle]);

  // Update recording duration while recording
  useEffect(() => {
    if (isRecording) {
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration((Date.now() - recordingStartTimeRef.current) / 1000);
      }, 100);
    } else {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [isRecording]);


  const loadBookData = async () => {
    try {
      const bookData = await speakersService.getMyBook(parseInt(bookId!));
      setBook(bookData);
      // Set book title in context for sidebar display
      if (bookData?.title) {
        setCurrentBookTitle(bookData.title);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load book",
        variant: "destructive",
      });
    }
  };

  const loadNextChunk = async () => {
    try {
      setLoading(true);
      setAllRecorded(false);
      const chunkId = chunkIdParam ? parseInt(chunkIdParam) : undefined;
      const nextChunk = await speakersService.getNextChunk(parseInt(bookId!), chunkId);
      setChunk(nextChunk);
      clearRecording();
    } catch (error: any) {
      if (error?.response?.status === 404) {
        setAllRecorded(true);
        setChunk(null);
      } else {
        toast({
          title: "Error",
          description: "Failed to load chunk",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(audioStream);
      const mediaRecorder = new MediaRecorder(audioStream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        // Останавливаем stream после остановки записи
        audioStream.getTracks().forEach((track) => track.stop());
        setStream(null);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      recordingStartTimeRef.current = Date.now();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to access microphone",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (time: number) => {
    // Wavesurfer сам обрабатывает seek, нам нужно только обновить состояние если нужно
    console.log("Seek to:", time);
  };

  const handleUpload = async () => {
    if (!audioBlob || !chunk) return;

    setUploading(true);
    try {
      const file = new File([audioBlob], `recording-${Date.now()}.wav`, { type: "audio/wav" });
      await recordingsService.uploadRecording(chunk.id, file);

      // Если это перезапись - возвращаем на страницу списка чанков с сохраненными параметрами
      if (isRerecording) {
        toast({
          title: "Success",
          description: "Recording updated successfully!",
        });

        // Строим URL с сохраненными параметрами
        const params = new URLSearchParams();
        if (savedState?.pageNumber) {
          params.set("page", savedState.pageNumber.toString());
        }
        if (savedState?.filter) {
          params.set("filter", savedState.filter);
        }
        if (savedState?.search) {
          params.set("search", savedState.search);
        }

        const queryString = params.toString();
        navigate(`/speaker/books/${bookId}/chunks${queryString ? `?${queryString}` : ""}`);
      } else {
        toast({
          title: "Success",
          description: "Recording saved! Loading next chunk...",
        });
        // Автоматически загружаем следующий чанк
        await loadNextChunk();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload recording",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const clearRecording = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setIsPlaying(false);
    setRecordingDuration(0);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading next chunk...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (allRecorded) {
    return (
      <Layout>
        <div className="min-h-full bg-gradient-to-b from-background to-muted/20">
          <div className="px-6 py-8 max-w-2xl mx-auto">
            <div className="p-16 text-center">
              <div className="p-4 bg-success/10 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-success" />
              </div>
              <h2 className="text-3xl font-bold text-foreground mb-4">All Done! 🎉</h2>
              <p className="text-muted-foreground text-lg mb-6">
                You have successfully recorded all chunks for "{book?.title}".
              </p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!chunk) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-muted-foreground">No chunk available</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-full bg-gradient-to-b from-background md:mt-10 to-muted/20 pb-32 md:pb-32">
        <div className="px-4 md:px-6 py-6 md:py-8 md:mt-10 max-w-8xl mx-auto">
          {/* Text Content */}
          <div className="dark:bg-gradient-to-br dark:from-muted/50 dark:to-muted/30 p-4 md:p-8 rounded-xl mb-4">
            <p className="text-lg md:text-2xl leading-relaxed text-foreground font-normal tracking-wide text-center">
              {chunk.text}
            </p>
          </div>

          {/* Waveform Visualization - всегда показываем */}
          <div className="mb-6 md:mb-8" style={{ minHeight: '180px' }}>
            {audioBlob && !isRecording && audioUrl ? (
              <div className="mt-16">  {/* <<< добавил обёртку + margin-top */}
                <Waveform
                  audioUrl={audioUrl}
                  isPlaying={isPlaying}
                  onPlayPause={handlePlayPause}
                  onSeek={handleSeek}
                  height={96}
                  waveColor="#f97316"
                  progressColor="#ea580c"
                  cursorColor="#c2410c"
                />
              </div>
            ) : (
              <RecordingWaveform
                stream={stream}
                isRecording={isRecording}
                duration={recordingDuration}
              />
            )}
          </div>
        </div>
      </div>

      {/* Fixed Recording Controls - всегда внизу экрана */}
      <div className="fixed bottom-0 left-0 md:left-72 right-0 h-32 bg-background/95 backdrop-blur-sm z-50">
        <div className="h-full flex items-center justify-center px-6 max-w-8xl mx-auto">
          <div className="flex items-center justify-center w-full" style={{ minHeight: '80px' }}>
            {!isRecording && !audioBlob && (
              <button
                onClick={startRecording}
                className="relative group focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 rounded-full transition-all"
              >
                {/* Outer ring */}
                <div className="w-16 h-16 rounded-full border-4 border-gray-300 dark:border-gray-600 flex items-center justify-center transition-all group-hover:border-gray-400 dark:group-hover:border-gray-500">
                  {/* Orange circle */}
                  <div className="w-12 h-12 rounded-full bg-orange-500 transition-all group-hover:scale-110 group-hover:bg-orange-600"></div>
                </div>
              </button>
            )}

            {isRecording && (
              <button
                onClick={stopRecording}
                className="relative group focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 rounded-full transition-all"
              >
                {/* Outer ring */}
                <div className="w-16 h-16 rounded-full border-4 border-gray-300 dark:border-gray-600 flex items-center justify-center transition-all group-hover:border-gray-400 dark:group-hover:border-gray-500 animate-pulse">
                  {/* Orange rounded square */}
                  <div className="w-8 h-8 rounded-lg bg-orange-500 transition-all group-hover:bg-orange-600"></div>
                </div>
              </button>
            )}

            {audioBlob && !isRecording && (
              <div className="flex flex-col sm:flex-row items-center gap-3 flex-wrap justify-center w-full px-4">

                <Button
                  onClick={clearRecording}
                  size="lg"
                  variant="secondary"
                  className="gap-2 h-12 px-4 md:px-6 w-full sm:w-auto sm:min-w-[180px] border-2 border-orange-500/50 dark:border-orange-500/30 rounded-full bg-transparent hover:bg-orange-50 dark:bg-[#1A1A1A] dark:hover:bg-[#2A2A2A] text-orange-600 dark:text-orange-400"
                >
                  <RotateCcw className="h-5 w-5" />
                  Кайра жаз
                </Button>

                <Button
                  onClick={handlePlayPause}
                  size="lg"
                  variant="secondary"
                  className="gap-2 h-12 px-6 md:px-10 w-full sm:w-auto border-2 border-blue-500/50 dark:border-blue-500/30 rounded-full bg-transparent hover:bg-blue-50 dark:bg-[#1A1A1A] dark:hover:bg-[#2A2A2A] text-blue-600 dark:text-blue-400"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="h-5 w-5" />

                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5" />

                    </>
                  )}
                </Button>


                <Button
                  onClick={handleUpload}
                  size="lg"
                  variant="secondary"
                  className="gap-2 h-12 px-4 md:px-6 w-full sm:w-auto sm:min-w-[180px] border-2 border-green-500/50 dark:border-green-500/30 rounded-full bg-transparent hover:bg-green-50 dark:bg-[#1A1A1A] dark:hover:bg-[#2A2A2A] text-green-600 dark:text-green-400"
                  disabled={uploading}
                >
                  <Save className="h-5 w-5" />
                  <span className="hidden sm:inline">
                    {uploading ? "Сакталууда..." : (isRerecording ? "Сактоо" : "Сактап, кийинкиге")}
                  </span>
                  <span className="sm:hidden">{uploading ? "Сакталууда..." : "Сактоо"}</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
