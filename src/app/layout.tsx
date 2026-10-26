import type { Metadata } from 'next';
import { Cormorant_Garamond, Caveat, Work_Sans } from 'next/font/google';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import Navbar from '@/components/Navbar';
import GuardiaConfirmacion from '@/components/GuardiaConfirmacion';
import FooterEnlaces from '@/components/FooterEnlaces';
import BootstrapClient from '@/components/BootstrapClient';

const _garamond = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-garamond',
  display: 'swap',
});

const _caveat = Caveat({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-caveat',
  display: 'swap',
});

const _workSans = Work_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-work',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Trattoria del Vicolo — Cocina italiana desde 1987',
  description:
    'Trattoria italiana de verdad: pasta fresca hecha a mano, vino de la casa y pedidos desde la mesa con menú digital.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`
      ${_garamond.variable}
      ${_caveat.variable}
      ${_workSans.variable}
    `}>
      <body>
        <AuthProvider>
          <CartProvider>
            <GuardiaConfirmacion />
            <Navbar />
            <main className="min-vh-100">{children}</main>
            <footer className="rv-footer">
              <div className="container">
                <div className="rv-footer-top">
                  <div>
                    <p className="rv-footer-marca">
                      Trattoria <em>del Vicolo</em>
                    </p>
                    <p className="rv-footer-tagline">Cucina italiana dal 1987 · Toscana</p>
                  </div>
                  <div className="rv-footer-col">
                    <p className="rv-footer-titulo">Dónde estamos</p>
                    <p>
                      Via dei Fiori, 12
                      <br />
                      Firenze — Toscana
                    </p>
                  </div>
                  <div className="rv-footer-col">
                    <p className="rv-footer-titulo">Horario</p>
                    <p>
                      Lun – Dom
                      <br />
                      12:00 – 23:00
                    </p>
                  </div>
                  <div className="rv-footer-col">
                    <p className="rv-footer-titulo">El sistema</p>
                    <FooterEnlaces />
                  </div>
                </div>
                <div className="rv-footer-bottom">
                  <span>Trattoria del Vicolo &copy; {new Date().getFullYear()}</span>
                  <span className="rv-footer-fatto">
                    Hecho con amor <i className="bi bi-heart-fill"></i>
                  </span>
                </div>
              </div>
            </footer>
          </CartProvider>
        </AuthProvider>
        <BootstrapClient />
      </body>
    </html>
  );
}