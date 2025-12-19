export default function LessonProgress({ steps = [], current = 1 }) {
  return (
    <div className="lessonProgress" aria-label="진행 단계">
      {steps.map((label, i) => {
        const stepNum = i + 1
        const active = current === stepNum
        const done = current > stepNum
        return (
          <div
            key={label}
            className={`lpStep ${active ? "active" : ""} ${done ? "done" : ""}`}
            aria-current={active ? "step" : undefined}
          >
            {label}
          </div>
        )
      })}
    </div>
  )
}

