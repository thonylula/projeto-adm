import { supabase } from '../supabaseClient';

export const AuthService = {
    async login(email: string, password: string) {
        if (!supabase) throw new Error("Supabase não configurado");
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;
        return data;
    },

    async register(email: string, password: string) {
        if (!supabase) throw new Error("Supabase não configurado");
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });
        if (error) throw error;
        return data;
    },

    async logout() {
        if (!supabase) return;
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    },

    async getSession() {
        if (!supabase) return null;
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        return data.session;
    },

    async resetPassword(email: string) {
        if (!supabase) return;
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
    }
};
