import '@/styles/globals.css';
import { Toaster } from 'sonner';
import { TRPCProvider } from '@/lib/trpc/provider';

export const metadata = {
  title: 'Widget Creator Admin',
  description: 'Admin dashboard for HuniPrinting Widget Creator',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <TRPCProvider>
          {children}
          <Toaster position="top-right" richColors />
        </TRPCProvider>
      </body>
    </html>
  );
}
