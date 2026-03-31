import React, { useState, useEffect } from 'react';
import { getEthereumTransactions, getSolanaTransactions, isExchange } from './api';
import { SearchBar } from './SearchBar';
import { TransactionFlow } from './TransactionFlow';
import { Transaction, Node, Edge } from './types';

export const CryptoApp: React.FC = () => {
  const [sourceAddress, setSourceAddress] = useState<string>('');
  const [network, setNetwork] = useState<'ethereum' | 'solana'>('ethereum');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNodeAddress, setSelectedNodeAddress] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [transactionsPerPage, setTransactionsPerPage] = useState<number>(25);
  const [isPaginationLoading, setIsPaginationLoading] = useState<boolean>(false);
  const [searchHistory, setSearchHistory] = useState<{address: string; network: 'ethereum' | 'solana'}[]>([]);
  
  // Add scroll event listener to show/hide scroll button
  React.useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollButton(true);
      } else {
        setShowScrollButton(false);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
  
  // Function to scroll to top
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const handleSearch = async (address: string, selectedNetwork: 'ethereum' | 'solana') => {
    setIsLoading(true);
    setError(null);
    
    // Add current address to search history if we're searching for a new address
    if (sourceAddress && (sourceAddress !== address || network !== selectedNetwork)) {
      setSearchHistory(prev => [...prev, { address: sourceAddress, network }]);
    }
    
    setSourceAddress(address);
    setNetwork(selectedNetwork);

    try {
      // Get transactions based on the selected network
      const txs = selectedNetwork === 'ethereum' 
        ? await getEthereumTransactions(address)
        : await getSolanaTransactions(address);
      
      setTransactions(txs);
      
      if (txs.length === 0) {
        setError('No transactions found for this address.');
        setNodes([]);
        setEdges([]);
        setIsLoading(false);
        return;
      }

      // Process transactions to create a graph
      const graphData = processTransactionsForGraph(address, txs);
      setNodes(graphData.nodes);
      setEdges(graphData.edges);
    } catch (err: any) {
      console.error('Error processing transactions:', err);
      setError(err.message || 'An error occurred while fetching transaction data.');
      setNodes([]);
      setEdges([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleBackClick = () => {
    if (searchHistory.length > 0) {
      // Get the last item from search history
      const lastSearch = searchHistory[searchHistory.length - 1];
      
      // Remove the last item from history
      setSearchHistory(prev => prev.slice(0, -1));
      
      // Search for the previous address
      handleSearch(lastSearch.address, lastSearch.network);
    }
  };

  // Process transactions to create a graph of nodes and edges
  const processTransactionsForGraph = (sourceAddress: string, transactions: Transaction[]) => {
    const nodeMap = new Map<string, Node>();
    const edgeMap = new Map<string, Edge>();

    // Create the source node (always a wallet type unless it's a known exchange)
    const sourceType = isExchange(sourceAddress) ? 'exchange' : 'wallet';
    nodeMap.set(sourceAddress, {
      id: sourceAddress,
      type: sourceType,
      data: {
        label: getTruncatedAddress(sourceAddress),
        address: sourceAddress,
        type: sourceType
      },
      position: { x: 0, y: 0 } // Center position for source
    });

    // Process each transaction to create nodes and edges
    const limitedTransactions = transactions.slice(0, 50); // Limit to avoid too complex graphs
    
    limitedTransactions.forEach((tx, index) => {
      const fromAddress = tx.from;
      const toAddress = tx.to;
      const value = tx.value;
      
      // Create 'from' node if it doesn't exist
      if (!nodeMap.has(fromAddress)) {
        const fromType = isExchange(fromAddress) ? 'exchange' : 'wallet';
        nodeMap.set(fromAddress, {
          id: fromAddress,
          type: fromType,
          data: {
            label: getTruncatedAddress(fromAddress),
            address: fromAddress,
            type: fromType
          },
          position: calculatePosition(index, 'from')
        });
      }
      
      // Create 'to' node if it doesn't exist
      if (!nodeMap.has(toAddress)) {
        const toType = isExchange(toAddress) ? 'exchange' : 'wallet';
        nodeMap.set(toAddress, {
          id: toAddress,
          type: toType,
          data: {
            label: getTruncatedAddress(toAddress),
            address: toAddress,
            type: toType
          },
          position: calculatePosition(index, 'to')
        });
      }
      
      // Create edge for the transaction if it doesn't exist
      const edgeId = `${fromAddress}-${toAddress}`;
      if (!edgeMap.has(edgeId)) {
        edgeMap.set(edgeId, {
          id: edgeId,
          source: fromAddress,
          target: toAddress,
          data: {
            value
          },
          animated: true,
          style: {
            stroke: '#64748b',
            strokeWidth: 2
          }
        });
      }
    });

    // Convert maps to arrays
    const nodes = Array.from(nodeMap.values());
    const edges = Array.from(edgeMap.values());

    // Apply a simple force-directed layout algorithm to arrange nodes
    const arrangedNodes = arrangeNodesInCircle(nodes, sourceAddress);

    return {
      nodes: arrangedNodes,
      edges
    };
  };

  // Calculate a simple position for nodes based on their index
  const calculatePosition = (index: number, type: 'from' | 'to') => {
    const radius = 300; // Radius of the circle
    const angle = (index * 5) % 360; // Angle in degrees
    const radians = (angle * Math.PI) / 180; // Convert to radians
    const xOffset = type === 'from' ? -100 : 100; // Offset from or to the center
    
    return {
      x: radius * Math.cos(radians) + xOffset,
      y: radius * Math.sin(radians)
    };
  };

  // Arrange nodes in a circle around the source node
  const arrangeNodesInCircle = (nodes: Node[], sourceAddress: string) => {
    // Find the source node to put in the center
    const sourceNode = nodes.find(node => node.id === sourceAddress);
    const otherNodes = nodes.filter(node => node.id !== sourceAddress);
    
    if (!sourceNode) return nodes;
    
    // Place source node in the center
    sourceNode.position = { x: 0, y: 0 };
    
    // Arrange other nodes in a circle
    const radius = 300; // Radius of the circle
    otherNodes.forEach((node, index) => {
      const angle = (index * (360 / otherNodes.length)) % 360; // Distribute evenly
      const radians = (angle * Math.PI) / 180; // Convert to radians
      
      node.position = {
        x: radius * Math.cos(radians),
        y: radius * Math.sin(radians)
      };
    });
    
    return [sourceNode, ...otherNodes];
  };

  // Helper function to truncate long addresses for display
  const getTruncatedAddress = (address: string) => {
    if (!address) return 'Unknown';
    if (address.length <= 16) return address;
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };

  const exportToCSV = () => {
    const headers = ['TX ID', 'From', 'To', 'Value', 'Date'];
    const rows = transactions.map(tx => [
      tx.hash || 'N/A',
      tx.from || 'N/A',
      tx.to || 'N/A',
      tx.value || 'N/A',
      tx.timestamp ? new Date(tx.timestamp * 1000).toLocaleString() : 'Unknown'
    ]);
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cva_transaction_report.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    const jspdfLib = (window as any).jspdf;
    if (!jspdfLib) { alert('PDF library not loaded yet, please try again.'); return; }
    const { jsPDF } = jspdfLib;
    const doc = new jsPDF({ orientation: 'landscape' });

    doc.setFontSize(20);
    doc.setTextColor(30, 58, 138);
    doc.text('CVA Transaction Analysis Report', 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(70, 70, 70);
    doc.text(`Wallet Address: ${sourceAddress}`, 14, 32);
    doc.text(`Network: ${network.charAt(0).toUpperCase() + network.slice(1)}`, 14, 39);
    doc.text(`Date of Report: ${new Date().toLocaleString()}`, 14, 46);
    doc.text(`Total Transactions: ${transactions.length}`, 14, 53);

    doc.setDrawColor(180, 180, 200);
    doc.line(14, 57, 283, 57);

    const tableData = transactions.map(tx => [
      tx.hash ? `${tx.hash.slice(0, 14)}...` : 'N/A',
      tx.from ? `${tx.from.slice(0, 18)}...` : 'N/A',
      tx.to ? `${tx.to.slice(0, 18)}...` : 'N/A',
      tx.value || 'N/A',
      tx.timestamp ? new Date(tx.timestamp * 1000).toLocaleString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      }) : 'Unknown'
    ]);

    (doc as any).autoTable({
      startY: 61,
      head: [['TX ID', 'From', 'To', 'Value', 'Date']],
      body: tableData,
      headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 8, textColor: [40, 40, 40] },
      alternateRowStyles: { fillColor: [241, 245, 249] },
      columnStyles: {
        0: { cellWidth: 48 },
        1: { cellWidth: 62 },
        2: { cellWidth: 62 },
        3: { cellWidth: 35 },
        4: { cellWidth: 58 }
      },
      margin: { left: 14, right: 14 }
    });

    doc.save(`cva_report_${sourceAddress.slice(0, 8)}.pdf`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Initial state - centered search form */}
      {!sourceAddress && !isLoading && !error && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-full max-w-xl mx-auto">
            <div className="text-center mb-8">
              <svg className="w-16 h-16 text-blue-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <h2 className="text-3xl font-bold mb-2 text-black relative overflow-hidden group">
                <span className="animate-typewriter-effect inline-block">Crypto Variant Authority</span>
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-700"></span>
              </h2>
              
              {/* Blockchain explorer logos */}
              <div className="flex items-center justify-center mb-4 space-x-4">
                <div className="flex items-center bg-gray-100 px-3 py-1 rounded-full">
                  <img src="https://etherscan.io/assets/svg/logos/logo-etherscan.svg" alt="Etherscan" className="h-5" />
                </div>
                <div className="flex items-center bg-gray-100 px-3 py-1 rounded-full">
                  <img src="/images/solscan-logo-purple.svg" alt="Solscan" className="h-5" />
                </div>
              </div>
              
              <p className="text-lg text-black mb-6">
                Enter a wallet address to visualize transactions and explore the network.
              </p>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-1">
                <div className="bg-white rounded-lg p-6">
                  <h3 className="text-xl font-bold mb-4 text-black">Search Wallet</h3>
                  <SearchBar onSearch={handleSearch} isLoading={isLoading} />
                </div>
              </div>
            </div>
            
            <div className="mt-8 text-center">
              <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Supported Networks</h4>
              <div className="flex justify-center space-x-6">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-blue-500 rounded-full mr-2"></div>
                  <span className="text-gray-700">Ethereum</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-purple-500 rounded-full mr-2"></div>
                  <span className="text-gray-700">Solana</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results state - two column layout */}
      {(sourceAddress || isLoading || error) && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left sidebar */}
          <div className="lg:col-span-3">
            <div className="sticky top-4">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-1 rounded-xl shadow-lg">
                <div className="bg-white rounded-lg p-5">
                  <h2 className="text-xl font-bold mb-4 text-black">Search Wallet</h2>
                  <SearchBar onSearch={handleSearch} isLoading={isLoading} />
                </div>
              </div>
              
              {sourceAddress && !isLoading && (
                <div className="mt-6 bg-white rounded-xl shadow-lg p-5">
                  <h3 className="text-lg font-semibold mb-3 text-black">Wallet Stats</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-800">Network:</span>
                      <span className="font-medium text-black">{network.charAt(0).toUpperCase() + network.slice(1)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-800">Transactions:</span>
                      <span className="font-medium text-black">{transactions.length}</span>
                    </div>
                    <div className="pt-2 border-t border-gray-200">
                      <div className="text-sm text-gray-800">
                        <span className="font-medium block mb-1 text-black">Address:</span>
                        <div className="flex items-center">
                          <code className="bg-gray-50 p-1 rounded text-xs break-all mr-2 flex-1">{sourceAddress}</code>
                          <button 
                            className="text-blue-600 hover:text-blue-800 p-1"
                            onClick={() => {
                              navigator.clipboard.writeText(sourceAddress);
                              setCopiedAddress(sourceAddress);
                              setTimeout(() => setCopiedAddress(null), 2000);
                            }}
                            title="Copy to clipboard"
                          >
                            {copiedAddress === sourceAddress ? (
                              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Main content area */}
          <div className="lg:col-span-9">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-8 rounded">
                <p className="font-medium">Error</p>
                <p>{error}</p>
              </div>
            )}
            
            {isLoading && (
              <div className="flex justify-center items-center h-96 bg-white rounded-xl shadow-lg">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-gray-600">Fetching wallet data...</p>
                </div>
              </div>
            )}
            
            {!isLoading && nodes.length > 0 && edges.length > 0 && (
              <>
                <div className="bg-white p-6 shadow-lg rounded-xl mb-8">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center space-x-4 mb-2">
                      <div className="flex">
                        <button 
                          onClick={handleBackClick}
                          disabled={searchHistory.length === 0}
                          className={`flex items-center px-3 py-1.5 rounded-full ${
                            searchHistory.length === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          }`}
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                          </svg>
                          Back
                        </button>
                      </div>
                      <h2 className="text-2xl font-bold text-black">Transaction Flow</h2>
                      <div className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Click on any node to explore its transactions</span>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                        {network.charAt(0).toUpperCase() + network.slice(1)} Network
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-gray-700 mb-6">
                    Interactive visualization of transactions for wallet address{' '}
                    <span className="font-mono bg-gray-100 rounded px-2 py-1 text-sm text-black">
                      {getTruncatedAddress(sourceAddress)}
                    </span>
                  </p>
                  
                  <div className="flex flex-wrap gap-4 mb-6">
                    <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span className="text-sm text-gray-800">Wallets</span>
                    </div>
                    <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="text-sm text-gray-800">Exchanges</span>
                    </div>
                    <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full">
                      <svg className="w-4 h-4 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span className="text-sm text-gray-800">Token Flow</span>
                    </div>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg overflow-hidden h-96">
                    <TransactionFlow 
                      nodes={nodes} 
                      edges={edges} 
                      onNodeClick={(address) => {
                        // Don't reload if clicking the current address
                        if (address === sourceAddress) {
                          setSelectedNodeAddress(address);
                          return;
                        }
                        
                        // Update the selected address and perform a new search
                        setSelectedNodeAddress(address);
                        handleSearch(address, network);
                      }}
                    />
                  </div>
                  
                  {selectedNodeAddress && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold text-black">Selected Node Details</h3>
                        <button 
                          onClick={() => setSelectedNodeAddress(null)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <div className="flex items-center mb-2">
                        <span className="text-gray-800 mr-2">Address:</span>
                        <code className="font-mono text-sm bg-white px-2 py-1 rounded text-black flex-1">{selectedNodeAddress}</code>
                        <button 
                          className="ml-2 text-blue-600 hover:text-blue-800 p-1"
                          onClick={() => {
                            navigator.clipboard.writeText(selectedNodeAddress);
                            setCopiedAddress(selectedNodeAddress);
                            setTimeout(() => setCopiedAddress(null), 2000);
                          }}
                          title="Copy to clipboard"
                        >
                          {copiedAddress === selectedNodeAddress ? (
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                            </svg>
                          )}
                        </button>
                      </div>
                      <div className="flex items-center">
                        <span className="text-gray-800 mr-2">Type:</span>
                        <span className={`${isExchange(selectedNodeAddress) ? 'text-green-600' : 'text-blue-600'} font-medium`}>
                          {isExchange(selectedNodeAddress) ? 'Exchange' : 'Wallet'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="bg-white p-6 shadow-lg rounded-xl">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center space-x-4">
                      <div className="flex">
                        <button 
                          onClick={handleBackClick}
                          disabled={searchHistory.length === 0}
                          className={`flex items-center px-3 py-1.5 rounded-full ${
                            searchHistory.length === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          }`}
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                          </svg>
                          Back
                        </button>
                      </div>
                      <h2 className="text-2xl font-bold text-black">Recent Transactions</h2>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Click on any address to explore its transactions</span>
                      </div>
                      <button
                        onClick={exportToCSV}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                        title="Export all transactions as CSV"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                        </svg>
                        Export Excel
                      </button>
                      <button
                        onClick={exportToPDF}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium rounded-lg transition-colors"
                        title="Export all transactions as PDF report"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        Export PDF
                      </button>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto -mx-6">
                    <table className="w-full table-fixed divide-y divide-gray-200">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="px-8 py-4 text-left text-sm font-semibold text-gray-900 uppercase tracking-wider w-1/6">TX ID</th>
                          <th className="px-8 py-4 text-left text-sm font-semibold text-gray-900 uppercase tracking-wider w-1/4">From</th>
                          <th className="px-8 py-4 text-left text-sm font-semibold text-gray-900 uppercase tracking-wider w-1/4">To</th>
                          <th className="px-8 py-4 text-left text-sm font-semibold text-gray-900 uppercase tracking-wider w-1/6">Value</th>
                          <th className="px-8 py-4 text-left text-sm font-semibold text-gray-900 uppercase tracking-wider w-1/6">Date</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {transactions
                          .slice((currentPage - 1) * transactionsPerPage, currentPage * transactionsPerPage)
                          .map((tx, index) => (
                          <tr key={tx.hash || index} className="hover:bg-blue-50/30 transition-colors">
                            <td className="px-8 py-4">
                              <div className="flex items-center group">
                                {tx.hash ? (
                                  <div className="flex items-center gap-2">
                                    {network === 'ethereum' ? (
                                      <img src="https://etherscan.io/assets/svg/logos/logo-etherscan.svg" alt="Etherscan" className="h-4 opacity-70 flex-shrink-0" />
                                    ) : (
                                      <img src="/images/solscan-logo-purple.svg" alt="Solscan" className="h-4 opacity-70 flex-shrink-0" />
                                    )}
                                    <a 
                                      href={network === 'ethereum' 
                                        ? `https://etherscan.io/tx/${tx.hash}` 
                                        : `https://solscan.io/tx/${tx.hash}`} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-sm font-mono text-blue-600 hover:text-blue-800 hover:underline truncate"
                                      title={tx.hash}
                                    >
                                      {tx.hash.slice(0, 10) + '...'}
                                    </a>
                                  </div>
                                ) : (
                                  <code className="text-sm font-mono text-gray-400">N/A</code>
                                )}
                              </div>
                            </td>
                            <td className="px-8 py-4 max-w-0">
                              <div className="flex items-center group gap-2 overflow-hidden">
                                <div className={`flex-shrink-0 w-2 h-2 rounded-full ${tx.from === sourceAddress ? 'bg-orange-500' : 'bg-blue-400'}`}></div>
                                <code 
                                  className="text-sm font-mono text-gray-700 truncate min-w-0 flex-1 cursor-pointer hover:text-blue-600 hover:underline" 
                                  onClick={() => handleSearch(tx.from, network)}
                                  title={tx.from}
                                >{tx.from}</code>
                                <button 
                                  className="flex-shrink-0 text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(tx.from);
                                    setCopiedAddress(tx.from);
                                    setTimeout(() => setCopiedAddress(null), 2000);
                                  }}
                                >
                                  {copiedAddress === tx.from ? (
                                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                  ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                  )}
                                </button>
                              </div>
                            </td>
                            <td className="px-8 py-4 max-w-0">
                              <div className="flex items-center group gap-2 overflow-hidden">
                                <div className={`flex-shrink-0 w-2 h-2 rounded-full ${tx.to === sourceAddress ? 'bg-green-500' : 'bg-blue-400'}`}></div>
                                <code 
                                  className="text-sm font-mono text-gray-700 truncate min-w-0 flex-1 cursor-pointer hover:text-blue-600 hover:underline" 
                                  onClick={() => handleSearch(tx.to, network)}
                                  title={tx.to}
                                >{tx.to}</code>
                                <button 
                                  className="flex-shrink-0 text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(tx.to);
                                    setCopiedAddress(tx.to);
                                    setTimeout(() => setCopiedAddress(null), 2000);
                                  }}
                                >
                                  {copiedAddress === tx.to ? (
                                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                  ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                  )}
                                </button>
                              </div>
                            </td>
                            <td className="px-8 py-4 whitespace-nowrap">
                              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                tx.from === sourceAddress 
                                  ? 'bg-red-50 text-red-600 border border-red-100' 
                                  : 'bg-green-50 text-green-600 border border-green-100'
                              }`}>
                                {tx.value === 'N/A' ? 'Unknown' : tx.value}
                              </span>
                            </td>
                            <td className="px-8 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                              {tx.timestamp ? new Date(tx.timestamp * 1000).toLocaleString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : 'Unknown'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-sm text-black">
                      <span>Rows per page:</span>
                      <select 
                        value={transactionsPerPage} 
                        onChange={e => {
                          setTransactionsPerPage(Number(e.target.value));
                          setCurrentPage(1); // Reset to first page when changing page size
                        }}
                        className="border border-gray-300 rounded px-2 py-1 text-sm"
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center justify-center space-x-2">
                      <button
                        onClick={() => {
                          setIsPaginationLoading(true);
                          // Simulate a slight delay for loading state transition
                          setTimeout(() => {
                            setCurrentPage(prev => Math.max(prev - 1, 1));
                            setIsPaginationLoading(false);
                          }, 300);
                        }}
                        disabled={currentPage === 1 || isPaginationLoading}
                        className={`px-3 py-1 rounded min-w-[90px] ${
                          currentPage === 1 || isPaginationLoading
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {isPaginationLoading ? (
                          <span className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Loading
                          </span>
                        ) : (
                          "Previous"
                        )}
                      </button>
                      
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: Math.ceil(transactions.length / transactionsPerPage) }, (_, i) => i + 1)
                          .filter(page => {
                            // Show only pages close to current page to prevent too many buttons
                            const totalPages = Math.ceil(transactions.length / transactionsPerPage);
                            if (totalPages <= 7) return true;
                            
                            // Always show first and last page
                            if (page === 1 || page === totalPages) return true;
                            
                            // Show pages around current page
                            if (Math.abs(page - currentPage) <= 1) return true;
                            
                            // Show ellipsis indicators
                            if (page === currentPage - 2 && currentPage > 3) return true;
                            if (page === currentPage + 2 && currentPage < totalPages - 2) return true;
                            
                            return false;
                          })
                          .map(page => (
                            <button
                              key={page}
                              onClick={() => {
                                if (page !== currentPage && !isPaginationLoading) {
                                  setIsPaginationLoading(true);
                                  // Simulate a slight delay for loading state transition
                                  setTimeout(() => {
                                    setCurrentPage(page);
                                    setIsPaginationLoading(false);
                                  }, 300);
                                }
                              }}
                              disabled={isPaginationLoading}
                              className={`w-8 h-8 rounded-full ${
                                currentPage === page
                                  ? 'bg-blue-600 text-white'
                                  : isPaginationLoading
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {page}
                            </button>
                          ))
                        }
                      </div>
                      
                      <button
                        onClick={() => {
                          setIsPaginationLoading(true);
                          // Simulate a slight delay for loading state transition
                          setTimeout(() => {
                            setCurrentPage(prev => 
                              Math.min(prev + 1, Math.ceil(transactions.length / transactionsPerPage))
                            );
                            setIsPaginationLoading(false);
                          }, 300);
                        }}
                        disabled={currentPage === Math.ceil(transactions.length / transactionsPerPage) || isPaginationLoading}
                        className={`px-3 py-1 rounded min-w-[90px] ${
                          currentPage === Math.ceil(transactions.length / transactionsPerPage) || isPaginationLoading
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {isPaginationLoading ? (
                          <span className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Loading
                          </span>
                        ) : (
                          "Next"
                        )}
                      </button>
                    </div>
                    
                    <div className="text-sm text-black">
                      Showing {Math.min((currentPage - 1) * transactionsPerPage + 1, transactions.length)} - {Math.min(currentPage * transactionsPerPage, transactions.length)} of {transactions.length}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Scroll to top button */}
      {showScrollButton && (
        <button
          onClick={scrollToTop}
          className="fixed right-8 bottom-8 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all duration-300 z-50"
          aria-label="Scroll to top"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      )}

      {/* Footer */}
      <footer className="mt-16 pt-8 pb-6 border-t border-gray-200">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <h3 className="text-xl font-bold text-black relative inline-block">
              <span>CVA</span>
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500 to-purple-500"></span>
            </h3>
            <p className="text-gray-600 mt-1">Visualize and analyze blockchain transactions.</p>
          </div>
          <div className="flex items-center space-x-4">
            <a href="https://etherscan.io" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-700">
              <img src="https://etherscan.io/assets/svg/logos/logo-etherscan.svg" alt="Etherscan" className="h-6" />
            </a>
            <a href="https://solscan.io" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-700">
              <img src="/images/solscan-logo-purple.svg" alt="Solscan" className="h-6" />
            </a>
          </div>
        </div>
        <div className="text-center mt-8">
          <p className="text-gray-600 text-sm">&copy; {new Date().getFullYear()} CVA. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};