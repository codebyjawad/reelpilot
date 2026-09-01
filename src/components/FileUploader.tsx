import { useRef, useState, useCallback } from 'react';
import { Upload, X, FileVideo } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploaderProps {
  onFileSelected: (file: File) => void;
  accept?: string;
  maxSizeMB?: number;
  label?: string;
  existingFile?: string | null;
  onClear?: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function FileUploader({
  onFileSelected,
  accept = 'video/*',
  maxSizeMB = 500,
  label = 'Drag & drop video or click to browse',
  existingFile,
  onClear,
}: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress] = useState(0);

  const handleFile = useCallback(
    (f: File | null) => {
      if (!f) return;
      setError(null);

      if (maxSizeMB && f.size > maxSizeMB * 1024 * 1024) {
        setError(`File size exceeds ${maxSizeMB}MB limit`);
        return;
      }

      setFile(f);
      onFileSelected(f);
    },
    [maxSizeMB, onFileSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFile = e.dataTransfer.files?.[0];
      handleFile(droppedFile ?? null);
    },
    [handleFile]
  );

  const handleClear = () => {
    setFile(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
    onClear?.();
  };

  const showPreview = file || existingFile;

  return (
    <div className="w-full">
      {!showPreview ? (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            'cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200',
            isDragging
              ? 'border-accent-400 bg-accent-400/5'
              : 'border-slate-700 hover:border-slate-600 hover:bg-bg-surface/50'
          )}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-800 text-slate-400">
              <Upload className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">{label}</p>
              <p className="mt-1 text-xs text-slate-500">
                MP4, MOV, WebM up to {maxSizeMB}MB
              </p>
            </div>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
        </div>
      ) : (
        <div className="rounded-xl border border-slate-700 bg-bg-surface/50 p-4 animate-fade-in">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-accent-400">
              <FileVideo className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-200">
                {file?.name ?? existingFile}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {file ? formatFileSize(file.size) : 'Uploaded'}
              </p>
              {file && progress > 0 && (
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
                  <div
                    className="h-full rounded-full bg-accent-400 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>
            <button
              onClick={handleClear}
              className="shrink-0 rounded-md p-2 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
