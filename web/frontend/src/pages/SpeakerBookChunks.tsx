import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { speakersService } from "@/services/speakers";
import { recordingsService } from "@/services/recordings";
import { Waveform } from "@/components/Waveform";
import { ArrowLeft, Search, X, CheckCircle2, Circle, Play, Pause } from "lucide-react";
import type { SpeakerChunk, BookWithStatistics } from "@/types";
import { Pagination } from "@/components/Pagination";
import { useAppSelector } from "@/store/hooks";

const DEFAULT_LIMIT = 10;

export default function SpeakerBookChunks() {
  const { bookId } = useParams<{ bookId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const PAGINATION_KEY = `speakerBookChunks-${bookId}`;
  const paginationState = useAppSelector((state) => state.pagination[PAGINATION_KEY]);
  
  const pageNumber = paginationState?.pageNumber || parseInt(searchParams.get("page") || "1", 10);
  const limit = paginationState?.limit || DEFAULT_LIMIT;
  const [searchInput, setSearchInput] = useState<string>(searchParams.get("search") || "");
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get("search") || "");
  const [filter, setFilter] = useState<"all" | "recorded" | "not_recorded">(
    (searchParams.get("filter") as "all" | "recorded" | "not_recorded") || "all"
  );

  const [book, setBook] = useState<BookWithStatistics | null>(null);
  const [chunks, setChunks] = useState<SpeakerChunk[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [audioUrls, setAudioUrls] = useState<Map<number, string>>(new Map());
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState<Map<number, boolean>>(new Map());
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const loadBookData = async () => {
    if (!bookId) return;
    
    try {
      const bookData = await speakersService.getMyBook(parseInt(bookId));
      setBook(bookData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load book",
        variant: "destructive",
      });
    }
  };

  const loadChunks = async () => {
    if (!bookId) return;
    
    try {
      setLoading(true);
      const response = await speakersService.getMyBookChunks(
        parseInt(bookId),
        pageNumber,
        limit,
        searchQuery || undefined,
        filter
      );
      setChunks(response.items);
      setTotal(response.total);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load chunks",
        variant: "destructive",
      });
      setChunks([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  // Загружаем данные книги при изменении bookId
  useEffect(() => {
    if (bookId) {
      loadBookData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);

  // Загружаем чанки при изменении bookId или параметров
  useEffect(() => {
    if (bookId) {
      loadChunks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId, pageNumber, limit, searchQuery, filter]);

  // Debounce для поиска
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setSearchQuery(searchInput);
      setSearchParams({ page: "1", filter });
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchInput, filter, setSearchParams]);

  // Загружаем аудио для записанных чанков
  useEffect(() => {
    const loadAudioForChunks = async () => {
      // Cleanup предыдущие URL перед загрузкой новых
      audioUrls.forEach((url) => URL.revokeObjectURL(url));
      
      const newAudioUrls = new Map<number, string>();
      
      for (const chunk of chunks) {
        if (chunk.is_recorded_by_me && chunk.my_recording?.id) {
          try {
            const audioUrl = await recordingsService.getRecordingAudio(chunk.my_recording.id);
            newAudioUrls.set(chunk.id, audioUrl);
          } catch (error) {
            // Игнорируем ошибки загрузки аудио для отдельных чанков
          }
        }
      }
      
      setAudioUrls(newAudioUrls);
    };

    if (chunks.length > 0) {
      loadAudioForChunks();
    }

    // Cleanup: revoke object URLs when component unmounts
    return () => {
      audioUrls.forEach((url) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chunks]);

  const handlePageChange = (newPageNumber: number) => {
    setSearchParams({ page: newPageNumber.toString(), filter });
  };

  const handleFilterChange = (value: string) => {
    const newFilter = value as "all" | "recorded" | "not_recorded";
    setFilter(newFilter);
    setSearchParams({ page: "1", filter: newFilter });
  };

  const handlePlayPause = (chunkId: number) => {
    if (playingId === chunkId) {
      setIsPlaying((prev) => {
        const newMap = new Map(prev);
        newMap.set(chunkId, !prev.get(chunkId));
        return newMap;
      });
    } else {
      setIsPlaying((prev) => {
        const newMap = new Map(prev);
        newMap.set(playingId!, false);
        newMap.set(chunkId, true);
        return newMap;
      });
      setPlayingId(chunkId);
    }
  };

  const handleSeek = () => {
    // Wavesurfer сам обрабатывает seek
  };

  const clearFilters = () => {
    setSearchInput("");
    setSearchQuery("");
    setFilter("all");
    setSearchParams({ page: "1", filter: "all" });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <Layout>
      <div className="min-h-full bg-gradient-to-b from-background to-muted/20 px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Books
          </Button>
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2 tracking-tight">
              {book?.title || "Book Chunks"}
            </h1>
            {book && (
              <p className="text-muted-foreground text-lg">
                Progress: {book.recorded_chunks} / {book.total_chunks} chunks recorded ({book.progress_percentage}%)
              </p>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            {/* Search */}
            <div className="flex-1 w-full">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search chunks by text..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-10 h-11"
                />
              </div>
            </div>

            {/* Filter */}
            <Select value={filter} onValueChange={handleFilterChange}>
              <SelectTrigger className="w-full md:w-[200px] h-11">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Chunks</SelectItem>
                <SelectItem value="recorded">Recorded</SelectItem>
                <SelectItem value="not_recorded">Not Recorded</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            {(searchQuery || filter !== "all") && (
              <Button
                variant="outline"
                onClick={clearFilters}
                className="h-11"
              >
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Chunks List */}
        {chunks.length > 0 ? (
          <>
            <div className="space-y-4 mb-6">
              {chunks.map((chunk) => (
                <Card
                  key={chunk.id}
                  className={`studio-shadow-lg border-2 transition-all ${
                    chunk.is_recorded_by_me
                      ? "border-green-500/30 bg-green-50/50 dark:bg-green-950/20"
                      : "border-border"
                  }`}
                >
                  <CardContent className="p-6">
                    {/* Header with status */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {chunk.is_recorded_by_me ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">
                              Chunk #{chunk.order_index}
                            </span>
                            {chunk.is_recorded_by_me && (
                              <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs font-medium rounded-full">
                                Recorded
                              </span>
                            )}
                          </div>
                          {chunk.estimated_duration && (
                            <p className="text-sm text-muted-foreground">
                              Estimated: {Math.round(chunk.estimated_duration)}s
                            </p>
                          )}
                        </div>
                      </div>
                      {chunk.is_recorded_by_me && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/record/${bookId}`)}
                        >
                          Re-record
                        </Button>
                      )}
                    </div>

                    {/* Text Content */}
                    <div className="mb-4">
                      <p className="text-lg leading-relaxed text-foreground">
                        {chunk.text}
                      </p>
                    </div>

                    {/* Audio Player */}
                    {chunk.is_recorded_by_me && audioUrls.has(chunk.id) && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <div className="mb-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePlayPause(chunk.id)}
                            className="mb-2"
                          >
                            {isPlaying.get(chunk.id) ? (
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
                        <Waveform
                          audioUrl={audioUrls.get(chunk.id)!}
                          isPlaying={isPlaying.get(chunk.id) || false}
                          onPlayPause={() => handlePlayPause(chunk.id)}
                          onSeek={handleSeek}
                          height={80}
                          waveColor="#10b981"
                          progressColor="#059669"
                          cursorColor="#047857"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8">
                <Pagination
                  paginationKey={PAGINATION_KEY}
                  total={total}
                  pageNumber={pageNumber}
                  limit={limit}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </>
        ) : (
          <Card className="studio-shadow-lg border-2">
            <CardContent className="p-16 text-center">
              <div className="p-4 bg-muted/50 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <Circle className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-2xl font-semibold text-foreground mb-3">No Chunks Found</h3>
              <p className="text-muted-foreground text-lg max-w-md mx-auto">
                {searchQuery || filter !== "all"
                  ? "Try adjusting your filters or search query."
                  : "No chunks available for this book."}
              </p>
              {(searchQuery || filter !== "all") && (
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="mt-4"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}

