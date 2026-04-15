'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Shield, ArrowLeft, Lock } from 'lucide-react'

export default function PrivacyPage() {
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
              <Lock className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Privacy Policy</h1>
              <p className="text-zinc-500">Last updated: January 2024</p>
            </div>
          </div>

          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-8 prose prose-invert prose-zinc max-w-none">
              <section className="mb-8">
                <h2 className="text-xl font-semibold text-white mb-4">1. Information We Collect</h2>
                <p className="text-zinc-400 mb-2">
                  We collect information that you provide directly to us:
                </p>
                <ul className="list-disc list-inside text-zinc-400 space-y-1">
                  <li>Account information (email, username)</li>
                  <li>Payment transaction data (order ID, amounts)</li>
                  <li>License information you create</li>
                  <li>Communication data when you contact support</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-white mb-4">2. How We Use Your Information</h2>
                <p className="text-zinc-400 mb-2">
                  We use the collected information to:
                </p>
                <ul className="list-disc list-inside text-zinc-400 space-y-1">
                  <li>Provide, maintain, and improve the Service</li>
                  <li>Process transactions and send related information</li>
                  <li>Send technical notices and support messages</li>
                  <li>Respond to your comments and questions</li>
                  <li>Detect and prevent fraud and abuse</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-white mb-4">3. Information Sharing</h2>
                <p className="text-zinc-400">
                  We do not sell, trade, or otherwise transfer your personal information to third parties except:
                </p>
                <ul className="list-disc list-inside text-zinc-400 mt-2 space-y-1">
                  <li>To payment processors to complete transactions</li>
                  <li>To comply with legal obligations</li>
                  <li>To protect our rights and safety</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-white mb-4">4. Data Security</h2>
                <p className="text-zinc-400">
                  We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. This includes encryption, secure servers, and regular security audits.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-white mb-4">5. Cookies and Tracking</h2>
                <p className="text-zinc-400">
                  We use cookies and similar technologies to maintain your session, remember your preferences, and improve your experience. You can control cookies through your browser settings.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-white mb-4">6. Data Retention</h2>
                <p className="text-zinc-400">
                  We retain your information for as long as your account is active or as needed to provide services. You may request deletion of your account by contacting support.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-white mb-4">7. Your Rights</h2>
                <p className="text-zinc-400 mb-2">
                  You have the right to:
                </p>
                <ul className="list-disc list-inside text-zinc-400 space-y-1">
                  <li>Access your personal information</li>
                  <li>Correct inaccurate data</li>
                  <li>Request deletion of your data</li>
                  <li>Object to processing of your data</li>
                  <li>Export your data in a portable format</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-white mb-4">8. Children&apos;s Privacy</h2>
                <p className="text-zinc-400">
                  The Service is not intended for users under 18 years of age. We do not knowingly collect personal information from children.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-white mb-4">9. Changes to This Policy</h2>
                <p className="text-zinc-400">
                  We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the &quot;Last updated&quot; date.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-4">10. Contact Us</h2>
                <p className="text-zinc-400">
                  If you have any questions about this Privacy Policy, please contact us at{' '}
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
              <Link href="/terms" className="hover:text-white transition-colors">
                Terms of Service
              </Link>
              <span>•</span>
              <Link href="/privacy" className="hover:text-white transition-colors text-emerald-400">
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
