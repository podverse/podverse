import fs from 'fs';
import path from 'path';
import dynamic from 'next/dynamic';

const UpdatesClient = dynamic(
  () => import('./UpdatesPageClient').then((mod) => ({ default: mod.UpdatesPageClient })),
  { ssr: true }
);

export default function UpdatesPage() {
  const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
  const changelogContent = fs.readFileSync(changelogPath, 'utf8');

  return <UpdatesClient markdownContent={changelogContent} />;
}
