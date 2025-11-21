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
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { speakersService } from "@/services/speakers";
import { API_BASE_URL } from "@/lib/api";
import { ArrowLeft, Search, X, CheckCircle2, Circle } from "lucide-react";
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


  const handlePageChange = (newPageNumber: number) => {
    setSearchParams({ page: newPageNumber.toString(), filter });
  };

  const handleFilterChange = (value: string) => {
    const newFilter = value as "all" | "recorded" | "not_recorded";
    setFilter(newFilter);
    setSearchParams({ page: "1", filter: newFilter });
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
      <div className="min-h-full bg-gradient-to-b from-background to-muted/20 px-4 md:px-6 py-6 md:py-8">
        {/* Header */}
        <div className="mb-4 md:mb-6">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold text-foreground mb-2 tracking-tight">
              {book?.title || "Book Chunks"}
            </h1>
            {book && book.total_chunks > 0 && (
              <div className="space-y-2">
                <p className="text-sm md:text-base text-muted-foreground">
                  Progress: {book.recorded_chunks} / {book.total_chunks} chunks recorded ({book.progress_percentage}%)
                </p>
                <Progress 
                  value={book.progress_percentage || 0} 
                  className="h-2 max-w-md"
                />
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="mb-4 md:mb-6 space-y-3 md:space-y-4">
          <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-start md:items-center">
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
            <div className="space-y-3 mb-4 md:mb-6">
              {chunks.map((chunk) => (
                <Card
                  key={chunk.id}
                  className="studio-shadow-lg border-2 border-border"
                >
                  <CardContent className="p-3 md:p-4">
                    {/* Header with status */}
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      {chunk.is_recorded_by_me ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <span className="font-semibold text-xs md:text-sm text-foreground whitespace-nowrap">
                        Chunk #{chunk.order_index}
                      </span>
                      {chunk.is_recorded_by_me && (
                        <span className="px-2 py-0.5 bg-muted text-muted-foreground text-xs font-medium rounded-full whitespace-nowrap">
                          Recorded
                        </span>
                      )}
                      {chunk.estimated_duration && (
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {Math.round(chunk.estimated_duration)}s
                        </span>
                      )}
                    </div>

                    {/* Text Content */}
                    <div className="mb-3">
                      <p className="text-xs md:text-sm leading-relaxed text-foreground">
                        {chunk.text}
                      </p>
                    </div>

                    {/* Audio Player - внизу на всю ширину */}
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

