import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { booksService } from "@/services/books";
import { api } from "@/lib/api";
import { Waveform } from "@/components/Waveform";
import { ChevronLeft, ChevronRight, Play, Pause, ArrowLeft, User } from "lucide-react";

interface AdminRecording {
  id: number;
  chunk_id: number;
  chunk_text: string;
  chunk_order_index: number;
  speaker_id: number;
  speaker_username: string;
  audio_file_path: string;
  duration: number | null;
  created_at: string;
  updated_at: string | null;
}

interface RecordingsResponse {
  items: AdminRecording[];
  total: number;
  pageNumber: number;
  limit: number;
  speakers: Array<{ id: number; username: string }>;
}

export default function AdminBookRecordings() {
  const { bookId } = useParams<{ bookId: string }>();
  const [recordings, setRecordings] = useState<RecordingsResponse | null>(null);
  const [bookTitle, setBookTitle] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [selectedSpeakerId, setSelectedSpeakerId] = useState<number | undefined>(undefined);
  const [pageNumber, setPageNumber] = useState(1);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [audioUrls, setAudioUrls] = useState<Map<number, string>>(new Map());
  const { toast } = useToast();
  const navigate = useNavigate();

  const limit = 10;

  useEffect(() => {
    if (bookId) {
      loadBook();
      loadRecordings();
    }
  }, [bookId, selectedSpeakerId, pageNumber]);

  const loadBook = async () => {
    try {
      const book = await booksService.getBook(parseInt(bookId!));
      setBookTitle(book.title);
    } catch (error) {
      console.error("Failed to load book", error);
    }
  };

  const loadRecordings = async () => {
    try {
      setLoading(true);
      const data = await booksService.getBookRecordings(
        parseInt(bookId!),
        selectedSpeakerId,
        pageNumber,
        limit
      );
      setRecordings(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load recordings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = async (recording: AdminRecording) => {
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
        title: "Error",
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
        <div className="flex items-center justify-center h-full">
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
      <div className="min-h-full bg-gradient-to-b from-background to-muted/20 px-6 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate("/books")}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Books
            </Button>
            <h1 className="text-4xl font-bold text-foreground mb-2">{bookTitle}</h1>
            <p className="text-muted-foreground mb-4">Recordings for this book</p>
            
            {/* Speaker Filter */}
            {recordings && recordings.speakers.length > 0 && (
              <div className="max-w-xs">
                <Select
                  value={selectedSpeakerId?.toString() || "all"}
                  onValueChange={(value) => {
                    setSelectedSpeakerId(value === "all" ? undefined : parseInt(value));
                    setPageNumber(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Speakers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Speakers</SelectItem>
                    {recordings.speakers.map((speaker) => (
                      <SelectItem key={speaker.id} value={speaker.id.toString()}>
                        {speaker.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Recordings List */}
          {recordings && recordings.items.length > 0 ? (
            <div className="space-y-4">
              {recordings.items.map((recording) => (
                <Card key={`${recording.chunk_id}-${recording.speaker_id}`} className="p-6">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-sm font-mono text-muted-foreground">
                            #{recording.chunk_order_index}
                          </span>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="h-4 w-4" />
                            <span className="font-medium">{recording.speaker_username}</span>
                          </div>
                        </div>
                        <p className="text-lg leading-relaxed">{recording.chunk_text}</p>
                      </div>
                    </div>

                    {/* Info and Controls */}
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Duration: {formatDuration(recording.duration)}</span>
                        <span>•</span>
                        <span>Recorded: {formatDate(recording.created_at)}</span>
                      </div>
                      <Button
                        onClick={() => handlePlay(recording)}
                        variant="default"
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
                    {audioUrls.has(recording.id) && (
                      <div className="pt-4">
                        <Waveform
                          audioUrl={audioUrls.get(recording.id)!}
                          isPlaying={playingId === recording.id}
                          onPlayPause={() => handlePlayPause(recording.id)}
                          onSeek={() => {}}
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
                  No recordings found for this book.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}

