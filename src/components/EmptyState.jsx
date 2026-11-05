import { Film } from 'lucide-react';

export default function EmptyState({ title, children, icon: Icon = Film, action }) {
  return <div className="empty-state"><div className="empty-icon"><Icon aria-hidden="true" size={28} /></div><h2>{title}</h2><p>{children}</p>{action}</div>;
}
