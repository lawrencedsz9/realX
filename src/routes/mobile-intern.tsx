import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/mobile-intern')({
  component: () => <iframe src="/mobile-intern/index.html" className="w-full h-screen border-none" title="mobile-intern" />
})
