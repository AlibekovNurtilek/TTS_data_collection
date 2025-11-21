import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { chunksService } from "@/services/chunks";
import { booksService } from "@/services/books";
import { ArrowLeft, Circle, Search, X } from "lucide-react";
import type { Chunk, Book } from "@/types";
import { Pagination } from "@/components/Pagination";
import { useAppSelector } from "@/store/hooks";
import { Input } from "@/components/ui/input";

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
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (bookId) {
      loadBookData();
    }
  }, [bookId]);

  // Debounce для поиска
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setSearchQuery(searchInput);
      setSearchParams({ page: "1" });
    }, 500); // Задержка 500ms

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchInput]);

  useEffect(() => {
    if (bookId) {
      loadChunks();
    }
  }, [bookId, pageNumber, limit, searchQuery]);

  const loadBookData = async () => {
    try {
      const bookData = await booksService.getBook(parseInt(bookId!));
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
    try {
      setLoading(true);
      const response = await chunksService.getBookChunks(
        parseInt(bookId!),
        pageNumber,
        limit,
        searchQuery || undefined
      );
      setChunks(response.items);
      setTotal(response.total);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load chunks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPageNumber: number) => {
    setSearchParams({ page: newPageNumber.toString() });
  };

  const handleSearch = (value: string) => {
    setSearchInput(value);
  };

  const clearSearch = () => {
    setSearchInput("");
    setSearchQuery("");
    setSearchParams({ page: "1" });
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

  return (
    <Layout>
      <div className="p-4 md:p-8">
        <Button variant="outline" onClick={() => navigate("/books")} className="mb-4 md:mb-6 gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Books
        </Button>

        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">{book?.title}</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Total chunks: {total} | Showing: {chunks.length} on this page
          </p>
        </div>

        {/* Search */}
        <div className="mb-4 md:mb-6">
          <div className="relative w-full max-w-md">
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
        </div>

        <div className="space-y-3 md:space-y-4">
          {chunks.map((chunk) => (
            <Card key={chunk.id}>
              <CardContent className="p-4 md:p-6">
                <div className="flex items-start gap-3 md:gap-4">
                  <Circle className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground flex-shrink-0 mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2">
                      <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                        #{chunk.order_index}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ID: {chunk.id}
                      </span>
                      {chunk.estimated_duration && (
                        <span className="text-xs text-muted-foreground">
                          ~{chunk.estimated_duration}s
                        </span>
                      )}
                    </div>
                    <p className="text-sm md:text-base text-foreground leading-relaxed">{chunk.text}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {chunks.length > 0 && (
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
      </div>
    </Layout>
  );
}
