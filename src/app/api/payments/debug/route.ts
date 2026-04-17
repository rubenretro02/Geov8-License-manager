import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

const CRYPTOMUS_API_KEY = process.env.CRYPTOMUS_API_KEY || ''
const CRYPTOMUS_MERCHANT_ID = process.env.CRYPTOMUS_MERCHANT_ID || ''
const CRYPTOMUS_API_URL = 'https://api.cryptomus.com/v1'

// Generate Cryptomus signature
function generateSign(data: object): string {
  const jsonData = JSON.stringify(data)
  const base64Data = Buffer.from(jsonData).toString('base64')
  return crypto.createHash('md5').update(base64Data + CRYPTOMUS_API_KEY).digest('hex')
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile to check if super_admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden - Super admin only' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const uuid = searchParams.get('uuid')
    const orderId = searchParams.get('order_id')

    // Get recent orders from database
    const { data: recentOrders } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    if (action === 'compare') {
      // Compare database orders with Cryptomus
      let cryptomusData: unknown = null
      let cryptomusError: unknown = null

      if (CRYPTOMUS_API_KEY && CRYPTOMUS_MERCHANT_ID) {
        try {
          // Get payment history from Cryptomus
          const requestData = {}
          const sign = generateSign(requestData)

          const res = await fetch(`${CRYPTOMUS_API_URL}/payment/list`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'merchant': CRYPTOMUS_MERCHANT_ID,
              'sign': sign,
            },
            body: JSON.stringify(requestData),
          })

          if (res.ok) {
            const data = await res.json()
            if (data.state === 0) {
              cryptomusData = data.result?.items?.slice(0, 10) || []
            } else {
              cryptomusError = { message: data.message }
            }
          } else {
            const rawData = await res.text()
            cryptomusError = { status: res.status, data: rawData }
          }
        } catch (e) {
          cryptomusError = String(e)
        }
      }

      return NextResponse.json({
        message: 'Compare database orders with Cryptomus payments',
        apiKeyFirst8: CRYPTOMUS_API_KEY.substring(0, 8),
        databaseOrders: recentOrders,
        cryptomusPayments: cryptomusData,
        cryptomusError: cryptomusError
      })
    }

    // Default: return debug info
    const result: Record<string, unknown> = {
      apiKeyConfigured: !!CRYPTOMUS_API_KEY,
      merchantIdConfigured: !!CRYPTOMUS_MERCHANT_ID,
      apiKeyFirst8: CRYPTOMUS_API_KEY.substring(0, 8),
      merchantIdFirst8: CRYPTOMUS_MERCHANT_ID.substring(0, 8),
      recentOrders,
    }

    // If uuid or order_id provided, get payment info
    if ((uuid || orderId) && CRYPTOMUS_API_KEY && CRYPTOMUS_MERCHANT_ID) {
      const requestData: Record<string, string> = {}
      if (uuid) requestData.uuid = uuid
      if (orderId) requestData.order_id = orderId

      const sign = generateSign(requestData)

      const paymentResponse = await fetch(`${CRYPTOMUS_API_URL}/payment/info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'merchant': CRYPTOMUS_MERCHANT_ID,
          'sign': sign,
        },
        body: JSON.stringify(requestData),
      })

      if (paymentResponse.ok) {
        const data = await paymentResponse.json()
        result.paymentInfo = data
      } else {
        result.paymentInfoError = await paymentResponse.text()
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
