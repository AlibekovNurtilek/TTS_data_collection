import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { useBook } from "@/contexts/BookContext";
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
import { Progress } from "@/components/ui/progress";
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
  const { setCurrentBookTitle } = useBook();

  useEffect(() => {
    if (user) {
      loadInitialData();
    }
    // Clear book title when on main books page
    setCurrentBookTitle(null);
  }, [user, setCurrentBookTitle]);

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
        description: "Категорияларды жүктөөдө ката",
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
        description: "Китептерди жүктөөдө ката",
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
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Жүктөлүүдө...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-full bg-gradient-to-b from-background to-muted/20 px-4 md:px-6 py-6 md:py-8">
        {/* Filters and Search */}
        <div className="mb-4 md:mb-6 space-y-3 md:space-y-4">
          <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-start md:items-center">
            {/* Search */}
            <div className="flex-1 w-full">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Китептерди аталышы боюнча издөө..."
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
                <SelectValue placeholder="Бардык категориялар" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Бардык категориялар</SelectItem>
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
                Тазалоо
              </Button>
            )}
          </div>
        </div>

        {speakerData && speakerData.assigned_books.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {speakerData.assigned_books.map((book) => (
              <Card
                key={book.id}
                className="studio-shadow-lg border-2 hover:shadow-xl hover:border-primary/30 transition-all group overflow-hidden"
              >
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors flex-shrink-0">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <span className="line-clamp-2 text-lg font-semibold leading-tight min-w-0">{book.title}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="overflow-hidden">
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm gap-2">
                        <span className="text-muted-foreground font-medium whitespace-nowrap">Категория:</span>
                        <span className="font-semibold text-foreground text-right truncate">{getCategoryName(book.category_id)}</span>
                      </div>

                      {/* Progress Bar */}
                      {book.total_chunks !== undefined && book.total_chunks > 0 && (
                        <div className="space-y-2">
                          <Progress
                            value={book.progress_percentage || 0}
                            className="h-2 w-full"
                          />
                          <div className="flex items-center justify-between text-sm gap-2">
                            <span className="font-semibold text-foreground whitespace-nowrap">
                              {book.recorded_chunks || 0} / {book.total_chunks}
                            </span>
                            {book.progress_percentage !== undefined && (
                              <span className="text-muted-foreground whitespace-nowrap">
                                ({book.progress_percentage.toFixed(2)}%)
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 w-full">
                      <Button
                        variant="outline"
                        className="w-full gap-2 h-11 font-semibold border-2"
                        onClick={() => navigate(`/speaker/books/${book.id}/chunks`)}
                      >
                        <Eye className="h-4 w-4 flex-shrink-0" />
                        <span>Көрүү</span>
                      </Button>
                      <Button
                        className="w-full gap-2 h-11 font-semibold shadow-md hover:shadow-lg transition-all"
                        onClick={() => navigate(`/record/${book.id}`)}
                      >
                        <span>Жаздырууну баштоо</span>
                        <ArrowRight className="h-4 w-4 flex-shrink-0" />
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
                {selectedCategoryId || searchQuery ? "Китептер табылган жок" : "Китептер берилген жок"}
              </h3>
              <p className="text-muted-foreground text-lg max-w-md mx-auto">
                {selectedCategoryId || searchQuery
                  ? "Фильтрлерди же издөө суроосун тууралаңыз."
                  : "Сизге азырынча китептер берилген жок. Баштоо үчүн администраторго кайрылыңыз."}
              </p>
              {(selectedCategoryId || searchQuery) && (
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="mt-4"
                >
                  <X className="h-4 w-4 mr-2" />
                  Фильтрлерди тазалоо
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
