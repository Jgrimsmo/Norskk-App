"use client";

import * as React from "react";
import {
  ChevronRight,
  FileText,
  FolderOpen,
  FolderPlus,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { uploadFile, deleteFile } from "@/lib/firebase/storage";
import type { Drawing, DrawingFolder, Project } from "@/lib/types/time-tracking";

// ────────────────────────────────────────────
// Props
// ────────────────────────────────────────────

interface ProjectDrawingsProps {
  project: Project;
  onUpdate: (patch: Partial<Project>) => void;
}

// ────────────────────────────────────────────
// Component
// ────────────────────────────────────────────

export function ProjectDrawings({ project, onUpdate }: ProjectDrawingsProps) {
  const folders = project.drawingFolders ?? [];

  // ── State ──
  const [activeFolderId, setActiveFolderId] = React.useState<string | null>(null);
  const [addingFolder, setAddingFolder] = React.useState(false);
  const [newFolderName, setNewFolderName] = React.useState("");
  const [renamingFolderId, setRenamingFolderId] = React.useState<string | null>(null);
  const [renameValue, setRenameValue] = React.useState("");
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const activeFolder = folders.find((f) => f.id === activeFolderId) ?? null;

  // ── Helpers to persist folders ──
  const updateFolders = React.useCallback(
    (next: DrawingFolder[]) => onUpdate({ drawingFolders: next }),
    [onUpdate]
  );

  // ── Folder CRUD ──
  const handleAddFolder = () => {
    const name = newFolderName.trim();
    if (!name) return;
    const folder: DrawingFolder = {
      id: `df-${crypto.randomUUID().slice(0, 8)}`,
      name,
      drawings: [],
    };
    updateFolders([...folders, folder]);
    setActiveFolderId(folder.id);
    setNewFolderName("");
    setAddingFolder(false);
  };

  const handleRenameFolder = (id: string) => {
    const name = renameValue.trim();
    if (!name) return;
    updateFolders(folders.map((f) => (f.id === id ? { ...f, name } : f)));
    setRenamingFolderId(null);
    setRenameValue("");
  };

  const handleDeleteFolder = (id: string) => {
    const folder = folders.find((f) => f.id === id);
    if (!folder) return;
    // Delete all files in storage
    for (const d of folder.drawings) {
      deleteFile(`project-drawings/${project.id}/${id}/${d.id}/${d.fileName}`).catch(() => {});
    }
    updateFolders(folders.filter((f) => f.id !== id));
    if (activeFolderId === id) setActiveFolderId(null);
  };

  // ── Drawing upload ──
  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0 || !activeFolder) return;
    setUploading(true);
    const updated = [...(activeFolder.drawings ?? [])];

    for (const file of Array.from(files)) {
      try {
        const drawingId = `dw-${crypto.randomUUID().slice(0, 8)}`;
        const path = `project-drawings/${project.id}/${activeFolder.id}/${drawingId}/${file.name}`;
        const url = await uploadFile(file, path);
        updated.push({
          id: drawingId,
          name: file.name.replace(/\.pdf$/i, ""),
          fileUrl: url,
          fileName: file.name,
          uploadedAt: new Date().toISOString().slice(0, 10),
        });
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    updateFolders(
      folders.map((f) =>
        f.id === activeFolder.id ? { ...f, drawings: updated } : f
      )
    );
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDeleteDrawing = (drawingId: string) => {
    if (!activeFolder) return;
    const drawing = activeFolder.drawings.find((d) => d.id === drawingId);
    if (drawing) {
      deleteFile(
        `project-drawings/${project.id}/${activeFolder.id}/${drawingId}/${drawing.fileName}`
      ).catch(() => {});
    }
    updateFolders(
      folders.map((f) =>
        f.id === activeFolder.id
          ? { ...f, drawings: f.drawings.filter((d) => d.id !== drawingId) }
          : f
      )
    );
  };

  // ── Drag & drop ──
  const [dragActive, setDragActive] = React.useState(false);
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.length) handleFileSelect(e.dataTransfer.files);
  };

  // ────────────────────────────────────────
  // Render
  // ────────────────────────────────────────

  return (
    <div className="flex gap-4 min-h-[400px]">
      {/* ── Folder sidebar ── */}
      <div className="w-[220px] shrink-0 rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2.5 border-b bg-muted/50">
          <span className="text-xs font-semibold">Folders</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 cursor-pointer"
            onClick={() => setAddingFolder(true)}
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="p-1.5 space-y-0.5 max-h-[500px] overflow-y-auto">
          {addingFolder && (
            <div className="flex items-center gap-1 px-1 py-1">
              <Input
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddFolder();
                  if (e.key === "Escape") { setAddingFolder(false); setNewFolderName(""); }
                }}
                placeholder="Folder name"
                className="h-7 text-xs"
              />
              <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 cursor-pointer" onClick={handleAddFolder}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 cursor-pointer" onClick={() => { setAddingFolder(false); setNewFolderName(""); }}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {folders.length === 0 && !addingFolder && (
            <p className="text-[11px] text-muted-foreground text-center py-6 px-2">
              No folders yet. Create one to start uploading drawings.
            </p>
          )}

          {folders.map((folder) => (
            <div key={folder.id}>
              {renamingFolderId === folder.id ? (
                <div className="flex items-center gap-1 px-1 py-1">
                  <Input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRenameFolder(folder.id);
                      if (e.key === "Escape") setRenamingFolderId(null);
                    }}
                    className="h-7 text-xs"
                  />
                  <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 cursor-pointer" onClick={() => handleRenameFolder(folder.id)}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <button
                  className={`w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-left transition-colors cursor-pointer group ${
                    activeFolderId === folder.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-muted text-foreground"
                  }`}
                  onClick={() => setActiveFolderId(folder.id)}
                >
                  <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate flex-1">{folder.name}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {folder.drawings.length}
                  </span>
                  <ChevronRight className={`h-3 w-3 shrink-0 transition-transform ${
                    activeFolderId === folder.id ? "rotate-90" : ""
                  }`} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Drawings content ── */}
      <div className="flex-1 rounded-xl border bg-card shadow-sm overflow-hidden flex flex-col">
        {!activeFolder ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-16 gap-3">
            <FolderOpen className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {folders.length === 0
                ? "Create a folder to get started"
                : "Select a folder to view drawings"}
            </p>
          </div>
        ) : (
          <>
            {/* Folder header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/50">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">{activeFolder.name}</span>
                <Badge count={activeFolder.drawings.length} />
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1 cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="h-3 w-3" />
                  Upload PDFs
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 cursor-pointer text-muted-foreground hover:text-foreground"
                  onClick={() => { setRenamingFolderId(activeFolder.id); setRenameValue(activeFolder.name); }}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 cursor-pointer text-muted-foreground hover:text-red-600"
                  onClick={() => handleDeleteFolder(activeFolder.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* File input (hidden) */}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              multiple
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files)}
            />

            {/* Drawing list / upload zone */}
            <div className="flex-1 overflow-y-auto p-4">
              {activeFolder.drawings.length === 0 && !uploading ? (
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-16 transition-colors cursor-pointer ${
                    dragActive
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/25 hover:border-muted-foreground/50"
                  }`}
                >
                  <Upload className="h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    Drop PDF drawings here or click to browse
                  </p>
                  <p className="text-[11px] text-muted-foreground/60">Max 50 MB per file</p>
                </div>
              ) : (
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`space-y-1.5 ${dragActive ? "ring-2 ring-primary/30 rounded-lg" : ""}`}
                >
                  {activeFolder.drawings.map((drawing) => (
                    <div
                      key={drawing.id}
                      className="flex items-center gap-3 rounded-md border bg-background px-3 py-2 group hover:bg-muted/30 transition-colors"
                    >
                      <FileText className="h-4 w-4 text-red-500 shrink-0" />
                      <a
                        href={drawing.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline truncate flex-1 font-medium"
                      >
                        {drawing.name}
                      </a>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {drawing.uploadedAt}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-red-600 cursor-pointer shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDeleteDrawing(drawing.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}

                  {uploading && (
                    <div className="flex items-center justify-center gap-2 py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Uploading...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Small badge helper ──
function Badge({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center justify-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
      {count}
    </span>
  );
}
