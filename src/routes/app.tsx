import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app')({
  component: () => <iframe src="/app/index.html" className="w-full h-screen border-none" title="app" />
})
