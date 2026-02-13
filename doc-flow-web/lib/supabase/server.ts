import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
    const cookieStore = await cookies();

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }: { name: string, value: string, options: CookieOptions }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
            global: {
                fetch: async (url: string | URL | Request, options?: RequestInit) => {
                    const retries = 3;
                    for (let i = 0; i < retries; i++) {
                        try {
                            const response = await fetch(url, options);
                            return response;
                        } catch (err) {
                            if (i === retries - 1) throw err;
                            await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
                        }
                    }
                    throw new Error('Failed to fetch after retries');
                },
            },
        }
    );
}
