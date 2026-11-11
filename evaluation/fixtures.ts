import cases from "./cases.json";
import {
  makeVersion,
  type Passage,
  type Source,
  type ReviewState,
} from "../src/core/model";
export type Case = {
  id: string;
  category: string;
  before: string;
  after: string;
  quote?: string;
  claim: string;
  expected: string;
  reason: string;
  confirmed?: boolean;
  archived?: boolean;
  missing?: boolean;
  unrelatedChange?: boolean;
};
export const scenarios: Case[] = cases;
export async function fixture(
  item: Case,
): Promise<{ passage: Passage; sources: Source[]; expected: ReviewState }> {
  const before = await makeVersion(item.before);
  const after = await makeVersion(item.after);
  const source: Source = {
    id: "fixture-source",
    title: "Authored fixture",
    archived: item.archived ?? false,
    versions: [before, after],
  };
  const passage: Passage = {
    id: item.id,
    text: item.claim,
    evidence: item.quote
      ? [
          {
            sourceId: source.id,
            versionId: before.id,
            quote: item.quote,
            confirmed: item.confirmed ?? true,
          },
        ]
      : [],
  };
  const sources = item.missing ? [] : [source];
  if (item.unrelatedChange)
    sources.push({
      id: "unrelated",
      title: "Unrelated source",
      archived: false,
      versions: [
        await makeVersion("Old unrelated content."),
        await makeVersion("Revised unrelated content."),
      ],
    });
  return { passage, sources, expected: item.expected as ReviewState };
}
