import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Barber Agent',
  description: 'إنشاء مواقع الحلاقين من روابط Google Maps وإرسالها عبر WhatsApp',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
