import { revalidatePath } from 'next/cache';
import { permanentRedirect, redirect } from 'next/navigation';
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
    // get page params
    const searchParams = new URL(request.url).searchParams
    const token = searchParams.get('token');
    if (token) {
        const response = NextResponse.rewrite(new URL('/', request.url.split('?')[0]));
        response.cookies.set({
            name: 'token',
            value: token,

        });

        return response;
    }
}

// See "Matching Paths" below to learn more
export const config = {
    matcher: '/',
}