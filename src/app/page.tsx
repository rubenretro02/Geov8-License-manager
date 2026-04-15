import { LandingPage } from '@/components/landing/landing-page'

export default function Home() {
  // Landing page is always public, no auth check needed
  return <LandingPage />
}
