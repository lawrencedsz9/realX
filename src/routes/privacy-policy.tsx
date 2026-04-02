import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/privacy-policy')({
  component: () => <iframe src="/privacy-policy/index.html" className="w-full h-screen border-none" title="privacy-policy" />
})
