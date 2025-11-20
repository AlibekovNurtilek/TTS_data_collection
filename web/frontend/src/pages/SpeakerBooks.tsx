import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { assignmentsService } from "@/services/assignments";
import { categoriesService } from "@/services/categories";
import { BookOpen, ArrowRight, Search, X, Eye } from "lucide-react";
import type { SpeakerWithBooks, Category } from "@/types";

export default function SpeakerBooks() {
  const { user } = useAuth();
  const [speakerData, setSpeakerData] = useState<SpeakerWithBooks | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(undefined);
  const [searchInput, setSearchInput] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadInitialData();
    }
  }, [user]);

  // Debounce для поиска
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 1000); // Задержка 1000ms

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchInput]);

  useEffect(() => {
    if (user) {
      loadBooks();
    }
  }, [user, selectedCategoryId, searchQuery]);

  const loadInitialData = async () => {
    try {
      // Используем публичный эндпоинт для спикеров
      const categoriesData = await categoriesService.getCategories(1, 1000, true);
      setCategories(categoriesData.items);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load categories",
        variant: "destructive",
      });
    }
  };

  const loadBooks = async () => {
    try {
      setLoading(true);
      const data = await assignmentsService.getMyBooks(
        selectedCategoryId,
        searchQuery || undefined
      );
      setSpeakerData(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load books",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryFilter = (categoryId: string) => {
    const id = categoryId === "all" ? undefined : parseInt(categoryId);
    setSelectedCategoryId(id);
  };

  const handleSearch = (value: string) => {
    setSearchInput(value);
  };

  const clearFilters = () => {
    setSelectedCategoryId(undefined);
    setSearchInput("");
    setSearchQuery("");
  };

  const getCategoryName = (categoryId: number) => {
    return categories.find((c) => c.id === categoryId)?.name || "-";
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
      <div className="min-h-full bg-gradient-to-b from-background to-muted/20 px-6 py-8">
          <div className="mb-10">
            <h1 className="text-4xl font-bold text-foreground mb-2 tracking-tight">My Books</h1>
            <p className="text-muted-foreground text-lg">Books assigned to you for recording</p>
          </div>

          {/* Filters and Search */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              {/* Search */}
              <div className="flex-1 w-full">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search books by title..."
                    value={searchInput}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10 h-11"
                  />
                </div>
              </div>

              {/* Category Filter */}
              <Select
                value={selectedCategoryId?.toString() || "all"}
                onValueChange={handleCategoryFilter}
              >
                <SelectTrigger className="w-full md:w-[200px] h-11">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Clear Filters */}
              {(selectedCategoryId || searchQuery) && (
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

          {speakerData && speakerData.assigned_books.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {speakerData.assigned_books.map((book) => (
                <Card 
                  key={book.id} 
                  className="studio-shadow-lg border-2 hover:shadow-xl hover:border-primary/30 transition-all group"
                >
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-start gap-3">
                      <div className="p-2.5 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                        <BookOpen className="h-5 w-5 text-primary flex-shrink-0" />
                      </div>
                      <span className="line-clamp-2 text-lg font-semibold leading-tight">{book.title}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm pb-2 border-b border-border">
                          <span className="text-muted-foreground font-medium">Category:</span>
                          <span className="font-semibold text-foreground">{getCategoryName(book.category_id)}</span>
                        </div>
                      <div className="flex items-center justify-between text-sm pb-3 border-b border-border">
                        <span className="text-muted-foreground font-medium">Format:</span>
                        <span className="font-mono bg-muted px-3 py-1.5 rounded-lg text-xs font-semibold border border-border">
                          {book.file_type.toUpperCase()}
                        </span>
                      </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1 gap-2 h-11 font-semibold border-2"
                          onClick={() => navigate(`/speaker/books/${book.id}/chunks`)}
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                      <Button
                          className="flex-1 gap-2 h-11 font-semibold shadow-md hover:shadow-lg transition-all"
                        onClick={() => navigate(`/record/${book.id}`)}
                      >
                        Start Recording
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="studio-shadow-lg border-2">
              <CardContent className="p-16 text-center">
                <div className="p-4 bg-muted/50 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                  <BookOpen className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-2xl font-semibold text-foreground mb-3">
                  {selectedCategoryId || searchQuery ? "No Books Found" : "No Books Assigned"}
                </h3>
                <p className="text-muted-foreground text-lg max-w-md mx-auto">
                  {selectedCategoryId || searchQuery
                    ? "Try adjusting your filters or search query."
                    : "You don't have any books assigned yet. Contact your administrator to get started."}
                </p>
                {(selectedCategoryId || searchQuery) && (
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
