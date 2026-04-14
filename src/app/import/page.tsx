"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { withUserHeaders } from "@/lib/client-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import toast from "react-hot-toast";
import {
  Upload,
  FileText,
  BarChart2,
  CheckCircle2,
  AlertCircle,
  Download,
  ArrowRight,
} from "lucide-react";

interface ImportResult {
  success: boolean;
  type: string;
  imported: number;
  skipped: number;
  errors: string[];
}

type ImportType = "posts" | "analytics";

export default function ImportPage() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<ImportType>("analytics");
  const [importing, setImporting] = useState(false);
  const [lastResult, setLastResult] = useState<ImportResult | null>(null);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>, type: ImportType) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setImporting(true);
      setLastResult(null);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", type);

        const res = await fetch("/api/import", {
          method: "POST",
          headers: withUserHeaders(),
          body: formData,
        });

        const data = await res.json() as ImportResult;

        if (!res.ok) {
          const errData = data as { error?: string; details?: string };
          throw new Error(errData.error || errData.details || "Import failed");
        }

        setLastResult(data as ImportResult);

        if (data.imported > 0) {
          toast.success(
            `Successfully imported ${data.imported} ${type}!`
          );
        } else {
          toast.error(`No ${type} were imported. Check the errors.`);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Import failed");
      } finally {
        setImporting(false);
        e.target.value = "";
      }
    },
    []
  );

  const downloadSampleCSV = () => {
    const csvContent = selectedType === "analytics"
      ? `date,followers,impressions,engagements,posts_count\n2024-01-01,14500,32000,890,2\n2024-01-02,14520,28000,720,1`
      : `content,posted_at,impressions,likes,replies,retweets\n"Check out my latest post!","2024-01-01",5000,234,45,67`;

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sample-${selectedType}-csv.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-ui-bg p-6 md:p-12 lg:p-16">
      <div className="mx-auto max-w-4xl">
        <PageHeader
          title="Import X Analytics"
          description="Upload your X analytics data to track growth and engagement metrics"
          icon={<Upload size={24} />}
        />

        {/* Tony's X Handle Banner */}
        <Card className="mb-8 border-brand-500/20 bg-gradient-to-r from-brand-500/5 to-transparent">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
                <BarChart2 size={28} />
              </div>
              <div>
                <p className="text-sm text-text-muted mb-1">Importing analytics for</p>
                <p className="text-xl font-bold text-text-main">@tonysimons_</p>
              </div>
              <Badge variant="brand" className="ml-auto">
                X Analytics
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Import Type Selector */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card
            className={`cursor-pointer transition-all ${
              selectedType === "analytics"
                ? "border-brand-500 ring-2 ring-brand-500/20"
                : "hover:border-brand-500/40"
            }`}
            onClick={() => setSelectedType("analytics")}
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                    selectedType === "analytics"
                      ? "bg-brand-500/10 text-brand-400"
                      : "bg-ui-surface-elevated text-text-muted"
                  }`}
                >
                  <BarChart2 size={24} />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg mb-1">Analytics Data</CardTitle>
                  <p className="text-sm text-text-muted">
                    Daily metrics: followers, impressions, engagements, posts count
                  </p>
                </div>
                {selectedType === "analytics" && (
                  <CheckCircle2 size={20} className="text-brand-400" />
                )}
              </div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all ${
              selectedType === "posts"
                ? "border-brand-500 ring-2 ring-brand-500/20"
                : "hover:border-brand-500/40"
            }`}
            onClick={() => setSelectedType("posts")}
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                    selectedType === "posts"
                      ? "bg-brand-500/10 text-brand-400"
                      : "bg-ui-surface-elevated text-text-muted"
                  }`}
                >
                  <FileText size={24} />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg mb-1">Posts Data</CardTitle>
                  <p className="text-sm text-text-muted">
                    Individual posts with content, date, and engagement metrics
                  </p>
                </div>
                {selectedType === "posts" && (
                  <CheckCircle2 size={20} className="text-brand-400" />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upload Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Upload CSV</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* File Input */}
            <div className="relative">
              <input
                type="file"
                accept=".csv"
                id={`${selectedType}-upload`}
                className="hidden"
                onChange={(e) => handleFileChange(e, selectedType)}
                disabled={importing}
              />
              <label
                htmlFor={`${selectedType}-upload`}
                className={`flex flex-col items-center justify-center gap-4 p-12 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
                  importing
                    ? "border-ui-border bg-ui-surface cursor-not-allowed opacity-50"
                    : "border-brand-500/30 hover:border-brand-500/50 hover:bg-brand-500/5"
                }`}
              >
                {importing ? (
                  <>
                    <div className="h-12 w-12 rounded-full border-4 border-brand-500/20 border-t-brand-500 animate-spin" />
                    <div className="text-center">
                      <p className="text-text-main font-medium mb-1">
                        Importing {selectedType}...
                      </p>
                      <p className="text-sm text-text-muted">
                        Please wait while we process your CSV
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-400">
                      <Upload size={32} />
                    </div>
                    <div className="text-center">
                      <p className="text-text-main font-medium mb-1">
                        Drop your CSV here or click to browse
                      </p>
                      <p className="text-sm text-text-muted">
                        Upload your {selectedType === "analytics" ? "X analytics" : "posts"} CSV
                        file
                      </p>
                    </div>
                  </>
                )}
              </label>
            </div>

            {/* Download Sample */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-ui-surface border border-ui-border">
              <div className="flex items-center gap-3">
                <Download size={18} className="text-text-muted" />
                <div>
                  <p className="text-sm font-medium text-text-main">
                    Need a template?
                  </p>
                  <p className="text-xs text-text-muted">
                    Download a sample CSV with the correct format
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={downloadSampleCSV}
              >
                Download Sample
              </Button>
            </div>

            {/* Import Result */}
            {lastResult && (
              <div
                className={`p-4 rounded-xl border ${
                  lastResult.imported > 0
                    ? "bg-emerald-500/5 border-emerald-500/20"
                    : "bg-amber-500/5 border-amber-500/20"
                }`}
              >
                <div className="flex items-start gap-3">
                  {lastResult.imported > 0 ? (
                    <CheckCircle2
                      size={20}
                      className="text-emerald-400 shrink-0 mt-0.5"
                    />
                  ) : (
                    <AlertCircle
                      size={20}
                      className="text-amber-400 shrink-0 mt-0.5"
                    />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text-main mb-2">
                      Import {lastResult.imported > 0 ? "Complete" : "Issues Found"}
                    </p>
                    <div className="flex gap-4 text-xs text-text-muted mb-3">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 size={12} className="text-emerald-400" />
                        {lastResult.imported} imported
                      </span>
                      <span className="flex items-center gap-1">
                        <AlertCircle size={12} className="text-amber-400" />
                        {lastResult.skipped} skipped
                      </span>
                    </div>
                    {lastResult.errors.length > 0 && (
                      <div className="mt-3 p-3 rounded-lg bg-ui-bg border border-ui-border">
                        <p className="text-xs font-medium text-text-muted mb-2">
                          Errors:
                        </p>
                        <ul className="space-y-1">
                          {lastResult.errors.slice(0, 5).map((err, i) => (
                            <li
                              key={i}
                              className="text-xs text-text-subtle font-mono"
                            >
                              {err}
                            </li>
                          ))}
                          {lastResult.errors.length > 5 && (
                            <li className="text-xs text-text-muted">
                              ...and {lastResult.errors.length - 5} more
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Format Guide */}
        <Card>
          <CardHeader>
            <CardTitle>CSV Format Guide</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {selectedType === "analytics" ? (
                <>
                  <div>
                    <p className="text-sm font-medium text-text-main mb-2">
                      Required columns:
                    </p>
                    <ul className="text-sm text-text-muted space-y-1">
                      <li>
                        <code className="text-brand-400">date</code> - Date of
                        metrics (YYYY-MM-DD format)
                      </li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-main mb-2">
                      Optional columns:
                    </p>
                    <ul className="text-sm text-text-muted space-y-1">
                      <li>
                        <code className="text-brand-400">followers</code> - Total
                        follower count
                      </li>
                      <li>
                        <code className="text-brand-400">impressions</code> - Total
                        post impressions
                      </li>
                      <li>
                        <code className="text-brand-400">engagements</code> - Total
                        engagements (likes + replies + retweets)
                      </li>
                      <li>
                        <code className="text-brand-400">posts_count</code> - Number
                        of posts published that day
                      </li>
                    </ul>
                  </div>
                  <div className="p-4 rounded-xl bg-ui-surface border border-ui-border">
                    <p className="text-xs text-text-muted font-mono">
                      date,followers,impressions,engagements,posts_count
                      <br />
                      2024-01-15,15234,45678,1234,3
                      <br />
                      2024-01-14,15100,38900,980,2
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-sm font-medium text-text-main mb-2">
                      Required columns:
                    </p>
                    <ul className="text-sm text-text-muted space-y-1">
                      <li>
                        <code className="text-brand-400">content</code> - The post
                        text content
                      </li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-main mb-2">
                      Optional columns:
                    </p>
                    <ul className="text-sm text-text-muted space-y-1">
                      <li>
                        <code className="text-brand-400">posted_at</code> - When
                        the post was published
                      </li>
                      <li>
                        <code className="text-brand-400">impressions</code> - View
                        count
                      </li>
                      <li>
                        <code className="text-brand-400">likes</code> - Like count
                      </li>
                      <li>
                        <code className="text-brand-400">replies</code> - Reply
                        count
                      </li>
                      <li>
                        <code className="text-brand-400">retweets</code> - Retweet
                        count
                      </li>
                    </ul>
                  </div>
                  <div className="p-4 rounded-xl bg-ui-surface border border-ui-border">
                    <p className="text-xs text-text-muted font-mono">
                      content,posted_at,impressions,likes,replies,retweets
                      <br />
                      &quot;My post text&quot;,&quot;2024-01-15&quot;,5000,234,45,67
                      <br />
                      &quot;Another post&quot;,&quot;2024-01-14&quot;,3200,156,28,34
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="mt-8 flex justify-end">
          <Button onClick={() => router.push("/analytics")}>
            View Analytics
            <ArrowRight size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
