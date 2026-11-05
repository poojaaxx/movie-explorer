import { BrowserRouter, Routes, Route } from 'react-router';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';
import Search from './pages/Search.jsx';
import MovieDetails from './pages/MovieDetails.jsx';
import NotFound from './pages/NotFound.jsx';
import RouteEffects from './components/RouteEffects.jsx';

export default function App() {
  return <BrowserRouter><RouteEffects /><a href="#main-content" className="skip-link">Skip to content</a><Navbar /><Routes><Route path="/" element={<Home />} /><Route path="/search" element={<Search />} /><Route path="/movie/:id" element={<MovieDetails />} /><Route path="*" element={<NotFound />} /></Routes><Footer /></BrowserRouter>;
}
