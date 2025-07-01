
import React from 'react';
import { APP_NAME } from '../constants';

const Header: React.FC = () => {
  return (
    <header className="bg-gray-800 shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <h1 className="text-3xl font-bold text-pink-500 tracking-tight">
          {APP_NAME}
        </h1>
        <p className="text-sm text-gray-400">Find your dance floor, tonight.</p>
      </div>
    </header>
  );
};

export default Header;
