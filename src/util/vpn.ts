import axios from 'axios';
import { redis } from '..';


interface VPNCheckResponse {
    service_type: string;
    reported_spam: boolean;
    vpn_service: boolean;
    ASN: string;
    Subnetwork: string;
    Provider: string;
    hostname: string;
    vpn_port_scan: {
        tcp: Record<string, boolean>;
        udp: Record<string, boolean>;
    };
    exec_time: Record<string, string>;
    geo_result: {
        ipNumber: string;
        ipVersion: number;
        ipAddress: string;
        latitude: number;
        longitude: number;
        countryName: string;
        countryCode: string;
        timeZone: string;
        zipCode: string;
        cityName: string;
        regionName: string;
    };
    cached_until: string;
}

export async function getIpInfo(ip: string): Promise<VPNCheckResponse> {
    const cache = await redis.get(`vpn:${ip}`);
    if (cache) return (JSON.parse(cache) as VPNCheckResponse);
    const res = await axios.get<VPNCheckResponse>(`https://detectvpn.io/_check/${ip}/`);
    await redis.set(`vpn:${ip}`, JSON.stringify(res.data), 'EX', 60 * 60 * 24 * 2);
    return res.data;
}

export async function isVPN(ip: string): Promise<Boolean> {
    const info = await getIpInfo(ip);
    return info.vpn_service;
}