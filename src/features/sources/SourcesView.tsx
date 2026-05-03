import { useMemo, useState } from "react";
import type { Source } from "../../types/research";
import { buildApaLikeCitation } from "../../lib/citation";

const initialSource: Source = {
  id: crypto.randomUUID(),
  title: "会談記録サンプル",
  author: "作成者未確認",
  date: "1987-06-12",
  type: "一次資料",
  citationKind: "archival",
  archiveName: "日本外務省外交史料館",
  collectionName: "日米安保関連文書",
  note: "最初の実験用データ",
  bias: "官僚組織の視点に偏る可能性",
};

export default function SourcesView(): JSX.Element {
  const [sources] = useState<Source[]>([initialSource]);

  const rows = useMemo(
    () => sources.map((s) => ({ ...s, apa: buildApaLikeCitation(s) })),
    [sources],
  );

  return (
    <section>
      <h2>Sources</h2>
      <p>Obsidian出力前の史料カードを構造化する画面です。</p>
      <ul>
        {rows.map((row) => (
          <li key={row.id}>
            <strong>{row.title}</strong>
            <div>{row.apa}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}
