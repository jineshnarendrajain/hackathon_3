interface ScoreGaugeProps {
  score: number
  winner?: boolean
}

export default function ScoreGauge({ score, winner = false }: ScoreGaugeProps) {
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = winner ? "#639922" : "#9ca3af"

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-36 w-36">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 144 144" aria-hidden="true">
          <circle
            cx="72"
            cy="72"
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="10"
          />
          <circle
            cx="72"
            cy="72"
            r={radius}
            fill="none"
            stroke={color}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            strokeWidth="10"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-[28px] font-semibold text-livably-text">
          {score}
        </div>
      </div>
      <div className="mt-2 text-[13px] text-livably-muted">Outdoor Comfort Score</div>
    </div>
  )
}
