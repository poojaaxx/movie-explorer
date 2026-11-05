import { Link } from 'react-router';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div>
          <Link className="footer-brand" to="/">movieexplorer<span>.</span></Link>
          <p>A little less scrolling. A little more cinema.</p>
        </div>
        <section className="tmdb-credit" aria-label="Credits">
          <span className="eyebrow">Credits</span>
          <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer">
            <img src="/tmdb-logo.svg" alt="The Movie Database (TMDB)" width="105" height="14" />
          </a>
          <p>This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
        </section>
      </div>
    </footer>
  );
}
