import * as crypto from 'crypto';

const SECRET_KEY = import.meta.env.SECRET_KEY!;

export function hashIP(ip: string): string {
    return crypto
        .createHmac('sha256', SECRET_KEY)
        .update(ip)
        .digest('hex');
}


export function verifyIP(ip: string, hash: string): boolean {
    const hashedIP = hashIP(ip);
    return hashedIP === hash;
}