import './globals.css';
import { Bar } from '../site/Bar.jsx';

export const metadata = { title: { default: 'React Plumber', template: '%s · React Plumber' }, description: 'Keep your app on your design system.' };

export default function Layout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Bar />
        {children}
      </body>
    </html>
  );
}
