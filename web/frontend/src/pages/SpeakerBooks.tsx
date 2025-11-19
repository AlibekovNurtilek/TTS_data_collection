import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { assignmentsService } from "@/services/assignments";
import { BookOpen, ArrowRight } from "lucide-react";
import type { SpeakerWithBooks } from "@/types";

export default function SpeakerBooks() {
  const { user } = useAuth();
  const [speakerData, setSpeakerData] = useState<SpeakerWithBooks | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadBooks();
    }
  }, [user]);

  const loadBooks = async () => {
    try {
      const data = await assignmentsService.getMyBooks();
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
                      <div className="flex items-center justify-between text-sm pb-3 border-b border-border">
                        <span className="text-muted-foreground font-medium">Format:</span>
                        <span className="font-mono bg-muted px-3 py-1.5 rounded-lg text-xs font-semibold border border-border">
                          {book.file_type.toUpperCase()}
                        </span>
                      </div>
                      <Button
                        className="w-full gap-2 h-11 font-semibold shadow-md hover:shadow-lg transition-all"
                        onClick={() => navigate(`/record/${book.id}`)}
                      >
                        Start Recording
                        <ArrowRight className="h-4 w-4" />
                      </Button>
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
                <h3 className="text-2xl font-semibold text-foreground mb-3">No Books Assigned</h3>
                <p className="text-muted-foreground text-lg max-w-md mx-auto">
                  You don't have any books assigned yet. Contact your administrator to get started.
                </p>
              </CardContent>
            </Card>
          )}
      </div>
    </Layout>
  );
}
