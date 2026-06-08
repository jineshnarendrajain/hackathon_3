interface InsightCardProps {
  insight: string
}

export default function InsightCard({ insight }: InsightCardProps) {
  return (
    <div className="flex gap-3 border-b border-livably-border py-3 last:border-b-0">
      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-livably-green" />
      <p className="m-0 text-[13px] leading-6 text-livably-text">{insight}</p>
    </div>
  )
}
