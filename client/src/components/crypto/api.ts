import axios from 'axios';
import { Transaction } from './types';

// List of known exchange addresses (simplified example)
const KNOWN_EXCHANGES = [
  '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', // Uniswap Router
  '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45', // Uniswap Router V2
  '0x881D40237659C251811CEC9c364ef91dC08D300C', // Metamask Swap Router
  '0x1111111254fb6c44bAC0beD2854e76F90643097d', // 1inch Router
  '0xdef1c0ded9bec7f1a1670819833240f027b25eff', // 0x Exchange
  '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1', // Solana example
];

/**
 * Check if an address is a known exchange
 */
export const isExchange = (address: string): boolean => {
  return KNOWN_EXCHANGES.includes(address);
};

/**
 * Fetch Ethereum transactions for a given address
 * 
 * Note: In a real application, this would connect to the Etherscan API
 * or similar service to get actual transaction data.
 */
export const getEthereumTransactions = async (address: string): Promise<Transaction[]> => {
  try {
    const response = await axios.get(
      `https://api.etherscan.io/v2/api?chainid=1&module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=50&sort=desc&apikey=2SYRCHEPGNM81KPQCDZNY4UJ2FG2AGYCRA`
    );
    
    // Etherscan V2 returns status "0" for errors OR for no transactions
    // We need to distinguish between them
    if (response.data.status === '0') {
      if (response.data.message === 'No transactions found') {
        return [];
      }
      // Rate limit or other API error
      throw new Error(response.data.result || response.data.message || 'Etherscan API error');
    }

    if (!Array.isArray(response.data.result)) {
      return [];
    }

    return response.data.result.map((tx: any) => ({
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: `${(parseInt(tx.value) / 1e18).toFixed(4)} ETH`,
      timestamp: parseInt(tx.timeStamp),
    }));
  } catch (error: any) {
    console.error('Error fetching Ethereum transactions:', error);
    // Propagate the specific error message if available
    throw new Error(error.message || 'Failed to fetch Ethereum transactions');
  }
};

export const getSolanaTransactions = async (address: string): Promise<Transaction[]> => {
  try {
    const response = await axios.get(
      `https://api.mainnet-beta.solana.com`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: {
          jsonrpc: "2.0",
          id: 1,
          method: "getSignaturesForAddress",
          params: [address, { limit: 20 }]
        }
      }
    );
    
    if (!response.data.result) return [];

    const transactions: Transaction[] = [];
    for (const sig of response.data.result) {
      transactions.push({
        hash: sig.signature,
        from: address, // Simplified for Solana list
        to: 'Various',
        value: 'Check Sig',
        timestamp: sig.blockTime || 0,
      });
    }
    
    return transactions;
  } catch (error) {
    console.error('Error fetching Solana transactions:', error);
    return [];
  }
};