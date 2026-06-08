"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { analyzeListings } from "@/lib/api"

const messages = [
  "Running Infrared wind simulation...",
  "Calculating thermal comfort (UTCI)...",
  "Analyzing sunlight exposure...",
  "Generating livability scores...",
  "Comparing neighborhoods..."
]

export default function LoadingScreenPage() {
  const router = useRouter()
  const [messageIndex, setMessageIndex] = useState(0)
  const [error, setError] = useState("")

  useEffect(() => {
    const interval = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % messages.length)
    }, 3000)

    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function runAnalysis() {
      try {
        const rawIds = sessionStorage.getItem("livably_selected_ids")
        const ids = rawIds ? (JSON.parse(rawIds) as string[]) : []

        if (ids.length < 2 || ids.length > 3) {
          router.replace("/")
          return
        }

        const result = await analyzeListings(ids)

        if (cancelled) {
          return
        }

        sessionStorage.setItem("livably_result", JSON.stringify(result))
        router.replace("/results")
      } catch (error) {
        if (!cancelled) {
          setError(
            error instanceof Error
              ? error.message
              : "We could not complete the analysis. Please make sure the backend is running and try again."
          )
        }
      }
    }

    runAnalysis()

    return () => {
      cancelled = true
    }
  }, [router])

  return (
    <main className="flex min-h-screen min-w-[768px] items-center justify-center bg-white px-8">
      <section className="flex w-full max-w-[520px] flex-col items-center text-center">
        <div className="mb-10 text-xl font-semibold text-livably-green">Livably</div>

        {error ? (
          <>
            <h1 className="text-lg font-medium text-livably-text">Analysis paused</h1>
            <p className="mt-3 text-sm text-livably-muted">{error}</p>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="mt-8 h-11 rounded-md bg-livably-green px-6 text-sm font-medium text-white"
            >
              Try again
            </button>
          </>
        ) : (
          <>
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-livably-greenLight border-t-livably-green" />
            <h1 className="mt-8 text-lg font-medium text-livably-text">Analyzing environmental comfort...</h1>
            <p className="mt-3 min-h-6 text-sm text-livably-muted">{messages[messageIndex]}</p>
            <p className="mt-10 text-[13px] text-livably-muted">This can take several minutes - please wait</p>
          </>
        )}
      </section>
    </main>
  )
}
