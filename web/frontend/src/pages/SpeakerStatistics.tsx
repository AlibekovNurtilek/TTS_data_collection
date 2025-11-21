import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { statisticsService, type SpeakerStatistics } from "@/services/statistics";
import { Clock, Mic, BookOpen, FolderOpen } from "lucide-react";

export default function SpeakerStatistics() {
  const [statistics, setStatistics] = useState<SpeakerStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"day" | "week" | "month" | "custom" | undefined>(undefined);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadStatistics();
  }, [period, startDate, endDate]);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      const data = await statisticsService.getMyStatistics(
        period,
        startDate || undefined,
        endDate || undefined
      );
      setStatistics(data);
    } catch (error) {
      toast({
        title: "Ката",
        description: "Статистиканы жүктөөдө ката кетти",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (hours: number) => {
    const totalSeconds = Math.floor(hours * 3600);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Статистика жүктөлүүдө...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!statistics) {
    return null;
  }

  return (
    <Layout>
      <div className="min-h-full bg-gradient-to-b from-background to-muted/20 px-4 md:px-6 py-6 md:py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 md:mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Статистика</h1>
            <p className="text-sm md:text-base text-muted-foreground">Сиздин жазылган статистикаңыз</p>
          </div>

          {/* Filters */}
          <Card className="mb-4 md:mb-6">
            <CardContent className="pt-4 md:pt-6">
              <div className="flex flex-col sm:flex-row flex-wrap gap-3 md:gap-4 items-end">
                <div className="flex-1 w-full sm:min-w-[200px]">
                  <Label>Мөөнөт</Label>
                  <Select
                    value={period || "all"}
                    onValueChange={(value) => {
                      if (value === "all") {
                        setPeriod(undefined);
                        setStartDate("");
                        setEndDate("");
                      } else {
                        setPeriod(value as "day" | "week" | "month" | "custom");
                        if (value !== "custom") {
                          setStartDate("");
                          setEndDate("");
                        }
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Бардык убакыт</SelectItem>
                      <SelectItem value="day">Бүгүн</SelectItem>
                      <SelectItem value="week">Акыркы жума</SelectItem>
                      <SelectItem value="month">Акыркы ай</SelectItem>
                      <SelectItem value="custom">Өзгөчө мөөнөт</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {period === "custom" && (
                  <>
                    <div className="flex-1 w-full sm:min-w-[200px]">
                      <Label>Башталган күн</Label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    <div className="flex-1 w-full sm:min-w-[200px]">
                      <Label>Аяктаган күн</Label>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>
                  </>
                )}

                <Button onClick={loadStatistics} className="w-full sm:w-auto">Көрсөтүү</Button>
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Жалпы убакыт</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatTime(statistics.total_duration_hours)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {statistics.total_duration_hours.toFixed(2)} саат
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Жалпы жазылгандар</CardTitle>
                <Mic className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{statistics.total_recordings}</div>
                <p className="text-xs text-muted-foreground mt-1">жазылган</p>
              </CardContent>
            </Card>
          </div>

          {/* Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {/* Books Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Китептер боюнча
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statistics.by_book.length > 0 ? (
                  <div className="space-y-3">
                    {statistics.by_book.map((book) => (
                      <div key={book.book_id} className="flex justify-between items-center p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex-1">
                          <p className="font-semibold text-base mb-1">{book.book_title}</p>
                          <p className="text-sm text-muted-foreground">{book.recordings_count} жазылган</p>
                        </div>
                        <div className="text-right ml-4">
                          <p className="font-bold text-lg text-primary">{formatTime(book.duration_hours)}</p>
                          <p className="text-xs text-muted-foreground">{book.duration_hours.toFixed(2)} саат</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Китептер боюнча маалымат жок</p>
                )}
              </CardContent>
            </Card>

            {/* Categories Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5" />
                  Категориялар боюнча
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statistics.by_category.length > 0 ? (
                  <div className="space-y-3">
                    {statistics.by_category.map((category) => (
                      <div key={category.category_id} className="flex justify-between items-center p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex-1">
                          <p className="font-semibold text-base mb-1">{category.category_name}</p>
                          <p className="text-sm text-muted-foreground">{category.recordings_count} жазылган</p>
                        </div>
                        <div className="text-right ml-4">
                          <p className="font-bold text-lg text-primary">{formatTime(category.duration_hours)}</p>
                          <p className="text-xs text-muted-foreground">{category.duration_hours.toFixed(2)} саат</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Категориялар боюнча маалымат жок</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}


