'use client';

/**
 * FileUploader Component
 *
 * Componente de upload de arquivos com drag & drop.
 * Suporta múltiplos arquivos e exibe progresso.
 */

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface FileUploaderProps {
    contractId: string;
    onUploadComplete?: (results: UploadResults) => void;
    onError?: (error: string) => void;
    maxFiles?: number;
    maxSizeMB?: number;
    accept?: Record<string, string[]>;
}

export interface UploadResults {
    success: boolean;
    summary: {
        total: number;
        validated: number;
        needsSuffix: number;
        unrecognized: number;
        errors: number;
    };
    results: ValidationResult[];
}

interface ValidationResult {
    filename: string;
    status: string;
    matched_document_code?: string;
    confidence: number;
    error?: string;
}

interface QueuedFile {
    file: File;
    id: string;
    status: 'queued' | 'uploading' | 'success' | 'error';
    error?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_ACCEPT = {
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'application/vnd.ms-excel': ['.xls'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'image/*': ['.jpg', '.jpeg', '.png', '.tif', '.tiff'],
};

// ============================================================================
// COMPONENT
// ============================================================================

export function FileUploader({
    contractId,
    onUploadComplete,
    onError,
    maxFiles = 100,
    maxSizeMB = 50,
    accept = DEFAULT_ACCEPT,
}: FileUploaderProps) {
    const [files, setFiles] = useState<QueuedFile[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);

    // Handle file drop
    const onDrop = useCallback(
        (acceptedFiles: File[]) => {
            const newFiles: QueuedFile[] = acceptedFiles.map((file) => ({
                file,
                id: `${file.name}-${Date.now()}`,
                status: 'queued' as const,
            }));

            setFiles((prev) => {
                const combined = [...prev, ...newFiles];
                // Limitar número de arquivos
                return combined.slice(0, maxFiles);
            });
        },
        [maxFiles]
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept,
        maxSize: maxSizeMB * 1024 * 1024,
        disabled: isUploading,
    });

    // Remove file from queue
    const removeFile = (id: string) => {
        setFiles((prev) => prev.filter((f) => f.id !== id));
    };

    // Clear all files
    const clearAll = () => {
        setFiles([]);
        setProgress(0);
    };

    // Upload files
    const handleUpload = async () => {
        if (files.length === 0) return;

        setIsUploading(true);
        setProgress(0);

        try {
            // Create FormData
            const formData = new FormData();
            files.forEach((qf) => {
                formData.append('files', qf.file);
            });

            // Upload to API
            const response = await fetch(`/api/validation/${contractId}/validate`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Upload failed');
            }

            const data: UploadResults = await response.json();

            // Update file statuses based on results
            setFiles((prev) =>
                prev.map((qf) => {
                    const result = data.results.find((r) => r.filename === qf.file.name);
                    if (result) {
                        return {
                            ...qf,
                            status: result.status === 'ERROR' ? 'error' : 'success',
                            error: result.error,
                        };
                    }
                    return { ...qf, status: 'success' };
                })
            );

            setProgress(100);
            onUploadComplete?.(data);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Upload failed';
            onError?.(message);

            // Mark all as error
            setFiles((prev) => prev.map((qf) => ({ ...qf, status: 'error', error: message })));
        } finally {
            setIsUploading(false);
        }
    };

    // Calculate total size
    const totalSize = files.reduce((sum, f) => sum + f.file.size, 0);
    const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);

    return (
        <div className="space-y-4">
            {/* Dropzone */}
            <div
                {...getRootProps()}
                className={cn(
                    'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                    isDragActive
                        ? 'border-primary bg-primary/5'
                        : 'border-muted-foreground/25 hover:border-primary/50',
                    isUploading && 'opacity-50 cursor-not-allowed'
                )}
            >
                <input {...getInputProps()} />
                <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                {isDragActive ? (
                    <p className="text-lg font-medium">Solte os arquivos aqui...</p>
                ) : (
                    <>
                        <p className="text-lg font-medium">Arraste arquivos ou clique para selecionar</p>
                        <p className="text-sm text-muted-foreground mt-2">
                            Suporta PDF, DOC, DOCX, XLS, XLSX, imagens (máx. {maxSizeMB}MB por arquivo)
                        </p>
                    </>
                )}
            </div>

            {/* File list */}
            {files.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">
                            {files.length} arquivo(s) selecionado(s) ({totalSizeMB} MB)
                        </p>
                        <Button variant="ghost" size="sm" onClick={clearAll} disabled={isUploading}>
                            Limpar tudo
                        </Button>
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-1">
                        {files.map((qf) => (
                            <div
                                key={qf.id}
                                className="flex items-center gap-2 p-2 bg-muted rounded-md text-sm"
                            >
                                <File className="h-4 w-4 flex-shrink-0" />
                                <span className="flex-1 truncate">{qf.file.name}</span>
                                <span className="text-muted-foreground text-xs">
                                    {(qf.file.size / 1024).toFixed(0)} KB
                                </span>
                                {qf.status === 'success' && (
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                )}
                                {qf.status === 'error' && (
                                    <AlertCircle className="h-4 w-4 text-red-500" />
                                )}
                                {qf.status === 'queued' && !isUploading && (
                                    <button
                                        onClick={() => removeFile(qf.id)}
                                        className="text-muted-foreground hover:text-destructive"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Progress */}
            {isUploading && (
                <div className="space-y-2">
                    <Progress value={progress} className="h-2" />
                    <p className="text-sm text-muted-foreground text-center">
                        Validando arquivos...
                    </p>
                </div>
            )}

            {/* Upload button */}
            <div className="flex justify-end gap-2">
                <Button
                    onClick={handleUpload}
                    disabled={files.length === 0 || isUploading}
                    className="min-w-32"
                >
                    {isUploading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Validando...
                        </>
                    ) : (
                        <>
                            <Upload className="mr-2 h-4 w-4" />
                            Validar {files.length > 0 ? `(${files.length})` : ''}
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
