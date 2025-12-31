import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { userStatsClient } from '../../lib/rpc'

// Test UUIDs for the sandbox - these won't exist in the database but will test connectivity
const TEST_USER_ID_1 = '00000000-0000-0000-0000-000000000001'
const TEST_USER_ID_2 = '00000000-0000-0000-0000-000000000002'

export const Route = createFileRoute('/demo/sandbox')({
  loader: async () => {
    try {
      console.log('Sandbox loader running...')
      const response = await userStatsClient.getUserStats({
        userId: TEST_USER_ID_1,
      })
      console.log('Sandbox loader success:', response)
      return { stats: response.stats, error: null }
    } catch (err) {
      if (
        String(err).includes('not_found') ||
        String(err).includes('not found')
      ) {
        console.warn(
          'Sandbox loader: User stats not found (expected for test ID)',
        )
        return { stats: null, error: 'User stats not found (expected)' }
      }
      console.error('Sandbox loader error:', err)
      return { stats: null, error: String(err) }
    }
  },
  component: Sandbox,
})

function Sandbox() {
  const { stats: initialStats, error: initialError } = Route.useLoaderData()
  const [clientStats, setClientStats] = useState<any>(null)
  const [clientError, setClientError] = useState<string | null>(null)

  const fetchClientSide = async () => {
    alert('clicked!')
    try {
      setClientError(null)
      setClientStats(null)
      console.log('fetching client side...')
      const response = await userStatsClient.getUserStats({
        userId: TEST_USER_ID_2,
      })
      console.log('response:', response)
      setClientStats(response.stats)
    } catch (err) {
      console.error('error:', err)
      setClientError(String(err))
    }
  }

  return (
    <div className="p-8 space-y-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">RPC Connectivity Sandbox</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* SSR Section */}
        <div className="p-6 border rounded-xl shadow-sm bg-card text-card-foreground">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-3 w-3 rounded-full bg-green-500" />
            <h2 className="text-xl font-semibold">SSR Context</h2>
            <span className="text-xs bg-muted px-2 py-1 rounded">
              Server-side
            </span>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Data fetched during initial page load via <code>loader</code>.
            Executed on Node.js server.
          </p>

          {initialError ? (
            <div className="p-4 bg-red-50 text-red-900 rounded-lg text-sm border border-red-200">
              <strong>Error:</strong> {initialError}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                Result for {TEST_USER_ID_1}
              </div>
              <pre className="bg-muted/50 p-4 rounded-lg overflow-auto text-xs font-mono border">
                {JSON.stringify(initialStats, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Client Section */}
        <div className="p-6 border rounded-xl shadow-sm bg-card text-card-foreground">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-3 w-3 rounded-full bg-blue-500" />
            <h2 className="text-xl font-semibold">Client Context</h2>
            <span className="text-xs bg-muted px-2 py-1 rounded">Browser</span>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Data fetched on demand via user interaction. Executed in Browser.
          </p>

          <button
            onClick={fetchClientSide}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg font-medium transition-colors mb-4"
          >
            Fetch Stats (Client)
          </button>

          {clientError && (
            <div className="p-4 bg-red-50 text-red-900 rounded-lg text-sm border border-red-200 mb-2">
              <strong>Error:</strong> {clientError}
            </div>
          )}

          {clientStats && (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                Result for {TEST_USER_ID_2}
              </div>
              <pre className="bg-muted/50 p-4 rounded-lg overflow-auto text-xs font-mono border">
                {JSON.stringify(clientStats, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
