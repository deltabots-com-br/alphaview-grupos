import React from 'react';
import { X } from 'lucide-react';

const Tag = ({ label, onRemove, clickable = false, onClick, customColor }) => {
    // Use solid background color with white text
    const bgColor = customColor || '#64748b';

    return (
        <span
            onClick={clickable ? onClick : undefined}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${clickable ? 'cursor-pointer hover:opacity-80' : ''
                }`}
            style={{
                backgroundColor: bgColor,
                color: 'white'
            }}
        >
            {label}
            {onRemove && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                    }}
                    className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
                >
                    <X size={12} strokeWidth={3} />
                </button>
            )}
        </span>
    );
};

export default Tag;
