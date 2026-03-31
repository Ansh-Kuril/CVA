import React, { useState } from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
  onSearch: (address: string, network: 'ethereum' | 'solana') => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const [address, setAddress] = useState('');
  const [network, setNetwork] = useState<'ethereum' | 'solana'>('ethereum');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (address.trim()) {
      onSearch(address.trim(), network);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="flex gap-4">
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Enter wallet address..."
          className="flex-1 px-6 py-4 text-lg rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none shadow-lg"
        />
        <select
          value={network}
          onChange={(e) => setNetwork(e.target.value as 'ethereum' | 'solana')}
          className="px-6 py-4 text-lg rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none shadow-lg bg-white"
        >
          <option value="ethereum">Ethereum</option>
          <option value="solana">Solana</option>
        </select>
        <button
          type="submit"
          className="px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-lg flex items-center gap-2"
        >
          <Search size={24} />
          <span>Search</span>
        </button>
      </form>
    </div>
  );
};