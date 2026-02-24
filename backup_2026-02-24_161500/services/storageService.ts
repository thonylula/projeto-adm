import { supabase } from '../supabaseClient';

export const StorageService = {
    /**
     * Uploads a file to a Supabase bucket.
     * @param bucket - The name of the bucket ('logos' or 'employees')
     * @param path - The internal path (e.g., 'company_id/logo.png')
     * @param file - The file object or base64 string
     */
    async uploadFile(bucket: string, path: string, file: File | string): Promise<string | null> {
        try {
            let fileBody: any = file;

            // Handle base64 if provided instead of File object
            if (typeof file === 'string' && file.startsWith('data:')) {
                const response = await fetch(file);
                fileBody = await response.blob();
            }

            const { data, error } = await supabase.storage
                .from(bucket)
                .upload(path, fileBody, {
                    upsert: true,
                    contentType: file instanceof File ? file.type : 'image/png'
                });

            if (error) {
                console.error(`[Storage] Upload error in ${bucket}:`, error);
                return null;
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from(bucket)
                .getPublicUrl(data.path);

            return publicUrl;
        } catch (e) {
            console.error('[Storage] Exception during upload:', e);
            return null;
        }
    },

    async deleteFile(bucket: string, path: string) {
        const { error } = await supabase.storage.from(bucket).remove([path]);
        if (error) console.error(`[Storage] Delete error in ${bucket}:`, error);
    }
};
