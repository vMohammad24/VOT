import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getApiUrl() {
  const isProd = process.env.NODE_ENV === "production";
  return isProd ? process.env.API_URL : process.env.API_URL_DEV;
}

export const apiUrl = getApiUrl()!;