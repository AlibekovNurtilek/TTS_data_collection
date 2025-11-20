import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { statisticsService, type AdminStatistics } from "@/services/statistics";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { TrendingUp, Clock, Mic, BookOpen, FolderOpen, Users } from "lucide-react";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function AdminStatistics() {
  const [statistics, setStatistics] = useState<AdminStatistics | null>(null);
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
      const data = await statisticsService.getAdminStatistics(
        period,
        startDate || undefined,
        endDate || undefined
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

  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}ч ${m}м`;
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
      <div className="min-h-full bg-gradient-to-b from-background to-muted/20 px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">Statistics</h1>
            <p className="text-muted-foreground">Overall recording statistics</p>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
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
                    <div className="flex-1 min-w-[200px]">
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    <div className="flex-1 min-w-[200px]">
                      <Label>End Date</Label>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>
                  </>
                )}

                <Button onClick={loadStatistics}>Apply</Button>
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Duration by Period */}
            {statistics.by_period.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Duration by Day</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={statistics.by_period}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="duration_hours" stroke="#8884d8" name="Hours" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Duration by Speaker */}
            {statistics.by_speaker.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Duration by Speaker</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={statistics.by_speaker}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="speaker_username" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="duration_hours" fill="#8884d8" name="Hours" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Duration by Book */}
            {statistics.by_book.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Duration by Book</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={statistics.by_book}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="book_title" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="duration_hours" fill="#8884d8" name="Hours" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Duration by Category */}
            {statistics.by_category.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Duration by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={statistics.by_category}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ category_name, duration_hours }) => `${category_name}: ${duration_hours.toFixed(1)}h`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="duration_hours"
                      >
                        {statistics.by_category.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

