import React from 'react';
import { Users, TrendingUp, MessageSquare, Activity } from 'lucide-react';
import StatCard from '../components/StatCard';
import { useOutletContext, useNavigate } from 'react-router-dom';

const Dashboard = () => {
    const { data } = useOutletContext();
    const navigate = useNavigate();

    const groups = data?.groups || [];
    const chats = data?.chats || [];

    const totalMembers = groups.reduce((sum, group) => sum + group.members, 0);
    const activeGroups = groups.filter(g => g.lastActivity).length;
    const totalMessages = chats.reduce((sum, chat) => sum + (chat.messages?.length || 0), 0);

    // Calcular taxa de resposta dinamicamente
    const responseRate = groups.length > 0
        ? Math.round((activeGroups / groups.length) * 100)
        : 0;

    const handleOpenChat = (groupId) => {
        // Find the group first
        const group = groups.find(g => g.id === groupId);
        if (group) {
            // Find the corresponding chat by name
            const chat = chats.find(c => c.name === group.name);
            if (chat) {
                navigate('/chat', { state: { chatId: chat.id } });
            } else {
                // If no chat exists, just navigate to chat page
                navigate('/chat');
            }
        }
    };

    return (
        <div className="space-y-3 md:space-y-6">
            {/* Stats Grid - Moderna e Compacta */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
                <div className="bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl p-3 md:p-4 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <Users size={16} strokeWidth={2.5} className="!text-white opacity-90" />
                        <span className="text-xl md:text-3xl font-bold !text-white">{groups.length}</span>
                    </div>
                    <p className="text-[9px] md:text-xs font-medium !text-white opacity-95 uppercase tracking-wide">Grupos Ativos</p>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-3 md:p-4 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <Activity size={16} strokeWidth={2.5} className="!text-white opacity-90" />
                        <span className="text-xl md:text-3xl font-bold !text-white">{totalMembers}</span>
                    </div>
                    <p className="text-[9px] md:text-xs font-medium !text-white opacity-95 uppercase tracking-wide">Participantes</p>
                </div>

                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-3 md:p-4 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <MessageSquare size={16} strokeWidth={2.5} className="!text-white opacity-90" />
                        <span className="text-xl md:text-3xl font-bold !text-white">{totalMessages}</span>
                    </div>
                    <p className="text-[9px] md:text-xs font-medium !text-white opacity-95 uppercase tracking-wide">Mensagens 24h</p>
                </div>

                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-3 md:p-4 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <TrendingUp size={16} strokeWidth={2.5} className="!text-white opacity-90" />
                        <span className="text-xl md:text-3xl font-bold !text-white">{responseRate}%</span>
                    </div>
                    <p className="text-[9px] md:text-xs font-medium !text-white opacity-95 uppercase tracking-wide">Taxa Resposta</p>
                </div>
            </div>

            {/* Recent Activity - Moderna */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-3 py-2.5 md:px-4 md:py-3 border-b border-slate-100 bg-slate-50">
                    <h2 className="text-[13px] md:text-base font-bold text-slate-900">Atividade Recente</h2>
                </div>
                <div className="bg-slate-50">
                    {groups.slice(0, 5).map((group) => (
                        <div key={group.id} onClick={() => handleOpenChat(group.id)} className="p-2.5 md:p-4 border-b border-slate-200 hover:bg-white transition-all cursor-pointer">
                            <div className="flex justify-between items-start mb-0">
                                <div className="flex items-center space-x-2 md:space-x-3 flex-1 min-w-0">
                                    <div className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white font-bold text-xs md:text-sm flex-shrink-0 shadow-sm">
                                        {group.name.charAt(0)}
                                    </div>
                                    <div className="overflow-hidden flex-1 min-w-0">
                                        <h4 className="font-semibold text-slate-800 text-[13px] md:text-sm truncate leading-tight">{group.name}</h4>
                                        <p className="text-[11px] md:text-xs text-slate-500 truncate mt-0.5">{group.members} membros</p>
                                    </div>
                                </div>
                                <div className="text-right flex-shrink-0 ml-2">
                                    <span className="text-[9px] md:text-[10px] text-slate-400 block">
                                        {group.lastActivity}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
