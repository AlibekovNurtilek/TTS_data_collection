import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { booksService } from "@/services/books";
import { categoriesService } from "@/services/categories";
import { assignmentsService } from "@/services/assignments";
import { Plus, Trash2, Upload, BookOpen, FileText, X, FolderOpen, User, Search } from "lucide-react";
import { cn, getAvatarGradient } from "@/lib/utils";
import type { Book, Category, BookWithSpeakers, User as UserType } from "@/types";
import { Pagination } from "@/components/Pagination";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setPagination } from "@/store/paginationSlice";

const PAGINATION_KEY = "books";
const DEFAULT_LIMIT = 20;

export default function Books() {
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const paginationState = useAppSelector((state) => state.pagination[PAGINATION_KEY]);

  const pageNumber = paginationState?.pageNumber || parseInt(searchParams.get("page") || "1", 10);
  const limit = paginationState?.limit || DEFAULT_LIMIT;

  const [books, setBooks] = useState<BookWithSpeakers[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [speakers, setSpeakers] = useState<UserType[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bookToDelete, setBookToDelete] = useState<BookWithSpeakers | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    category_id: "",
  });

  // Фильтры и поиск
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(
    searchParams.get("category") ? parseInt(searchParams.get("category")!) : undefined
  );
  const [selectedSpeakerId, setSelectedSpeakerId] = useState<number | undefined>(
    searchParams.get("speaker") ? parseInt(searchParams.get("speaker")!) : undefined
  );
  const [searchInput, setSearchInput] = useState<string>(searchParams.get("search") || "");
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get("search") || "");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadInitialData();
  }, []);

  // Debounce для поиска
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setSearchQuery(searchInput);
      setSearchParams({ page: "1" });
    }, 1000); // Задержка 1000ms

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchInput]);

  useEffect(() => {
    loadData();
  }, [pageNumber, limit, selectedCategoryId, selectedSpeakerId, searchQuery]);

  const loadInitialData = async () => {
    try {
      const [categoriesData, speakersData] = await Promise.all([
        categoriesService.getCategories(1, 1000), // Загружаем все категории
        assignmentsService.getAllSpeakers(1, 1000), // Загружаем всех спикеров
      ]);
      setCategories(categoriesData.items);
      setSpeakers(speakersData.items);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load filter data",
        variant: "destructive",
      });
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const booksData = await booksService.getBooks(
        pageNumber,
        limit,
        selectedCategoryId,
        selectedSpeakerId,
        searchQuery || undefined
      );
      setTotal(booksData.total);

      // Загружаем назначенных спикеров для каждой книги
      const booksWithSpeakersData = await Promise.all(
        booksData.items.map((book) => assignmentsService.getBookSpeakers(book.id))
      );
      setBooks(booksWithSpeakersData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPageNumber: number) => {
    setSearchParams({ page: newPageNumber.toString() });
  };

  const handleCategoryFilter = (categoryId: string) => {
    const id = categoryId === "all" ? undefined : parseInt(categoryId);
    setSelectedCategoryId(id);
    setSelectedSpeakerId(undefined); // Сбрасываем фильтр спикера при смене категории
    setSearchParams({ page: "1" }); // Сбрасываем на первую страницу
  };

  const handleSpeakerFilter = (speakerId: string) => {
    const id = speakerId === "all" ? undefined : parseInt(speakerId);
    setSelectedSpeakerId(id);
    setSearchParams({ page: "1" }); // Сбрасываем на первую страницу
  };

  const handleSearch = (value: string) => {
    setSearchInput(value);
  };

  const clearFilters = () => {
    setSelectedCategoryId(undefined);
    setSelectedSpeakerId(undefined);
    setSearchInput("");
    setSearchQuery("");
    setSearchParams({ page: "1" });
  };

  const handleFileSelect = (file: File) => {
    if (file) {
      // Проверяем тип файла
      const validTypes = ['.pdf', '.docx', '.txt'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

      if (!validTypes.includes(fileExtension)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF, DOCX, or TXT file",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
      if (!formData.title) {
        setFormData({ ...formData, title: file.name.replace(/\.[^/.]+$/, "") });
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !formData.category_id) return;

    setUploading(true);
    try {
      await booksService.uploadBook(
        selectedFile,
        parseInt(formData.category_id),
        formData.title
      );
      toast({
        title: "Success",
        description: "Book uploaded successfully",
      });
      setDialogOpen(false);
      setSelectedFile(null);
      setFormData({ title: "", category_id: "" });
      setIsDragging(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload book",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!bookToDelete) return;
    try {
      await booksService.deleteBook(bookToDelete.id);
      toast({
        title: "Success",
        description: "Book deleted successfully",
      });
      setDeleteDialogOpen(false);
      setBookToDelete(null);
      loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete book",
        variant: "destructive",
      });
    }
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
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-full bg-gradient-to-b from-background to-muted/20 px-4 md:px-6 py-6 md:py-8">
        {/* Filters and Search with Upload Button */}
        <div className="mb-4 md:mb-6 space-y-3 md:space-y-4">
          <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-start md:items-center">
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

            {/* Speaker Filter */}
            <Select
              value={selectedSpeakerId?.toString() || "all"}
              onValueChange={handleSpeakerFilter}
            >
              <SelectTrigger className="w-full md:w-[200px] h-11">
                <SelectValue placeholder="All Speakers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Speakers</SelectItem>
                {speakers.map((speaker) => (
                  <SelectItem key={speaker.id} value={speaker.id.toString()}>
                    {speaker.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            {(selectedCategoryId || selectedSpeakerId || searchQuery) && (
              <Button
                variant="outline"
                onClick={clearFilters}
                className="h-11"
              >
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}

            {/* Upload Book Button */}
            <Dialog
              open={dialogOpen}
              onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) {
                  setSelectedFile(null);
                  setFormData({ title: "", category_id: "" });
                  setIsDragging(false);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }
              }}
            >
              <DialogTrigger asChild>
                <Button className="gap-2 bg-gradient-to-r from-[#0066cc] to-[#0052a3] hover:from-[#0052a3] hover:to-[#004999] dark:from-[#7c3aed] dark:to-[#6d28d9] dark:hover:from-[#6d28d9] dark:hover:to-[#5b21b6] text-white shadow-md hover:shadow-lg transition-all font-semibold h-11 w-full md:w-auto">
                  <Upload className="h-4 w-4" />
                  <span className="hidden sm:inline">Upload Book</span>
                  <span className="sm:hidden">Upload</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold">Upload New Book</DialogTitle>
                  <p className="text-sm text-muted-foreground mt-1">Upload PDF, DOCX, or TXT files</p>
                </DialogHeader>
                <form onSubmit={handleUpload} className="space-y-4 mt-4">
                  {/* Drag and Drop Zone */}
                  <div
                    ref={dropZoneRef}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={cn(
                      "relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer",
                      isDragging
                        ? "border-[#0066cc] bg-blue-50 dark:border-[#7c3aed] dark:bg-violet-900/20"
                        : "border-border hover:border-[#0066cc] hover:bg-blue-50 dark:hover:border-[#7c3aed] dark:hover:bg-muted/50",
                      selectedFile && "border-[#0066cc] bg-blue-50 dark:border-[#7c3aed] dark:bg-violet-900/20"
                    )}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,.txt"
                      onChange={handleFileInputChange}
                      className="hidden"
                      required={!selectedFile}
                    />
                    {selectedFile ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-center">
                          <div className="p-3 bg-[#0066cc] dark:bg-[#7c3aed] rounded-full">
                            <FileText className="h-6 w-6 text-white" />
                          </div>
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{selectedFile.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFile(null);
                            if (fileInputRef.current) fileInputRef.current.value = "";
                          }}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Remove file
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-center">
                          <div className="p-4 bg-muted rounded-full">
                            <Upload className="h-8 w-8 text-muted-foreground" />
                          </div>
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">
                            {isDragging ? "Drop file here" : "Drag & drop file here"}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            or click to browse
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            Supports: PDF, DOCX, TXT
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-sm font-semibold">Title (optional)</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="h-11"
                      placeholder="Book title (auto-filled from filename)"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-sm font-semibold">Category *</Label>
                    <Select
                      value={formData.category_id}
                      onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                      required
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            <div className="flex items-center gap-2">
                              <FolderOpen className="h-4 w-4 text-muted-foreground" />
                              {category.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-11 bg-gradient-to-r from-[#0066cc] to-[#0052a3] hover:from-[#0052a3] hover:to-[#004999] dark:from-[#7c3aed] dark:to-[#6d28d9] dark:hover:from-[#6d28d9] dark:hover:to-[#5b21b6] text-white"
                    disabled={uploading || !selectedFile || !formData.category_id}
                  >
                    {uploading ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2"></div>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Book
                      </>
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Books Grid */}
        {books.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {books.map((book) => (
                <Card
                  key={book.id}
                  className="studio-shadow-lg border-2 hover:shadow-xl hover:border-[#0066cc]/30 dark:hover:border-[#7c3aed]/30 transition-all group cursor-pointer overflow-hidden"
                  onClick={() => navigate(`/books/${book.id}/chunks`)}
                >
                  <CardHeader className="pb-10">
                    <CardTitle className="flex items-center gap-3">
                      <div className="p-2.5 bg-gradient-to-br from-[#0066cc]/10 to-[#0052a3]/10 dark:from-[#7c3aed]/10 dark:to-[#6d28d9]/10 rounded-lg group-hover:from-[#0066cc]/20 group-hover:to-[#0052a3]/20 dark:group-hover:from-[#7c3aed]/20 dark:group-hover:to-[#6d28d9]/20 transition-colors flex-shrink-0">
                        <BookOpen className="h-5 w-5 text-[#0066cc] dark:text-[#7c3aed]" />
                      </div>
                      <span className="line-clamp-2 text-lg font-semibold leading-tight text-foreground min-w-0">{book.title}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-hidden">
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm pb-2 border-b border-border gap-2">
                          <span className="text-muted-foreground font-medium whitespace-nowrap">Category:</span>
                          <span className="font-semibold text-foreground text-right truncate">{getCategoryName(book.category_id)}</span>
                        </div>

                        {/* Assigned Speakers */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-muted-foreground font-medium">Assigned Speakers:</span>
                          </div>
                          {book.assigned_speakers && book.assigned_speakers.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {book.assigned_speakers.map((speaker) => (
                                <div
                                  key={speaker.id}
                                  className="flex items-center gap-1.5 bg-blue-50 dark:bg-violet-900/20 border border-blue-200 dark:border-violet-800 rounded-md px-2 py-1"
                                >
                                  <div className={cn(
                                    "w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-semibold bg-gradient-to-br flex-shrink-0",
                                    getAvatarGradient(speaker.username)
                                  )}>
                                    {speaker.username.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="text-xs font-medium text-foreground truncate">{speaker.username}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">No speakers assigned</p>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-end pt-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-gray-800 transition-all flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setBookToDelete(book);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="mt-8">
              <Pagination
                paginationKey={PAGINATION_KEY}
                total={total}
                pageNumber={pageNumber}
                limit={limit}
                onPageChange={handlePageChange}
              />
            </div>
          </>
        ) : (
          <Card className="studio-shadow-lg border-2">
            <CardContent className="p-16 text-center">
              <div className="p-4 bg-muted rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <BookOpen className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-2xl font-semibold text-foreground mb-3">No Books Yet</h3>
              <p className="text-muted-foreground text-lg max-w-md mx-auto mb-6">
                Get started by uploading your first book to the library.
              </p>
              <Button
                className="gap-2 bg-gradient-to-r from-[#0066cc] to-[#0052a3] hover:from-[#0052a3] hover:to-[#004999] dark:from-[#7c3aed] dark:to-[#6d28d9] dark:hover:from-[#6d28d9] dark:hover:to-[#5b21b6] text-white"
                onClick={() => setDialogOpen(true)}
              >
                <Upload className="h-4 w-4" />
                Upload Your First Book
              </Button>
            </CardContent>
          </Card>
        )}

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-bold text-foreground">Delete Book</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                Are you sure you want to delete book <span className="font-semibold text-foreground">"{bookToDelete?.title}"</span>?
                <br />
                <span className="text-red-600 font-medium">This will also delete all associated chunks and recordings.</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete Book
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
