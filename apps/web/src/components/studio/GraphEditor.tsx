"use client";
import { useRef, useState } from "react";
import { Plus, Minus, Maximize2, Trash2 } from "lucide-react";
import type { Graph } from "./data";
export function GraphEditor({
  graph,
  onChange,
  readOnly = false,
  onSelect,
  selectedId,
}: {
  graph: Graph;
  onChange?: (graph: Graph) => void;
  readOnly?: boolean;
  onSelect?: (id: string) => void;
  selectedId?: string;
}) {
  const [selected, setSelected] = useState("");
  const [label, setLabel] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [relationship, setRelationship] = useState("");
  const [error, setError] = useState("");
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const drag = useRef<{
    node?: string;
    x: number;
    y: number;
    originalX: number;
    originalY: number;
  } | null>(null);
  const current = graph.nodes.find(
    (node) => node.id === (selectedId ?? selected),
  );
  function select(id: string) {
    setSelected(id);
    setLabel(graph.nodes.find((node) => node.id === id)?.label ?? "");
    onSelect?.(id);
  }
  function connect() {
    if (!from || !to || from === to || !relationship.trim()) {
      setError("Choose two different concepts and name their relationship.");
      return;
    }
    onChange?.({
      ...graph,
      edges: [
        ...graph.edges,
        { id: crypto.randomUUID(), from, to, label: relationship.trim() },
      ],
    });
    setRelationship("");
    setError("");
  }
  return (
    <div className="s-graph-editor">
      <div className="s-graph-tools">
        <span>
          {graph.nodes.length} concepts · {graph.edges.length} connections
        </span>
        <div>
          <button
            aria-label="Zoom out"
            onClick={() =>
              setView((v) => ({ ...v, scale: Math.max(0.5, v.scale - 0.15) }))
            }
          >
            <Minus size={14} />
          </button>
          <span>{Math.round(view.scale * 100)}%</span>
          <button
            aria-label="Zoom in"
            onClick={() =>
              setView((v) => ({ ...v, scale: Math.min(2, v.scale + 0.15) }))
            }
          >
            <Plus size={14} />
          </button>
          <button
            aria-label="Reset graph view"
            onClick={() => setView({ x: 0, y: 0, scale: 1 })}
          >
            <Maximize2 size={14} />
          </button>
        </div>
      </div>
      <svg
        className="s-graph-canvas"
        viewBox="0 0 600 410"
        role="group"
        aria-label="Concept graph. Select nodes to inspect; drag the background to pan."
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) {
            drag.current = {
              x: event.clientX,
              y: event.clientY,
              originalX: view.x,
              originalY: view.y,
            };
            event.currentTarget.setPointerCapture(event.pointerId);
          }
        }}
        onPointerMove={(event) => {
          const moving = drag.current;
          if (!moving) return;
          const ratio = 600 / event.currentTarget.getBoundingClientRect().width;
          const dx = (event.clientX - moving.x) * ratio;
          const dy = (event.clientY - moving.y) * ratio;
          if (moving.node && !readOnly)
            onChange?.({
              ...graph,
              nodes: graph.nodes.map((node) =>
                node.id === moving.node
                  ? {
                      ...node,
                      x: Math.max(
                        80,
                        Math.min(520, moving.originalX + dx / view.scale),
                      ),
                      y: Math.max(
                        35,
                        Math.min(375, moving.originalY + dy / view.scale),
                      ),
                    }
                  : node,
              ),
            });
          else
            setView((v) => ({
              ...v,
              x: moving.originalX + dx,
              y: moving.originalY + dy,
            }));
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        <defs>
          <pattern
            id="studio-grid"
            width="22"
            height="22"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1" cy="1" r=".8" fill="currentColor" opacity=".13" />
          </pattern>
        </defs>
        <rect
          width="600"
          height="410"
          fill="url(#studio-grid)"
          pointerEvents="none"
        />
        <g transform={`translate(${view.x},${view.y}) scale(${view.scale})`}>
          {graph.edges.map((edge) => {
            const a = graph.nodes.find((node) => node.id === edge.from);
            const b = graph.nodes.find((node) => node.id === edge.to);
            if (!a || !b) return null;
            const highlighted = current?.id === a.id || current?.id === b.id;
            return (
              <g
                key={edge.id}
                className={highlighted ? "s-edge selected" : "s-edge"}
              >
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
                <rect
                  x={(a.x + b.x) / 2 - 62}
                  y={(a.y + b.y) / 2 - 10}
                  width="124"
                  height="20"
                  rx="5"
                />
                <text
                  x={(a.x + b.x) / 2}
                  y={(a.y + b.y) / 2 + 4}
                  textAnchor="middle"
                >
                  {edge.label.slice(0, 28)} →
                </text>
              </g>
            );
          })}
          {graph.nodes.map((node) => (
            <g
              key={node.id}
              className={`s-node ${current?.id === node.id ? "selected" : ""}`}
              role="button"
              tabIndex={0}
              aria-label={`Concept ${node.label}`}
              onClick={() => select(node.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  select(node.id);
                }
              }}
              onPointerDown={(event) => {
                event.stopPropagation();
                select(node.id);
                if (readOnly) return;
                drag.current = {
                  node: node.id,
                  x: event.clientX,
                  y: event.clientY,
                  originalX: node.x,
                  originalY: node.y,
                };
                event.currentTarget.ownerSVGElement?.setPointerCapture(
                  event.pointerId,
                );
              }}
            >
              <rect
                x={node.x - 76}
                y={node.y - 24}
                width="152"
                height="48"
                rx="9"
              />
              <circle cx={node.x - 61} cy={node.y} r="3" />
              <text x={node.x + 3} y={node.y + 4} textAnchor="middle">
                {node.label.length > 23
                  ? `${node.label.slice(0, 21)}…`
                  : node.label}
              </text>
            </g>
          ))}
        </g>
        {!graph.nodes.length && (
          <text x="300" y="195" textAnchor="middle" className="s-graph-empty">
            Start with an idea you can recall.
          </text>
        )}
      </svg>
      {!readOnly && (
        <div className="s-graph-forms">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!label.trim()) return;
              if (current)
                onChange?.({
                  ...graph,
                  nodes: graph.nodes.map((node) =>
                    node.id === current.id
                      ? { ...node, label: label.trim() }
                      : node,
                  ),
                });
              else
                onChange?.({
                  ...graph,
                  nodes: [
                    ...graph.nodes,
                    {
                      id: crypto.randomUUID(),
                      label: label.trim(),
                      x: 120 + (graph.nodes.length % 3) * 175,
                      y: 65 + (Math.floor(graph.nodes.length / 3) % 4) * 85,
                    },
                  ],
                });
              setLabel("");
              setSelected("");
            }}
          >
            <input
              aria-label="Concept name"
              placeholder="Name a concept…"
              maxLength={60}
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              required
            />
            <button className="s-button secondary" type="submit">
              {current ? "Rename" : "Add concept"}
            </button>
            {current && (
              <>
                <button
                  className="s-icon"
                  aria-label="Delete selected concept"
                  type="button"
                  onClick={() => {
                    onChange?.({
                      nodes: graph.nodes.filter(
                        (node) => node.id !== current.id,
                      ),
                      edges: graph.edges.filter(
                        (edge) =>
                          edge.from !== current.id && edge.to !== current.id,
                      ),
                    });
                    setSelected("");
                    setLabel("");
                  }}
                >
                  <Trash2 size={15} />
                </button>
                <button
                  className="s-button secondary"
                  type="button"
                  onClick={() => {
                    setSelected("");
                    setLabel("");
                  }}
                >
                  Deselect
                </button>
              </>
            )}
          </form>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              connect();
            }}
          >
            <select
              aria-label="Relationship source"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            >
              <option value="">From concept</option>
              {graph.nodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.label}
                </option>
              ))}
            </select>
            <input
              aria-label="Relationship label"
              placeholder="e.g. enables"
              maxLength={50}
              value={relationship}
              onChange={(event) => setRelationship(event.target.value)}
            />
            <select
              aria-label="Relationship target"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            >
              <option value="">To concept</option>
              {graph.nodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.label}
                </option>
              ))}
            </select>
            <button className="s-button secondary" type="submit">
              Connect
            </button>
          </form>
          {error && (
            <p role="alert" className="s-warning">
              {error}
            </p>
          )}
          {graph.edges.length > 0 && (
            <details>
              <summary>Edit connections</summary>
              {graph.edges.map((edge) => (
                <div className="s-edge-edit" key={edge.id}>
                  <span>
                    {graph.nodes.find((node) => node.id === edge.from)?.label} →{" "}
                    {graph.nodes.find((node) => node.id === edge.to)?.label}
                  </span>
                  <input
                    aria-label="Edit relationship"
                    value={edge.label}
                    onChange={(event) =>
                      onChange?.({
                        ...graph,
                        edges: graph.edges.map((item) =>
                          item.id === edge.id
                            ? { ...item, label: event.target.value }
                            : item,
                        ),
                      })
                    }
                  />
                  <button
                    className="s-icon"
                    aria-label="Remove relationship"
                    onClick={() =>
                      onChange?.({
                        ...graph,
                        edges: graph.edges.filter(
                          (item) => item.id !== edge.id,
                        ),
                      })
                    }
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </details>
          )}
        </div>
      )}
    </div>
  );
}
