import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { statisticsService, type AdminStatistics } from "@/services/statistics";
import { usersService } from "@/services/users";
import { booksService } from "@/services/books";
import { categoriesService } from "@/services/categories";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, ComposedChart } from "recharts";
import { TrendingUp, Clock, Mic, BookOpen, FolderOpen, Users, X } from "lucide-react";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

interface User {
  id: number;
  username: string;
  role: string;
}

interface Book {
  id: number;
  title: string;
}

interface Category {
  id: number;
  name: string;
}

export default function AdminStatistics() {
  const [statistics, setStatistics] = useState<AdminStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"day" | "week" | "month" | "custom" | undefined>(undefined);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedSpeakerId, setSelectedSpeakerId] = useState<number | undefined>(undefined);
  const [selectedBookId, setSelectedBookId] = useState<number | undefined>(undefined);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(undefined);
  
  // Filter options
  const [speakers, setSpeakers] = useState<User[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(true);
  
  const { toast } = useToast();

  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    loadStatistics();
  }, [period, startDate, endDate, selectedSpeakerId, selectedBookId, selectedCategoryId]);

  const loadFilterOptions = async () => {
    try {
      setLoadingFilters(true);
      const [usersData, booksData, categoriesData] = await Promise.all([
        usersService.getUsers(1, 1000),
        booksService.getBooks(1, 1000),
        categoriesService.getCategories(1, 1000),
      ]);
      
      // Filter only speakers from users
      const speakerUsers = usersData.items.filter(u => u.role === "speaker");
      setSpeakers(speakerUsers);
      setBooks(booksData.items);
      setCategories(categoriesData.items);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load filter options",
        variant: "destructive",
      });
    } finally {
      setLoadingFilters(false);
    }
  };

  const loadStatistics = async () => {
    try {
      setLoading(true);
      const data = await statisticsService.getAdminStatistics(
        period,
        startDate || undefined,
        endDate || undefined,
        selectedSpeakerId,
        selectedBookId,
        selectedCategoryId
      );
      setStatistics(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load statistics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setPeriod(undefined);
    setStartDate("");
    setEndDate("");
    setSelectedSpeakerId(undefined);
    setSelectedBookId(undefined);
    setSelectedCategoryId(undefined);
  };

  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}ч ${m}м`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3">
          <p className="font-semibold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.name.includes("Hours") 
                ? `${formatHours(entry.value)} (${entry.value.toFixed(2)}h)`
                : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading statistics...</p>
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
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Statistics</h1>
            <p className="text-sm md:text-base text-muted-foreground">Overall recording statistics</p>
          </div>

          {/* Filters */}
          <Card className="mb-4 md:mb-6">
            <CardContent className="pt-4 md:pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Filters</h3>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={clearFilters}
                    className="flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Clear All
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                  <div className="flex-1 w-full">
                    <Label>Period</Label>
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
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="day">Today</SelectItem>
                        <SelectItem value="week">Last Week</SelectItem>
                        <SelectItem value="month">Last Month</SelectItem>
                        <SelectItem value="custom">Custom Range</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {period === "custom" && (
                    <>
                      <div className="flex-1 w-full">
                        <Label>Start Date</Label>
                        <Input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                        />
                      </div>
                      <div className="flex-1 w-full">
                        <Label>End Date</Label>
                        <Input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                        />
                      </div>
                    </>
                  )}

                  <div className="flex-1 w-full">
                    <Label>Speaker</Label>
                    <Select
                      value={selectedSpeakerId?.toString() || "all"}
                      onValueChange={(value) => {
                        setSelectedSpeakerId(value === "all" ? undefined : parseInt(value));
                      }}
                      disabled={loadingFilters}
                    >
                      <SelectTrigger>
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
                  </div>

                  <div className="flex-1 w-full">
                    <Label>Book</Label>
                    <Select
                      value={selectedBookId?.toString() || "all"}
                      onValueChange={(value) => {
                        setSelectedBookId(value === "all" ? undefined : parseInt(value));
                      }}
                      disabled={loadingFilters}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Books" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Books</SelectItem>
                        {books.map((book) => (
                          <SelectItem key={book.id} value={book.id.toString()}>
                            {book.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-1 w-full">
                    <Label>Category</Label>
                    <Select
                      value={selectedCategoryId?.toString() || "all"}
                      onValueChange={(value) => {
                        setSelectedCategoryId(value === "all" ? undefined : parseInt(value));
                      }}
                      disabled={loadingFilters}
                    >
                      <SelectTrigger>
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
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Duration</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatHours(statistics.total_duration_hours)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {statistics.total_duration_hours.toFixed(2)} hours
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Recordings</CardTitle>
                <Mic className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.total_recordings}</div>
                <p className="text-xs text-muted-foreground mt-1">recordings</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Speakers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.total_speakers}</div>
                <p className="text-xs text-muted-foreground mt-1">speakers</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Duration</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statistics.total_recordings > 0
                    ? formatHours(statistics.total_duration_hours / statistics.total_recordings)
                    : "0ч 0м"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">per recording</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
            {/* Duration by Period */}
            {statistics.by_period.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Activity by Day</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={statistics.by_period}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="duration_hours"
                        fill="#8884d8"
                        fillOpacity={0.3}
                        stroke="#8884d8"
                        name="Duration (hours)"
                      />
                      <Bar
                        yAxisId="right"
                        dataKey="recordings_count"
                        fill="#82ca9d"
                        name="Recordings"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Duration by Speaker */}
            {statistics.by_speaker.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Performance by Speaker</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={statistics.by_speaker}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="speaker_username" angle={-45} textAnchor="end" height={100} />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar yAxisId="left" dataKey="duration_hours" fill="#8884d8" name="Duration (hours)" />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="recordings_count"
                        stroke="#82ca9d"
                        strokeWidth={2}
                        name="Recordings"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

          
          </div>

          {/* Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Speakers Table */}
            {statistics.by_speaker.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    By Speaker
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {statistics.by_speaker.map((speaker) => (
                      <div key={speaker.speaker_id} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{speaker.speaker_username}</p>
                          <p className="text-sm text-muted-foreground">{speaker.recordings_count} recordings</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatHours(speaker.duration_hours)}</p>
                          <p className="text-sm text-muted-foreground">{speaker.duration_hours.toFixed(2)}h</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Books Table */}
            {statistics.by_book.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    By Book
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {statistics.by_book.map((book) => (
                      <div key={book.book_id} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{book.book_title}</p>
                          <p className="text-sm text-muted-foreground">{book.recordings_count} recordings</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatHours(book.duration_hours)}</p>
                          <p className="text-sm text-muted-foreground">{book.duration_hours.toFixed(2)}h</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Categories Table */}
            {statistics.by_category.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FolderOpen className="h-5 w-5" />
                    By Category
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {statistics.by_category.map((category) => (
                      <div key={category.category_id} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{category.category_name}</p>
                          <p className="text-sm text-muted-foreground">{category.recordings_count} recordings</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatHours(category.duration_hours)}</p>
                          <p className="text-sm text-muted-foreground">{category.duration_hours.toFixed(2)}h</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}


