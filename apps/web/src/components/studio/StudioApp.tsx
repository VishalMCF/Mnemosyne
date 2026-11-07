"use client";
import { usePathname } from "next/navigation";
import { StudioStore } from "./Store";
import { Shell } from "./Shell";
import {
  Dashboard,
  LibraryPage,
  SkillsPage,
  KnowledgePage,
  ReviewPage,
  AnalyticsPage,
  SettingsPage,
} from "./Pages";
import { ReadingStudio } from "./ReadingStudio";
import Link from "next/link";
export function StudioApp() {
  const path = usePathname().split("/").filter(Boolean).slice(1);
  let page;
  switch (path[0]) {
    case undefined:
      page = <Dashboard />;
      break;
    case "library":
      page = <LibraryPage id={path[1]} />;
      break;
    case "read":
      page = (
        <ReadingStudio
          key={path.join("/")}
          documentId={path[1]}
          initialStage={
            path[2] && /^[0-5]$/.test(path[2]) ? Number(path[2]) : undefined
          }
        />
      );
      break;
    case "skills":
      page = (
        <SkillsPage
          index={
            path[1] && /^[0-5]$/.test(path[1]) ? Number(path[1]) : undefined
          }
        />
      );
      break;
    case "graph":
      page = <KnowledgePage />;
      break;
    case "reviews":
      page = <ReviewPage />;
      break;
    case "analytics":
      page = <AnalyticsPage />;
      break;
    case "settings":
      page = <SettingsPage />;
      break;
    default:
      page = (
        <div className="s-empty">
          <h1>This learning space doesn’t exist.</h1>
          <Link href="/studio" className="s-button">
            Back to dashboard
          </Link>
        </div>
      );
  }
  return (
    <StudioStore>
      <Shell>{page}</Shell>
    </StudioStore>
  );
}
