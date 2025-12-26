import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

const GroupContext = createContext();

export const GroupProvider = ({ children }) => {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedGroup, setSelectedGroup] = useState(null);

    const { user } = useAuth(); // Assuming useAuth is available in the scope or imported

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const loadGroups = async () => {
            setLoading(true);
            try {
                const result = await api.getInitialData();
                if (result && result.chats) {
                    setGroups(result.chats);
                }
            } catch (error) {
                console.error("Failed to load groups", error);
            } finally {
                setLoading(false);
            }
        };
        loadGroups();
    }, [user]);

    const value = {
        groups,
        loading,
        selectedGroup,
        setSelectedGroup,
        setGroups
    };

    return (
        <GroupContext.Provider value={value}>
            {children}
        </GroupContext.Provider>
    );
};

export const useGroups = () => {
    const context = useContext(GroupContext);
    if (!context) {
        throw new Error('useGroups must be used within a GroupProvider');
    }
    return context;
};
