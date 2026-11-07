"use client";
import Link from "next/link";
import { SourceContent } from "@/components/content/SourceContent";
import { useState } from "react";
import { ArrowUpRight, ArrowRight, Search, Check } from "lucide-react";
import { documents, skills, referenceGraph } from "./data";
import { useStudio } from "./Store";
import { Heading, Panel, ButtonLink, Meter, Tag, Answer } from "./ui";
import { GraphEditor } from "./GraphEditor";
const masteryWord = (value: number) =>
  value >= 70 ? "Strengthening" : value >= 55 ? "Developing" : "Needs practice";
function dateLabel(value?: string) {
  return value
    ? new Date(value).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : "Not yet studied";
}
export function Dashboard() {
  const { state } = useStudio();
  const completed = Object.values(state.programs).reduce(
    (total, program) => total + program.completed.length,
    0,
  );
  const current =
    documents.find(
      (doc) =>
        state.programs[doc.id] && state.programs[doc.id]!.completed.length < 6,
    ) ??
    documents.find((doc) => state.programs[doc.id]?.completed.length !== 6) ??
    documents[0]!;
  const program = state.programs[current.id];
  const stageCount = program?.completed.length ?? 0;
  const due = documents[0]!.concepts.filter(
    (_, index) =>
      !state.reviews.some(
        (review) =>
          review.id === String(index) && Date.parse(review.due) > Date.now(),
      ),
  ).length;
  const reconstructed = documents.filter(
    (doc) => state.programs[doc.id]?.comparison,
  );
  return (
    <div className="s-home">
      <header className="s-home-heading">
        <h1>Your learning</h1>
        <Link href="/studio/library" className="s-text-link">
          Library <ArrowUpRight size={14} />
        </Link>
      </header>

      <section className="s-home-focus" aria-labelledby="continue-title">
        <p className="s-home-label">
          {program ? "Continue reading" : "Start here"}
        </p>
        <h2 id="continue-title">{current.title}</h2>
        <p className="s-home-position">
          {skills[program?.stage ?? 0]!.name} <span>·</span> {stageCount} of 6
          stages complete
        </p>
        <Meter
          value={(stageCount / 6) * 100}
          label="Learning program completion"
        />
        <ButtonLink href={`/studio/read/${current.id}`}>
          {program ? "Continue" : "Start learning"}
          <ArrowRight size={15} />
        </ButtonLink>
      </section>

      <section className="s-home-next" aria-labelledby="next-title">
        <h2 id="next-title">Next up</h2>
        <Link href="/studio/reviews" className="s-home-action">
          <span>Review your concepts</span>
          <span className="s-home-action-meta">
            {due ? `${due} due` : "All caught up"}
            <ArrowRight size={15} />
          </span>
        </Link>
        <Link href={`/studio/read/${current.id}/4`} className="s-home-action">
          <span>Practice reconstruction</span>
          <span className="s-home-action-meta">
            Source closed
            <ArrowRight size={15} />
          </span>
        </Link>
      </section>

      <details className="s-home-disclosure">
        <summary>
          <span>Progress</span>
          <span>{completed} skills practiced</span>
        </summary>
        <div className="s-home-disclosure-body">
          <div className="s-home-totals">
            <span>
              <strong>{Object.keys(state.programs).length}</strong> programs
              started
            </span>
            <span>
              <strong>{state.reviews.length}</strong> reviews completed
            </span>
            <Link className="s-text-link" href="/studio/analytics">
              View analytics <ArrowUpRight size={13} />
            </Link>
          </div>
          <div className="s-skill-meters">
            {skills.map((skill, index) => {
              const practiced = Object.values(state.programs).filter((item) =>
                item.completed.includes(index),
              ).length;
              return (
                <Link href={`/studio/skills/${index}`} key={skill.name}>
                  <div>
                    <span>{skill.name}</span>
                    <small>
                      {practiced
                        ? `${practiced} practiced`
                        : "Not yet practiced"}
                    </small>
                  </div>
                  <Meter
                    value={Math.min(95, skill.base + practiced * 5)}
                    label={skill.name}
                  />
                </Link>
              );
            })}
          </div>
          <p className="s-footnote">
            Illustrative skill levels, with your local practice activity.
          </p>
        </div>
      </details>

      <details className="s-home-disclosure">
        <summary>
          <span>Recent activity</span>
          <span>
            {state.activity.length
              ? `${state.activity.length} sessions`
              : "No sessions yet"}
          </span>
        </summary>
        <div className="s-home-disclosure-body">
          {state.activity.length ? (
            state.activity.slice(0, 5).map((item, index) => (
              <div className="s-home-history" key={index}>
                <span>{item.text}</span>
                <time>{dateLabel(item.at)}</time>
              </div>
            ))
          ) : (
            <p className="s-muted">Your completed practice will appear here.</p>
          )}
          {reconstructed.length > 0 && (
            <>
              <h3>Reconstructed models</h3>
              {reconstructed.map((doc) => (
                <Link
                  href={`/studio/read/${doc.id}/4`}
                  className="s-home-action"
                  key={doc.id}
                >
                  <span>{doc.title}</span>
                  <ArrowUpRight size={14} />
                </Link>
              ))}
            </>
          )}
        </div>
      </details>
    </div>
  );
}
export function LibraryPage({ id }: { id?: string }) {
  const { state } = useStudio();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All materials");
  const doc = documents.find((item) => item.id === id);
  if (doc)
    return (
      <>
        <Link href="/studio/library" className="s-text-link">
          ← Library
        </Link>
        <Heading eyebrow={doc.topic.toUpperCase()} title={doc.title}>
          {doc.author}
        </Heading>
        <div className="s-two-columns">
          <Panel title="A question worth understanding">
            <p className="s-prose">{doc.intro}</p>
            <div className="s-callout">
              All reading material in this prototype is original. Book titles
              identify a study context; no book chapters are reproduced.
            </div>
            <ButtonLink href={`/studio/read/${doc.id}`}>
              {state.programs[doc.id]
                ? "Continue learning program"
                : "Start a learning program"}
              <ArrowRight size={15} />
            </ButtonLink>
            <p className="s-small s-muted">
              6 skills · approximately 35–50 minutes · self-paced
            </p>
          </Panel>
          <Panel title="Document outline">
            {doc.sections.map((section, index) => (
              <details className="s-outline-detail" key={section.title}>
                <summary>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {section.title}
                </summary>
                <SourceContent source={section.text} />
              </details>
            ))}
          </Panel>
        </div>
      </>
    );
  const filtered = documents.filter(
    (item) =>
      `${item.title} ${item.topic}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "All materials" ||
        (filter === "In progress"
          ? !!state.programs[item.id] &&
            state.programs[item.id]!.completed.length < 6
          : state.programs[item.id]?.completed.length === 6)),
  );
  return (
    <>
      <Heading
        eyebrow="YOUR GROWING KNOWLEDGE BASE"
        title="A library for understanding."
        action={
          <ButtonLink href="/library" secondary>
            Open existing imports <ArrowUpRight size={14} />
          </ButtonLink>
        }
      >
        Four carefully chosen starting points. Read with questions, leave with a
        model.
      </Heading>
      <div className="s-filter-bar">
        <label className="s-search">
          <Search size={16} />
          <input
            aria-label="Search reading materials"
            placeholder="Find a title or topic…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <select
          aria-label="Filter materials"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        >
          <option>All materials</option>
          <option>In progress</option>
          <option>Completed</option>
        </select>
        <span className="s-muted s-small">
          {filtered.length} materials · original practice notes
        </span>
      </div>
      <div className="s-library-grid">
        {filtered.map((item, index) => {
          const done = state.programs[item.id]?.completed.length ?? 0;
          return (
            <article className="s-document-card" key={item.id}>
              <Link
                href={`/studio/library/${item.id}`}
                className="s-document-art"
                style={{ background: item.color }}
              >
                <span>MNEMOSYNE / READING SERIES</span>
                <strong>{item.topic}</strong>
                <div className={`s-cover-lines pattern-${index}`} />
                <small>
                  FIELD NOTE {String(index + 1).padStart(2, "0")}{" "}
                  <ArrowUpRight size={17} />
                </small>
              </Link>
              <div className="s-document-info">
                <Tag>
                  {done === 6
                    ? "Completed"
                    : state.programs[item.id]
                      ? "In progress"
                      : "Ready to explore"}
                </Tag>
                <Link href={`/studio/library/${item.id}`}>
                  <h2>{item.title}</h2>
                </Link>
                <p>{item.author}</p>
                <Meter
                  value={(done / 6) * 100}
                  label={`${item.title} progress`}
                />
                <div className="s-document-meta">
                  <span>4 sections · {done}/6 skills</span>
                  <span>
                    {dateLabel(
                      state.activity.find((a) => a.text.includes(item.title))
                        ?.at,
                    )}
                  </span>
                </div>
                <ButtonLink href={`/studio/read/${item.id}`} secondary>
                  {state.programs[item.id]
                    ? "Continue program"
                    : "Start learning"}
                  <ArrowRight size={14} />
                </ButtonLink>
              </div>
            </article>
          );
        })}
      </div>
      {!filtered.length && (
        <div className="s-empty">
          No materials match. Try another title or filter.
        </div>
      )}
    </>
  );
}
export function SkillsPage({ index }: { index?: number }) {
  const { state } = useStudio();
  const skill = index !== undefined ? skills[index] : undefined;
  if (skill)
    return (
      <>
        <Link className="s-text-link" href="/studio/skills">
          ← Cognitive toolkit
        </Link>
        <Heading
          eyebrow={`SKILL ${String(index! + 1).padStart(2, "0")}`}
          title={skill.name}
        >
          {skill.description}
        </Heading>
        <div className="s-two-columns">
          <Panel title="Why this matters">
            <p className="s-prose">{skill.why}</p>
            <h3>Your next growth edge</h3>
            <p className="s-muted">{skill.weakness}</p>
            <p className="s-small s-muted">
              This starting assessment is illustrative. Practice records below
              are your local activity.
            </p>
            <ButtonLink href={`/studio/read/ddia/${index}`}>
              Practice this skill <ArrowRight size={15} />
            </ButtonLink>
          </Panel>
          <Panel title="Try this question">
            <blockquote className="s-pullquote">{skill.question}</blockquote>
            <p className="s-muted">
              Recommended: {documents[0]!.title} · original companion note
            </p>
            <h3>Practice history</h3>
            {state.activity.filter((a) => a.text.startsWith(skill.name))
              .length ? (
              state.activity
                .filter((a) => a.text.startsWith(skill.name))
                .map((a, i) => (
                  <p className="s-small" key={i}>
                    {dateLabel(a.at)} · {a.text}
                  </p>
                ))
            ) : (
              <p className="s-muted">Your first attempt will appear here.</p>
            )}
          </Panel>
        </div>
      </>
    );
  return (
    <>
      <Heading
        eyebrow="HOW YOU LEARN"
        title="Six skills. One independent mind."
      >
        Practice the thinking that turns information into knowledge you can use.
      </Heading>
      <div className="s-skills-grid">
        {skills.map((item, i) => {
          const attempts = Object.values(state.programs).filter((p) =>
            p.completed.includes(i),
          ).length;
          return (
            <Link
              href={`/studio/skills/${i}`}
              className="s-skill-card"
              key={item.name}
            >
              <span className="s-skill-index">
                0{i + 1}
                <ArrowUpRight size={17} />
              </span>
              <h2>{item.name}</h2>
              <p>{item.description}</p>
              <Meter
                value={Math.min(95, item.base + attempts * 5)}
                label={item.name}
              />
              <div className="s-document-meta">
                <span>{masteryWord(item.base + attempts * 5)}</span>
                <span>{attempts} local attempts</span>
              </div>
            </Link>
          );
        })}
      </div>
      <p className="s-footnote">
        Mastery bands are illustrative starting points, not validated
        measurements of cognitive ability.
      </p>
    </>
  );
}
export function KnowledgePage() {
  const [docId, setDocId] = useState("ddia");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("0");
  const { state } = useStudio();
  const fallbackDoc = documents.find((d) => d.id === docId) ?? documents[0]!;
  const graph =
    docId === "all"
      ? {
          nodes: documents.flatMap((d, docIndex) =>
            referenceGraph(d).nodes.map((n, index) => ({
              ...n,
              id: `${d.id}:${n.id}`,
              x: 100 + ((docIndex * 4 + index) % 3) * 190,
              y: 35 + Math.floor((docIndex * 4 + index) / 3) * 65,
            })),
          ),
          edges: [
            ...documents.flatMap((d) =>
              referenceGraph(d).edges.map((e) => ({
                ...e,
                id: `${d.id}:${e.id}`,
                from: `${d.id}:${e.from}`,
                to: `${d.id}:${e.to}`,
              })),
            ),
            {
              id: "cross-1",
              from: "ddia:1",
              to: "indexes:2",
              label: "adds maintenance work",
            },
            {
              id: "cross-2",
              from: "distributed:1",
              to: "os:0",
              label: "increases workload for",
            },
          ],
        }
      : referenceGraph(fallbackDoc);
  const doc =
    docId === "all"
      ? (documents.find((d) => d.id === selected.split(":")[0]) ??
        documents[0]!)
      : fallbackDoc;
  const matches = graph.nodes
    .filter((node) => node.label.toLowerCase().includes(query.toLowerCase()))
    .map((node) => node.id);
  const neighbors = graph.edges
    .filter((e) => matches.includes(e.from) || matches.includes(e.to))
    .flatMap((e) => [e.from, e.to]);
  const visible = query
    ? {
        nodes: graph.nodes.filter(
          (node) => matches.includes(node.id) || neighbors.includes(node.id),
        ),
        edges: graph.edges.filter(
          (e) => matches.includes(e.from) || matches.includes(e.to),
        ),
      }
    : graph;
  const conceptIndex =
    docId === "all" ? (selected.split(":")[1] ?? "0") : selected;
  const concept = doc.concepts[Number(conceptIndex)];
  return (
    <>
      <Heading
        eyebrow="YOUR CONNECTED UNDERSTANDING"
        title="Ideas become useful in relation."
      >
        Explore reference models, then test whether you can rebuild their
        connections.
      </Heading>
      <div className="s-filter-bar">
        <select
          aria-label="Filter graph by document or topic"
          value={docId}
          onChange={(e) => {
            setDocId(e.target.value);
            setSelected(e.target.value === "all" ? "ddia:0" : "0");
            setQuery("");
          }}
        >
          <option value="all">All documents · connected topics</option>
          {documents.map((d) => (
            <option key={d.id} value={d.id}>
              {d.topic} · {d.title}
            </option>
          ))}
        </select>
        <label className="s-search">
          <Search size={16} />
          <input
            aria-label="Search concepts"
            value={query}
            placeholder="Find a concept and its neighbors…"
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      <div className="s-knowledge-layout">
        <Panel
          title="Reference knowledge map"
          label={<Tag>{visible.nodes.length} concepts</Tag>}
        >
          <GraphEditor
            key={docId}
            graph={visible}
            readOnly
            selectedId={selected}
            onSelect={setSelected}
          />
          <p className="s-footnote">
            Drag the canvas to pan. Use + / − to zoom. Select a node to
            highlight its relationships.
          </p>
        </Panel>
        <Panel title={concept?.name ?? "Select a concept"}>
          <Tag>{doc.topic}</Tag>
          <p className="s-prose">{concept?.explanation}</p>
          <h3>Connected concepts</h3>
          {graph.edges
            .filter((e) => e.from === selected || e.to === selected)
            .map((e) => (
              <button
                key={e.id}
                className="s-connection"
                onClick={() => setSelected(e.from === selected ? e.to : e.from)}
              >
                {graph.nodes.find((n) => n.id === e.from)?.label}{" "}
                <small>{e.label} →</small>{" "}
                {graph.nodes.find((n) => n.id === e.to)?.label}
              </button>
            ))}
          <h3>Source</h3>
          <Link className="s-text-link" href={`/studio/library/${doc.id}`}>
            {doc.title} <ArrowUpRight size={13} />
          </Link>
          <h3>Learner confidence</h3>
          <p className="s-muted">
            {state.programs[doc.id]?.comparison?.correct.includes(
              concept?.name ?? "",
            )
              ? "Matched in your reconstruction"
              : "Not assessed in a local reconstruction"}
          </p>
          <h3>Recall history</h3>
          <p className="s-muted">
            {doc.id === "ddia"
              ? `${state.reviews.filter((r) => r.id === conceptIndex).length} local reviews`
              : "No local review yet"}
          </p>
          <ButtonLink href={`/studio/read/${doc.id}/4`} secondary>
            Reconstruct this model
          </ButtonLink>
        </Panel>
      </div>
    </>
  );
}
export function ReviewPage() {
  const { state, update } = useStudio();
  const [answer, setAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [notice, setNotice] = useState("");
  const queue = documents[0]!.concepts
    .map((concept, index) => ({ ...concept, id: String(index) }))
    .filter(
      (concept) =>
        !state.reviews.some(
          (r) => r.id === concept.id && Date.parse(r.due) > Date.now(),
        ),
    );
  const current = queue[0];
  function rate(rating: string, days: number) {
    if (!current) return;
    const now = new Date();
    update((s) => ({
      ...s,
      reviews: [
        ...s.reviews,
        {
          id: current.id,
          rating,
          days,
          at: now.toISOString(),
          due: new Date(now.getTime() + days * 86400000).toISOString(),
        },
      ],
      activity: [
        { text: `Reviewed ${current.name} · ${rating}`, at: now.toISOString() },
        ...s.activity,
      ].slice(0, 40),
    }));
    setNotice(
      `${current.name}: next review ${days < 1 ? "in 10 minutes" : `in ${days} days`}.`,
    );
    setAnswer("");
    setRevealed(false);
  }
  return (
    <>
      <Heading
        eyebrow="RETRIEVE BEFORE YOU REVISIT"
        title="Give your memory a turn."
      >
        Four concepts from the durability companion note. Practice retrieval,
        then choose an honest next interval.
      </Heading>
      <div className="s-review-layout">
        <Panel
          title={current ? "Recall practice" : "Your queue is clear"}
          label={<Tag>{queue.length} due</Tag>}
        >
          {notice && (
            <p className="s-feedback" role="status">
              {notice}
            </p>
          )}
          {current ? (
            <>
              <p className="s-eyebrow">WITHOUT LOOKING IT UP</p>
              <h2 className="s-review-question">
                Explain {current.name.toLowerCase()}.
              </h2>
              <p className="s-muted">
                How does it work? Give an example and name one limit.
              </p>
              <Answer
                label="Your recall attempt"
                value={answer}
                onChange={setAnswer}
                rows={6}
              />
              {!revealed ? (
                <div className="s-inline">
                  <button
                    className="s-button"
                    disabled={answer.trim().split(/\s+/).length < 5}
                    onClick={() => setRevealed(true)}
                  >
                    Reveal reference
                  </button>
                  <button
                    className="s-button secondary"
                    onClick={() => {
                      setAnswer("I could not recall this independently.");
                      setRevealed(true);
                    }}
                  >
                    I couldn’t recall it
                  </button>
                </div>
              ) : (
                <>
                  <div className="s-feedback">
                    <span className="s-eyebrow">REFERENCE EXPLANATION</span>
                    <p>{current.explanation}</p>
                  </div>
                  <p>How well did you recall it?</p>
                  <div className="s-rating-grid">
                    {[
                      ["Again", 10 / 1440, "10 min"],
                      ["Hard", 1, "1 day"],
                      ["Good", 3, "3 days"],
                      ["Easy", 7, "7 days"],
                    ].map(([rating, days, label]) => (
                      <button
                        key={rating as string}
                        onClick={() => rate(rating as string, days as number)}
                      >
                        <strong>{rating as string}</strong>
                        <small>{label as string}</small>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="s-empty">
              <Check size={30} />
              <h3>You made room for future recall.</h3>
              <p>Upcoming reviews are saved in this browser.</p>
              <ButtonLink href="/studio">Back to dashboard</ButtonLink>
            </div>
          )}
        </Panel>
        <Panel title="Today’s practice">
          <p className="s-pullquote">
            Recognition feels easy.
            <br />
            Recall builds access.
          </p>
          <p className="s-muted">
            This prototype uses simple intervals. Your rating schedules the next
            review locally; it is not a validated adaptive algorithm.
          </p>
          <h3>Due cognitive skill</h3>
          <p className="s-muted">
            Reconstruction · explain the relationships you find hardest to
            recall.
          </p>
          <ButtonLink href="/studio/read/ddia/4" secondary>
            Practice reconstruction
          </ButtonLink>
          <h3>Upcoming</h3>
          {state.reviews
            .slice(-4)
            .reverse()
            .map((r, i) => (
              <div className="s-review-row" key={i}>
                <span>
                  {documents[0]!.concepts[Number(r.id)]?.name}
                  <small>{new Date(r.due).toLocaleString()}</small>
                </span>
                <Tag>{r.rating}</Tag>
              </div>
            ))}
        </Panel>
      </div>
    </>
  );
}
export function AnalyticsPage() {
  const { state } = useStudio();
  const [metric, setMetric] = useState("Recall accuracy");
  const series: Record<string, number[]> = {
    "Recall accuracy": [38, 44, 43, 52, 57, 61, 68, 72],
    "Reconstruction accuracy": [22, 27, 25, 34, 38, 44, 48, 57],
    "Delayed recall": [25, 32, 29, 39, 42, 45, 51, 59],
    "Knowledge retention": [45, 38, 46, 43, 55, 51, 64, 61],
  };
  const data = series[metric]!;
  const totalStages = Object.values(state.programs).reduce(
    (sum, p) => sum + p.completed.length,
    0,
  );
  const comparisons = Object.values(state.programs).flatMap((p) =>
    p.comparison ? [p.comparison.score] : [],
  );
  return (
    <>
      <Heading
        eyebrow="EVIDENCE OF UNDERSTANDING"
        title="Are your ideas staying with you?"
      >
        Separate what feels familiar from what you can actually retrieve.
      </Heading>
      <div className="s-callout">
        Trend charts use simulated sample sessions. Your local attempts are
        shown separately; these metrics are not scientific measurements.
      </div>
      <div className="s-stats">
        {[
          ["Local skills practiced", totalStages],
          ["Local reviews", state.reviews.length],
          ["Local reconstructions", comparisons.length],
          [
            "Reference match average",
            comparisons.length
              ? `${Math.round(comparisons.reduce((a, b) => a + b, 0) / comparisons.length)}%`
              : "No attempts",
          ],
        ].map(([label, value]) => (
          <div className="s-stat" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>Your browser activity</small>
          </div>
        ))}
      </div>
      <div className="s-two-columns">
        <Panel
          title="Learning over time"
          label={<Tag>Simulated · 8 weeks</Tag>}
        >
          <select
            aria-label="Choose learning metric"
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
          >
            {Object.keys(series).map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
          <svg
            className="s-chart"
            viewBox="0 0 500 230"
            role="img"
            aria-label={`${metric}: simulated weekly percentages ${data.join(", ")}`}
          >
            <title>{metric} · sample data</title>
            {[0, 25, 50, 75, 100].map((v) => (
              <g key={v}>
                <line x1="35" y1={195 - v * 1.6} x2="480" y2={195 - v * 1.6} />
                <text x="4" y={200 - v * 1.6}>
                  {v}
                </text>
              </g>
            ))}
            <polyline
              className="s-chart-line"
              points={data
                .map((v, i) => `${40 + i * 61},${195 - v * 1.6}`)
                .join(" ")}
            />
            {data.map((v, i) => (
              <g key={i}>
                <circle cx={40 + i * 61} cy={195 - v * 1.6} r="4" />
                <text x={33 + i * 61} y="222">
                  W{i + 1}
                </text>
              </g>
            ))}
          </svg>
        </Panel>
        <Panel
          title="Confidence vs. recall"
          label={<Tag>Simulated comparison</Tag>}
        >
          <p className="s-muted">
            The gap is useful information. Confidence can outpace independent
            recall.
          </p>
          {[
            ["Immediately after reading", 88, 46],
            ["After reconstruction", 76, 70],
            ["Seven days later", 71, 59],
          ].map(([label, confidence, accuracy]) => (
            <div className="s-confidence" key={label}>
              <strong>{label}</strong>
              <div>
                <span>Confidence</span>
                <Meter
                  value={confidence as number}
                  label={`${label} confidence`}
                />
                <small>{confidence}%</small>
              </div>
              <div>
                <span>Recall</span>
                <Meter value={accuracy as number} label={`${label} recall`} />
                <small>{accuracy}%</small>
              </div>
            </div>
          ))}
        </Panel>
        <Panel
          title="Cognitive skill development"
          label={<Tag>Illustrative bands</Tag>}
        >
          {skills.map((skill, index) => (
            <div className="s-skill-trend" key={skill.name}>
              <span>{skill.name}</span>
              <Meter
                value={Math.min(
                  95,
                  skill.base +
                    Object.values(state.programs).filter((p) =>
                      p.completed.includes(index),
                    ).length *
                      5,
                )}
                label={skill.name}
              />
              <small>{masteryWord(skill.base)}</small>
            </div>
          ))}
        </Panel>
        <Panel title="Review consistency">
          <p className="s-muted">
            Sample practice pattern over four weeks. Filled cells represent a
            sample retrieval session.
          </p>
          <div className="s-heatmap">
            {Array.from({ length: 28 }, (_, i) => (
              <span
                className={i % 5 === 0 || i % 7 === 2 ? "" : "filled"}
                key={i}
                title={`Sample day ${i + 1}: ${i % 5 === 0 || i % 7 === 2 ? "no practice" : "practice"}`}
              />
            ))}
          </div>
          <p className="s-small s-muted">
            Your local review count: {state.reviews.length}. A useful habit is a
            short, honest recall attempt.
          </p>
          <ButtonLink href="/studio/reviews" secondary>
            Practice a due concept <ArrowRight size={14} />
          </ButtonLink>
        </Panel>
      </div>
    </>
  );
}
export function SettingsPage() {
  const { state, update } = useStudio();
  const [checked, setChecked] = useState(false);
  const [notice, setNotice] = useState("");
  return (
    <>
      <Heading
        eyebrow="MAKE SPACE FOR YOUR THINKING"
        title="Workspace settings."
      >
        A local prototype. Provider choices below are saved visually and never
        execute a command.
      </Heading>
      <div className="s-settings">
        <Panel title="Appearance">
          <div className="s-setting-row">
            <div>
              <strong>Workspace theme</strong>
              <p className="s-muted">
                Choose a quiet environment for focused reading.
              </p>
            </div>
            <select
              aria-label="Workspace theme"
              value={state.theme}
              onChange={(e) =>
                update((s) => ({
                  ...s,
                  theme: e.target.value as "light" | "dark",
                }))
              }
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>
        </Panel>
        <Panel
          title="Cognitive coach provider"
          label={<Tag>Visual configuration only</Tag>}
        >
          <div className="s-setting-row">
            <label>
              Default provider
              <select
                value={state.provider}
                onChange={(e) => {
                  setChecked(false);
                  update((s) => ({
                    ...s,
                    provider: e.target.value,
                    model:
                      e.target.value === "Codex"
                        ? "Sol · medium"
                        : "Claude Sonnet · default",
                  }));
                }}
              >
                <option>Codex</option>
                <option>Claude Code</option>
              </select>
            </label>
            <label>
              Model
              <select
                value={state.model}
                onChange={(e) =>
                  update((s) => ({ ...s, model: e.target.value }))
                }
              >
                {(state.provider === "Codex"
                  ? ["Sol · medium", "Sol · low"]
                  : ["Claude Sonnet · default", "Claude Opus · default"]
                ).map((model) => (
                  <option key={model}>{model}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="s-setting-row">
            <span>
              CLI availability / provider health
              <small>
                {checked
                  ? "Simulated: available / healthy. No command was executed."
                  : "Not checked. Live provider discovery is disabled in this prototype."}
              </small>
            </span>
            <button
              className="s-button secondary"
              onClick={() => setChecked(true)}
            >
              Simulate health check
            </button>
          </div>
          <h3>Task-specific overrides</h3>
          {["Coaching", "Reconstruction feedback", "Transfer evaluation"].map(
            (task) => (
              <div className="s-setting-row" key={task}>
                <label htmlFor={`override-${task}`}>{task}</label>
                <select
                  id={`override-${task}`}
                  value={state.overrides[task] ?? "Default"}
                  onChange={(e) =>
                    update((s) => ({
                      ...s,
                      overrides: { ...s.overrides, [task]: e.target.value },
                    }))
                  }
                >
                  <option>Default</option>
                  <option>Codex · Sol</option>
                  <option>Claude Code · Sonnet</option>
                </select>
              </div>
            ),
          )}
        </Panel>
        <Panel title="Local prototype data">
          <p className="s-muted">
            Drafts, annotations, graphs, stage reflections, review schedules,
            and preferences stay in this browser. No user content is sent to a
            service.
          </p>
          <div className="s-inline">
            <button
              className="s-button secondary"
              onClick={() => {
                const blob = new Blob([JSON.stringify(state, null, 2)], {
                  type: "application/json",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "mnemosyne-studio-progress.json";
                a.click();
                URL.revokeObjectURL(url);
                setNotice("Progress exported as JSON.");
              }}
            >
              Export progress
            </button>
            <button
              className="s-button secondary"
              onClick={() => {
                if (
                  window.confirm(
                    "Clear only this prototype’s learning progress? Existing Mnemosyne documents and database are unaffected.",
                  )
                ) {
                  update((s) => ({
                    ...s,
                    programs: {},
                    reviews: [],
                    activity: [],
                  }));
                  setNotice("Prototype learning progress cleared.");
                }
              }}
            >
              Reset prototype progress
            </button>
          </div>
          {notice && (
            <p role="status" className="s-feedback">
              {notice}
            </p>
          )}
          <Link className="s-text-link" href="/">
            Return to existing Mnemosyne <ArrowUpRight size={13} />
          </Link>
        </Panel>
      </div>
    </>
  );
}
