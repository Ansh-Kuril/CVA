import axios from 'axios';
import { Transaction } from './types';

const ETHERSCAN_API_KEY = 'F32EM2DUC7VEDQNUEIY39AGTBTCPV5QX3G';
const SOLANA_API_KEY = '76e3bac5-1874-4b62-a7c5-6cc53c3bca19';

const EXCHANGES = [
  'binance',
  'coinbase',
  'kraken',
  'ftx',
  'huobi',
  'kucoin',
  'gemini',
  'bitfinex',
  'bitstamp',
  'gate.io',
  'kucoin',
  'okex',
  'bybit'
];

export const isExchange = (address: string): boolean => {
  return EXCHANGES.some(exchange => 
    address.toLowerCase().includes(exchange.toLowerCase())
  );
};

export const getEthereumTransactions = async (address: string): Promise<Transaction[]> => {
  try {
    const response = await axios.get(`https://api.etherscan.io/api`, {
      params: {
        module: 'account',
        action: 'txlist',
        address,
        startblock: 0,
        endblock: 99999999,
        sort: 'desc',
        apikey: ETHERSCAN_API_KEY
      }
    });

    if (response.data.status === '1' && response.data.result) {
      return response.data.result.map((tx: any) => ({
        from: tx.from,
        to: tx.to,
        value: (parseFloat(tx.value) / 1e18).toFixed(6), // Convert from Wei to ETH
        hash: tx.hash,
        timestamp: parseInt(tx.timeStamp)
      }));
    }
    return [];
  } catch (error) {
    console.error('Error fetching Ethereum transactions:', error);
    return [];
  }
};

export const getSolanaTransactions = async (address: string): Promise<Transaction[]> => {
  try {
    const response = await axios.get(
      `https://mainnet.helius-rpc.com/v0/addresses/${address}/transactions`,
      {
        params: {
          'api-key': SOLANA_API_KEY
        }
      }
    );

    if (response.data && Array.isArray(response.data)) {
      // Create a new array with only the data we need, avoiding any Symbol() or non-cloneable objects
      return response.data.map((tx: any) => {
        const fromAccount = tx.accountData?.[0]?.account || address;
        const toAccount = tx.accountData?.[1]?.account || '';
        
        // Only return transactions where we have both a from and to address
        if (fromAccount && toAccount) {
          return {
            from: fromAccount,
            to: toAccount,
            value: 'N/A', // Solana transaction value needs specific parsing
            hash: tx.signature || tx.id || `${fromAccount}-${toAccount}`,
            timestamp: tx.timestamp || Date.now()
          };
        }
        return null;
      }).filter((tx: Transaction | null): tx is Transaction => tx !== null);
    }
    return [];
  } catch (error) {
    console.error('Error fetching Solana transactions:', error);
    return [];
  }
};