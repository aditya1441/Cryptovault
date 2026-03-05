import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

export interface User {
    id: number;
    email: string;
    virtual_balance: number;
    profile_picture_url?: string;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (token: string) => Promise<void>;
    logout: () => void;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    login: async () => { },
    logout: () => { },
    refreshUser: async () => { },
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchMe = useCallback(async (): Promise<User | null> => {
        const token = localStorage.getItem('token');
        if (!token) return null;
        try {
            const { data } = await api.get('/auth/me');
            return data as User;
        } catch {
            localStorage.removeItem('token');
            return null;
        }
    }, []);

    // Called once on mount — restores session from existing token in localStorage
    useEffect(() => {
        let cancelled = false;
        fetchMe().then(u => {
            if (!cancelled) {
                setUser(u);
                setLoading(false);
            }
        });
        return () => { cancelled = true; };
    }, [fetchMe]);

    // login: save token, fetch user, set state — all awaited so navigation
    // after login() always has a valid user in context
    const login = useCallback(async (token: string): Promise<void> => {
        localStorage.setItem('token', token);
        // Small delay to make sure interceptor picks up the new token
        const u = await fetchMe();
        if (u) {
            setUser(u);
        } else {
            // Token was invalid — clean up
            localStorage.removeItem('token');
            throw new Error('Failed to authenticate. Please try again.');
        }
    }, [fetchMe]);

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        setUser(null);
        // Navigate to auth page
        window.location.href = '/auth?mode=login';
    }, []);

    const refreshUser = useCallback(async () => {
        const u = await fetchMe();
        setUser(u);
    }, [fetchMe]);

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
