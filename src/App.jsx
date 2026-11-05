import { BrowserRouter, Routes, Route } from 'react-router';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';

export default function App() {
  return <BrowserRouter><a href="#main-content" className="skip-link">Skip to content</a><Navbar /><Routes><Route path="/" element={<Home />} /></Routes><Footer /></BrowserRouter>;
}
