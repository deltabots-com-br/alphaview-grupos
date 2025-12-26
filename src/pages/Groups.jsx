import React, { useState, useMemo } from 'react';
import { Search, Plus, MessageCircle, Settings, RefreshCcw, Filter } from 'lucide-react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import Tag from '../components/Tag';
import TagInput from '../components/TagInput';
import { api } from '../services/api';

const Groups = () => {
    const { data, setData } = useOutletContext();
    const navigate = useNavigate();
    const [isModalOpen, setModalOpen] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupDescription, setNewGroupDescription] = useState('');
    const [newGroupTags, setNewGroupTags] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTags, setSelectedTags] = useState([]);

    const groups = data?.groups || [];

    // Extract all unique tags from groups (now as objects with name and color)
    const allTags = useMemo(() => {
        const tagMap = new Map();
        groups.forEach(group => {
            group.tags?.forEach(tag => {
                if (!tagMap.has(tag.name)) {
                    tagMap.set(tag.name, tag);
                }
            });
        });
        return Array.from(tagMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [groups]);

    // Filtered groups based on search and tags
    const filteredGroups = useMemo(() => {
        return groups.filter(group => {
            const matchesSearch = group.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesTags = selectedTags.length === 0 ||
                selectedTags.some(tagName => group.tags?.find(t => t.name === tagName));
            return matchesSearch && matchesTags;
        });
    }, [groups, searchTerm, selectedTags]);

    const handleCreate = async () => {
        setIsLoading(true);
        const newGroup = await api.createGroup(newGroupName);

        // Add tags and description to the new group
        newGroup.tags = newGroupTags;
        newGroup.description = newGroupDescription;

        setData(prev => ({
            ...prev,
            groups: [newGroup, ...prev.groups],
            metrics: { ...prev.metrics, totalGroups: prev.metrics.totalGroups + 1 }
        }));

        setIsLoading(false);
        closeModal();
    };

    const closeModal = () => {
        setNewGroupName('');
        setNewGroupDescription('');
        setNewGroupTags([]);
        setModalOpen(false);
    };

    const handleOpenChat = (groupId) => {
        navigate('/chat');
    };

    const toggleTag = (tag) => {
        setSelectedTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    return (
        <div className="space-y-3 md:space-y-6 animate-fade-in-up">
            {/* Search and Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                <div className="relative flex-1 sm:flex-none sm:w-64">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar grupo..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                    />
                </div>
                <button onClick={() => setModalOpen(true)} className="bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white px-5 py-2.5 rounded-lg flex items-center justify-center space-x-2 text-sm font-semibold transition-all shadow-sm">
                    <Plus size={18} strokeWidth={2.5} />
                    <span>Novo Grupo</span>
                </button>
            </div>

            {/* Tag Filter - Simplified for Mobile */}
            <div className="bg-white/90 backdrop-blur-sm p-3 rounded-xl border border-slate-200/60 shadow-sm">
                <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                        <Filter size={14} className="text-brand-600" />
                        <span className="text-xs font-semibold text-slate-700">Filtros</span>
                    </div>
                    {selectedTags.length > 0 && (
                        <button
                            onClick={() => setSelectedTags([])}
                            className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                        >
                            Limpar
                        </button>
                    )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {allTags.map(tag => (
                        <Tag
                            key={tag.name}
                            label={tag.name}
                            customColor={tag.color}
                            clickable
                            onClick={() => toggleTag(tag.name)}
                        />
                    ))}
                </div>
            </div>

            {/* Results Count */}
            <div className="text-xs text-slate-500">
                <span className="font-semibold text-slate-700">{filteredGroups.length}</span> de{' '}
                <span className="font-semibold text-slate-700">{groups.length}</span> grupos
            </div>

            {/* Groups List - Mobile Cards / Desktop Table */}
            <div className="space-y-0">
                {/* Mobile Card View */}
                <div className="md:hidden bg-slate-50">
                    {filteredGroups.map(group => (
                        <div
                            key={group.id}
                            onClick={() => handleOpenChat(group.id)}
                            className="p-2.5 border-b border-slate-200 hover:bg-white transition-all"
                        >
                            <div className="flex justify-between items-start mb-1.5">
                                <div className="flex items-center space-x-2 flex-1 min-w-0">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-sm">
                                        {group.image}
                                    </div>
                                    <div className="overflow-hidden flex-1 min-w-0">
                                        <h4 className="font-semibold text-slate-800 text-[13px] truncate leading-tight">{group.name}</h4>
                                        <p className="text-[11px] text-slate-500 truncate mt-0.5">{group.members} membros</p>
                                    </div>
                                </div>
                                <div className="text-right flex-shrink-0 ml-2">
                                    <span className="text-[9px] text-slate-400 block">{group.lastActivity}</span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/groups/${group.id}`);
                                        }}
                                        className="p-1 text-slate-400 hover:text-brand-600 rounded-lg transition-colors mt-1"
                                    >
                                        <Settings size={14} />
                                    </button>
                                </div>
                            </div>

                            {/* Tags - Compact */}
                            {group.tags && group.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {group.tags.slice(0, 3).map(tag => (
                                        <Tag key={tag.name} label={tag.name} customColor={tag.color} />
                                    ))}
                                    {group.tags.length > 3 && (
                                        <span className="text-[10px] text-slate-500 font-medium">
                                            +{group.tags.length - 3}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}

                    {filteredGroups.length === 0 && (
                        <div className="p-8 text-center">
                            <div className="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-3">
                                <Search size={28} className="text-brand-400" />
                            </div>
                            <p className="text-sm font-medium text-slate-600">Nenhum grupo encontrado</p>
                            <p className="text-xs text-slate-400 mt-1">Ajuste os filtros ou busca</p>
                        </div>
                    )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase text-slate-500 font-semibold">
                            <tr>
                                <th className="px-6 py-4">Nome do Grupo</th>
                                <th className="px-6 py-4">Etiquetas</th>
                                <th className="px-6 py-4">Participantes</th>
                                <th className="px-6 py-4">Última Atividade</th>
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredGroups.map(group => (
                                <tr
                                    key={group.id}
                                    onClick={() => handleOpenChat(group.id)}
                                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-100 to-accent-100 flex items-center justify-center text-brand-700 font-bold text-xs">
                                                {group.image}
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-800">{group.name}</p>
                                                <p className="text-xs text-slate-400">ID: {group.id}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1.5">
                                            {group.tags?.map(tag => (
                                                <Tag key={tag.name} label={tag.name} customColor={tag.color} />
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-gradient-to-r from-brand-500 to-brand-600" style={{ width: `${(group.members / group.maxMembers) * 100}%` }}></div>
                                            </div>
                                            <span className="text-xs text-slate-500">{group.members}/{group.maxMembers}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500">
                                        {group.lastActivity}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end space-x-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleOpenChat(group.id);
                                                }}
                                                title="Abrir Chat do Grupo"
                                                className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                                            >
                                                <MessageCircle size={18} />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/groups/${group.id}`);
                                                }}
                                                title="Configurações"
                                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                            >
                                                <Settings size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredGroups.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <Search size={32} className="text-slate-300" />
                                            <p className="font-medium">Nenhum grupo encontrado</p>
                                            <p className="text-sm">Tente ajustar os filtros</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={closeModal} title="Criar Novo Grupo">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Grupo</label>
                        <input
                            type="text"
                            value={newGroupName}
                            onChange={(e) => setNewGroupName(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                            placeholder="Ex: Lançamento Turma 10"
                        />
                        <p className="text-xs text-slate-500 mt-1">Este nome será sincronizado com o WhatsApp.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                        <textarea
                            value={newGroupDescription}
                            onChange={(e) => setNewGroupDescription(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                            placeholder="Descreva o objetivo deste grupo..."
                            rows="3"
                        />
                        <p className="text-xs text-slate-500 mt-1">Descrição opcional para identificação interna.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Etiquetas</label>

                        {/* Quick Pick Existing Tags */}
                        {allTags.length > 0 && (
                            <div className="mb-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                <p className="text-xs text-slate-600 font-medium mb-2">Selecione rapidamente:</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {allTags.map(tag => {
                                        const isSelected = newGroupTags.find(t => t.name === tag.name);
                                        return (
                                            <button
                                                key={tag.name}
                                                type="button"
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setNewGroupTags(prev => prev.filter(t => t.name !== tag.name));
                                                    } else {
                                                        setNewGroupTags(prev => [...prev, tag]);
                                                    }
                                                }}
                                                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${isSelected
                                                    ? 'ring-2 ring-offset-1 ring-slate-900'
                                                    : 'opacity-70 hover:opacity-100'
                                                    }`}
                                                style={{
                                                    backgroundColor: tag.color,
                                                    color: 'white'
                                                }}
                                            >
                                                {tag.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <TagInput
                            tags={newGroupTags}
                            onChange={setNewGroupTags}
                            suggestions={allTags}
                        />
                    </div>

                    <button
                        onClick={handleCreate}
                        disabled={!newGroupName || isLoading}
                        className="w-full bg-gradient-to-r from-brand-600 to-brand-700 text-white py-2 rounded-lg font-medium hover:from-brand-700 hover:to-brand-800 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center transition-all"
                    >
                        {isLoading ? <RefreshCcw className="animate-spin" size={20} /> : 'Criar Grupo'}
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default Groups;
