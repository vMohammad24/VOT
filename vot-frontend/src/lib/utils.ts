import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getApiUrl() {
  const isProd = import.meta.env.NODE_ENV === "production";
  return isProd ? import.meta.env.API_URL : import.meta.env.API_URL_DEV;
}

export const apiUrl = getApiUrl()!;