import { Link } from 'react-router';
import { ArrowLeft, Film } from 'lucide-react';
import EmptyState from '../components/EmptyState.jsx';

export default function NotFound({
  title = 'This scene is missing.',
  description = 'The page you are looking for could not be found. There are plenty of other stories to discover.',
}) {
  return (
    <main id="main-content" className="container page-main">
      <EmptyState
        title={title}
        icon={Film}
        action={
          <Link to="/" className="button button-primary">
            <ArrowLeft size={16} aria-hidden="true" />
            Back to discovery
          </Link>
        }
      >
        {description}
      </EmptyState>
    </main>
  );
}
