import React from 'react';
import { Button } from './ui/button';
import { Download, FileText, FileCode, File } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@radix-ui/react-dropdown-menu";

interface ExportDropdownProps {
    researchId: string;
    onExport: (format: 'markdown' | 'pdf' | 'latex') => void;
}

export const ExportDropdown = ({ researchId, onExport }: ExportDropdownProps) => {
    // We can use direct links if we prefer, but let's stick to the callback prop pattern or direct navigation
    const handleDownload = (format: 'markdown' | 'pdf' | 'latex') => {
        // Construct the URL directly for download
        const url = `/api/export/${researchId}/${format}`; // Adjust based on proxy
        // Actually, since we have a proxy, we can just open the window or use an anchor tag.
        // But the user might want to use the onExport callback if we were doing client-side generation.
        // Let's use window.open for now or a hidden link.

        // However, the proxy is at /api if configured that way, or just /export if forwarded.
        // Vite proxy: '^/research' -> target. '^/auth' -> target.
        // We need to verify if '/export' is proxied in vite.config.ts.

        window.open(`/export/${researchId}/${format}`, '_blank');
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Download className="h-4 w-4" />
                    Export
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg p-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                <DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Download As
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />

                <DropdownMenuItem
                    onClick={() => handleDownload('pdf')}
                    className="flex items-center gap-2 px-2 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded outline-none cursor-pointer"
                >
                    <File className="h-4 w-4 text-red-500" />
                    <span>PDF Document</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                    onClick={() => handleDownload('markdown')}
                    className="flex items-center gap-2 px-2 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded outline-none cursor-pointer"
                >
                    <FileText className="h-4 w-4 text-blue-500" />
                    <span>Markdown</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                    onClick={() => handleDownload('latex')}
                    className="flex items-center gap-2 px-2 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded outline-none cursor-pointer"
                >
                    <FileCode className="h-4 w-4 text-green-500" />
                    <span>LaTeX Source</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
