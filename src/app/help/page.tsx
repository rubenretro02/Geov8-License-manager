'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Shield,
  HelpCircle,
  Search,
  BookOpen,
  Key,
  CreditCard,
  Settings,
  Bell,
  Users,
  Globe,
  Download,
  ArrowLeft,
  MessageCircle,
  Mail,
  FileText,
  ChevronRight,
  Zap,
  Lock,
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Smartphone,
  LayoutDashboard,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const FAQ_CATEGORIES = [
  {
    id: 'getting-started',
    icon: Zap,
    title: 'Getting Started',
    description: 'Learn the basics of GeoV8',
    questions: [
      {
        question: 'What is GeoV8 License Manager?',
        answer: 'GeoV8 License Manager is a comprehensive software licensing solution that helps you protect your applications with HWID binding, geolocation tracking, real-time alerts, and automated protection. It allows you to create, manage, and monitor software licenses for your users.'
      },
      {
        question: 'How do I create an account?',
        answer: 'Click the "Get Started" or "Register" button on the homepage. Fill in your username, email, and password. After registration, you can access your dashboard to start creating licenses.'
      },
      {
        question: 'Is there a free trial available?',
        answer: 'Yes! All new users receive 1 free trial license to test the system. This trial license includes all features so you can fully evaluate GeoV8 before purchasing credits.'
      },
      {
        question: 'What platforms does GeoV8 support?',
        answer: 'GeoV8 currently supports Windows applications. The license validation API can be integrated into any Windows application using our provided SDK and documentation.'
      },
    ]
  },
  {
    id: 'licenses',
    icon: Key,
    title: 'Licenses',
    description: 'Creating and managing licenses',
    questions: [
      {
        question: 'How do I create a license?',
        answer: 'Go to your Dashboard, click "Create License", fill in the required information (label, expiration date, country restrictions if any), and click Create. Each license costs 1 credit.'
      },
      {
        question: 'What is HWID binding?',
        answer: 'HWID (Hardware ID) binding links a license to a specific computer\'s unique hardware identifier. This prevents license sharing - once a license is activated on a device, it can only be used on that device.'
      },
      {
        question: 'Can I reset the HWID of a license?',
        answer: 'Yes, you can reset the HWID from the Dashboard. Select the license, click on the details/edit option, and use the "Reset HWID" function. This allows the license to be activated on a different device.'
      },
      {
        question: 'What license durations are available?',
        answer: 'You can create licenses with custom expiration dates or set them as "Permanent" (never expires). Common durations include 30 days, 90 days, 365 days, or lifetime access.'
      },
      {
        question: 'How do country restrictions work?',
        answer: 'When creating a license, you can specify allowed countries. The license will only work when activated from an IP address in those countries. Leave it empty for worldwide access.'
      },
      {
        question: 'Can I pause or disable a license?',
        answer: 'Yes, you can toggle the license status between "Active" and "Paused" from your Dashboard. Paused licenses will not validate until reactivated.'
      },
    ]
  },
  {
    id: 'payments',
    icon: CreditCard,
    title: 'Payments & Credits',
    description: 'Purchasing and using credits',
    questions: [
      {
        question: 'How do I purchase credits?',
        answer: 'Go to the Store page and select a credit package. We accept cryptocurrency payments through Cryptomus. After payment confirmation, credits are automatically added to your account.'
      },
      {
        question: 'What payment methods are accepted?',
        answer: 'We accept cryptocurrency payments including Bitcoin (BTC), Ethereum (ETH), Litecoin (LTC), USDT, and many other cryptocurrencies through our payment processor Cryptomus.'
      },
      {
        question: 'How long does payment confirmation take?',
        answer: 'Cryptocurrency payments are usually confirmed within 10-30 minutes depending on network congestion. Once confirmed, credits are instantly added to your account.'
      },
      {
        question: 'My payment is not confirmed yet, what should I do?',
        answer: 'Visit the Orders page and click "Refresh & Verify" to check the latest status. Most payments confirm within 30 minutes. If it\'s been longer, please contact support with your order ID.'
      },
      {
        question: 'Can I get a refund?',
        answer: 'Due to the nature of cryptocurrency payments and digital goods, we generally cannot process refunds. Please contact support if you have specific concerns about your purchase.'
      },
      {
        question: 'How much does each license cost?',
        answer: 'Each license creation costs 1 credit. You can purchase credits in packages of 10, 50, 100, or custom amounts. Bulk purchases offer better value per credit.'
      },
    ]
  },
  {
    id: 'alerts',
    icon: Bell,
    title: 'Alerts & Notifications',
    description: 'Setting up real-time alerts',
    questions: [
      {
        question: 'How do I set up Telegram alerts?',
        answer: 'Go to the Alerts page in your Dashboard. Click "Connect Telegram" and follow the instructions to link your Telegram account with our bot. You\'ll receive a verification code to confirm the connection.'
      },
      {
        question: 'What events trigger alerts?',
        answer: 'You can configure alerts for: new license activations, HWID changes, failed validation attempts, license expirations, and suspicious activity like multiple failed attempts from the same IP.'
      },
      {
        question: 'Can I customize which alerts I receive?',
        answer: 'Yes, from the Alerts settings you can enable or disable specific alert types. You can also set quiet hours to avoid notifications during certain times.'
      },
      {
        question: 'Why am I not receiving Telegram notifications?',
        answer: 'Ensure you\'ve started a chat with our Telegram bot and haven\'t blocked it. Check that your Telegram account is properly linked in the Alerts page. Try reconnecting if issues persist.'
      },
    ]
  },
  {
    id: 'security',
    icon: Lock,
    title: 'Security',
    description: 'Protecting your licenses',
    questions: [
      {
        question: 'How secure is the HWID system?',
        answer: 'Our HWID system uses multiple hardware identifiers combined into a unique hash. This makes it extremely difficult to spoof or clone, providing robust protection against unauthorized use.'
      },
      {
        question: 'What happens if someone tries to use a stolen license?',
        answer: 'If someone tries to activate a license that\'s already bound to another HWID, the activation will fail and you\'ll receive an alert (if configured). The original binding remains intact.'
      },
      {
        question: 'Is my payment information secure?',
        answer: 'Absolutely. We use Cryptomus, a reputable cryptocurrency payment processor. We never store your wallet addresses or transaction details beyond what\'s necessary for order tracking.'
      },
      {
        question: 'How do you protect against license leaks?',
        answer: 'Besides HWID binding, we offer: country restrictions, single-use activation, logging of all validation attempts, and real-time alerts for suspicious activity.'
      },
    ]
  },
  {
    id: 'team',
    icon: Users,
    title: 'Team Management',
    description: 'Managing team members',
    questions: [
      {
        question: 'Can I add team members to my account?',
        answer: 'Yes, if you have an admin account, you can add team members from the Team page. You can assign different roles and permissions to each member.'
      },
      {
        question: 'What roles are available?',
        answer: 'There are three roles: Super Admin (full access, can manage everything), Admin (can create licenses and manage team), and User (limited access as assigned by admin).'
      },
      {
        question: 'Can team members use my credits?',
        answer: 'Yes, team members created by you will use credits from your account when creating licenses. You can set limits on how many licenses each team member can create.'
      },
      {
        question: 'How do I remove a team member?',
        answer: 'Go to the Team page, find the member you want to remove, and click the delete/remove option. Their licenses will remain active but they\'ll lose access to the dashboard.'
      },
    ]
  },
  {
    id: 'technical',
    icon: Settings,
    title: 'Technical',
    description: 'API and integration',
    questions: [
      {
        question: 'How do I integrate GeoV8 into my application?',
        answer: 'Download our SDK from the Dashboard (Download App button). Include it in your application and use the provided API endpoint to validate licenses. Documentation is included in the download.'
      },
      {
        question: 'What is the API endpoint for license validation?',
        answer: 'The validation endpoint is provided in your dashboard. It\'s a POST request that takes the license key and HWID, returning the license status and remaining time.'
      },
      {
        question: 'Is there rate limiting on the API?',
        answer: 'Yes, to prevent abuse we limit validation requests. Normal usage (validating at app startup or periodically) won\'t hit these limits. Excessive requests may be temporarily blocked.'
      },
      {
        question: 'What data does the validation return?',
        answer: 'The API returns: license status (valid/invalid/expired/paused), expiration date, remaining days, IP address, country, and any custom metadata you\'ve attached to the license.'
      },
      {
        question: 'Can I use the API from multiple applications?',
        answer: 'Yes, your account can be used to manage licenses for multiple applications. We recommend using different license labels or prefixes to organize them.'
      },
    ]
  },
  {
    id: 'troubleshooting',
    icon: AlertTriangle,
    title: 'Troubleshooting',
    description: 'Common issues and solutions',
    questions: [
      {
        question: 'License validation is failing, what should I check?',
        answer: 'Verify the license key is correct, check that the license hasn\'t expired or been paused, ensure the HWID matches (if already activated), and confirm there are no country restrictions blocking access.'
      },
      {
        question: 'I can\'t log into my account',
        answer: 'Make sure you\'re using the correct email and password. Try the "Forgot Password" option if needed. Clear your browser cache or try a different browser if issues persist.'
      },
      {
        question: 'My credits weren\'t added after payment',
        answer: 'Go to the Orders page and click "Refresh & Verify" on your order. If the payment is confirmed on the blockchain but credits weren\'t added, contact support with your order ID and transaction hash.'
      },
      {
        question: 'The application download isn\'t working',
        answer: 'Ensure you\'re logged in to access the download. Try a different browser or disable any download-blocking extensions. If issues persist, contact support for an alternative download link.'
      },
      {
        question: 'Geolocation data seems incorrect',
        answer: 'Geolocation is based on IP address, which may not always be 100% accurate, especially with VPNs or proxies. The system will show the location associated with the user\'s IP at validation time.'
      },
    ]
  },
]

const QUICK_LINKS = [
  { icon: LayoutDashboard, title: 'Dashboard', href: '/dashboard', description: 'Manage your licenses' },
  { icon: CreditCard, title: 'Buy Credits', href: '/store', description: 'Purchase more credits' },
  { icon: MessageCircle, title: 'Support', href: '/support', description: 'Contact our team' },
  { icon: Download, title: 'Download App', href: '/dashboard', description: 'Get the validation app' },
]

export default function HelpPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setIsLoggedIn(!!user)
      setLoading(false)
    }
    checkAuth()
  }, [])

  // Filter questions based on search
  const filteredCategories = FAQ_CATEGORIES.map(category => ({
    ...category,
    questions: category.questions.filter(q =>
      q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category =>
    searchQuery === '' || category.questions.length > 0
  )

  const totalResults = filteredCategories.reduce((acc, cat) => acc + cat.questions.length, 0)

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header with Navigation */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">GeoV8</h1>
                <p className="text-xs text-zinc-500">License Manager</p>
              </div>
            </Link>

            {/* Navigation Links */}
            {isLoggedIn && (
              <nav className="hidden md:flex items-center gap-1">
                <Link href="/dashboard">
                  <Button variant="ghost" className="text-zinc-400 hover:text-white hover:bg-zinc-800/50">
                    Dashboard
                  </Button>
                </Link>
                <Link href="/help">
                  <Button variant="ghost" className="bg-zinc-800 text-white">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Help Center
                  </Button>
                </Link>
                <Link href="/support">
                  <Button variant="ghost" className="text-zinc-400 hover:text-white hover:bg-zinc-800/50">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Support
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button variant="ghost" className="text-zinc-400 hover:text-white hover:bg-zinc-800/50">
                    <Mail className="w-4 h-4 mr-2" />
                    Contact
                  </Button>
                </Link>
              </nav>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Link href="/support">
              <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                <MessageCircle className="w-4 h-4 mr-2" />
                Contact Support
              </Button>
            </Link>
            {isLoggedIn ? (
              <Link href="/dashboard">
                <Button variant="ghost" className="text-zinc-400 hover:text-white">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button className="bg-emerald-600 hover:bg-emerald-500 text-white">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative py-16 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.15),transparent_50%)]" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <BookOpen className="w-10 h-10 text-emerald-400" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Help Center
              </h1>
              <p className="text-xl text-zinc-400 mb-8">
                Find answers to common questions and learn how to get the most out of GeoV8
              </p>

              {/* Search Bar */}
              <div className="relative max-w-xl mx-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for help..."
                  className="w-full pl-12 pr-4 py-6 bg-zinc-900 border-zinc-700 text-white text-lg rounded-xl focus:border-emerald-500 focus:ring-emerald-500/20"
                />
                {searchQuery && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <Badge variant="outline" className="bg-zinc-800 text-zinc-400 border-zinc-700">
                      {totalResults} results
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Quick Links */}
        <section className="py-8 border-y border-zinc-800 bg-zinc-900/30">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {QUICK_LINKS.map((link) => (
                <Link key={link.href} href={link.href}>
                  <Card className="bg-zinc-900/50 border-zinc-800 hover:border-emerald-500/50 transition-colors cursor-pointer h-full">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <link.icon className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="text-white font-medium">{link.title}</h3>
                        <p className="text-zinc-500 text-sm">{link.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Category Navigation */}
        {!searchQuery && (
          <section className="py-12">
            <div className="container mx-auto px-4">
              <h2 className="text-2xl font-bold text-white mb-6">Browse by Category</h2>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {FAQ_CATEGORIES.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(selectedCategory === category.id ? null : category.id)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      selectedCategory === category.id
                        ? 'bg-emerald-500/10 border-emerald-500/50'
                        : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <category.icon className={`w-6 h-6 mb-3 ${
                      selectedCategory === category.id ? 'text-emerald-400' : 'text-zinc-400'
                    }`} />
                    <h3 className="text-white font-medium mb-1">{category.title}</h3>
                    <p className="text-zinc-500 text-sm">{category.description}</p>
                    <p className="text-xs text-zinc-600 mt-2">{category.questions.length} questions</p>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* FAQ Content */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              {filteredCategories.map((category) => {
                if (selectedCategory && selectedCategory !== category.id && !searchQuery) return null
                if (category.questions.length === 0) return null

                return (
                  <div key={category.id} className="mb-10">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                        <category.icon className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">{category.title}</h2>
                        <p className="text-zinc-500 text-sm">{category.description}</p>
                      </div>
                    </div>

                    <Card className="bg-zinc-900/50 border-zinc-800">
                      <CardContent className="p-0">
                        <Accordion type="single" collapsible className="w-full">
                          {category.questions.map((faq, index) => (
                            <AccordionItem
                              key={index}
                              value={`${category.id}-${index}`}
                              className="px-6 border-zinc-800 last:border-0"
                            >
                              <AccordionTrigger className="text-white hover:text-emerald-400 hover:no-underline text-left py-5">
                                <span className="pr-4">{faq.question}</span>
                              </AccordionTrigger>
                              <AccordionContent className="text-zinc-400 leading-relaxed pb-5">
                                {faq.answer}
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </CardContent>
                    </Card>
                  </div>
                )
              })}

              {searchQuery && totalResults === 0 && (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-zinc-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">No results found</h3>
                  <p className="text-zinc-400 mb-6">
                    We couldn't find any questions matching "{searchQuery}"
                  </p>
                  <Link href="/support">
                    <Button className="bg-emerald-600 hover:bg-emerald-500 text-white">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Contact Support
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Still Need Help */}
        <section className="py-16 border-t border-zinc-800 bg-zinc-900/30">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-2xl font-bold text-white mb-4">Still Need Help?</h2>
              <p className="text-zinc-400 mb-8">
                Can't find what you're looking for? Our support team is here to help.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/support">
                  <Button size="lg" className="bg-emerald-600 hover:bg-emerald-500 text-white px-8">
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Open Support Ticket
                  </Button>
                </Link>
                <a href="https://t.me/geov8_support" target="_blank" rel="noopener noreferrer">
                  <Button size="lg" variant="outline" className="border-zinc-700 text-white hover:bg-zinc-800 px-8">
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Chat on Telegram
                  </Button>
                </a>
              </div>
              <p className="text-zinc-500 text-sm mt-6">
                Average response time: less than 24 hours
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 border-t border-zinc-800">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-6 text-sm text-zinc-500">
                <Link href="/terms" className="hover:text-white transition-colors">
                  Terms of Service
                </Link>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
                <Link href="/support" className="hover:text-white transition-colors">
                  Support
                </Link>
                <Link href="/contact" className="hover:text-white transition-colors">
                  Contact
                </Link>
              </div>
              <p className="text-zinc-600 text-sm">
                © 2024 GeoV8. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}
