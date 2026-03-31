import React, { useState } from 'react';

interface SearchBarProps {
  onSearch: (address: string, network: 'ethereum' | 'solana') => void;
  isLoading?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSearch, isLoading = false }) => {
  const [address, setAddress] = useState<string>('');
  const [network, setNetwork] = useState<'ethereum' | 'solana'>('ethereum');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!address.trim()) {
      setError('Please enter a wallet address');
      return;
    }
    
    // Basic wallet address format validation
    if (network === 'ethereum' && !address.match(/^0x[a-fA-F0-9]{40}$/)) {
      setError('Please enter a valid Ethereum address (0x followed by 40 hexadecimal characters)');
      return;
    }

    if (network === 'solana' && !address.match(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)) {
      setError('Please enter a valid Solana address (32-44 alphanumeric characters)');
      return;
    }
    
    setError(null);
    onSearch(address, network);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label 
            htmlFor="network" 
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Select Network
          </label>
          <select
            id="network"
            value={network}
            onChange={(e) => setNetwork(e.target.value as 'ethereum' | 'solana')}
            className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            disabled={isLoading}
          >
            <option value="ethereum" className="text-gray-900">Ethereum</option>
            <option value="solana" className="text-gray-900">Solana</option>
          </select>
        </div>
        
        <div>
          <label 
            htmlFor="address" 
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Wallet Address
          </label>
          <input
            id="address"
            type="text"
            placeholder={network === 'ethereum' ? '0x...' : 'Enter Solana address...'}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            disabled={isLoading}
          />
          {error && (
            <p className="mt-1 text-sm text-red-600">{error}</p>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (network === 'ethereum') {
                setAddress('0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'); // Uniswap Router
              } else {
                setAddress('5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1'); // Example Solana address
              }
            }}
            className="text-sm text-blue-600 hover:text-blue-800"
            disabled={isLoading}
          >
            Use Example Address
          </button>
          
          <button
            type="submit"
            className={`px-4 py-2 rounded-md text-white font-medium ${
              isLoading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
            }`}
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Searching...
              </div>
            ) : (
              'Search'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};