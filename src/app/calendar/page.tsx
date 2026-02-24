"use client";

import { useState, useEffect } from "react";
import { dataApi } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import toast from "react-hot-toast";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";

interface ScheduledPost {
  id: string;
  posts: { content: string };
  scheduled_for: string;
  status: string;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default function CalendarPage() {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [view, setView] = useState<"month" | "week">("month");

  useEffect(() => {
    loadSchedule();
  }, []);

  const loadSchedule = async () => {
    setLoading(true);
    try {
      const data = await dataApi.getSchedule();
      setPosts(data);
    } catch {
      toast.error("Failed to load schedule");
    } finally {
      setLoading(false);
    }
  };

  const deletePost = async (id: string) => {
    try {
      await dataApi.deleteSchedule(id);
      setPosts((prev) => prev.filter((p) => p.id !== id));
      toast.success("Removed from schedule");
    } catch {
      toast.error("Failed to remove post");
    }
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const getPostsForDay = (day: number) => {
    return posts.filter((p) => {
      const d = new Date(p.scheduled_for);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
  };

  const selectedDayPosts = selectedDay ? getPostsForDay(selectedDay) : [];

  const today = new Date();
  const isToday = (day: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  const isPast = (day: number) => new Date(year, month, day) < today;

  // Week view: get this week's posts
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });

  const getPostsForDate = (date: Date) => {
    return posts.filter((p) => {
      const d = new Date(p.scheduled_for);
      return (
        d.getFullYear() === date.getFullYear() &&
        d.getMonth() === date.getMonth() &&
        d.getDate() === date.getDate()
      );
    });
  };

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto">
      <PageHeader
        title="Content Calendar"
        description="Visualize your scheduled content"
        icon={<Calendar size={18} />}
        action={
          <Link href="/schedule">
            <Button size="sm" className="gap-2">
              <Plus size={13} />
              Schedule post
            </Button>
          </Link>
        }
      />

      {/* View toggle */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-1 p-1 bg-[#0f0f1a] rounded-xl border border-[#1e1e35] w-fit">
          {(["month", "week"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                view === v
                  ? "bg-gradient-to-r from-indigo-500/30 to-purple-500/20 text-indigo-300 border border-indigo-500/30"
                  : "text-[#94a3b8] hover:text-[#f1f5f9]"
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        {view === "month" && (
          <div className="flex items-center gap-3">
            <button
              onClick={prevMonth}
              className="w-8 h-8 rounded-lg bg-[#1c1c2e] hover:bg-[#22223a] flex items-center justify-center transition-colors"
            >
              <ChevronLeft size={16} className="text-[#94a3b8]" />
            </button>
            <span className="text-[#f1f5f9] font-semibold min-w-36 text-center">
              {MONTHS[month]} {year}
            </span>
            <button
              onClick={nextMonth}
              className="w-8 h-8 rounded-lg bg-[#1c1c2e] hover:bg-[#22223a] flex items-center justify-center transition-colors"
            >
              <ChevronRight size={16} className="text-[#94a3b8]" />
            </button>
          </div>
        )}
      </div>

      {view === "month" ? (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Calendar grid */}
          <div className="lg:col-span-2">
            <Card className="p-4">
              {/* Day headers */}
              <div className="grid grid-cols-7 mb-2">
                {DAYS.map((d) => (
                  <div key={d} className="text-center text-xs font-medium text-[#4b5563] py-2">
                    {d}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 gap-1">
                {/* Leading empty cells */}
                {Array.from({ length: firstDay }, (_, i) => (
                  <div key={`empty-${i}`} className="h-16 lg:h-20" />
                ))}

                {/* Day cells */}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1;
                  const dayPosts = getPostsForDay(day);
                  const selected = selectedDay === day;
                  const todayDay = isToday(day);
                  const past = isPast(day);

                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(selected ? null : day)}
                      className={`h-16 lg:h-20 rounded-xl p-1.5 text-left transition-all relative border ${
                        selected
                          ? "bg-indigo-500/20 border-indigo-500/40"
                          : todayDay
                          ? "bg-[#1c1c2e] border-indigo-500/30"
                          : "border-transparent hover:bg-[#1c1c2e] hover:border-[#2a2a45]"
                      }`}
                    >
                      <span
                        className={`text-xs font-semibold block mb-1 ${
                          todayDay
                            ? "w-5 h-5 bg-indigo-500 text-white rounded-full flex items-center justify-center text-[10px]"
                            : past
                            ? "text-[#4b5563]"
                            : "text-[#94a3b8]"
                        }`}
                      >
                        {day}
                      </span>
                      <div className="space-y-0.5">
                        {dayPosts.slice(0, 2).map((p) => (
                          <div
                            key={p.id}
                            className="w-full h-1.5 rounded-full bg-indigo-500/60"
                          />
                        ))}
                        {dayPosts.length > 2 && (
                          <span className="text-[9px] text-indigo-400">+{dayPosts.length - 2}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Sidebar: selected day details */}
          <div>
            {selectedDay ? (
              <Card className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-semibold text-[#f1f5f9]">
                      {MONTHS[month]} {selectedDay}
                    </p>
                    <p className="text-xs text-[#4b5563]">
                      {selectedDayPosts.length} post{selectedDayPosts.length !== 1 ? "s" : ""} scheduled
                    </p>
                  </div>
                  <Link href="/schedule">
                    <Button variant="secondary" size="sm" className="gap-1.5">
                      <Plus size={12} />
                      Add
                    </Button>
                  </Link>
                </div>

                {selectedDayPosts.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-[#4b5563]">Nothing scheduled</p>
                    <Link href="/schedule">
                      <Button variant="outline" size="sm" className="mt-3 gap-2">
                        <Plus size={12} />
                        Schedule something
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedDayPosts.map((post) => (
                      <div key={post.id} className="p-3 rounded-xl bg-[#1c1c2e] border border-[#2a2a45]">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5 text-xs text-indigo-400">
                            <Clock size={11} />
                            {formatTime(post.scheduled_for)}
                          </div>
                          <button
                            onClick={() => deletePost(post.id)}
                            className="text-[#4b5563] hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                        <p className="text-sm text-[#f1f5f9] line-clamp-3">
                          {post.posts?.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ) : (
              <Card className="p-5">
                <p className="text-sm text-[#94a3b8] mb-4 font-medium">Upcoming posts</p>
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="skeleton h-16 rounded-xl" />
                    ))}
                  </div>
                ) : posts.filter((p) => new Date(p.scheduled_for) >= today).length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-[#4b5563] mb-3">No upcoming posts</p>
                    <Link href="/schedule">
                      <Button variant="outline" size="sm" className="gap-2">
                        <Plus size={12} />
                        Schedule a post
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {posts
                      .filter((p) => new Date(p.scheduled_for) >= today && p.status === "pending")
                      .sort((a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime())
                      .slice(0, 5)
                      .map((post) => (
                        <div key={post.id} className="p-3 rounded-xl bg-[#1c1c2e] border border-[#2a2a45]">
                          <div className="flex items-center gap-1.5 text-xs text-indigo-400 mb-1.5">
                            <Clock size={11} />
                            {formatDate(post.scheduled_for)} / {formatTime(post.scheduled_for)}
                          </div>
                          <p className="text-xs text-[#f1f5f9] line-clamp-2">
                            {post.posts?.content}
                          </p>
                        </div>
                      ))}
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      ) : (
        /* Week view */
        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-[#94a3b8]">
              Week of {weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} -{" "}
              {weekDays[6].toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </p>
            <Badge variant="indigo">
              {posts.filter((p) => {
                const d = new Date(p.scheduled_for);
                return d >= weekDays[0] && d <= weekDays[6];
              }).length}{" "}
              posts this week
            </Badge>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((date, i) => {
              const dayPosts = getPostsForDate(date);
              const isCurrentDay =
                date.toDateString() === today.toDateString();

              return (
                <div key={i} className="min-h-40">
                  <div
                    className={`text-center p-2 rounded-xl mb-2 ${
                      isCurrentDay
                        ? "bg-indigo-500/20 border border-indigo-500/30"
                        : "bg-[#0f0f1a] border border-[#1e1e35]"
                    }`}
                  >
                    <p className="text-xs text-[#4b5563]">{DAYS[date.getDay()]}</p>
                    <p className={`text-sm font-bold ${isCurrentDay ? "text-indigo-400" : "text-[#f1f5f9]"}`}>
                      {date.getDate()}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    {dayPosts.map((post) => (
                      <div
                        key={post.id}
                        className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20"
                      >
                        <p className="text-[9px] text-indigo-400">{formatTime(post.scheduled_for)}</p>
                        <p className="text-[10px] text-[#f1f5f9] line-clamp-2 mt-0.5">
                          {post.posts?.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
