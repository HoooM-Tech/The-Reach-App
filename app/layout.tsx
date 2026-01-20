import React from 'react';
import { Providers } from './Providers';
import { RoleSwitcher } from '../components/dev/RoleSwitcher';
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
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Providers>
          {children}
          {/*<RoleSwitcher />*/}
        </Providers>
      </body>
    </html>
  );
}

