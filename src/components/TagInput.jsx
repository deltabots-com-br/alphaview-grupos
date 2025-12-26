import React, { useState } from 'react';
import { X, Plus, Palette } from 'lucide-react';
import Tag from './Tag';

const TAG_COLORS = [
    { name: 'Vermelho', value: '#ef4444' },
    { name: 'Laranja', value: '#f59e0b' },
    { name: 'Amarelo', value: '#eab308' },
    { name: 'Verde', value: '#10b981' },
    { name: 'Teal', value: '#14b8a6' },
    { name: 'Azul', value: '#3b82f6' },
    { name: 'Índigo', value: '#6366f1' },
    { name: 'Roxo', value: '#a855f7' },
    { name: 'Rosa', value: '#ec4899' },
    { name: 'Cinza', value: '#64748b' },
];

const TagInput = ({ tags = [], onChange, suggestions = [] }) => {
    const [inputValue, setInputValue] = useState('');
    const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0].value);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);

    const handleAddTag = (tagName, tagColor = selectedColor) => {
        const trimmedTag = tagName.trim().toLowerCase();
        if (trimmedTag && !tags.find(t => t.name === trimmedTag)) {
            onChange([...tags, { name: trimmedTag, color: tagColor }]);
            setInputValue('');
            setShowSuggestions(false);
        }
    };

    const handleRemoveTag = (tagName) => {
        onChange(tags.filter(tag => tag.name !== tagName));
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddTag(inputValue);
        }
    };

    const filteredSuggestions = suggestions.filter(
        s => !tags.find(t => t.name === s.name) && s.name.toLowerCase().includes(inputValue.toLowerCase())
    );

    return (
        <div>
            <div className="flex flex-wrap gap-2 mb-2">
                {tags.map(tag => (
                    <Tag
                        key={tag.name}
                        label={tag.name}
                        customColor={tag.color}
                        onRemove={() => handleRemoveTag(tag.name)}
                    />
                ))}
            </div>

            <div className="relative">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => {
                                setInputValue(e.target.value);
                                setShowSuggestions(e.target.value.length > 0);
                            }}
                            onKeyDown={handleKeyDown}
                            onFocus={() => setShowSuggestions(inputValue.length > 0)}
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                            placeholder="Digite e pressione Enter..."
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                    </div>

                    {/* Color Picker Button */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setShowColorPicker(!showColorPicker)}
                            className="px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
                        >
                            <div
                                className="w-5 h-5 rounded border-2 border-white shadow-sm"
                                style={{ backgroundColor: selectedColor }}
                            />
                            <Palette size={16} className="text-slate-500" />
                        </button>

                        {/* Color Picker Dropdown */}
                        {showColorPicker && (
                            <div className="absolute right-0 bottom-full mb-2 p-3 bg-white border border-slate-200 rounded-lg shadow-lg z-20 w-48">
                                <p className="text-xs font-semibold text-slate-600 mb-2">Escolha uma cor:</p>
                                <div className="grid grid-cols-5 gap-2">
                                    {TAG_COLORS.map(color => (
                                        <button
                                            key={color.value}
                                            type="button"
                                            onClick={() => {
                                                setSelectedColor(color.value);
                                                setShowColorPicker(false);
                                            }}
                                            className={`w-8 h-8 rounded-lg border-2 transition-all hover:scale-110 ${selectedColor === color.value ? 'border-slate-900 ring-2 ring-brand-500' : 'border-white'
                                                }`}
                                            style={{ backgroundColor: color.value }}
                                            title={color.name}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={() => handleAddTag(inputValue)}
                        disabled={!inputValue.trim()}
                        className="px-3 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Plus size={16} />
                    </button>
                </div>

                {/* Suggestions Dropdown */}
                {showSuggestions && filteredSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                        {filteredSuggestions.map(suggestion => (
                            <button
                                key={suggestion.name}
                                type="button"
                                onClick={() => handleAddTag(suggestion.name, suggestion.color)}
                                className="w-full text-left px-3 py-2 hover:bg-brand-50 transition-colors flex items-center gap-2"
                            >
                                <Tag label={suggestion.name} customColor={suggestion.color} />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <p className="text-xs text-slate-500 mt-2">
                Digite uma etiqueta, escolha uma cor e pressione Enter ou clique em +
            </p>
        </div>
    );
};

export default TagInput;
