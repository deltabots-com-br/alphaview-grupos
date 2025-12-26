import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Download, Copy, Check, Server, Key, Globe, Webhook, UserPlus, Edit2, Trash2, Users, X } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../services/api';

const Settings = () => {
    const { data, setData } = useOutletContext();
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [showUserModal, setShowUserModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [copied, setCopied] = useState(false);
    const [importing, setImporting] = useState(false);

    // Z-API Settings
    const [zapiSettings, setZapiSettings] = useState({
        zapi_server: 'https://api.z-api.io',
        zapi_instance_id: '',
        zapi_token: '',
        zapi_client_token: ''
    });

    // User Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: 'user',
        department: '',
        status: 'active'
    });

    const company = data?.company || {};
    const currentUser = data?.currentUser || {};
    const isAdmin = currentUser.role === 'admin';

    const webhookUrl = `${window.location.protocol}//${window.location.host}/api/webhook/zapi`;

    useEffect(() => {
        if (isAdmin) {
            loadUsers();
            loadSettings();
        }
    }, [isAdmin]);

    const loadSettings = async () => {
        try {
            const settings = await api.getSettings();
            setZapiSettings({
                zapi_server: settings.zapi_server || 'https://api.z-api.io',
                zapi_instance_id: settings.zapi_instance_id || '',
                zapi_token: settings.zapi_token || '',
                zapi_client_token: settings.zapi_client_token || ''
            });
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    };

    const handleSaveZapiSettings = async () => {
        setLoading(true);
        try {
            await api.updateSettings(zapiSettings);
            alert('Configurações salvas com sucesso!');
        } catch (error) {
            alert('Erro ao salvar configurações');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleImportGroups = async () => {
        if (!zapiSettings.zapi_instance_id || !zapiSettings.zapi_token || !zapiSettings.zapi_client_token) {
            alert('Configure as credenciais da Z-API primeiro!');
            return;
        }

        setImporting(true);
        try {
            const result = await api.importWhatsAppGroups();
            alert(`Importação concluída!\nImportados: ${result.imported}\nIgnorados: ${result.skipped}\nTotal: ${result.total}`);

            // Recarregar dados
            const newData = await api.getInitialData();
            setData(newData);
        } catch (error) {
            alert(`Erro na importação: ${error.message}`);
            console.error(error);
        } finally {
            setImporting(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleGenerateWebhookToken = async () => {
        setLoading(true);
        try {
            const result = await api.generateWebhookToken();
            setZapiSettings({ ...zapiSettings, webhook_token: result.token });
            alert('Token gerado com sucesso! Copie e configure na Z-API.');
        } catch (error) {
            alert('Erro ao gerar token');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const loadUsers = async () => {
        setLoadingUsers(true);
        try {
            const fetchedUsers = await api.getUsers();
            setUsers(fetchedUsers);
        } catch (error) {
            console.error('Error loading users:', error);
        } finally {
            setLoadingUsers(false);
        }
    };

    const handleEditUser = (user) => {
        setEditingUser(user);
        setFormData({
            name: user.name,
            email: user.email,
            role: user.role,
            department: user.department,
            status: user.status
        });
        setShowUserModal(true);
    };

    const handleCreateUser = () => {
        setEditingUser(null);
        setFormData({
            name: '',
            email: '',
            role: 'user',
            department: '',
            status: 'active'
        });
        setShowUserModal(true);
    };

    const handleDeleteUser = async (userId) => {
        if (window.confirm('Tem certeza que deseja remover este usuário?')) {
            await api.deleteUser(userId);
            loadUsers();
        }
    };

    const handleSubmitUser = async (e) => {
        e.preventDefault();
        setLoadingUsers(true);
        try {
            if (editingUser) {
                await api.updateUser(editingUser.id, formData);
            } else {
                await api.createUser(formData);
            }
            setShowUserModal(false);
            loadUsers();
        } catch (error) {
            console.error('Error saving user:', error);
        } finally {
            setLoadingUsers(false);
        }
    };

    return (
        <div className="max-w-4xl animate-fade-in-up">
            {/* Mensagem para não-admin */}
            {!isAdmin && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
                    <AlertCircle className="mx-auto mb-3 text-amber-600" size={48} />
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Acesso Restrito</h3>
                    <p className="text-slate-600">
                        Apenas administradores podem acessar as configurações do sistema.
                    </p>
                    <p className="text-sm text-slate-500 mt-2">
                        Entre em contato com um administrador se precisar alterar configurações.
                    </p>
                </div>
            )}

            {/* Z-API Configuration - Admin Only */}
            {isAdmin && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 mb-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Server size={20} className="text-brand-600" />
                        Configuração Z-API (WhatsApp)
                    </h3>

                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                                <Globe size={14} />
                                Servidor Z-API
                            </label>
                            <input
                                type="text"
                                value={zapiSettings.zapi_server}
                                onChange={(e) => setZapiSettings({ ...zapiSettings, zapi_server: e.target.value })}
                                placeholder="https://api.z-api.io"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                                <Server size={14} />
                                ID da Instância
                            </label>
                            <input
                                type="text"
                                value={zapiSettings.zapi_instance_id}
                                onChange={(e) => setZapiSettings({ ...zapiSettings, zapi_instance_id: e.target.value })}
                                placeholder="3CD723E75E1810AC37A19E692ED0BBB5"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                                <Key size={14} />
                                Token
                            </label>
                            <input
                                type="text"
                                value={zapiSettings.zapi_token}
                                onChange={(e) => setZapiSettings({ ...zapiSettings, zapi_token: e.target.value })}
                                placeholder="FE40A4039148B278C6D58A38"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                                <Key size={14} />
                                Client Token
                            </label>
                            <input
                                type="text"
                                value={zapiSettings.zapi_client_token}
                                onChange={(e) => setZapiSettings({ ...zapiSettings, zapi_client_token: e.target.value })}
                                placeholder="F1d62cfb33be84863a5600cb29b9ec05eS"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                            />
                        </div>
                    </div>

                    {/* Webhook URL */}
                    <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1">
                            <Webhook size={14} />
                            URL do Webhook (copie para configurar na Z-API)
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={webhookUrl}
                                readOnly
                                className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono text-slate-600"
                            />
                            <button
                                onClick={() => copyToClipboard(webhookUrl)}
                                className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
                            >
                                {copied ? <Check size={16} /> : <Copy size={16} />}
                                {copied ? 'Copiado!' : 'Copiar'}
                            </button>
                        </div>
                    </div>

                    {/* Webhook Token */}
                    <div className="mb-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                        <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1">
                            <Key size={14} />
                            Token do Webhook (configure na Z-API para autenticar)
                        </label>
                        <div className="flex gap-2 mb-2">
                            <input
                                type="text"
                                value={zapiSettings.webhook_token || 'Clique em "Gerar Token"'}
                                readOnly
                                className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono text-slate-600"
                            />
                            <button
                                onClick={() => copyToClipboard(zapiSettings.webhook_token || '')}
                                disabled={!zapiSettings.webhook_token}
                                className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50"
                            >
                                {copied ? <Check size={16} /> : <Copy size={16} />}
                                {copied ? 'Copiado!' : 'Copiar'}
                            </button>
                            <button
                                onClick={handleGenerateWebhookToken}
                                disabled={loading}
                                className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
                            >
                                <Key size={16} />
                                {loading ? 'Gerando...' : 'Gerar Token'}
                            </button>
                        </div>
                        <p className="text-xs text-slate-500">
                            Configure este token na Z-API com o header: <code className="bg-white px-1 rounded">X-Webhook-Token</code>
                        </p>
                    </div>


                    <div className="flex gap-2">
                        <button
                            onClick={handleSaveZapiSettings}
                            disabled={loading}
                            className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50"
                        >
                            <CheckCircle size={16} />
                            {loading ? 'Salvando...' : 'Salvar Configurações'}
                        </button>

                        <button
                            onClick={handleImportGroups}
                            disabled={importing}
                            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                        >
                            <Download size={16} />
                            {importing ? 'Importando...' : 'Importar Grupos do WhatsApp'}
                        </button>
                    </div>
                </div>
            )}

            {/* Team Management - Admin Only */}
            {isAdmin && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Users size={20} className="text-brand-600" />
                                Gestão de Equipe
                            </h3>
                            <p className="text-sm text-slate-500 mt-1">Gerencie os usuários que têm acesso ao sistema.</p>
                        </div>
                        <button
                            onClick={handleCreateUser}
                            className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
                        >
                            <UserPlus size={16} />
                            Adicionar Membro
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        {loadingUsers ? (
                            <div className="p-8 text-center">
                                <div className="animate-spin w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full mx-auto mb-3"></div>
                                <p className="text-slate-500 text-sm">Carregando usuários...</p>
                            </div>
                        ) : users.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">
                                <Users size={48} className="mx-auto mb-3 text-slate-300" />
                                <p>Nenhum usuário encontrado.</p>
                                <p className="text-sm mt-1">Clique em "Adicionar Membro" para criar o primeiro usuário.</p>
                            </div>
                        ) : (
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-500 font-medium uppercase text-xs">
                                    <tr>
                                        <th className="px-6 py-3">Nome</th>
                                        <th className="px-6 py-3">Departamento</th>
                                        <th className="px-6 py-3">Cargo</th>
                                        <th className="px-6 py-3">Status</th>
                                        <th className="px-6 py-3 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {users.map((user) => (
                                        <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-900">{user.name}</div>
                                                <div className="text-xs text-slate-500">{user.email}</div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">{user.department}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                                                    {user.role === 'admin' ? 'Admin' : 'Usuário'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {user.status === 'active' ? 'Ativo' : 'Inativo'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                <button onClick={() => handleEditUser(user)} className="p-1 text-slate-400 hover:text-brand-600 transition-colors">
                                                    <Edit2 size={16} />
                                                </button>
                                                <button onClick={() => handleDeleteUser(user.id)} className="p-1 text-slate-400 hover:text-red-600 transition-colors">
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {/* User Modal */}
            {showUserModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-fade-in-up">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
                            <h3 className="font-bold text-slate-800">{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</h3>
                            <button onClick={() => setShowUserModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmitUser} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Cargo</label>
                                    <select
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                                    >
                                        <option value="user">Usuário</option>
                                        <option value="admin">Administrador</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                                    >
                                        <option value="active">Ativo</option>
                                        <option value="inactive">Inativo</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Departamento</label>
                                <input
                                    type="text"
                                    value={formData.department}
                                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                                    placeholder="Ex: Cardiologia"
                                />
                            </div>

                            <div className="pt-4 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowUserModal(false)}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loadingUsers}
                                    className="px-4 py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors"
                                >
                                    {loadingUsers ? 'Salvando...' : 'Salvar Usuário'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;
