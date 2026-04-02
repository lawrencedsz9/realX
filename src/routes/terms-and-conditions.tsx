import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/terms-and-conditions')({
  component: () => <iframe src="/terms-and-conditions/index.html" className="w-full h-screen border-none" title="terms-and-conditions" />
})
