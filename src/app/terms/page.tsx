'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Shield, ArrowLeft, FileText } from 'lucide-react'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">GeoV8</h1>
              <p className="text-xs text-zinc-500">License Manager</p>
            </div>
          </Link>
          <Link href="/support">
            <Button variant="ghost" className="text-zinc-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Support
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Terms of Service</h1>
              <p className="text-zinc-500">Last updated: January 2024</p>
            </div>
          </div>

          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-8 prose prose-invert prose-zinc max-w-none">
              <section className="mb-8">
                <h2 className="text-xl font-semibold text-white mb-4">1. Acceptance of Terms</h2>
                <p className="text-zinc-400">
                  By accessing and using GeoV8 License Manager (&quot;the Service&quot;), you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-white mb-4">2. Description of Service</h2>
                <p className="text-zinc-400">
                  GeoV8 License Manager is a software licensing platform that allows users to purchase credits and create software licenses. The Service includes:
                </p>
                <ul className="list-disc list-inside text-zinc-400 mt-2 space-y-1">
                  <li>Purchase of credits using cryptocurrency</li>
                  <li>Creation and management of software licenses</li>
                  <li>License verification and monitoring</li>
                  <li>Team management features</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-white mb-4">3. User Accounts</h2>
                <p className="text-zinc-400">
                  You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must notify us immediately of any unauthorized use.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-white mb-4">4. Payments and Credits</h2>
                <p className="text-zinc-400 mb-2">
                  All payments are processed through secure cryptocurrency payment gateways. By making a purchase, you agree that:
                </p>
                <ul className="list-disc list-inside text-zinc-400 space-y-1">
                  <li>Credits are non-refundable once purchased</li>
                  <li>Credits do not expire</li>
                  <li>Prices are subject to change without notice</li>
                  <li>You are responsible for any applicable taxes</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-white mb-4">5. Prohibited Uses</h2>
                <p className="text-zinc-400 mb-2">
                  You agree not to use the Service for:
                </p>
                <ul className="list-disc list-inside text-zinc-400 space-y-1">
                  <li>Any illegal or unauthorized purpose</li>
                  <li>Distributing malware or harmful software</li>
                  <li>Violating any laws or regulations</li>
                  <li>Infringing on intellectual property rights</li>
                  <li>Attempting to bypass security measures</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-white mb-4">6. Limitation of Liability</h2>
                <p className="text-zinc-400">
                  The Service is provided &quot;as is&quot; without warranties of any kind. We shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-white mb-4">7. Termination</h2>
                <p className="text-zinc-400">
                  We reserve the right to suspend or terminate your access to the Service at any time for violation of these terms or for any other reason at our discretion.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-white mb-4">8. Changes to Terms</h2>
                <p className="text-zinc-400">
                  We may modify these terms at any time. Continued use of the Service after changes constitutes acceptance of the modified terms.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-4">9. Contact</h2>
                <p className="text-zinc-400">
                  For questions about these Terms of Service, please contact us at{' '}
                  <a href="mailto:support@blackgoatt.com" className="text-emerald-400 hover:underline">
                    support@blackgoatt.com
                  </a>
                </p>
              </section>
            </CardContent>
          </Card>

          {/* Footer Links */}
          <div className="mt-8 pt-8 border-t border-zinc-800 text-center">
            <div className="flex items-center justify-center gap-6 text-sm text-zinc-500">
              <Link href="/terms" className="hover:text-white transition-colors text-emerald-400">
                Terms of Service
              </Link>
              <span>•</span>
              <Link href="/privacy" className="hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <span>•</span>
              <Link href="/support" className="hover:text-white transition-colors">
                Support
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
