export interface Transaction {
  from: string;
  to: string;
  value: string;
  hash: string;
  timestamp: number;
}

export interface Node {
  id: string;
  type: 'wallet' | 'exchange';
  data: {
    label: string;
    address: string;
    type: 'wallet' | 'exchange';
  };
  position: { x: number; y: number };
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  data: {
    value: string;
  };
}