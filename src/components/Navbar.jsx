import { useState } from 'react';
import { Link, NavLink } from 'react-router';
import { Compass, Search, Heart, Menu, X, Play } from 'lucide-react';

const navigation = [{ to: '/', label: 'Discover', icon: Compass }, { to: '/search', label: 'Search', icon: Search }, { to: '/favourites', label: 'Favourites', icon: Heart }];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="site-header">
      <div className="container navbar">
        <Link to="/" className="brand" onClick={() => setMenuOpen(false)} aria-label="Movie Explorer home"><span className="brand-mark"><Play size={19} fill="currentColor" aria-hidden="true" /></span><span>movie<span className="brand-light">explorer</span><span className="brand-dot">.</span></span></Link>
        <nav aria-label="Main navigation" className="desktop-nav">{navigation.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === '/'}><Icon size={16} aria-hidden="true" />{label}</NavLink>)}</nav>
        <Link className="nav-search" to="/search"><Search size={17} aria-hidden="true" /><span>Find a movie</span><span className="search-hint" aria-hidden="true">↗</span></Link>
        <button className="icon-button mobile-menu-button" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
      </div>
      {menuOpen && <nav id="mobile-navigation" className="mobile-nav" aria-label="Mobile navigation">{navigation.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === '/'} onClick={() => setMenuOpen(false)}><Icon size={18} aria-hidden="true" />{label}</NavLink>)}</nav>}
    </header>
  );
}
