import { PlumbOverlay } from '@unlocalhosted/react-plumber/next';
import '../../src/styles.css';

export const metadata = { title: 'Relay' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}<PlumbOverlay /></body>
    </html>
  );
}
