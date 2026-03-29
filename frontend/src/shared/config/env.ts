export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "",
} as const;

export function getRequiredEnvValue(value: string | undefined, name: string) {
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}