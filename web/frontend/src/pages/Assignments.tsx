import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { assignmentsService } from "@/services/assignments";
import { booksService } from "@/services/books";
import { Plus, Trash2, X, UserCheck } from "lucide-react";
import { cn, getAvatarGradient } from "@/lib/utils";
import type { Book, User, BookWithSpeakers } from "@/types";
import { Pagination } from "@/components/Pagination";
import { useAppSelector } from "@/store/hooks";

const PAGINATION_KEY = "assignments";
const DEFAULT_LIMIT = 20;

export default function Assignments() {
  const [searchParams, setSearchParams] = useSearchParams();
  const paginationState = useAppSelector((state) => state.pagination[PAGINATION_KEY]);
  
  const pageNumber = paginationState?.pageNumber || parseInt(searchParams.get("page") || "1", 10);
  const limit = paginationState?.limit || DEFAULT_LIMIT;

  const [booksWithSpeakers, setBooksWithSpeakers] = useState<BookWithSpeakers[]>([]);
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [allSpeakers, setAllSpeakers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState<{
    bookId: number;
    bookTitle: string;
    speakerId: number;
    speakerUsername: string;
  } | null>(null);
  const [formData, setFormData] = useState({
    book_id: "",
    speaker_id: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [pageNumber, limit]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [booksData, speakersData] = await Promise.all([
        booksService.getBooks(pageNumber, limit),
        assignmentsService.getAllSpeakers(1, 1000), // Загружаем всех спикеров для выпадающего списка
      ]);
      setAllBooks(booksData.items);
      setAllSpeakers(speakersData.items);
      setTotal(booksData.total);

      const booksWithSpeakersData = await Promise.all(
        booksData.items.map((book) => assignmentsService.getBookSpeakers(book.id))
      );
      setBooksWithSpeakers(booksWithSpeakersData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load assignments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPageNumber: number) => {
    setSearchParams({ page: newPageNumber.toString() });
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await assignmentsService.assignBook({
        book_id: parseInt(formData.book_id),
        speaker_id: parseInt(formData.speaker_id),
      });
      toast({
        title: "Success",
        description: "Book assigned successfully",
      });
      setDialogOpen(false);
      setFormData({ book_id: "", speaker_id: "" });
      loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to assign book",
        variant: "destructive",
      });
    }
  };

  const handleUnassign = async () => {
    if (!assignmentToDelete) return;
    try {
      await assignmentsService.unassignBook(
        assignmentToDelete.bookId,
        assignmentToDelete.speakerId
      );
      toast({
        title: "Success",
        description: "Assignment removed successfully",
      });
      setDeleteDialogOpen(false);
      setAssignmentToDelete(null);
      loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove assignment",
        variant: "destructive",
      });
    }
  };

  const openDeleteDialog = (
    bookId: number,
    bookTitle: string,
    speakerId: number,
    speakerUsername: string
  ) => {
    setAssignmentToDelete({
      bookId,
      bookTitle,
      speakerId,
      speakerUsername,
    });
    setDeleteDialogOpen(true);
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
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-[#0066cc] to-[#0052a3] rounded-xl shadow-lg">
              <UserCheck className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Assignments</h1>
              <p className="text-gray-500 mt-1">Assign books to speakers</p>
            </div>
          </div>
          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) {
                setFormData({ book_id: "", speaker_id: "" });
              }
            }}
          >
            <DialogTrigger asChild>
              <Button className="gap-2 bg-gradient-to-r from-[#0066cc] to-[#0052a3] hover:from-[#0052a3] hover:to-[#004999] text-white shadow-md hover:shadow-lg transition-all font-semibold">
                <Plus className="h-4 w-4" />
                New Assignment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Book to Speaker</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAssign} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="book">Book</Label>
                  <Select
                    value={formData.book_id}
                    onValueChange={(value) => setFormData({ ...formData, book_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select book" />
                    </SelectTrigger>
                    <SelectContent>
                      {allBooks.map((book) => (
                        <SelectItem key={book.id} value={book.id.toString()}>
                          {book.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="speaker">Speaker</Label>
                  <Select
                    value={formData.speaker_id}
                    onValueChange={(value) => setFormData({ ...formData, speaker_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select speaker" />
                    </SelectTrigger>
                    <SelectContent>
                      {allSpeakers.map((speaker) => (
                        <SelectItem key={speaker.id} value={speaker.id.toString()}>
                          {speaker.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full">
                  Assign
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 hover:bg-gray-50">
                <TableHead className="font-semibold text-gray-700">Book</TableHead>
                <TableHead className="font-semibold text-gray-700">Assigned Speakers</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {booksWithSpeakers.map((book) => (
                <TableRow key={book.id} className="hover:bg-gray-50 transition-colors">
                  <TableCell className="font-semibold text-gray-900">{book.title}</TableCell>
                  <TableCell>
                    {book.assigned_speakers.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {book.assigned_speakers.map((speaker) => (
                          <div
                            key={speaker.id}
                            className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-md px-3 py-1.5 group hover:bg-blue-100 transition-colors"
                          >
                            <div className={cn(
                              "w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold bg-gradient-to-br",
                              getAvatarGradient(speaker.username)
                            )}>
                              {speaker.username.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-gray-700">{speaker.username}</span>
                            <button
                              onClick={() =>
                                openDeleteDialog(book.id, book.title, speaker.id, speaker.username)
                              }
                              className="ml-1 p-0.5 rounded hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                              title="Remove assignment"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm italic">No speakers assigned</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {booksWithSpeakers.length > 0 && (
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

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-bold text-gray-900">
                Remove Assignment
              </AlertDialogTitle>
              <AlertDialogDescription className="text-gray-600">
                Are you sure you want to remove <span className="font-semibold text-gray-900">"{assignmentToDelete?.speakerUsername}"</span> from book{" "}
                <span className="font-semibold text-gray-900">"{assignmentToDelete?.bookTitle}"</span>?
                <br />
                <span className="text-red-600 font-medium">This action cannot be undone.</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-gray-300">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleUnassign}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Remove Assignment
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
