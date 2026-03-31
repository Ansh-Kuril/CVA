import React from "react";
import { CryptoApp } from "./components/crypto/CryptoApp";

function App() {
  return (
    <div className="app-container min-h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <a href="/" className="text-2xl font-bold text-gray-900 hover:text-blue-600 transition-colors">CVA</a>
          <div className="flex items-center gap-6">
            <a href="https://etherscan.io" target="_blank" rel="noopener noreferrer" className="flex items-center">
              <img src="https://etherscan.io/assets/svg/logos/logo-etherscan.svg" alt="Etherscan" className="h-6" />
            </a>
            <a href="https://solscan.io" target="_blank" rel="noopener noreferrer" className="flex items-center">
              <img src="/images/solscan-logo-purple.svg" alt="Solscan" className="h-6" />
            </a>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-gray-50">
        <CryptoApp />
      </div>

      {/* Footer */}
      <footer className="py-4 px-6 bg-white border-t border-gray-200 text-center text-sm text-gray-600">
        <p>© 2025 CVA. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;