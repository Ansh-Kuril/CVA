import React, { useState, useCallback } from 'react';
import { Wallet } from 'lucide-react';
import { SearchBar } from './components/SearchBar';
import { TransactionFlow } from './components/TransactionFlow';
import { getEthereumTransactions, getSolanaTransactions, isExchange } from './api';
import type { Node, Edge, Transaction } from './types';

function App() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processTransactions = async (
    address: string,
    network: 'ethereum' | 'solana',
    depth: number = 0,
    maxDepth: number = 2,
    processedAddresses: Set<string> = new Set()
  ) => {
    if (depth >= maxDepth || processedAddresses.has(address) || isExchange(address)) {
      if (isExchange(address) && !processedAddresses.has(address)) {
        const exchangeNode: Node = {
          id: address,
          type: 'exchange',
          data: {
            label: `Exchange: ${address.slice(0, 6)}...${address.slice(-4)}`,
            address,
            type: 'exchange'
          },
          position: { x: Math.random() * 800 - 400, y: depth * 200 }
        };
        setNodes(prev => [...prev, exchangeNode]);
      }
      return;
    }

    processedAddresses.add(address);

    const transactions = network === 'ethereum' 
      ? await getEthereumTransactions(address)
      : await getSolanaTransactions(address);

    // Take only the first 10 transactions
    const limitedTransactions = transactions.slice(0, 10);

    // Add the source node if it's not an exchange
    const sourceNode: Node = {
      id: address,
      type: 'wallet',
      data: {
        label: `Wallet: ${address.slice(0, 6)}...${address.slice(-4)}`,
        address,
        type: 'wallet'
      },
      position: { x: 0, y: depth * 200 }
    };
    setNodes(prev => [...prev, sourceNode]);

    // Process each transaction
    for (const [index, tx] of limitedTransactions.entries()) {
      const targetAddress = tx.to === address ? tx.from : tx.to;
      
      if (!processedAddresses.has(targetAddress)) {
        // Add target node
        const targetNode: Node = {
          id: targetAddress,
          type: isExchange(targetAddress) ? 'exchange' : 'wallet',
          data: {
            label: `${isExchange(targetAddress) ? 'Exchange: ' : 'Wallet: '}${targetAddress.slice(0, 6)}...${targetAddress.slice(-4)}`,
            address: targetAddress,
            type: isExchange(targetAddress) ? 'exchange' : 'wallet'
          },
          position: { 
            x: (index - limitedTransactions.length / 2) * 200,
            y: (depth + 1) * 200
          }
        };
        setNodes(prev => [...prev, targetNode]);

        // Add edge
        const edge: Edge = {
          id: `${tx.hash}`,
          source: tx.from,
          target: tx.to,
          data: {
            value: tx.value
          },
          animated: true,
          style: { stroke: '#64748b', strokeWidth: 2 }
        };
        setEdges(prev => [...prev, edge]);

        // Only continue recursion if the target is not an exchange
        if (!isExchange(targetAddress)) {
          await processTransactions(targetAddress, network, depth + 1, maxDepth, processedAddresses);
        }
      }
    }
  };

  const handleSearch = useCallback(async (address: string, network: 'ethereum' | 'solana') => {
    try {
      setError(null);
      setLoading(true);
      setNodes([]);
      setEdges([]);
      
      if (!address) {
        throw new Error('Please enter a wallet address');
      }

      await processTransactions(address, network);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Wallet className="text-blue-600 w-12 h-12" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Crypto Transaction Explorer
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Visualize cryptocurrency transactions in a tree-like structure. Enter a wallet address to explore its transaction history and connections.
          </p>
        </div>

        <div className="mb-12">
          <SearchBar onSearch={handleSearch} />
        </div>

        {error && (
          <div className="text-center py-4 mb-8">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Analyzing transactions (showing first 10 transactions per wallet)...</p>
          </div>
        ) : (
          nodes.length > 0 && <TransactionFlow nodes={nodes} edges={edges} />
        )}
      </div>
    </div>
  );
}

export default App;