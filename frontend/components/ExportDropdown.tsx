import React from 'react';
import { Button } from './ui/button';
import { Download, FileText, FileCode, File, Archive, BarChart3 } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

interface ExportDropdownProps {
    researchId: string;
    onExport: (format: 'markdown' | 'pdf' | 'latex' | 'zip' | 'plots') => void;
}

export const ExportDropdown = ({ researchId, onExport }: ExportDropdownProps) => {
    const handleDownload = (format: 'markdown' | 'pdf' | 'latex' | 'zip' | 'plots') => {
        onExport(format);
    };

    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Download className="h-4 w-4" />
                    Export
                </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="end" className="w-48 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg p-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                <DropdownMenu.Label className="px-2 py-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Download As
                </DropdownMenu.Label>
                <DropdownMenu.Separator className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />

                <DropdownMenu.Item
                    onClick={() => handleDownload('pdf')}
                    className="flex items-center gap-2 px-2 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded outline-none cursor-pointer"
                >
                    <File className="h-4 w-4 text-red-500" />
                    <span>PDF Document</span>
                </DropdownMenu.Item>

                <DropdownMenu.Item
                    onClick={() => handleDownload('markdown')}
                    className="flex items-center gap-2 px-2 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded outline-none cursor-pointer"
                >
                    <FileText className="h-4 w-4 text-blue-500" />
                    <span>Markdown</span>
                </DropdownMenu.Item>

                <DropdownMenu.Item
                    onClick={() => handleDownload('latex')}
                    className="flex items-center gap-2 px-2 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded outline-none cursor-pointer"
                >
                    <FileCode className="h-4 w-4 text-green-500" />
                    <span>LaTeX Source</span>
                </DropdownMenu.Item>

                <DropdownMenu.Separator className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />

                <DropdownMenu.Item
                    onClick={() => handleDownload('zip')}
                    className="flex items-center gap-2 px-2 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded outline-none cursor-pointer"
                >
                    <Archive className="h-4 w-4 text-purple-500" />
                    <span>All as ZIP</span>
                </DropdownMenu.Item>

                <DropdownMenu.Item
                    onClick={() => handleDownload('plots')}
                    className="flex items-center gap-2 px-2 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded outline-none cursor-pointer"
                >
                    <BarChart3 className="h-4 w-4 text-orange-500" />
                    <span>Plots Only</span>
                </DropdownMenu.Item>
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    );
};
