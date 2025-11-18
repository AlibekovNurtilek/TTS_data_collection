import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { chunksService } from "@/services/chunks";
import { recordingsService } from "@/services/recordings";
import { booksService } from "@/services/books";
import {
  ArrowLeft,
  Mic,
  Square,
  Play,
  Pause,
  Upload,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { Chunk, Book } from "@/types";

export default function RecordBook() {
  const { bookId } = useParams<{ bookId: string }>();
  const [book, setBook] = useState<Book | null>(null);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);

  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (bookId) {
      loadBookData();
      loadChunks();
    }
  }, [bookId]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.onended = () => setIsPlaying(false);
    }
  }, [audioUrl]);

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
      const response = await chunksService.getBookChunks(parseInt(bookId!), 0, 1000);
      setChunks(response.items);
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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to access microphone",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleUpload = async () => {
    if (!audioBlob || !chunks[currentChunkIndex]) return;

    setUploading(true);
    try {
      const file = new File([audioBlob], `recording-${Date.now()}.wav`, { type: "audio/wav" });
      await recordingsService.uploadRecording(chunks[currentChunkIndex].id, file);

      toast({
        title: "Success",
        description: "Recording uploaded successfully",
      });

      // Mark chunk as recorded
      const updatedChunks = [...chunks];
      updatedChunks[currentChunkIndex].is_recorded = true;
      setChunks(updatedChunks);

      // Clear current recording and move to next chunk
      clearRecording();
      if (currentChunkIndex < chunks.length - 1) {
        setCurrentChunkIndex(currentChunkIndex + 1);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload recording",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const clearRecording = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setIsPlaying(false);
  };

  const goToPreviousChunk = () => {
    if (currentChunkIndex > 0) {
      clearRecording();
      setCurrentChunkIndex(currentChunkIndex - 1);
    }
  };

  const goToNextChunk = () => {
    if (currentChunkIndex < chunks.length - 1) {
      clearRecording();
      setCurrentChunkIndex(currentChunkIndex + 1);
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

  const currentChunk = chunks[currentChunkIndex];
  const recordedCount = chunks.filter((c) => c.is_recorded).length;
  const progress = (recordedCount / chunks.length) * 100;

  return (
    <Layout>
      <div className="min-h-full bg-gradient-to-b from-background to-muted/20">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <Button 
              variant="ghost" 
              onClick={() => navigate("/")} 
              className="mb-6 gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to My Books
            </Button>

            <div className="mb-6">
              <h1 className="text-4xl font-bold text-foreground mb-3 tracking-tight">{book?.title}</h1>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Progress: {recordedCount} / {chunks.length} chunks recorded
                  </span>
                  <span className="text-sm font-semibold text-foreground">{Math.round(progress)}%</span>
                </div>
                <div className="relative">
                  <Progress value={progress} className="h-3" />
                  <div 
                    className="absolute top-0 left-0 h-3 bg-primary/20 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {currentChunk && (
            <div className="space-y-6">
              {/* Chunk Card */}
              <Card className="studio-shadow-lg border-2">
                <CardContent className="p-8">
                  {/* Chunk Header */}
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
                    <div className="flex items-center gap-3">
                      <div className="px-4 py-2 bg-primary/10 border border-primary/20 rounded-lg">
                        <span className="text-sm font-semibold text-primary">
                          Chunk #{currentChunk.order_index} of {chunks.length}
                        </span>
                      </div>
                      {currentChunk.is_recorded && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-success/10 border border-success/20 rounded-lg">
                          <CheckCircle2 className="h-4 w-4 text-success" />
                          <span className="text-sm font-medium text-success">Recorded</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Text Content */}
                  <div className="bg-gradient-to-br from-muted/50 to-muted/30 p-8 rounded-xl mb-8 border border-border/50">
                    <p className="text-xl leading-relaxed text-foreground font-normal tracking-wide">
                      {currentChunk.text}
                    </p>
                  </div>

                  {/* Recording Controls */}
                  <div className="space-y-6">
                    {/* Main Control Button */}
                    <div className="flex items-center justify-center">
                      {!isRecording && !audioBlob && (
                        <Button 
                          onClick={startRecording} 
                          size="lg" 
                          className="gap-3 h-14 px-8 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                        >
                          <Mic className="h-6 w-6" />
                          Start Recording
                        </Button>
                      )}

                      {isRecording && (
                        <Button 
                          onClick={stopRecording} 
                          size="lg" 
                          variant="destructive" 
                          className="gap-3 h-14 px-8 text-base font-semibold shadow-lg hover:shadow-xl transition-all animate-pulse"
                        >
                          <Square className="h-6 w-6" />
                          Stop Recording
                        </Button>
                      )}

                      {audioBlob && !isRecording && (
                        <div className="flex items-center gap-3">
                          <Button 
                            onClick={togglePlayback} 
                            size="lg" 
                            variant="secondary" 
                            className="gap-3 h-14 px-6 text-base font-semibold"
                          >
                            {isPlaying ? (
                              <>
                                <Pause className="h-5 w-5" />
                                Pause
                              </>
                            ) : (
                              <>
                                <Play className="h-5 w-5" />
                                Playback
                              </>
                            )}
                          </Button>
                          <Button 
                            onClick={clearRecording} 
                            size="lg" 
                            variant="outline"
                            className="h-14 px-6 text-base font-semibold border-2"
                          >
                            Re-record
                          </Button>
                          <Button
                            onClick={handleUpload}
                            size="lg"
                            className="gap-3 h-14 px-8 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                            disabled={uploading}
                          >
                            <Upload className="h-5 w-5" />
                            {uploading ? "Uploading..." : "Save Recording"}
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Recording Indicator */}
                    {isRecording && (
                      <div className="flex items-center justify-center gap-3 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 bg-recording rounded-full animate-pulse shadow-lg shadow-recording/50" />
                          <span className="text-base font-semibold text-recording">Recording in progress...</span>
                        </div>
                      </div>
                    )}

                    {audioUrl && <audio ref={audioRef} src={audioUrl} className="hidden" />}
                  </div>
                </CardContent>
              </Card>

              {/* Navigation */}
              <div className="flex items-center justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={goToPreviousChunk}
                  disabled={currentChunkIndex === 0}
                  className="gap-2 h-11 px-6 font-medium border-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous Chunk
                </Button>
                <div className="text-sm text-muted-foreground font-medium">
                  {currentChunkIndex + 1} / {chunks.length}
                </div>
                <Button
                  variant="outline"
                  onClick={goToNextChunk}
                  disabled={currentChunkIndex === chunks.length - 1}
                  className="gap-2 h-11 px-6 font-medium border-2"
                >
                  Next Chunk
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
