import { mockProvider } from "./mock/provider";

const providers = new Map([[mockProvider.id, mockProvider]]);

export function getProvider(providerId = "mock") {
  return providers.get(providerId) || mockProvider;
}

export function getFallbackProvider() {
  return getProvider("mock");
}

export function listProviders() {
  return Array.from(providers.values()).map((provider) => ({
    id: provider.id,
    name: provider.name,
  }));
}
