import { Sidebar } from './Sidebar';
import { Hero } from './Hero';

export function Layout() {
  return (
    <div className="flex min-h-screen w-full flex-col lg:h-screen lg:flex-row">
      <Sidebar />
      <Hero />
    </div>
  );
}
