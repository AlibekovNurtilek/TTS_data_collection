import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { chunksService } from "@/services/chunks";
import { booksService } from "@/services/books";
import { assignmentsService } from "@/services/assignments";
import { ArrowLeft, Circle, Search, X, CheckCircle2, User } from "lucide-react";
import type { Chunk, Book, SpeakerChunk, BookWithSpeakers, SpeakerInfo } from "@/types";
import { Pagination } from "@/components/Pagination";
import { useAppSelector } from "@/store/hooks";
import { Input } from "@/components/ui/input";
import { API_BASE_URL } from "@/my_lib/api";
import { cn, getAvatarGradient } from "@/my_lib/utils";

const DEFAULT_LIMIT = 20;

export default function BookChunks() {
  const { bookId } = useParams<{ bookId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const PAGINATION_KEY = `bookChunks-${bookId}`;
  const paginationState = useAppSelector((state) => state.pagination[PAGINATION_KEY]);

  const pageNumber = paginationState?.pageNumber || parseInt(searchParams.get("page") || "1", 10);
  const limit = paginationState?.limit || DEFAULT_LIMIT;
  const [searchInput, setSearchInput] = useState<string>(searchParams.get("search") || "");
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get("search") || "");

  const [book, setBook] = useState<Book | null>(null);
  const [bookWithSpeakers, setBookWithSpeakers] = useState<BookWithSpeakers | null>(null);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [speakerChunks, setSpeakerChunks] = useState<SpeakerChunk[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [selectedSpeakerId, setSelectedSpeakerId] = useState<number | null>(
    searchParams.get("speaker_id") ? parseInt(searchParams.get("speaker_id")!) : null
  );
  const [filter, setFilter] = useState<"all" | "recorded" | "not_recorded">(
    (searchParams.get("filter") as "all" | "recorded" | "not_recorded") || "all"
  );
  const [showSpeakerDialog, setShowSpeakerDialog] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (bookId) {
      loadBookData();
      loadBookSpeakers();
    }
  }, [bookId]);

  // Проверяем, нужно ли показывать диалог выбора спикера
  useEffect(() => {
    if (bookWithSpeakers && bookWithSpeakers.assigned_speakers.length >= 2) {
      // Если спикер не выбран, показываем диалог
      if (!selectedSpeakerId) {
        setShowSpeakerDialog(true);
      }
    } else if (bookWithSpeakers && bookWithSpeakers.assigned_speakers.length === 1) {
      // Если спикер ровно один, автоматически выбираем его
      const singleSpeaker = bookWithSpeakers.assigned_speakers[0];
      if (selectedSpeakerId !== singleSpeaker.id) {
        setSelectedSpeakerId(singleSpeaker.id);
      }
      setShowSpeakerDialog(false);
    } else {
      // Если спикеров нет, сбрасываем выбранного спикера
      setSelectedSpeakerId(null);
      setShowSpeakerDialog(false);
    }
  }, [bookWithSpeakers, selectedSpeakerId]);

  // Debounce для поиска
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setSearchQuery(searchInput);
      const params: Record<string, string> = { page: "1" };
      if (selectedSpeakerId) {
        params.speaker_id = selectedSpeakerId.toString();
      }
      setSearchParams(params);
    }, 500); // Задержка 500ms

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchInput, selectedSpeakerId, setSearchParams]);

  useEffect(() => {
    if (bookId) {
      // Загружаем записи спикера если спикер выбран (независимо от количества спикеров)
      if (selectedSpeakerId && bookWithSpeakers && bookWithSpeakers.assigned_speakers.length >= 1) {
        loadSpeakerChunks();
      } else {
        loadChunks();
      }
    }
  }, [bookId, pageNumber, limit, searchQuery, selectedSpeakerId, filter]);

  const loadBookData = async () => {
    try {
      const bookData = await booksService.getBook(parseInt(bookId!));
      setBook(bookData);
    } catch (error) {
      toast({
        description: "Failed to load book",
        variant: "destructive",
      });
    }
  };

  const loadBookSpeakers = async () => {
    try {
      const bookSpeakersData = await assignmentsService.getBookSpeakers(parseInt(bookId!));
      setBookWithSpeakers(bookSpeakersData);
    } catch (error) {
      toast({
        description: "Failed to load book speakers",
        variant: "destructive",
      });
    }
  };

  const loadChunks = async () => {
    try {
      setLoading(true);
      const response = await chunksService.getBookChunks(
        parseInt(bookId!),
        pageNumber,
        limit,
        searchQuery || undefined
      );
      setChunks(response.items);
      setSpeakerChunks([]);
      setTotal(response.total);
    } catch (error) {
      toast({
        description: "Failed to load chunks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSpeakerChunks = async () => {
    if (!selectedSpeakerId) return;

    try {
      setLoading(true);
      const response = await chunksService.getBookChunksWithRecordings(
        parseInt(bookId!),
        selectedSpeakerId,
        pageNumber,
        limit,
        searchQuery || undefined,
        filter
      );
      setSpeakerChunks(response.items);
      setChunks([]);
      setTotal(response.total);
    } catch (error) {
      toast({
        description: "Failed to load chunks with recordings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPageNumber: number) => {
    const params: Record<string, string> = { page: newPageNumber.toString() };
    if (selectedSpeakerId) {
      params.speaker_id = selectedSpeakerId.toString();
    }
    if (filter !== "all") {
      params.filter = filter;
    }
    setSearchParams(params);
  };

  const handleSearch = (value: string) => {
    setSearchInput(value);
  };

  const clearSearch = () => {
    setSearchInput("");
    setSearchQuery("");
    const params: Record<string, string> = { page: "1" };
    if (selectedSpeakerId) {
      params.speaker_id = selectedSpeakerId.toString();
    }
    if (filter !== "all") {
      params.filter = filter;
    }
    setSearchParams(params);
  };

  const handleFilterChange = (value: string) => {
    const newFilter = value as "all" | "recorded" | "not_recorded";
    setFilter(newFilter);
    const params: Record<string, string> = { page: "1" };
    if (selectedSpeakerId) {
      params.speaker_id = selectedSpeakerId.toString();
    }
    if (newFilter !== "all") {
      params.filter = newFilter;
    }
    if (searchQuery) {
      params.search = searchQuery;
    }
    setSearchParams(params);
  };

  const handleSpeakerSelect = (speakerId: number) => {
    setSelectedSpeakerId(speakerId);
    setShowSpeakerDialog(false);
    setSearchParams({ page: "1", speaker_id: speakerId.toString() });
  };

  const handleChangeSpeaker = () => {
    setShowSpeakerDialog(true);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const selectedSpeaker = bookWithSpeakers?.assigned_speakers.find(
    (s) => s.id === selectedSpeakerId
  );

  return (
    <Layout>
      <div className="p-4 md:p-8">
        <div className="mb-6 md:mb-8">
          <div className="flex items-center justify-between gap-4 mb-2">
            <Button
              variant="outline"
              onClick={() => navigate("/books")}
              className="border-blue-300 bg-blue-50 hover:bg-blue-100 hover:text-black text-blue-700 dark:border-purple-500 dark:bg-purple-900/50 dark:hover:bg-purple-800 dark:text-purple-200"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Books
            </Button>
            <div className="flex items-center gap-4">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">{book?.title}</h1>
              {selectedSpeakerId && bookWithSpeakers && bookWithSpeakers.assigned_speakers.length >= 2 && (
                <Button variant="outline" onClick={handleChangeSpeaker} className="gap-2">
                  <User className="h-4 w-4" />
                  Change Speaker
                </Button>
              )}
            </div>
          </div>
          {selectedSpeaker && (
            <div className="flex items-center gap-2 mt-2">
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold bg-gradient-to-br flex-shrink-0",
                getAvatarGradient(selectedSpeaker.username)
              )}>
                {selectedSpeaker.username.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-muted-foreground">
                Viewing recordings by: <span className="font-semibold text-foreground">{selectedSpeaker.username}</span>
              </span>
            </div>
          )}
        </div>

        {/* Search and Filter */}
        <div className="mb-4 md:mb-6">
          <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-start md:items-center">
            <div className="relative w-full md:max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search chunks by text..."
                value={searchInput}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 pr-10 h-11"
              />
              {searchInput && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {selectedSpeakerId && bookWithSpeakers && bookWithSpeakers.assigned_speakers.length >= 2 && (
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
            )}
          </div>
        </div>

        <div className="space-y-3 md:space-y-4">
          {selectedSpeakerId && speakerChunks.length > 0 ? (
            // Показываем чанки с записями спикера
            speakerChunks.map((chunk) => (
              <Card key={chunk.id}>
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-start gap-3 md:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2">
                        {chunk.is_recorded_by_me ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        )}
                        <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                          #{chunk.order_index}
                        </span>
                      </div>
                      <p className="text-sm md:text-base text-foreground leading-relaxed mb-3">{chunk.text}</p>
                      {/* Audio Player */}
                      {chunk.is_recorded_by_me && chunk.my_recording?.id && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <audio
                            controls
                            src={`${API_BASE_URL}/recordings/${chunk.my_recording.id}/audio`}
                            className="w-full h-8"
                          >
                            Your browser does not support the audio element.
                          </audio>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            // Показываем обычные чанки без записей
            chunks.map((chunk) => (
              <Card key={chunk.id}>
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-start gap-3 md:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2">
                        <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                          #{chunk.order_index}
                        </span>
                      </div>
                      <p className="text-sm md:text-base text-foreground leading-relaxed">{chunk.text}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {(chunks.length > 0 || speakerChunks.length > 0) && (
          <div className="mt-6">
            <Pagination
              paginationKey={PAGINATION_KEY}
              total={total}
              pageNumber={pageNumber}
              limit={limit}
              onPageChange={handlePageChange}
            />
          </div>
        )}

        {/* Dialog для выбора спикера */}
        <Dialog
          open={showSpeakerDialog}
          onOpenChange={(open) => {
            // Не позволяем закрыть диалог без выбора спикера, если спикеров >= 2
            if (!open && bookWithSpeakers && bookWithSpeakers.assigned_speakers.length >= 2 && !selectedSpeakerId) {
              return;
            }
            setShowSpeakerDialog(open);
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Select Speaker</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                This book has multiple speakers. Please select a speaker to view their recordings.
              </p>
            </DialogHeader>
            <div className="space-y-2 mt-4">
              {bookWithSpeakers?.assigned_speakers.map((speaker) => (
                <Button
                  key={speaker.id}
                  variant={selectedSpeakerId === speaker.id ? "default" : "outline"}
                  className="w-full justify-start gap-3 h-auto py-3"
                  onClick={() => handleSpeakerSelect(speaker.id)}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold bg-gradient-to-br flex-shrink-0",
                    getAvatarGradient(speaker.username)
                  )}>
                    {speaker.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium">{speaker.username}</span>
                </Button>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t">
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => navigate("/books")}
              >
                Back to Books
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
