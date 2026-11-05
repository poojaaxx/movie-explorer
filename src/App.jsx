import { BrowserRouter, Routes, Route } from 'react-router';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';
import Search from './pages/Search.jsx';

export default function App() {
  return <BrowserRouter><a href="#main-content" className="skip-link">Skip to content</a><Navbar /><Routes><Route path="/" element={<Home />} /><Route path="/search" element={<Search />} /></Routes><Footer /></BrowserRouter>;
}
