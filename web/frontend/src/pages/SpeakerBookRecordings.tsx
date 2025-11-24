import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { speakersService } from "@/services/speakers";
import { recordingsService } from "@/services/recordings";
import { api } from "@/my_lib/api";
import { Waveform } from "@/components/Waveform";
import { ChevronLeft, ChevronRight, Play, Pause, ArrowLeft } from "lucide-react";

interface SpeakerRecording {
  id: number | null;
  chunk_id: number;
  chunk_text: string;
  chunk_order_index: number;
  audio_file_path: string | null;
  duration: number | null;
  created_at: string;
  updated_at: string | null;
  is_recorded: boolean;
}

interface RecordingsResponse {
  items: SpeakerRecording[];
  total: number;
  pageNumber: number;
  limit: number;
}

export default function SpeakerBookRecordings() {
  const { bookId } = useParams<{ bookId: string }>();
  const [recordings, setRecordings] = useState<RecordingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "recorded" | "not_recorded">("all");
  const [pageNumber, setPageNumber] = useState(1);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [audioUrls, setAudioUrls] = useState<Map<number, string>>(new Map());
  const { toast } = useToast();
  const navigate = useNavigate();

  const limit = 10;

  useEffect(() => {
    if (bookId) {
      loadRecordings();
    }
  }, [bookId, filter, pageNumber]);

  const loadRecordings = async () => {
    try {
      setLoading(true);
      const data = await speakersService.getMyBookRecordings(
        parseInt(bookId!),
        pageNumber,
        limit,
        filter
      );
      setRecordings(data);
    } catch (error) {
      toast({
        description: "Failed to load recordings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = async (recording: SpeakerRecording) => {
    if (!recording.id || !recording.audio_file_path) {
      toast({
        description: "This chunk has not been recorded yet",
        variant: "destructive",
      });
      return;
    }

    // Если аудио уже загружено, просто переключаем воспроизведение
    if (audioUrls.has(recording.id)) {
      if (playingId === recording.id) {
        setPlayingId(null);
      } else {
        setPlayingId(recording.id);
      }
      return;
    }

    // Загружаем аудио через API с credentials
    try {
      const blob = await api.getAudioBlob(`/recordings/${recording.id}/audio`);

      // Проверяем размер blob - если очень маленький, это может быть проблема
      if (blob.size < 1000) {
        console.warn("Audio file is very small, may have issues playing");
      }

      // Создаем URL и ждем немного, чтобы убедиться, что blob готов
      const audioUrl = URL.createObjectURL(blob);

      // Для очень коротких файлов добавляем небольшую задержку
      if (recording.duration && recording.duration < 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      setAudioUrls(new Map(audioUrls.set(recording.id, audioUrl)));
      setPlayingId(recording.id);
    } catch (error) {
      toast({
        description: error instanceof Error ? error.message : "Failed to load audio",
        variant: "destructive",
      });
    }
  };

  const handlePlayPause = (recordingId: number) => {
    if (playingId === recordingId) {
      setPlayingId(null);
    } else {
      setPlayingId(recordingId);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ru-RU", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Очистка blob URLs при размонтировании
  useEffect(() => {
    return () => {
      audioUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const totalPages = recordings ? Math.ceil(recordings.total / limit) : 0;

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading recordings...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-full bg-gradient-to-b from-background to-muted/20 px-4 md:px-6 py-6 md:py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6 md:mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="mb-3 md:mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Books
            </Button>
            <h1 className="text-2xl md:text-4xl font-bold text-foreground mb-4">My Recordings</h1>

            {/* Filter */}
            <div className="w-full sm:max-w-xs">
              <Select
                value={filter}
                onValueChange={(value) => {
                  setFilter(value as "all" | "recorded" | "not_recorded");
                  setPageNumber(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Chunks</SelectItem>
                  <SelectItem value="recorded">Recorded</SelectItem>
                  <SelectItem value="not_recorded">Not Recorded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Recordings List */}
          {recordings && recordings.items.length > 0 ? (
            <div className="space-y-3 md:space-y-4">
              {recordings.items.map((recording) => (
                <Card key={recording.chunk_id} className="p-4 md:p-6">
                  <div className="space-y-3 md:space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2">
                          <span className="text-xs md:text-sm font-mono text-muted-foreground">
                            #{recording.chunk_order_index}
                          </span>
                          {recording.is_recorded && (
                            <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                              Recorded
                            </span>
                          )}
                          {!recording.is_recorded && (
                            <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 rounded-full">
                              Not Recorded
                            </span>
                          )}
                        </div>
                        <p className="text-sm md:text-base lg:text-lg leading-relaxed">{recording.chunk_text}</p>
                      </div>
                    </div>

                    {/* Info and Controls */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 md:pt-4 border-t">
                      <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm text-muted-foreground">
                        {recording.is_recorded && (
                          <>
                            <span>Duration: {formatDuration(recording.duration)}</span>
                            <span className="hidden sm:inline">•</span>
                            <span className="break-words">Recorded: {formatDate(recording.created_at)}</span>
                          </>
                        )}
                      </div>
                      <Button
                        onClick={() => handlePlay(recording)}
                        disabled={!recording.is_recorded}
                        variant={recording.is_recorded ? "default" : "outline"}
                        className="w-full sm:w-auto"
                      >
                        {playingId === recording.id ? (
                          <>
                            <Pause className="h-4 w-4 mr-2" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Play
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Waveform */}
                    {recording.is_recorded && recording.id && audioUrls.has(recording.id) && (
                      <div className="pt-4">
                        <Waveform
                          audioUrl={audioUrls.get(recording.id)!}
                          isPlaying={playingId === recording.id}
                          onPlayPause={() => handlePlayPause(recording.id!)}
                          onSeek={() => { }}
                          height={80}
                        />
                      </div>
                    )}
                  </div>
                </Card>
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-8">
                  <Button
                    variant="outline"
                    onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                    disabled={pageNumber === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {pageNumber} of {totalPages} ({recordings.total} total)
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setPageNumber((p) => Math.min(totalPages, p + 1))}
                    disabled={pageNumber === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="p-16 text-center">
                <p className="text-muted-foreground text-lg">
                  No recordings found for this filter.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}

