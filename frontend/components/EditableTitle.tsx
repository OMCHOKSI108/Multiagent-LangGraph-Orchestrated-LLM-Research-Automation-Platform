import React, { useState, useRef, useEffect } from 'react';
import { Edit2, Check, X } from 'lucide-react';

interface EditableTitleProps {
    title: string;
    onSave: (newTitle: string) => void;
    className?: string;
}

export const EditableTitle: React.FC<EditableTitleProps> = ({
    title,
    onSave,
    className = '',
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState(title);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setValue(title);
    }, [title]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleSave = () => {
        if (value.trim() && value !== title) {
            onSave(value.trim());
        }
        setIsEditing(false);
    };

    const handleCancel = () => {
        setValue(title);
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSave();
        } else if (e.key === 'Escape') {
            handleCancel();
        }
    };

    if (isEditing) {
        return (
            <div className={`flex items-center gap-2 ${className}`}>
                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onBlur={handleSave}
                    onKeyDown={handleKeyDown}
                    className="bg-gray-700 text-white px-2 py-1 rounded border border-cyan-500 focus:outline-none text-lg font-semibold"
                    style={{ minWidth: '200px' }}
                />
                <button
                    onClick={handleSave}
                    className="p-1 text-green-400 hover:text-green-300"
                >
                    <Check className="w-4 h-4" />
                </button>
                <button
                    onClick={handleCancel}
                    className="p-1 text-red-400 hover:text-red-300"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        );
    }

    return (
        <div
            className={`flex items-center gap-2 cursor-pointer group ${className}`}
            onClick={() => setIsEditing(true)}
        >
            <h1 className="text-xl font-semibold text-white">{title || 'Untitled Research'}</h1>
            <Edit2 className="w-4 h-4 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
    );
};

export default EditableTitle;
