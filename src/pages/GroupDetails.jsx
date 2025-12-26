import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { UserPlus, ArrowLeft, Settings, Users, UserMinus, Plus, Phone, FileText } from 'lucide-react';
import TagInput from '../components/TagInput';
import Modal from '../components/Modal';
import { api } from '../services/api';

const GroupDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data, setData } = useOutletContext();
    const [participants, setParticipants] = useState([]);
    const [loadingMembers, setLoadingMembers] = useState(false);

    // Add Member Modal State
    const [isAddModalOpen, setAddModalOpen] = useState(false);
    const [newMemberData, setNewMemberData] = useState({ name: '', phone: '', notes: '' });
    const [addingMember, setAddingMember] = useState(false);

    const group = data?.groups?.find(g => g.id === id);

    useEffect(() => {
        if (group) {
            loadGroupMembers();
        }
    }, [group?.id]);

    const loadGroupMembers = async () => {
        setLoadingMembers(true);
        try {
            const members = await api.getGroupMembers(id);
            setParticipants(members);
        } catch (error) {
            console.error('Error loading members:', error);
        } finally {
            setLoadingMembers(false);
        }
    };

    if (!group) {
        return <div className="p-8">Grupo não encontrado</div>;
    }

    // Get all tags for suggestions
    const allTags = Array.from(new Set(
        data?.groups?.flatMap(g => g.tags || []) || []
    )).sort();

    const handleUpdateTags = (newTags) => {
        setData(prev => ({
            ...prev,
            groups: prev.groups.map(g =>
                g.id === id ? { ...g, tags: newTags } : g
            )
        }));
    };

    const handleAddMember = async (e) => {
        e.preventDefault();
        setAddingMember(true);
        try {
            await api.addMemberToGroup(id, newMemberData);

            // Update local state
            await loadGroupMembers();

            // Update global group count locally
            setData(prev => ({
                ...prev,
                groups: prev.groups.map(g =>
                    g.id === id ? { ...g, members: g.members + 1 } : g
                )
            }));

            closeAddModal();
        } catch (error) {
            console.error('Error adding member:', error);
        } finally {
            setAddingMember(false);
        }
    };

    const handleRemoveMember = async (memberId) => {
        if (window.confirm('Remover este participante do grupo?')) {
            try {
                await api.removeMemberFromGroup(id, memberId);
                await loadGroupMembers();

                // Update global group count locally
                setData(prev => ({
                    ...prev,
                    groups: prev.groups.map(g =>
                        g.id === id ? { ...g, members: Math.max(0, g.members - 1) } : g
                    )
                }));
            } catch (error) {
                console.error('Error removing member:', error);
            }
        }
    };

    const closeAddModal = () => {
        setAddModalOpen(false);
        setNewMemberData({ name: '', phone: '', notes: '' });
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            <button
                onClick={() => navigate('/groups')}
                className="flex items-center space-x-2 text-slate-500 hover:text-brand-600 transition-colors"
            >
                <ArrowLeft size={18} />
                <span>Voltar para Grupos</span>
            </button>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-100 to-accent-100 flex items-center justify-center text-brand-700 font-bold text-xl">
                    {group.image}
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">{group.name}</h2>
                    <p className="text-slate-500">ID: {group.id} • {group.members} Participantes</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Configurações Gerais */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-fit">
                    <div className="flex items-center space-x-3 mb-6">
                        <div className="p-2 bg-slate-100 rounded-lg">
                            <Settings size={20} className="text-slate-600" />
                        </div>
                        <h3 className="font-bold text-slate-800">Configurações Gerais</h3>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Grupo</label>
                            <input type="text" defaultValue={group.name} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50" disabled />
                        </div>

                        {/* Tags Management */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Etiquetas</label>
                            <TagInput
                                tags={group.tags || []}
                                onChange={handleUpdateTags}
                                suggestions={allTags}
                            />
                        </div>
                    </div>
                </div>

                {/* Gestão de Participantes */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-brand-100 rounded-lg">
                                <Users size={20} className="text-brand-600" />
                            </div>
                            <h3 className="font-bold text-slate-800">Participantes</h3>
                        </div>
                        <button
                            onClick={() => setAddModalOpen(true)}
                            className="px-3 py-1.5 bg-gradient-to-r from-brand-600 to-brand-700 text-white rounded-lg hover:from-brand-700 hover:to-brand-800 transition-all text-sm font-medium flex items-center gap-2"
                        >
                            <UserPlus size={16} />
                            Adicionar
                        </button>
                    </div>

                    <div className="max-h-96 overflow-y-auto pr-1">
                        {loadingMembers ? (
                            <div className="p-4 text-center text-slate-500 text-sm">Carregando...</div>
                        ) : participants.length === 0 ? (
                            <div className="p-8 text-center border-2 border-dashed border-slate-100 rounded-lg">
                                <p className="text-slate-400 text-sm">Nenhum participante ainda.</p>
                            </div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="border-b border-slate-100 text-xs text-slate-500">
                                    <tr>
                                        <th className="text-left pb-2 font-semibold">Contato</th>
                                        <th className="text-left pb-2 font-semibold">Infos</th>
                                        <th className="text-right pb-2 font-semibold">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {participants.map(p => (
                                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-3 align-top">
                                                <div className="flex items-start gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold shrink-0 mt-0.5">
                                                        {p.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-slate-800">{p.name}</p>
                                                        <div className="flex items-center text-slate-500 text-xs mt-0.5">
                                                            <Phone size={10} className="mr-1" />
                                                            {p.phone}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 align-top">
                                                {p.notes ? (
                                                    <div className="flex items-start text-xs text-slate-500 max-w-[150px]">
                                                        <FileText size={10} className="mr-1 mt-0.5 shrink-0" />
                                                        <span className="truncate">{p.notes}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-300">-</span>
                                                )}
                                            </td>
                                            <td className="text-right py-3 align-top">
                                                <button
                                                    onClick={() => handleRemoveMember(p.id)}
                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                    title="Remover do grupo"
                                                >
                                                    <UserMinus size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal de Adicionar Participante Manual */}
            <Modal isOpen={isAddModalOpen} onClose={closeAddModal} title="Adicionar Participante">
                <form onSubmit={handleAddMember} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            required
                            value={newMemberData.name}
                            onChange={(e) => setNewMemberData({ ...newMemberData, name: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                            placeholder="Ex: João Silva"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Telefone (WhatsApp) <span className="text-red-500">*</span></label>
                        <input
                            type="tel"
                            required
                            value={newMemberData.phone}
                            onChange={(e) => setNewMemberData({ ...newMemberData, phone: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                            placeholder="Ex: 11999998888"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Notas / Observações</label>
                        <textarea
                            value={newMemberData.notes}
                            onChange={(e) => setNewMemberData({ ...newMemberData, notes: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                            placeholder="Informações adicionais..."
                            rows="3"
                        />
                    </div>

                    <div className="flex gap-2 pt-2">
                        <button
                            type="button"
                            onClick={closeAddModal}
                            className="flex-1 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors text-sm"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={addingMember}
                            className="flex-1 px-4 py-2 bg-gradient-to-r from-brand-600 to-brand-700 text-white rounded-lg font-medium hover:from-brand-700 hover:to-brand-800 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                        >
                            {addingMember ? 'Adicionando...' : (
                                <>
                                    <Plus size={16} />
                                    <span>Adicionar Membro</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default GroupDetails;
