import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createRoot } from "react-dom/client";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Menu,
  Target,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useLessonAudio } from "../../shared/useLessonAudio";
import { lesson } from "./lesson-data";
import "./styles.css";

const illustrations = import.meta.glob("./assets/illustrations/*.png", {
  eager: true,
  query: "?url",
  import: "default",
});

const imageFor = (name) => illustrations[`./assets/illustrations/${name}.png`];

const kickerFor = (screen) => screen.id === "hook"
  ? `Lesson ${lesson.number} · ${lesson.title}`
  : screen.kicker.replace(/^Screen\s+\d+\s+[—-]\s+/, "");

function FocusModal({ content, onClose, onRead }) {
  useEffect(() => {
    const closeOnEscape = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return createPortal(
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="focus-modal" role="dialog" aria-modal="true" aria-labelledby="focus-title">
        <button className="modal-close" type="button" onClick={onClose} aria-label="Close">
          <X />
        </button>
        <img src={imageFor(content.image)} alt="" />
        <h3 id="focus-title">{content.title}</h3>
        <p>{content.text}</p>
        {content.bullets && (
          <ul>
            {content.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
          </ul>
        )}
        <button className="modal-action" type="button" onClick={() => { onRead(); onClose(); }}>
          Mark as read <Check />
        </button>
      </section>
    </div>,
    document.body,
  );
}

function KnowledgeCheck({ quiz, review = false, onClose, onComplete }) {
  const [picked, setPicked] = useState(review ? quiz.correct : null);
  const correct = picked === quiz.correct;

  useEffect(() => {
    const closeOnEscape = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return createPortal(
    <div className="modal-backdrop knowledge-backdrop">
      <section className="knowledge-modal" role="dialog" aria-modal="true" aria-labelledby="quiz-title">
        <button className="modal-close" type="button" onClick={onClose} aria-label="Close">
          <X />
        </button>
        <p className="quiz-label"><Target /> MICRO KNOWLEDGE CHECK</p>
        <h3 id="quiz-title">{quiz.question}</h3>
        <div className="answers">
          {quiz.answers.map((answer, index) => (
            <button
              type="button"
              key={answer}
              disabled={review}
              className={picked === index ? (correct ? "correct" : "wrong") : ""}
              onClick={() => setPicked(index)}
            >
              <span>{String.fromCharCode(65 + index)}</span>
              {answer}
            </button>
          ))}
        </div>
        {picked !== null && (
          <div className={`feedback ${correct ? "good" : "bad"}`}>
            <p>{correct ? quiz.correctFeedback : quiz.incorrectFeedback}</p>
            {!correct && <small>Choose another answer to try again.</small>}
          </div>
        )}
        {correct && !review && (
          <button className="modal-action" type="button" onClick={() => { onComplete(); onClose(); }}>
            Finish check <ArrowRight />
          </button>
        )}
        {review && (
          <button className="modal-action" type="button" onClick={onClose}>
            Done <Check />
          </button>
        )}
      </section>
    </div>,
    document.body,
  );
}

function CardGridScreen({ screen, visited, complete, onVisit, onQuiz }) {
  const [active, setActive] = useState(null);
  const allRead = visited.size === screen.items.length;
  const heading = screen.headline || screen.heading;
  const supportingCopy = screen.headline
    && screen.heading !== screen.headline
    && !screen.intro?.startsWith(screen.heading)
    ? screen.heading
    : null;
  const instruction = screen.intro?.startsWith(screen.headline)
    ? screen.intro.slice(screen.headline.length).trim()
    : screen.intro;

  return (
    <div className="grid-page">
      <div className="grid-page-header">
        <div>
          <p className="screen-kicker">{kickerFor(screen)}</p>
          <h1>{heading}</h1>
          {supportingCopy && <p className="lead">{supportingCopy}</p>}
          {instruction && <p className="lead">{instruction}</p>}
        </div>
        <img className="grid-page-art" src={imageFor(screen.image)} alt="" />
      </div>
      <div className={`card-grid ${screen.items.length === 4 ? "two-by-two" : "three"}`}>
          {screen.items.map((item, index) => {
            const isRead = visited.has(index);
            return (
              <button className={`click-card ${isRead ? "read" : ""}`} type="button" key={item.title} onClick={() => setActive(index)}>
                <span className="card-number">{String(index + 1).padStart(2, "0")}</span>
                <strong>{item.title}</strong>
                {isRead ? <Check className="card-arrow check" /> : <ArrowRight className="card-arrow" />}
              </button>
            );
          })}
      </div>
      {allRead && screen.after && (
        <div className="revealed-note">
          {screen.after.label && <strong>{screen.after.label}</strong>}
          <p>{screen.after.text}</p>
        </div>
      )}
      {screen.quiz && (
        <div className={`knowledge-actions ${complete ? "completed" : ""}`}>
          {complete ? (
            <>
              <div className="knowledge-complete">
                <span><Check /></span>
                <div><strong>Knowledge check completed</strong><small>You can review your answer or try again.</small></div>
              </div>
              <div className="knowledge-action-buttons">
                <button className="knowledge-cta" type="button" onClick={() => onQuiz("review")}><Target /> Review answers</button>
                <button className="knowledge-retake" type="button" onClick={() => onQuiz("attempt")}>Retake</button>
              </div>
            </>
          ) : (
            <button className="knowledge-cta" type="button" disabled={!allRead} onClick={() => onQuiz("attempt")}>
              <Target /> {allRead ? "Start knowledge check" : "Explore all items"}
            </button>
          )}
        </div>
      )}
      {active !== null && (
        <FocusModal
          content={{ ...screen.items[active], image: screen.items[active].image || screen.image }}
          onClose={() => setActive(null)}
          onRead={() => onVisit(active)}
        />
      )}
    </div>
  );
}

function RevealScreen({ screen, complete, onReveal }) {
  const heading = screen.headline || screen.heading;
  const supportingCopy = screen.lead || (screen.headline && screen.heading !== screen.headline ? screen.heading : null);

  return (
    <div className="content-grid">
      <div className="content-copy">
        <p className="screen-kicker">{kickerFor(screen)}</p>
        <h1>{heading}</h1>
        {supportingCopy && <p className="lead">{supportingCopy}</p>}
        <button className="primary-cta" type="button" disabled={complete} onClick={onReveal}>
          {complete ? "Revealed" : (screen.cta || "Reveal")} <ArrowRight />
        </button>
      </div>
      <img className="lesson-art" src={imageFor(screen.image)} alt="" />
    </div>
  );
}

function CompletionModal({ onClose }) {
  return createPortal(
    <div className="modal-backdrop">
      <section className="completion-modal" role="dialog" aria-modal="true" aria-labelledby="complete-title">
        <div className="completion-icon"><Check /></div>
        <p>LESSON COMPLETE</p>
        <h3 id="complete-title">Lesson {lesson.number}</h3>
        <span>{lesson.title}</span>
        <button className="modal-action" type="button" onClick={onClose}>Done <Check /></button>
      </section>
    </div>,
    document.body,
  );
}

function App() {
  const [screenIndex, setScreenIndex] = useState(0);
  const [completed, setCompleted] = useState(() => lesson.screens.map(() => false));
  const [visited, setVisited] = useState({});
  const [focus, setFocus] = useState(null);
  const [quizOpen, setQuizOpen] = useState(false);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [lessonComplete, setLessonComplete] = useState(false);
  const footerRef = useRef(null);
  const screen = lesson.screens[screenIndex];
  const currentVisited = useMemo(() => new Set(visited[screen.id] || []), [visited, screen.id]);

  useLessonAudio(soundOn);

  const markComplete = (index = screenIndex) => {
    setCompleted((state) => state.map((value, itemIndex) => itemIndex === index ? true : value));
  };

  const visitItem = (itemIndex) => {
    setVisited((state) => {
      const next = new Set(state[screen.id] || []);
      next.add(itemIndex);
      return { ...state, [screen.id]: [...next] };
    });
  };

  useEffect(() => {
    if (screen.type === "accordion" && !screen.quiz && currentVisited.size === screen.items.length) {
      markComplete();
    }
  }, [currentVisited.size, screen.id]);

  useEffect(() => {
    if (completed[screenIndex]) footerRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [completed, screenIndex]);

  const goTo = (index) => {
    if (index < 0 || index >= lesson.screens.length) return;
    if (index > screenIndex && !completed[screenIndex]) return;
    setScreenIndex(index);
    setOutlineOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const next = () => {
    if (!completed[screenIndex]) return;
    if (screenIndex === lesson.screens.length - 1) setLessonComplete(true);
    else goTo(screenIndex + 1);
  };

  const progress = Math.round((completed.filter(Boolean).length / lesson.screens.length) * 100);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="course-select">
          <span className="crumb">Module 7</span>
          <span className="crumb-sep">/</span>
          <span className="crumb-current">Lesson {lesson.number} — {lesson.title}</span>
        </div>
        <div className="module-progress" aria-label="Course progress">
          <div>{Array.from({ length: 10 }, (_, index) => <span key={index} className={`progress-dot ${index < 5 ? "done" : index === 5 ? "active" : ""}`}>{index < 5 ? <Check /> : index === 5 ? <span /> : null}</span>)}</div>
        </div>
        <div className="top-actions">
          <button className="ghost-button" type="button" onClick={() => setSoundOn((value) => !value)}>{soundOn ? <Volume2 /> : <VolumeX />}<span>Sound {soundOn ? "on" : "off"}</span></button>
          <button className="ghost-button" type="button"><X /><span>Quit</span></button>
        </div>
      </header>

      <main className="workspace">
        <div className="lesson-stage">
          <div className="outline">
            <button className="menu-button" type="button" onClick={() => setOutlineOpen((value) => !value)} aria-label="Toggle lesson outline"><Menu /></button>
            {outlineOpen && (
              <aside className="outline-panel">
                <div className="outline-summary"><strong>Lesson {lesson.number}</strong><span>{progress}% explored</span><i><b style={{ width: `${progress}%` }} /></i></div>
                <div className="lesson-list">
                  {lesson.screens.map((entry, index) => (
                    <button type="button" key={entry.id} className={index === screenIndex ? "current" : ""} disabled={index > 0 && !completed[index - 1]} onClick={() => goTo(index)}>
                      <span>{completed[index] ? <Check /> : index + 1}</span><strong>{entry.tab}</strong>
                    </button>
                  ))}
                </div>
              </aside>
            )}
          </div>

          <article className="lesson-card">
            <nav className="section-tabs" aria-label="Lesson sections">
              <p>SECTION {screenIndex + 1} OF {lesson.screens.length}</p>
              <div>{lesson.screens.map((entry, index) => (
                  <button type="button" key={entry.id} className={`${index === screenIndex ? "active" : ""} ${completed[index] ? "done" : ""}`} disabled={index > 0 && !completed[index - 1]} onClick={() => goTo(index)}>
                    {completed[index] && <Check />}<span>{entry.tab}</span>
                  </button>
                ))}</div>
            </nav>

            <section className="lesson-content">
              {screen.type === "accordion" ? (
                <CardGridScreen screen={screen} visited={currentVisited} complete={completed[screenIndex]} onVisit={visitItem} onQuiz={setQuizOpen} />
              ) : (
                <RevealScreen screen={screen} complete={completed[screenIndex]} onReveal={() => setFocus(screen.reveal)} />
              )}
            </section>

            {completed[screenIndex] && <div className="interaction-status"><Check /> Section explored. Continue when you’re ready.</div>}
            <footer className="nav-footer" ref={footerRef}>
              <button className="secondary-button" type="button" disabled={screenIndex === 0} onClick={() => goTo(screenIndex - 1)}><ArrowLeft /> Previous</button>
              <button className={`primary-button ${completed[screenIndex] ? "unlocked" : ""}`} type="button" disabled={!completed[screenIndex]} onClick={next}>
                {screenIndex === lesson.screens.length - 1 ? "Complete lesson" : "Continue"} <ArrowRight />
              </button>
            </footer>
          </article>
        </div>
      </main>

      {focus && <FocusModal content={focus} onClose={() => setFocus(null)} onRead={() => { if (screen.quiz) setQuizOpen("attempt"); else markComplete(); }} />}
      {quizOpen && <KnowledgeCheck quiz={screen.quiz} review={quizOpen === "review"} onClose={() => setQuizOpen(false)} onComplete={() => markComplete()} />}
      {lessonComplete && <CompletionModal onClose={() => setLessonComplete(false)} />}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
