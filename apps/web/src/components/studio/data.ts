export const skills = [
  {
    name: "Orientation",
    short: "Orient",
    mode: "Socratic questioning",
    description:
      "Set an intention before reading. Predict the structure and name what you need to understand.",
    why: "A question gives your attention a job.",
    weakness: "Predictions stay broad instead of being testable.",
    question: "What question would make this reading worth your time?",
    hint: "Name one decision this material might help you make.",
    base: 68,
  },
  {
    name: "Structural Reading",
    short: "Structure",
    mode: "Concept clarification",
    description:
      "Separate claims from evidence, assumptions, and examples. Notice how the argument is built.",
    why: "Remembering a conclusion is fragile if you cannot explain its support.",
    weakness: "Examples are sometimes mistaken for evidence.",
    question:
      "Which sentence carries the argument, and what actually supports it?",
    hint: "Look for a statement that could be challenged, then inspect its support.",
    base: 61,
  },
  {
    name: "Mental Compression",
    short: "Compress",
    mode: "Memory challenge",
    description: "Reduce an explanation without losing its causal structure.",
    why: "Compression reveals which ideas do the explanatory work.",
    weakness: "Summaries keep details but sometimes lose the trade-off.",
    question: "What must survive if your explanation gets three times shorter?",
    hint: "Keep the constraint, the mechanism, and the consequence.",
    base: 54,
  },
  {
    name: "Associative Encoding",
    short: "Connect",
    mode: "Analogy generation",
    description:
      "Connect new ideas to familiar models, while naming where each analogy breaks.",
    why: "Multiple retrieval paths make an idea easier to find later.",
    weakness: "Analogies need clearer boundaries.",
    question:
      "What familiar system behaves similarly, and where does that comparison fail?",
    hint: "Try a library, a queue, or a shared calendar. State one important difference.",
    base: 73,
  },
  {
    name: "Reconstruction",
    short: "Reconstruct",
    mode: "Reconstruction feedback",
    description:
      "Rebuild the argument and its relationships from memory, with the source closed.",
    why: "Independent recall exposes the difference between recognition and understanding.",
    weakness: "Concept names return more easily than causal links.",
    question: "Without looking back, what causes what in your model?",
    hint: "Start with the problem, then reconstruct the mechanism and its cost.",
    base: 42,
  },
  {
    name: "Application & Transfer",
    short: "Transfer",
    mode: "Application challenge",
    description:
      "Use a principle under changed constraints, and identify when it stops helping.",
    why: "An idea is useful when you can reason with it in a new situation.",
    weakness: "Design choices need explicit failure conditions.",
    question:
      "Which assumption changes in this scenario, and how does your decision change?",
    hint: "Describe an outcome, the mechanism behind it, and one counterexample.",
    base: 48,
  },
];
export type Node = { id: string; label: string; x: number; y: number };
export type Edge = { id: string; from: string; to: string; label: string };
export type Graph = { nodes: Node[]; edges: Edge[] };
export type Document = {
  id: string;
  title: string;
  author: string;
  topic: string;
  color: string;
  intro: string;
  sections: { title: string; text: string }[];
  concepts: { name: string; explanation: string }[];
  relations: string[];
  scenario: string;
};
export const documents: Document[] = [
  {
    id: "ddia",
    title: "Designing Data-Intensive Applications",
    author: "Martin Kleppmann · companion exercise",
    topic: "Data systems",
    color: "var(--secondary)",
    intro:
      "How do we make data survive failure? Explore the tension between accepting writes quickly and preserving them reliably. This is an original practice note, not an excerpt from the book.",
    sections: [
      {
        title: "The promise of durability",
        text: "A service can acknowledge a write before that write reaches durable storage. This reduces response time, but a crash in that gap can lose an acknowledged update. The key claim is that an acknowledgement should describe a specific durability promise, rather than merely indicate that a request arrived.",
      },
      {
        title: "A log before the data",
        text: "A write-ahead log records a change before the data structure is updated. After a crash, replaying the log can restore changes whose effects were only partly applied. This reasoning assumes the log itself is durable and ordered. For example, a balance update recorded in the log can be replayed even if its data page was never flushed.",
      },
      {
        title: "Replication and its limits",
        text: "Replication copies data to another machine. It protects against a machine failure only when an appropriate replica has received the update. An asynchronous copy may lag behind the acknowledged write. A second copy therefore improves availability without automatically establishing the durability promise the user expects.",
      },
      {
        title: "Making the trade-off explicit",
        text: "Waiting for durable storage increases write latency. Waiting for another machine adds a network dependency. A useful design states which failures it tolerates, when it acknowledges a write, and what recovery will do. The decision depends on the cost of losing data and the time users can afford to wait.",
      },
    ],
    concepts: [
      {
        name: "Durability",
        explanation:
          "An acknowledged change survives the failures promised by the system.",
      },
      {
        name: "Write-ahead log",
        explanation:
          "A durable ordered record written before changes are applied.",
      },
      {
        name: "Recovery",
        explanation:
          "Restoring valid state after a failure, often by replaying recorded changes.",
      },
      {
        name: "Write latency",
        explanation:
          "The time a client waits before its write is acknowledged.",
      },
    ],
    relations: ["enables", "supports", "trades off with"],
    scenario:
      "A hospital records medication orders. A new requirement says an acknowledged order must survive loss of one server. The current service acknowledges writes held only in memory and copies them asynchronously. Propose a change, explain its latency cost, and name a failure your design still cannot tolerate.",
  },
  {
    id: "os",
    title: "Operating Systems: Three Easy Pieces",
    author: "Remzi & Andrea Arpaci-Dusseau · companion exercise",
    topic: "Operating systems",
    color: "var(--secondary)",
    intro:
      "How can many programs share a processor? This original practice note explores scheduling decisions and their costs.",
    sections: [
      {
        title: "Sharing a processor",
        text: "A scheduler chooses which runnable process uses the CPU. Giving every process a turn can improve responsiveness, but the choice of turn length affects overhead and waiting time. Scheduling is a policy decision under limited resources.",
      },
      {
        title: "The cost of switching",
        text: "A context switch saves one process state and restores another. These operations consume time that is not spent doing application work. The argument assumes there is useful work ready to run. For example, reducing a time slice from ten milliseconds to one millisecond makes switching costs a larger fraction of execution.",
      },
      {
        title: "Fairness is a policy",
        text: "Equal CPU time does not imply equal user experience. An interactive editor benefits from short waits while a batch computation may prefer throughput. Priority can reduce latency for one process while increasing another process's wait.",
      },
      {
        title: "Choosing a policy",
        text: "A useful policy names its objective: response time, throughput, or fairness. A workload can change, so measuring only average performance may conceal starvation. Constraints determine which scheduling trade-offs are acceptable.",
      },
    ],
    concepts: [
      {
        name: "Scheduling",
        explanation: "Choosing the next runnable process under a policy.",
      },
      {
        name: "Context switch",
        explanation:
          "Saving and restoring execution state when changing processes.",
      },
      {
        name: "Responsiveness",
        explanation: "How quickly a system reacts to interactive work.",
      },
      {
        name: "Switch overhead",
        explanation:
          "CPU time spent switching rather than doing application work.",
      },
    ],
    relations: ["requires", "improves", "trades off with"],
    scenario:
      "A workstation now runs both interactive medical dashboards and long simulations. A shorter time slice improved responsiveness but reduced completed simulations per hour. Propose a scheduling policy, explain the mechanism, and identify a workload that could break your policy.",
  },
  {
    id: "distributed",
    title: "When a network stops cooperating",
    author: "Mnemosyne field notes · original article",
    topic: "Distributed systems",
    color: "var(--secondary)",
    intro:
      "A timeout tells us that a response did not arrive. It does not tell us whether the remote work happened. Explore how retries interact with uncertainty.",
    sections: [
      {
        title: "The uncertain timeout",
        text: "A client can time out even after a server commits a request. A missing response is therefore not proof that the operation failed. The client must reason about an unknown outcome.",
      },
      {
        title: "Retrying safely",
        text: "A retry sends the operation again. If the operation creates a payment, a duplicate request may create a second payment. An idempotency key lets the service associate repeated requests with the same intended operation. This assumes that the key and the operation result are stored consistently.",
      },
      {
        title: "Remembering intent",
        text: "The server stores a result for the operation key. When a repeated key arrives, it returns that result instead of performing the action again. For example, a repeated checkout request can receive the original payment receipt.",
      },
      {
        title: "Boundaries matter",
        text: "Keeping operation keys forever has a storage cost. Expiring them creates a window after which a delayed retry might execute again. A safe retry policy must name that window and the assumptions about client behavior.",
      },
    ],
    concepts: [
      {
        name: "Timeout",
        explanation:
          "A missing response within a chosen time window, not proof of failure.",
      },
      {
        name: "Retry",
        explanation: "Repeating a request whose outcome may be uncertain.",
      },
      {
        name: "Idempotency key",
        explanation:
          "An identifier that makes repeated requests represent the same intended action.",
      },
      {
        name: "Duplicate effect",
        explanation:
          "A repeated action caused by treating a retry as a new intent.",
      },
    ],
    relations: ["can trigger", "is guarded by", "prevents"],
    scenario:
      "An offline point-of-sale terminal resends a payment three days later, but your service expires idempotency keys after one day. Predict the failure, propose a policy change, and explain the storage or availability trade-off.",
  },
  {
    id: "indexes",
    title: "Database indexes: the cost of finding things",
    author: "Mnemosyne workshop · original tutorial",
    topic: "Databases",
    color: "var(--secondary)",
    intro:
      "An index is an extra path to the same information. Understand why faster reads are purchased with space and maintenance work.",
    sections: [
      {
        title: "Finding a row",
        text: "Without an appropriate index, a query may inspect every row. An index arranges keys so a query can narrow its search. The improvement depends on whether the query can use that arrangement.",
      },
      {
        title: "Paying for the shortcut",
        text: "Every relevant write must maintain the index as well as the table. Faster reads therefore introduce write amplification and storage cost. This assumes the index remains consistent with the base data. For example, updating an indexed address may modify both a table row and an index entry.",
      },
      {
        title: "Selectivity matters",
        text: "An index on a value shared by nearly every row may still require reading much of the table. A query planner may choose a scan instead. The existence of an index does not guarantee that using it is cheaper.",
      },
      {
        title: "Designing for a workload",
        text: "Index choices should reflect frequent queries and write patterns. Removing an unused index can improve write throughput. Measuring a single fast query is not enough to establish that the overall workload benefits.",
      },
    ],
    concepts: [
      {
        name: "Index",
        explanation:
          "An additional key arrangement used to narrow a data search.",
      },
      {
        name: "Selectivity",
        explanation: "How much a condition narrows the set of candidate rows.",
      },
      {
        name: "Write amplification",
        explanation: "Extra maintenance work needed for each logical write.",
      },
      {
        name: "Query plan",
        explanation: "The chosen strategy for obtaining a query's result.",
      },
    ],
    relations: ["benefits from", "increases", "informs"],
    scenario:
      "A telemetry service receives a million writes each minute. An engineer adds an index on a status value shared by 95% of rows. Writes slow down while the common status query barely improves. Explain both outcomes and propose a workload-aware alternative.",
  },
];
export function referenceGraph(doc: Document): Graph {
  const relationships: Record<string, [number, number, string][]> = {
    ddia: [
      [1, 0, "supports"],
      [1, 2, "enables"],
      [0, 3, "trades off with"],
    ],
    os: [
      [0, 1, "requires"],
      [0, 2, "influences"],
      [1, 3, "incurs"],
    ],
    distributed: [
      [0, 1, "can trigger"],
      [1, 2, "is guarded by"],
      [2, 3, "prevents"],
    ],
    indexes: [
      [0, 1, "benefits from"],
      [0, 2, "increases"],
      [1, 3, "informs"],
    ],
  };
  return {
    nodes: doc.concepts.map((concept, index) => ({
      id: String(index),
      label: concept.name,
      x: [140, 430, 150, 440][index]!,
      y: [100, 110, 300, 310][index]!,
    })),
    edges: (relationships[doc.id] ?? []).map(([from, to, label], index) => ({
      id: `ref-${index}`,
      from: String(from),
      to: String(to),
      label,
    })),
  };
}
export const blankGraph = (): Graph => ({ nodes: [], edges: [] });
export const fields = [
  [
    "Your prediction",
    "Questions this should answer",
    "Expected concepts and relationships",
    "What you already know",
  ],
  [],
  [
    "One paragraph",
    "Exactly three sentences",
    "Three essential concepts",
    "The mental model",
    "What can you safely discard?",
  ],
  [
    "A familiar analogy",
    "Where the analogy breaks",
    "Memory palace: place an idea in a familiar location (optional)",
  ],
  ["Reconstruct the central argument, reasoning, and supporting evidence"],
  [
    "Your proposed solution",
    "Why it works",
    "Trade-offs and failure conditions",
  ],
];
export type Annotation = { text: string; kind: string; section: number };
export type Program = {
  stage: number;
  section: number;
  answers: Record<string, string>;
  completed: number[];
  feedback: Record<string, string>;
  annotations: Annotation[];
  graph: Graph;
  reconstruction: Graph;
  comparison?: Comparison;
};
export type Comparison = {
  correct: string[];
  missing: string[];
  extra: string[];
  correctEdges: string[];
  incorrectEdges: string[];
  missingEdges: string[];
  score: number;
};
export function compareGraph(learner: Graph, reference: Graph): Comparison {
  const normalize = (text: string) =>
    text
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  const ref = reference.nodes.map((node) => normalize(node.label));
  const recalled = learner.nodes.map((node) => normalize(node.label));
  const correct = reference.nodes
    .filter((node) => recalled.includes(normalize(node.label)))
    .map((node) => node.label);
  const missing = reference.nodes
    .filter((node) => !recalled.includes(normalize(node.label)))
    .map((node) => node.label);
  const extra = learner.nodes
    .filter((node) => !ref.includes(normalize(node.label)))
    .map((node) => node.label);
  const signature = (edge: Edge, graph: Graph) =>
    [
      graph.nodes.find((node) => node.id === edge.from)?.label,
      edge.label,
      graph.nodes.find((node) => node.id === edge.to)?.label,
    ]
      .map((text) => normalize(text || ""))
      .join("|");
  const refEdges = reference.edges.map((edge) => signature(edge, reference));
  const mine = learner.edges.map((edge) => signature(edge, learner));
  const describe = (edge: Edge, graph: Graph) =>
    `${graph.nodes.find((node) => node.id === edge.from)?.label} → ${edge.label} → ${graph.nodes.find((node) => node.id === edge.to)?.label}`;
  const correctEdges = reference.edges
    .filter((edge) => mine.includes(signature(edge, reference)))
    .map((edge) => describe(edge, reference));
  const incorrectEdges = learner.edges
    .filter((edge) => !refEdges.includes(signature(edge, learner)))
    .map((edge) => describe(edge, learner));
  return {
    correct,
    missing,
    extra,
    correctEdges,
    incorrectEdges,
    missingEdges: reference.edges
      .filter((edge) => !mine.includes(signature(edge, reference)))
      .map((edge) => describe(edge, reference)),
    score: Math.round(
      (100 * (correct.length + correctEdges.length)) /
        (reference.nodes.length +
          reference.edges.length +
          extra.length +
          incorrectEdges.length),
    ),
  };
}
