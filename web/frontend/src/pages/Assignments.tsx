import { useEffect, useState } from "react";
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
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { assignmentsService } from "@/services/assignments";
import { booksService } from "@/services/books";
import { Plus, Trash2 } from "lucide-react";
import type { Book, User, BookWithSpeakers } from "@/types";

export default function Assignments() {
  const [booksWithSpeakers, setBooksWithSpeakers] = useState<BookWithSpeakers[]>([]);
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [allSpeakers, setAllSpeakers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    book_id: "",
    speaker_id: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [books, speakers] = await Promise.all([
        booksService.getBooks(),
        assignmentsService.getAllSpeakers(),
      ]);
      setAllBooks(books);
      setAllSpeakers(speakers);

      const booksWithSpeakersData = await Promise.all(
        books.map((book) => assignmentsService.getBookSpeakers(book.id))
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

  const handleUnassign = async (bookId: number, speakerId: number) => {
    try {
      await assignmentsService.unassignBook(bookId, speakerId);
      toast({
        title: "Success",
        description: "Assignment removed successfully",
      });
      loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove assignment",
        variant: "destructive",
      });
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

  return (
    <Layout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Assignments</h1>
            <p className="text-muted-foreground mt-1">Assign books to speakers</p>
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
              <Button className="gap-2">
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

        <div className="bg-card rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Book</TableHead>
                <TableHead>Assigned Speakers</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {booksWithSpeakers.map((book) => (
                <TableRow key={book.id}>
                  <TableCell className="font-semibold">{book.title}</TableCell>
                  <TableCell>
                    {book.assigned_speakers.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {book.assigned_speakers.map((speaker) => (
                          <span
                            key={speaker.id}
                            className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded"
                          >
                            {speaker.username}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">No speakers assigned</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {book.assigned_speakers.map((speaker) => (
                      <Button
                        key={speaker.id}
                        variant="destructive"
                        size="sm"
                        className="ml-2"
                        onClick={() => handleUnassign(book.id, speaker.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </Layout>
  );
}
