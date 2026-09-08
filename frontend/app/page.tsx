import { AppsGrid } from "../components/AppsGrid";
import { DownloadsPanel } from "../components/DownloadsPanel";
import { MetricPanel } from "../components/MetricPanel";
import { PiHolePanel } from "../components/PiHolePanel";
import { UpdateButton } from "../components/UpdateButton";


export default function HomePage() {
  return (
    <main className="page">
      <header className="header">
        <h1>Home Server Dashboard</h1>
        <p className="muted">System · Pi-hole · Downloads · Apps</p>
      </header>
      <div className="layout">
        <MetricPanel />
        <PiHolePanel />
        <DownloadsPanel />
        <UpdateButton />
        <AppsGrid />
      </div>
    </main>
  );
}
