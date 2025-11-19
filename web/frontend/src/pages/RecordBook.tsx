import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { speakersService } from "@/services/speakers";
import { recordingsService } from "@/services/recordings";
import { Waveform } from "@/components/Waveform";
import { RecordingWaveform } from "@/components/RecordingWaveform";
import {
  ArrowLeft,
  Mic,
  Square,
  Play,
  Pause,
  Upload,
  CheckCircle2,
} from "lucide-react";
import type { SpeakerChunk, Book } from "@/types";

export default function RecordBook() {
  const { bookId } = useParams<{ bookId: string }>();
  const [book, setBook] = useState<Book | null>(null);
  const [chunk, setChunk] = useState<SpeakerChunk | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [allRecorded, setAllRecorded] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (bookId) {
      loadBookData();
      loadNextChunk();
    }
  }, [bookId]);

  // Update recording duration while recording
  useEffect(() => {
    if (isRecording) {
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration((Date.now() - recordingStartTimeRef.current) / 1000);
      }, 100);
    } else {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [isRecording]);


  const loadBookData = async () => {
    try {
      const bookData = await speakersService.getMyBook(parseInt(bookId!));
      setBook(bookData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load book",
        variant: "destructive",
      });
    }
  };

  const loadNextChunk = async () => {
    try {
      setLoading(true);
      setAllRecorded(false);
      const nextChunk = await speakersService.getNextChunk(parseInt(bookId!));
      setChunk(nextChunk);
      clearRecording();
    } catch (error: any) {
      if (error?.response?.status === 404) {
        setAllRecorded(true);
        setChunk(null);
      } else {
        toast({
          title: "Error",
          description: "Failed to load next chunk",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(audioStream);
      const mediaRecorder = new MediaRecorder(audioStream);
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
        // Останавливаем stream после остановки записи
        audioStream.getTracks().forEach((track) => track.stop());
        setStream(null);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      recordingStartTimeRef.current = Date.now();
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

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (time: number) => {
    // Wavesurfer сам обрабатывает seek, нам нужно только обновить состояние если нужно
    console.log("Seek to:", time);
  };

  const handleUpload = async () => {
    if (!audioBlob || !chunk) return;

    setUploading(true);
    try {
      const file = new File([audioBlob], `recording-${Date.now()}.wav`, { type: "audio/wav" });
      await recordingsService.uploadRecording(chunk.id, file);

      toast({
        title: "Success",
        description: "Recording saved! Loading next chunk...",
      });

      // Автоматически загружаем следующий чанк
      await loadNextChunk();
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
    setRecordingDuration(0);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading next chunk...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (allRecorded) {
    return (
      <Layout>
        <div className="min-h-full bg-gradient-to-b from-background to-muted/20">
          <div className="px-6 py-8">
            <Button 
              variant="ghost" 
              onClick={() => navigate("/")} 
              className="mb-6 gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to My Books
            </Button>

            <Card className="studio-shadow-lg border-2 max-w-2xl mx-auto">
              <CardContent className="p-16 text-center">
                <div className="p-4 bg-success/10 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                  <CheckCircle2 className="h-10 w-10 text-success" />
                </div>
                <h2 className="text-3xl font-bold text-foreground mb-4">All Done! 🎉</h2>
                <p className="text-muted-foreground text-lg mb-6">
                  You have successfully recorded all chunks for "{book?.title}".
                </p>
                <Button onClick={() => navigate("/")} size="lg">
                  Back to My Books
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  if (!chunk) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-muted-foreground">No chunk available</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-full bg-gradient-to-b from-background to-muted/20">
        <div className="px-6 py-8">
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
              <div className="flex items-center gap-2">
                <div className="px-4 py-2 bg-primary/10 border border-primary/20 rounded-lg">
                  <span className="text-sm font-semibold text-primary">
                    Chunk #{chunk.order_index}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Chunk Card */}
          <Card className="studio-shadow-lg border-2 max-w-4xl mx-auto">
            <CardContent className="p-8">
              {/* Text Content */}
              <div className="bg-gradient-to-br from-muted/50 to-muted/30 p-8 rounded-xl mb-8 border border-border/50">
                <p className="text-2xl leading-relaxed text-foreground font-normal tracking-wide text-center">
                  {chunk.text}
                </p>
              </div>

              {/* Waveform Visualization */}
              <div className="mb-6">
                {isRecording && stream && (
                  <RecordingWaveform
                    stream={stream}
                    isRecording={isRecording}
                    duration={recordingDuration}
                  />
                )}
                
                {audioBlob && !isRecording && audioUrl && (
                  <div className="space-y-2">
                    <Waveform
                      audioUrl={audioUrl}
                      isPlaying={isPlaying}
                      onPlayPause={handlePlayPause}
                      onSeek={handleSeek}
                      height={120}
                      waveColor="#3b82f6"
                      progressColor="#2563eb"
                      cursorColor="#1e40af"
                    />
                  </div>
                )}
              </div>

              {/* Recording Controls */}
              <div className="space-y-6">
                {/* Main Control Button */}
                <div className="flex items-center justify-center">
                  {!isRecording && !audioBlob && (
                    <Button 
                      onClick={startRecording} 
                      size="lg" 
                      className="gap-3 h-16 px-10 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
                    >
                      <Mic className="h-7 w-7" />
                      Start Recording
                    </Button>
                  )}

                  {isRecording && (
                    <Button 
                      onClick={stopRecording} 
                      size="lg" 
                      variant="destructive" 
                      className="gap-3 h-16 px-10 text-lg font-semibold shadow-lg hover:shadow-xl transition-all animate-pulse"
                    >
                      <Square className="h-7 w-7" />
                      Stop Recording
                    </Button>
                  )}

                  {audioBlob && !isRecording && (
                    <div className="flex items-center gap-4">
                      <Button 
                        onClick={handlePlayPause} 
                        size="lg" 
                        variant="secondary" 
                        className="gap-3 h-16 px-8 text-lg font-semibold"
                      >
                        {isPlaying ? (
                          <>
                            <Pause className="h-6 w-6" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="h-6 w-6" />
                            Playback
                          </>
                        )}
                      </Button>
                      <Button 
                        onClick={clearRecording} 
                        size="lg" 
                        variant="outline"
                        className="h-16 px-8 text-lg font-semibold border-2"
                      >
                        Re-record
                      </Button>
                      <Button
                        onClick={handleUpload}
                        size="lg"
                        className="gap-3 h-16 px-10 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
                        disabled={uploading}
                      >
                        <Upload className="h-6 w-6" />
                        {uploading ? "Saving..." : "Save & Next"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
