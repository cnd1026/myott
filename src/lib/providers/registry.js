import { mockProvider } from "./mock/provider";
import { tmdbProvider } from "./tmdb/provider";

const providers = new Map([
  [mockProvider.id, mockProvider],
  [tmdbProvider.id, tmdbProvider],
]);

export function getProvider(providerId = "mock") {
  return providers.get(providerId) || mockProvider;
}

export function getActiveProvider() {
  return tmdbProvider.isEnabled() ? tmdbProvider : mockProvider;
}

export function getFallbackProvider() {
  return getProvider("mock");
}

export function isTmdbProviderEnabled() {
  return tmdbProvider.isEnabled();
}

export function listProviders() {
  return Array.from(providers.values()).map((provider) => ({
    id: provider.id,
    name: provider.name,
    enabled: typeof provider.isEnabled === "function" ? provider.isEnabled() : true,
  }));
}
