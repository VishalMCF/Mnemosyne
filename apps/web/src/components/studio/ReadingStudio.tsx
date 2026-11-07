"use client";
import Link from "next/link";
import { SourceContent } from "@/components/content/SourceContent";
import { useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  LockKeyhole,
  X,
  PanelLeft,
  MessageCircle,
} from "lucide-react";
import {
  documents,
  skills,
  fields,
  compareGraph,
  referenceGraph,
  type Annotation,
  type Program,
} from "./data";
import { useProgram, useStudio } from "./Store";
import { Answer, Tag } from "./ui";
import { GraphEditor } from "./GraphEditor";
import { Coach } from "./Coach";
export function ReadingStudio({
  documentId,
  initialStage,
}: {
  documentId?: string;
  initialStage?: number;
}) {
  const doc = documents.find((item) => item.id === documentId) ?? documents[0]!;
  const { program, change } = useProgram(doc.id);
  const { update } = useStudio();
  const [stage, setStage] = useState(initialStage ?? program.stage);
  const [selection, setSelection] = useState("");
  const [knownConcept, setKnownConcept] = useState("");
  const [kind, setKind] = useState("Main claim");
  const [error, setError] = useState("");
  const sourceRef = useRef<HTMLDivElement>(null);
  const outlineDialog = useRef<HTMLDialogElement>(null);
  const coachDialog = useRef<HTMLDialogElement>(null);
  const questions = [
    "What do you expect to learn?",
    "What is the author arguing?",
    "How would you explain this with less?",
    "How do these ideas connect?",
    "What can you rebuild from memory?",
    "How would you apply this here?",
  ];
  const skill = skills[stage]!;
  const section = doc.sections[program.section] ?? doc.sections[0]!;
  const feedback = program.feedback[String(stage)];
  const answer = (index: number) => program.answers[`${stage}:${index}`] ?? "";
  const setAnswer = (index: number, value: string) =>
    change((p) => ({
      ...p,
      answers: { ...p.answers, [`${stage}:${index}`]: value },
      feedback: { ...p.feedback, [stage]: "" },
      ...(stage === 4 ? { comparison: undefined } : {}),
    }));
  function navigate(next: number) {
    if (
      stage === 4 &&
      !program.comparison &&
      next !== 4 &&
      !window.confirm(
        "Leave this memory attempt? Returning to the source can influence your recall.",
      )
    )
      return;
    setStage(next);
    setError("");
    change((p) => ({ ...p, stage: next }));
  }
  function submit() {
    if (
      stage === 1 &&
      (program.annotations.length < 3 ||
        new Set(program.annotations.map((a) => a.kind)).size < 2)
    ) {
      setError(
        "Mark at least three passages using at least two annotation types before reflecting.",
      );
      return;
    }
    if (
      stage === 3 &&
      (program.graph.nodes.length < 3 || program.graph.edges.length < 2)
    ) {
      setError(
        "Build at least three concepts and two named relationships. The graph should express your own model.",
      );
      return;
    }
    if (
      stage === 4 &&
      (program.reconstruction.nodes.length < 2 ||
        !program.reconstruction.edges.length)
    ) {
      setError(
        "Recall at least two concepts and a relationship before comparing.",
      );
      return;
    }
    const required = (fields[stage] ?? []).filter(
      (label) => !label.includes("optional"),
    );
    if (
      required.some(
        (_, index) =>
          answer(index).trim().split(/\s+/).length < (stage === 4 ? 15 : 5),
      )
    ) {
      setError(
        "Give each required response a few meaningful sentences or a concrete idea before submitting.",
      );
      return;
    }
    if (
      stage === 2 &&
      answer(1)
        .split(/[.!?]+/)
        .filter((sentence) => sentence.trim()).length !== 3
    ) {
      setError(
        "Try compressing the second response into exactly three sentences.",
      );
      return;
    }
    setError("");
    let message =
      "Your response is recorded. Name the mechanism more explicitly and check one assumption against the source.";
    if (stage === 0)
      message =
        "Your questions give this reading a direction. As you read, test one prediction and revise it when the evidence disagrees.";
    if (stage === 1)
      message =
        "You separated the argument into parts. Check whether your evidence demonstrates the claim or only illustrates it. An example alone may not establish the general case.";
    if (stage === 2)
      message = /because|therefore|trade|cost|if|when/i.test(answer(3))
        ? "Your mental model includes a causal connection. Now ask whether the shorter explanation still preserves the constraint and the cost."
        : "You identified ideas. Strengthen your mental model by naming how one idea changes another, rather than listing terms.";
    if (stage === 3)
      message =
        "Your associations create multiple retrieval paths. Test your analogy at its boundary: which mechanism in the source has no equivalent in the familiar system?";
    if (stage === 4)
      message =
        "Compare your model below. This deterministic comparison matches concept names and directed, labeled relationships; it cannot judge semantic equivalence. A missing match is a prompt to reflect, not proof you misunderstood.";
    if (stage === 5)
      message =
        /because|therefore|if|when/i.test(answer(1)) &&
        /fail|cost|risk|latency|overhead|storage|limit/i.test(answer(2))
          ? "You connected a mechanism to a trade-off. A useful next test is to change one more constraint and check whether your design still holds."
          : "Your proposal is recorded. Make the causal mechanism and one specific failure condition explicit before trusting the design.";
    change((p) => ({
      ...p,
      completed: [...new Set([...p.completed, stage])],
      feedback: { ...p.feedback, [stage]: message },
      ...(stage === 4
        ? { comparison: compareGraph(p.reconstruction, referenceGraph(doc)) }
        : {}),
    }));
    update((state) => ({
      ...state,
      activity: [
        { text: `${skill.name} · ${doc.title}`, at: new Date().toISOString() },
        ...state.activity,
      ].slice(0, 40),
    }));
  }
  function graphChange(
    p: Program,
    graph: Program["graph"],
    reconstruction: boolean,
  ): Program {
    return {
      ...p,
      ...(reconstruction
        ? { reconstruction: graph, comparison: undefined }
        : { graph }),
      feedback: { ...p.feedback, [stage]: "" },
    };
  }
  const comparison = program.comparison;
  return (
    <div className="s-reading">
      <div className="s-reading-header">
        <Link href={`/studio/library/${doc.id}`} className="s-muted">
          <ArrowLeft size={18} /> Library
        </Link>
        <span className="s-reading-doc">{doc.title}</span>
        <Tag>Original practice note</Tag>
        <span className="s-saved">Saved in this browser</span>
      </div>
      <div className="s-study-toolbar">
        <div className="s-stage-control">
          <span>Stage {stage + 1} of 6</span>
          <select
            aria-label="Current learning stage"
            value={stage}
            onChange={(event) => navigate(Number(event.target.value))}
          >
            {skills.map((item, index) => (
              <option key={item.name} value={index}>
                {item.name}
                {program.completed.includes(index) ? " ✓" : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="s-study-tools">
          <button
            className="s-button secondary"
            onClick={() => outlineDialog.current?.showModal()}
          >
            <PanelLeft size={18} />
            Contents
          </button>
          <button
            className="s-button secondary"
            onClick={() => coachDialog.current?.showModal()}
          >
            <MessageCircle size={18} />
            Coach
          </button>
        </div>
      </div>
      <div className="s-reading-layout">
        <article className="s-exercise">
          {stage === 4 && (
            <p className="s-recall-status">
              <LockKeyhole size={18} />
              Source hidden
            </p>
          )}
          <h1>{questions[stage]}</h1>
          <details className="s-task-guidance">
            <summary>Guidance</summary>
            <p>{skill.description}</p>
          </details>
          {stage === 0 && (
            <>
              <div className="s-source">
                <h2>{doc.title}</h2>
                <p>{doc.intro}</p>
                <ol>
                  {doc.sections.map((item) => (
                    <li key={item.title}>{item.title}</li>
                  ))}
                </ol>
              </div>
              <p className="s-callout">
                Before you read: commit to a prediction. Being wrong gives you
                something useful to notice.
              </p>
            </>
          )}
          {stage === 1 && (
            <>
              <label className="s-section-picker">
                Reading section
                <select
                  aria-label="Reading section"
                  value={program.section}
                  onChange={(event) => {
                    change((p) => ({
                      ...p,
                      section: Number(event.target.value),
                    }));
                    setSelection("");
                  }}
                >
                  {doc.sections.map((item, index) => (
                    <option key={item.title} value={index}>
                      {index + 1}. {item.title}
                    </option>
                  ))}
                </select>
              </label>
              <p className="s-callout">
                Select a passage with your mouse or keyboard, then assign its
                role in the argument.
              </p>
              <div
                ref={sourceRef}
                className="s-source selectable"
                tabIndex={0}
                onMouseUp={() => {
                  const selected = window.getSelection();
                  if (
                    selected &&
                    sourceRef.current?.contains(selected.anchorNode) &&
                    sourceRef.current?.contains(selected.focusNode)
                  )
                    setSelection(selected.toString().trim());
                }}
                onKeyUp={() =>
                  setSelection(window.getSelection()?.toString().trim() ?? "")
                }
              >
                <span className="s-eyebrow">SECTION {program.section + 1}</span>
                <h2>{section.title}</h2>
                <SourceContent
                  source={section.text}
                  renderText={(text) =>
                    highlightPassages(
                      text,
                      program.annotations.filter(
                        (annotation) => annotation.section === program.section,
                      ),
                    )
                  }
                />
              </div>
              <div className="s-annotation-tools">
                <select
                  aria-label="Annotation type"
                  value={kind}
                  onChange={(event) => setKind(event.target.value)}
                >
                  {[
                    "Main claim",
                    "Evidence",
                    "Assumption",
                    "Example",
                    "Concept",
                    "Relationship",
                  ].map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
                <button
                  className="s-button secondary"
                  disabled={!selection}
                  onClick={() => {
                    change((p) => ({
                      ...p,
                      annotations: [
                        ...p.annotations,
                        {
                          text: selection,
                          kind,
                          section: p.section,
                        } as Annotation,
                      ],
                      feedback: { ...p.feedback, 1: "" },
                    }));
                    setSelection("");
                  }}
                >
                  Mark passage
                </button>
              </div>
              {selection && (
                <p className="s-selection">Selected: “{selection}”</p>
              )}
              <div className="s-annotations">
                {program.annotations.map((annotation, index) => (
                  <div key={index}>
                    <Tag>{annotation.kind}</Tag>
                    <p>“{annotation.text}”</p>
                    <button
                      className="s-icon"
                      aria-label="Remove annotation"
                      onClick={() =>
                        change((p) => ({
                          ...p,
                          annotations: p.annotations.filter(
                            (_, i) => i !== index,
                          ),
                        }))
                      }
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
          {stage === 2 && (
            <details className="s-source">
              <summary>Revisit the source before compressing</summary>
              {doc.sections.map((item) => (
                <div key={item.title}>
                  <h3>{item.title}</h3>
                  <SourceContent source={item.text} />
                </div>
              ))}
            </details>
          )}
          {stage === 3 && (
            <>
              <p className="s-callout">
                Build your own network. Add concepts, connect them with verbs,
                and drag them into an arrangement that explains your model.
              </p>
              <GraphEditor
                graph={program.graph}
                onChange={(graph) =>
                  change((p) => graphChange(p, graph, false))
                }
              />
              <div className="s-known-concept">
                <label>
                  Connect to existing knowledge
                  <select
                    aria-label="Existing knowledge concept"
                    value={knownConcept}
                    onChange={(event) => setKnownConcept(event.target.value)}
                  >
                    <option value="">
                      Choose a concept from another reading…
                    </option>
                    {documents
                      .filter((item) => item.id !== doc.id)
                      .flatMap((item) =>
                        item.concepts.map((concept) => (
                          <option key={concept.name} value={concept.name}>
                            {concept.name} · {item.topic}
                          </option>
                        )),
                      )}
                  </select>
                </label>
                <button
                  className="s-button secondary"
                  disabled={!knownConcept}
                  onClick={() => {
                    change((p) =>
                      graphChange(
                        p,
                        {
                          ...p.graph,
                          nodes: [
                            ...p.graph.nodes,
                            {
                              id: crypto.randomUUID(),
                              label: knownConcept,
                              x: 300,
                              y: 200,
                            },
                          ],
                        },
                        false,
                      ),
                    );
                    setKnownConcept("");
                  }}
                >
                  Add connection anchor
                </button>
              </div>
              <p className="s-footnote">
                Add an anchor, then create and label a relationship that
                explains your connection.
              </p>
            </>
          )}
          {stage === 4 && (
            <>
              <div className="s-memory-banner">
                <LockKeyhole size={18} />
                <div>
                  <strong>This is your memory, unassisted.</strong>
                  <p>
                    The source and reference graph stay hidden until you submit.
                    Rebuild the ideas and the reasons connecting them.
                  </p>
                </div>
              </div>
              <GraphEditor
                graph={program.reconstruction}
                onChange={(graph) => change((p) => graphChange(p, graph, true))}
              />
            </>
          )}
          {stage === 5 && (
            <div className="s-scenario">
              <Tag>Unfamiliar scenario</Tag>
              <h2>Change the constraints.</h2>
              <p>{doc.scenario}</p>
            </div>
          )}
          {(fields[stage] ?? []).map((label, index) => (
            <Answer
              key={`${stage}:${label}`}
              label={label}
              value={answer(index)}
              onChange={(value) => setAnswer(index, value)}
              rows={stage === 4 ? 7 : 4}
            />
          ))}
          {error && (
            <p role="alert" className="s-warning">
              {error}
            </p>
          )}
          <div className="s-submit-row">
            <button className="s-button" onClick={submit}>
              {stage === 4
                ? "Submit my reconstruction"
                : "Reflect on my response"}
              <ArrowRight size={14} />
            </button>
            <span className="s-muted">
              Simulated coaching · Your response stays local
            </span>
          </div>
          {feedback && (
            <section className="s-feedback" role="status">
              <span className="s-eyebrow">COACH REFLECTION · SCRIPTED</span>
              <p>{feedback}</p>
            </section>
          )}
          {stage === 4 && comparison && (
            <section className="s-comparison">
              <div className="s-panel-heading">
                <h2>Your reconstruction, compared</h2>
                <Tag>{comparison.score}% reference match</Tag>
              </div>
              <p className="s-muted">
                Illustrative exact-match score, not a scientific measure of
                understanding. Relationship direction and labels matter.
              </p>
              <div className="s-comparison-lists">
                {[
                  ["Recalled concepts", comparison.correct],
                  ["Missing concepts", comparison.missing],
                  ["Unmatched concepts", comparison.extra],
                  ["Correct relationships", comparison.correctEdges],
                  ["Unmatched relationships", comparison.incorrectEdges],
                  ["Missing relationships", comparison.missingEdges],
                ].map(([label, items]) => (
                  <div key={label as string}>
                    <h3>{label as string}</h3>
                    <ul>
                      {(items as string[]).length ? (
                        (items as string[]).map((text) => (
                          <li key={text}>{text}</li>
                        ))
                      ) : (
                        <li>None</li>
                      )}
                    </ul>
                  </div>
                ))}
              </div>
              <h3>Reference model</h3>
              <GraphEditor graph={referenceGraph(doc)} readOnly />
              <button
                className="s-button secondary"
                onClick={() =>
                  change((p) => ({
                    ...p,
                    reconstruction: { nodes: [], edges: [] },
                    comparison: undefined,
                    answers: { ...p.answers, "4:0": "" },
                    feedback: { ...p.feedback, 4: "" },
                  }))
                }
              >
                Try again with a blank workspace
              </button>
            </section>
          )}
          <footer className="s-stage-footer">
            {stage ? (
              <button
                className="s-button secondary"
                onClick={() => navigate(stage - 1)}
              >
                <ArrowLeft size={14} /> Previous stage
              </button>
            ) : (
              <Link
                className="s-button secondary"
                href={`/studio/library/${doc.id}`}
              >
                Back to document
              </Link>
            )}
            {stage < 5 ? (
              <button
                className="s-button secondary"
                disabled={!feedback}
                onClick={() => navigate(stage + 1)}
              >
                Next: {skills[stage + 1]!.short}
                <ArrowRight size={14} />
              </button>
            ) : feedback ? (
              <Link href="/studio" className="s-button">
                Finish session <Check size={14} />
              </Link>
            ) : (
              <span className="s-muted">Reflect to finish your session</span>
            )}
          </footer>
        </article>
      </div>
      <dialog
        ref={outlineDialog}
        className="s-study-drawer"
        aria-labelledby="outline-title"
      >
        <header className="s-drawer-heading">
          <h2 id="outline-title">Contents</h2>
          <button
            className="s-button secondary"
            onClick={() => outlineDialog.current?.close()}
          >
            <X size={18} />
            Close
          </button>
        </header>
        <aside className="s-outline">
          <p className="s-eyebrow">YOUR LEARNING PATH</p>
          <strong>{doc.topic}</strong>
          <p className="s-muted">
            {program.completed.length} of 6 skills practiced
          </p>
          <progress
            value={program.completed.length}
            max={6}
            aria-label="Learning program completion"
          />
          <p className="s-eyebrow s-outline-label">DOCUMENT OUTLINE</p>
          {stage >= 4 && !comparison ? (
            <div className="s-source-closed">
              <LockKeyhole size={19} />
              <p>Source closed</p>
              <small>Build from memory before comparing.</small>
            </div>
          ) : (
            doc.sections.map((item, index) => (
              <button
                key={item.title}
                className={index === program.section ? "active" : ""}
                onClick={() => {
                  change((p) => ({ ...p, section: index }));
                  setSelection("");
                  outlineDialog.current?.close();
                }}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                {item.title}
              </button>
            ))
          )}
        </aside>
      </dialog>
      <dialog
        ref={coachDialog}
        className="s-study-drawer"
        aria-labelledby="coach-title"
      >
        <header className="s-drawer-heading">
          <h2 id="coach-title">Coach</h2>
          <button
            className="s-button secondary"
            onClick={() => coachDialog.current?.close()}
          >
            <X size={18} />
            Close
          </button>
        </header>
        <Coach key={`${doc.id}-${stage}`} stage={stage} />
      </dialog>
    </div>
  );
}

function highlightPassages(text: string, annotations: Annotation[]) {
  const ranges = annotations
    .map((annotation) => ({
      start: text.indexOf(annotation.text),
      end: text.indexOf(annotation.text) + annotation.text.length,
      kind: annotation.kind,
    }))
    .filter((range) => range.start >= 0)
    .sort((a, b) => a.start - b.start);
  const pieces = [];
  let cursor = 0;
  for (const range of ranges) {
    if (range.start < cursor) continue;
    pieces.push(text.slice(cursor, range.start));
    pieces.push(
      <mark
        className="s-mark"
        title={range.kind}
        key={`${range.start}-${range.end}`}
      >
        {text.slice(range.start, range.end)}
      </mark>,
    );
    cursor = range.end;
  }
  pieces.push(text.slice(cursor));
  return pieces;
}
