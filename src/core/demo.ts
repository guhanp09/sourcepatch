import {
  makeVersion,
  latest,
  type Source,
  type Workspace,
  type Passage,
  type Evidence,
} from "./model";

export async function createDemo(): Promise<Workspace> {
  const experimentBefore =
    "Random assignment helps distribute confounding factors across treatment and control groups. Correlation alone does not establish causation.\n\nThe workshop exercise uses a sample of 60 participants, split equally between treatment and control.\n\nFor the workshop exercise, use a significance threshold of 0.05. Report the effect size alongside the p-value.";
  const experimentAfter =
    "Random assignment helps distribute confounding factors across treatment and control groups. Correlation alone does not establish causation.\n\nThe workshop exercise uses a sample of 80 participants, split equally between treatment and control.\n\nFor the workshop exercise, use a significance threshold of 0.01. Report the effect size alongside the p-value.\n\nThe exercise is illustrative. Its convenience sample does not support generalizing results to the wider student population.";
  const scheduleBefore =
    "The research workshop takes place on 14 November 2026 in Room 301. Bring the completed experiment worksheet.\n\nOffice hours are on Fridays from 15:00 to 16:00. Students can bring questions about the reading material.";
  const scheduleAfter =
    "The research workshop takes place on 21 November 2026 in Room 204. Bring the completed experiment worksheet.\n\nOffice hours are on Fridays from 15:00 to 16:00. Students can bring questions about the reading material.";
  const writing =
    "Report units alongside numerical quantities. Label graph axes and distinguish absolute changes from percentage changes.\n\nCite original sources when explaining a research finding. Separate the evidence from your interpretation.";
  const sources: Source[] = [
    {
      id: "source-experiment",
      title: "Experiment handbook",
      archived: false,
      versions: [
        await makeVersion(experimentBefore),
        await makeVersion(experimentAfter),
      ],
    },
    {
      id: "source-schedule",
      title: "Workshop schedule",
      archived: false,
      versions: [
        await makeVersion(scheduleBefore),
        await makeVersion(scheduleAfter),
      ],
    },
    {
      id: "source-writing",
      title: "Scientific writing guide",
      archived: false,
      versions: [await makeVersion(writing)],
    },
  ];
  const quote = (sourceIndex: number, paragraphIndex: number): Evidence => ({
    sourceId: sources[sourceIndex].id,
    versionId: sources[sourceIndex].versions[0].id,
    quote: sources[sourceIndex].versions[0].body.split("\n\n")[paragraphIndex],
    confirmed: true,
  });
  const passage = (
    id: string,
    text: string,
    evidence: Evidence[],
  ): Passage => ({ id, text, evidence });
  return {
    schemaVersion: 1,
    id: "sourcepatch-sample-workspace",
    name: "Research methods notebook",
    sample: true,
    sources,
    outputs: [
      {
        id: "output-experiment",
        title: "Experiment revision guide",
        origin: "Sample",
        createdAt: "2026-11-10T09:00:00.000Z",
        passages: [
          passage(
            "passage-sample",
            "Plan for 60 participants: 30 in the treatment group and 30 in the control group.",
            [quote(0, 1)],
          ),
          passage(
            "passage-threshold",
            "Use a significance threshold of 0.05 and report the effect size alongside the p-value.",
            [quote(0, 2)],
          ),
          passage(
            "passage-random",
            "Random assignment helps balance confounding factors. A correlation is not enough to establish causation.",
            [quote(0, 0)],
          ),
        ],
      },
      {
        id: "output-workshop",
        title: "Workshop preparation note",
        origin: "Sample",
        createdAt: "2026-11-10T09:10:00.000Z",
        passages: [
          passage(
            "passage-date",
            "Attend the research workshop on 14 November 2026 in Room 301, with the experiment worksheet completed.",
            [quote(1, 0)],
          ),
          passage(
            "passage-hours",
            "Bring reading questions to Friday office hours, from 15:00 to 16:00.",
            [quote(1, 1)],
          ),
        ],
      },
      {
        id: "output-writing",
        title: "Writing checklist",
        origin: "Sample",
        createdAt: "2026-11-10T09:20:00.000Z",
        passages: [
          passage(
            "passage-units",
            "Include units, label graph axes, and distinguish absolute changes from percentage changes.",
            [quote(2, 0)],
          ),
          passage(
            "passage-citations",
            "Cite original sources and separate the evidence from your interpretation.",
            [quote(2, 1)],
          ),
          passage(
            "passage-unlinked",
            "Every study should use the same sample size, regardless of its research question.",
            [],
          ),
        ],
      },
    ],
    audit: [
      {
        id: "audit-demo-schedule",
        at: "2026-11-12T08:10:00.000Z",
        action: "source-revised",
        subject: "Workshop schedule",
        detail: `Sample revision changes the workshop date and room. Snapshot ${latest(sources[1]).digest.slice(0, 12)}.`,
      },
      {
        id: "audit-demo-experiment",
        at: "2026-11-12T08:00:00.000Z",
        action: "source-revised",
        subject: "Experiment handbook",
        detail:
          "Sample revision changes the participant count and threshold, and adds a limitation.",
      },
    ],
  };
}
