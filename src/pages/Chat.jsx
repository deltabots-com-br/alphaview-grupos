import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ArrowLeft, MoreVertical, Paperclip, Send, MessageSquare, Filter, Mic, Trash2, StopCircle } from 'lucide-react';
import { useOutletContext, useLocation } from 'react-router-dom';
import Tag from '../components/Tag';
import { api } from '../services/api';

const Chat = () => {
    const { data, setData } = useOutletContext();
    const location = useLocation();
    const [selectedChatId, setSelectedChatId] = useState(null);
    const [messageInput, setMessageInput] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTags, setSelectedTags] = useState([]);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerRef = useRef(null);
    const messagesEndRef = useRef(null);

    const chats = data?.chats || [];

    // Open chat automatically if coming from navigation with chatId
    useEffect(() => {
        if (location.state?.chatId) {
            setSelectedChatId(location.state.chatId);
            // Clear the state to prevent reopening on refresh
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);



    // Extract all unique tags from chats
    const allTags = useMemo(() => {
        const tagMap = new Map();
        chats.forEach(chat => {
            chat.tags?.forEach(tag => {
                if (!tagMap.has(tag.name)) {
                    tagMap.set(tag.name, tag);
                }
            });
        });
        return Array.from(tagMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [chats]);

    // Filtered chats based on search and tags
    const filteredChats = useMemo(() => {
        return chats.filter(chat => {
            const matchesSearch = chat.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesTags = selectedTags.length === 0 ||
                selectedTags.some(tagName => chat.tags?.find(t => t.name === tagName));
            return matchesSearch && matchesTags;
        });
    }, [chats, searchTerm, selectedTags]);

    const selectedChat = chats.find(c => c.id === selectedChatId);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [selectedChat?.messages, selectedChatId]);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            setRecordingTime(0);

            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (error) {
            console.error("Error accessing microphone:", error);
            alert("Não foi possível acessar o microfone. Verifique as permissões.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const audioUrl = URL.createObjectURL(audioBlob);
                await sendAudioMessage(audioUrl);

                // Cleanup
                const tracks = mediaRecorderRef.current.stream.getTracks();
                tracks.forEach(track => track.stop());
            };

            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const cancelRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            // Cleanup without sending
            const tracks = mediaRecorderRef.current.stream.getTracks();
            tracks.forEach(track => track.stop());

            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
            setRecordingTime(0);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const sendAudioMessage = async (audioUrl) => {
        if (!selectedChatId) return;

        const newMessage = await api.sendMessage(selectedChatId, audioUrl, 'audio');

        setData(prevData => ({
            ...prevData,
            chats: prevData.chats.map(chat => {
                if (chat.id === selectedChatId) {
                    return {
                        ...chat,
                        messages: [...chat.messages, newMessage],
                        lastMessage: 'Mensagem de áudio', // Update preview text
                        time: newMessage.time
                    };
                }
                return chat;
            })
        }));
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!messageInput.trim() || !selectedChatId) return;

        const newMessage = await api.sendMessage(selectedChatId, messageInput, 'text');

        setData(prevData => ({
            ...prevData,
            chats: prevData.chats.map(chat => {
                if (chat.id === selectedChatId) {
                    return {
                        ...chat,
                        messages: [...chat.messages, newMessage],
                        lastMessage: newMessage.text,
                        time: newMessage.time
                    };
                }
                return chat;
            })
        }));

        setMessageInput('');
    };

    const toggleTag = (tag) => {
        setSelectedTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    return (
        <div className="bg-white rounded-none md:rounded-xl shadow-none md:shadow-md border-0 md:border border-slate-200 overflow-hidden h-[calc(100dvh-140px)] md:h-[calc(100vh-180px)] flex">
            {/* Sidebar de Chats - Mobile Optimized */}
            <div className={`w-full md:w-96 border-r border-slate-200 flex flex-col bg-white overflow-hidden ${selectedChatId ? 'hidden md:flex' : 'flex'}`}>
                {/* Search Bar - Compact */}
                <div className="p-3 md:p-4 border-b border-slate-200 bg-slate-50 space-y-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar conversas..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                        />
                    </div>

                    {/* Tag Filter - Compact */}
                    {allTags.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-1.5">
                                <Filter size={12} className="text-brand-600" />
                                <span className="text-[10px] md:text-xs font-semibold text-slate-700">Filtrar:</span>
                                {selectedTags.length > 0 && (
                                    <button
                                        onClick={() => setSelectedTags([])}
                                        className="text-[9px] md:text-xs text-brand-600 hover:text-brand-700 font-medium ml-auto"
                                    >
                                        Limpar
                                    </button>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-1">
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
                    )}
                </div>

                {/* Chat List - Compact */}
                <div className="flex-1 overflow-y-auto bg-slate-50">
                    {filteredChats.length > 0 ? (
                        filteredChats.map(chat => (
                            <div
                                key={chat.id}
                                onClick={() => setSelectedChatId(chat.id)}
                                className={`p-2.5 md:p-4 border-b border-slate-200 hover:bg-white cursor-pointer transition-all ${selectedChatId === chat.id ? 'bg-white border-l-4 border-l-brand-600 shadow-sm' : ''
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-1.5">
                                    <div className="flex items-center space-x-2 md:space-x-3 flex-1 min-w-0">
                                        <div className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white font-bold text-xs md:text-sm flex-shrink-0 shadow-sm">
                                            {chat.image}
                                        </div>
                                        <div className="overflow-hidden flex-1 min-w-0">
                                            <h4 className="font-semibold text-slate-800 text-[13px] md:text-sm truncate leading-tight">{chat.name}</h4>
                                            <p className="text-[11px] md:text-xs text-slate-500 truncate mt-0.5">{chat.lastMessage}</p>
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0 ml-2">
                                        <span className="text-[9px] md:text-[10px] text-slate-400 block">{chat.time}</span>
                                        {chat.unread > 0 && (
                                            <span className="bg-brand-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 inline-block">
                                                {chat.unread}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {/* Tags on chat item */}
                                {chat.tags && chat.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {chat.tags.slice(0, 3).map(tag => (
                                            <Tag key={tag.name} label={tag.name} customColor={tag.color} />
                                        ))}
                                        {chat.tags.length > 3 && (
                                            <span className="text-[10px] text-slate-500 font-medium">+{chat.tags.length - 3}</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="p-8 text-center">
                            <div className="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-3">
                                <Search size={28} className="text-brand-400" />
                            </div>
                            <p className="text-sm font-medium text-slate-600">Nenhuma conversa encontrada</p>
                            <p className="text-xs text-slate-400 mt-1">Ajuste os filtros ou busca</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Chat Area - WhatsApp Style */}
            <div className={`flex-1 flex flex-col ${!selectedChatId ? 'hidden md:flex' : 'flex'}`}>
                {selectedChat ? (
                    <>
                        {/* Chat Header - Native */}
                        <div className="bg-slate-100 md:bg-white p-3 md:p-3 border-b border-slate-200 flex justify-between items-center overflow-hidden">
                            <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
                                <button onClick={() => setSelectedChatId(null)} className="md:hidden text-slate-600 hover:text-brand-600 p-1 flex-shrink-0">
                                    <ArrowLeft size={20} />
                                </button>
                                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white font-bold text-[10px] md:text-sm flex-shrink-0">
                                    {selectedChat.image}
                                </div>
                                <div className="flex-1 min-w-0 overflow-hidden">
                                    <h3 className="font-semibold text-slate-900 text-[12px] md:text-sm truncate leading-tight">{selectedChat.name}</h3>
                                    <p className="text-[9px] md:text-xs text-slate-500 truncate leading-tight">{selectedChat.type === 'group' ? 'Grupo' : 'Contato Privado'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-0.5 text-slate-500 flex-shrink-0">
                                {/* Search and Menu removed as requested */}
                            </div>
                        </div>

                        {/* Tags Row - Ultra Compact */}
                        {selectedChat.tags && selectedChat.tags.length > 0 && (
                            <div className="bg-white border-b border-slate-200 px-2 py-1.5 flex gap-1 overflow-x-auto scrollbar-hide">
                                {selectedChat.tags.map(tag => (
                                    <Tag key={tag.name} label={tag.name} customColor={tag.color} />
                                ))}
                            </div>
                        )}

                        {/* Messages - WhatsApp Native */}
                        <div className="flex-1 overflow-y-auto px-3 md:px-4 py-3 bg-[#e5ddd5] space-y-2">
                            {(selectedChat.messages || []).map((msg) => (
                                <div key={msg.id} className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[70%] md:max-w-[70%] rounded-lg px-3 py-2 shadow-sm ${msg.isMe
                                        ? 'bg-[#d9fdd3] text-slate-900'
                                        : 'bg-white text-slate-900'
                                        }`}>
                                        {!msg.isMe && selectedChat.type === 'group' && (
                                            <p className={`text-[11px] font-semibold mb-0.5 ${msg.color || 'text-brand-600'}`}>{msg.sender}</p>
                                        )}
                                        {msg.type === 'audio' ? (
                                            <div className="flex items-center gap-2 min-w-[200px]">
                                                <audio controls src={msg.content} className="w-full h-8" />
                                            </div>
                                        ) : (
                                            <p className="text-[13px] md:text-sm leading-snug">{msg.text}</p>
                                        )}
                                        <span className="text-[10px] text-slate-500 float-right mt-0.5 ml-2">
                                            {msg.time}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Message Input - Native Compact */}
                        <div className="bg-slate-100 md:bg-white p-2.5 md:p-3 border-t border-slate-200 safe-area-inset-bottom">
                            <form onSubmit={handleSendMessage} className="flex items-center gap-1 md:gap-2">
                                {isRecording ? (
                                    <div className="flex-1 flex items-center gap-4 animate-fade-in-up">
                                        <button
                                            type="button"
                                            onClick={cancelRecording}
                                            className="text-red-500 p-2 hover:bg-red-50 rounded-full transition-colors"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                        <div className="flex-1 bg-white border border-slate-300 rounded-3xl h-[38px] flex items-center px-4 gap-3">
                                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                            <span className="text-slate-600 font-mono text-sm">{formatTime(recordingTime)}</span>
                                            <span className="text-slate-400 text-xs ml-auto">Gravando...</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={stopRecording}
                                            className="bg-brand-600 text-white p-2.5 rounded-full hover:bg-brand-700 transition-all shadow-md animate-pulse flex items-center justify-center"
                                        >
                                            <Send size={18} />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <button type="button" className="text-slate-500 hover:text-brand-600 p-1 md:p-2 hover:bg-slate-200 rounded-full transition-colors flex-shrink-0">
                                            <Paperclip size={20} />
                                        </button>
                                        <input
                                            type="text"
                                            value={messageInput}
                                            onChange={(e) => setMessageInput(e.target.value)}
                                            placeholder="Digite uma mensagem..."
                                            className="flex-1 px-3 py-1.5 md:py-2 rounded-3xl border border-slate-300 focus:outline-none focus:border-brand-500 bg-white text-sm h-[38px]"
                                        />
                                        {messageInput.trim() ? (
                                            <button
                                                type="submit"
                                                className="bg-brand-600 text-white p-2 md:p-2.5 rounded-full hover:bg-brand-700 transition-all flex-shrink-0 flex items-center justify-center"
                                            >
                                                <Send size={18} />
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={startRecording}
                                                className="bg-brand-600 text-white p-2 md:p-2.5 rounded-full hover:bg-brand-700 transition-all flex-shrink-0 flex items-center justify-center"
                                            >
                                                <Mic size={18} />
                                            </button>
                                        )}
                                    </>
                                )}
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center bg-slate-50">
                        <div className="w-24 h-24 bg-slate-200 rounded-full flex items-center justify-center mb-4">
                            <MessageSquare size={40} className="text-slate-400" />
                        </div>
                        <h3 className="text-base font-semibold text-slate-700 mb-1">Selecione uma conversa</h3>
                        <p className="text-xs text-slate-500 max-w-xs">Escolha um grupo ou contato para começar</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Chat;
