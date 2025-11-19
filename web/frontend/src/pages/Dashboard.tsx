import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, Mic, FolderOpen } from "lucide-react";
import { usersService } from "@/services/users";
import { booksService } from "@/services/books";
import { categoriesService } from "@/services/categories";

export default function Dashboard() {
  const [stats, setStats] = useState({
    users: 0,
    books: 0,
    categories: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [users, books, categories] = await Promise.all([
        usersService.getUsers(1, 1), // Get first page with limit 1 to get total count
        booksService.getBooks(1, 1),
        categoriesService.getCategories(1, 1),
      ]);

      setStats({
        users: users.total,
        books: books.total,
        categories: categories.total,
      });
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  const statCards = [
    { title: "Total Users", value: stats.users, icon: Users, color: "text-primary" },
    { title: "Total Books", value: stats.books, icon: BookOpen, color: "text-success" },
    { title: "Categories", value: stats.categories, icon: FolderOpen, color: "text-warning" },
  ];

  return (
    <Layout>
      <div className="min-h-full bg-gradient-to-b from-background to-muted/20 px-6 py-8">
          <div className="mb-10">
            <h1 className="text-4xl font-bold text-foreground mb-2 tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground text-lg">Overview of your TTS studio</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {statCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.title} className="studio-shadow-lg border-2 hover:shadow-xl transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      {stat.title}
                    </CardTitle>
                    <div className={`p-2.5 rounded-lg bg-primary/10 ${stat.color === "text-primary" ? "bg-primary/10" : stat.color === "text-success" ? "bg-success/10" : "bg-warning/10"}`}>
                      <Icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold text-foreground mb-1">{stat.value}</div>
                    <p className="text-xs text-muted-foreground">Total items</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
      </div>
    </Layout>
  );
}
