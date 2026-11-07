"use client";
import { useState } from "react";
import { Sparkles, ArrowUp, Lightbulb } from "lucide-react";
import { skills } from "./data";
export function Coach({ stage }: { stage: number }) {
  const skill = skills[stage]!;
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([
    { role: "coach", text: skill.question },
  ]);
  const [text, setText] = useState("");
  const [hint, setHint] = useState(0);
  return (
    <aside className="s-coach">
      <header>
        <span className="s-coach-symbol">
          <Sparkles size={17} />
        </span>
        <div>
          <strong>Cognitive coach</strong>
          <small>{skill.mode}</small>
        </div>
        <i />
      </header>
      <div className="s-chat" aria-live="polite">
        {messages.map((message, index) => (
          <div key={index} className={`s-message ${message.role}`}>
            <span>{message.role === "coach" ? "MNEMOSYNE" : "YOU"}</span>
            <p>{message.text}</p>
          </div>
        ))}
      </div>
      <button
        className="s-hint"
        onClick={() => {
          setHint((h) => h + 1);
          setMessages((m) => [
            ...m,
            {
              role: "coach",
              text:
                hint === 0
                  ? skill.hint
                  : hint === 1
                    ? "Choose one concrete example from your own experience. What would change if its main constraint were removed?"
                    : "Pause and write one sentence beginning ‘This works because…’. Which part of that sentence needs evidence?",
            },
          ]);
        }}
      >
        <Lightbulb size={14} />{" "}
        {hint ? "Another prompt" : "Give me a small hint"}
      </button>
      <form
        className="s-coach-input"
        onSubmit={(event) => {
          event.preventDefault();
          if (!text.trim()) return;
          const reply =
            text.trim().split(/\s+/).length < 12
              ? "That is a starting point. Can you name a specific mechanism and explain why it produces the outcome you expect?"
              : /because|therefore|if|when/i.test(text)
                ? "You have named a causal link. What observation would show that this explanation is wrong?"
                : "You described what happens. What connects the cause to the outcome, and under which assumption?";
          setMessages((m) => [
            ...m,
            { role: "learner", text },
            { role: "coach", text: reply },
          ]);
          setText("");
        }}
      >
        <textarea
          aria-label="Message the cognitive coach"
          placeholder="Think out loud…"
          rows={2}
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        <button
          className="s-button"
          aria-label="Send coach message"
          disabled={!text.trim()}
        >
          <ArrowUp size={18} /> Send
        </button>
      </form>
      <p className="s-coach-disclosure">Scripted coach · No model calls</p>
    </aside>
  );
}
