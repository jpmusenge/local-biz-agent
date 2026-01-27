// Discovery Module
// Responsible for discovering newly registered businesses from state registries

// TODO: Implement state registry scrapers/API integrations
// - California Secretary of State
// - Texas Secretary of State
// - Florida Division of Corporations
// - etc.

export interface NewBusiness {
  id: string;
  name: string;
  registrationDate: Date;
  state: string;
  entityType: string;
  registeredAgent?: string;
  address?: string;
  status: 'active' | 'inactive' | 'pending';
}

export interface DiscoveryOptions {
  states: string[];
  daysBack: number;
  entityTypes?: string[];
}

// TODO: Implement discovery functions
export const discovery = {
  // Discover new businesses from specified states
  discoverBusinesses: async (_options: DiscoveryOptions): Promise<NewBusiness[]> => {
    // TODO: Implement
    return [];
  },

  // Get available state registries
  getAvailableStates: (): string[] => {
    // TODO: Implement
    return [];
  },
};
