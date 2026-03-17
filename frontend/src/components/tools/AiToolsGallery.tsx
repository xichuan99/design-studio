"use client";

import { useState, useEffect, useRef } from "react";
import { useAiToolsEndpoints } from "@/lib/api/aiToolsApi";
import { AiToolResult } from "@/lib/api/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, Download } from "lucide-react";

export function AiToolsGallery() {
  const { getMyToolResults, deleteToolResult } = useAiToolsEndpoints();
  
  const [results, setResults] = useState<AiToolResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Stabilize ref to prevent infinite loop (same pattern as StorageBadge/CreditBadge)
  const getMyToolResultsRef = useRef(getMyToolResults);
  getMyToolResultsRef.current = getMyToolResults;

  useEffect(() => {
    const loadResults = async () => {
      try {
        setIsLoading(true);
        const data = await getMyToolResultsRef.current();
        setResults(data);
      } catch (error) {
        console.error("Failed to load AI tool results:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadResults();
  }, []); // empty deps — runs once on mount

  const handleDelete = async (id: string) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus hasil ini? Storage kuota akan dikembalikan.")) {
      return;
    }

    try {
      setDeletingId(id);
      await deleteToolResult(id);
      setResults((prev) => prev.filter((r) => r.id !== id));
      alert("Gambar berhasil dihapus dari galeri dan storage kuota telah dikembalikan.");
    } catch (error) {
      console.error("Failed to delete result:", error);
      alert("Gagal menghapus: Terjadi kesalahan saat mencoba menghapus gambar.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = (url: string, toolName: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `${toolName}-${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatToolName = (name: string) => {
    return name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (results.length === 0) {
    return null; // Don't show the gallery section if empty
  }

  return (
    <div className="mt-16 mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-jakarta font-bold text-foreground">Riwayat Hasil AI</h2>
        <p className="text-sm text-muted-foreground">
          {results.length} gambar tersimpan
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {results.map((result) => (
          <Card key={result.id} className="group relative overflow-hidden border-border/50">
            <div className="aspect-square bg-muted relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={result.result_url}
                alt={result.input_summary || result.tool_name}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
              
              {/* Hover overlay with actions */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-center items-center gap-3">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="w-32 gap-2"
                  onClick={() => handleDownload(result.result_url, result.tool_name)}
                >
                  <Download className="w-4 h-4" /> Download
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="w-32 gap-2"
                  onClick={() => handleDelete(result.id)}
                  disabled={deletingId === result.id}
                >
                  {deletingId === result.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Hapus
                </Button>
              </div>

              {/* Badges */}
              <div className="absolute top-2 right-2 flex flex-col gap-1 items-end pointer-events-none">
                <span className="text-[10px] bg-black/70 text-white px-2 py-1 rounded-full font-medium shadow-sm border border-white/10">
                  {formatToolName(result.tool_name)}
                </span>
              </div>
            </div>
            
            <div className="p-3 bg-card border-t border-border/50">
              <p className="text-xs text-muted-foreground truncate" title={result.input_summary || "No description"}>
                {result.input_summary || "AI Generated"}
              </p>
              <p className="text-[10px] text-muted-foreground/70 mt-1">
                {new Date(result.created_at).toLocaleDateString('id-ID', {
                  day: 'numeric', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit'
                })}
              </p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
