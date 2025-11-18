import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { chunksService } from "@/services/chunks";
import { booksService } from "@/services/books";
import { ArrowLeft, CheckCircle2, Circle, ChevronLeft, ChevronRight } from "lucide-react";
import type { Chunk, Book } from "@/types";

export default function BookChunks() {
  const { bookId } = useParams<{ bookId: string }>();
  const [book, setBook] = useState<Book | null>(null);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const pageSize = 20;
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (bookId) {
      loadBookData();
      loadChunks();
    }
  }, [bookId, page]);

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
      const response = await chunksService.getBookChunks(
        parseInt(bookId!),
        page * pageSize,
        pageSize
      );
      setChunks(response.items);
      setHasMore(response.has_more);
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

  const recordedCount = chunks.filter((c) => c.is_recorded).length;

  return (
    <Layout>
      <div className="p-8">
        <Button variant="outline" onClick={() => navigate("/books")} className="mb-6 gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Books
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">{book?.title}</h1>
          <p className="text-muted-foreground">
            Total chunks: {total} | Recorded: {recordedCount} / {chunks.length} on this page
          </p>
        </div>

        <div className="space-y-4">
          {chunks.map((chunk) => (
            <Card key={chunk.id}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  {chunk.is_recorded ? (
                    <CheckCircle2 className="h-5 w-5 text-recorded flex-shrink-0 mt-1" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
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
                    <p className="text-foreground leading-relaxed">{chunk.text}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {(page > 0 || hasMore) && (
          <div className="flex items-center justify-between mt-6">
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page + 1} of {Math.ceil(total / pageSize)}
            </span>
            <Button
              variant="outline"
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasMore}
              className="gap-2"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
