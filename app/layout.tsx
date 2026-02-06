import React from 'react';
import { Providers } from './Providers';
import { RoleSwitcher } from '../components/dev/RoleSwitcher';
import { Toaster } from 'react-hot-toast';
import './globals.css';

export const metadata = {
  title: 'The Reach App',
  description: 'Property management platform',
};

export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="min-h-screen overflow-x-hidden">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen overflow-x-hidden">
        <Providers>
          {children}
          <Toaster position="top-center" />
          {/*<RoleSwitcher />*/}
        </Providers>
      </body>
    </html>
  );
}

