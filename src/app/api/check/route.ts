import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Create Supabase client with service role for API access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface CheckRequest {
  license_key: string
  hwid: string
}

interface GeoInfo {
  country?: string
  state?: string
  city?: string
}

async function getGeoFromIP(ip: string): Promise<GeoInfo> {
  try {
    // Use a free IP geolocation service
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=country,regionName,city`)
    if (response.ok) {
      const data = await response.json()
      return {
        country: data.country,
        state: data.regionName,
        city: data.city,
      }
    }
  } catch (error) {
    console.error('Error getting geo info:', error)
  }
  return {}
}

async function createCheckLog(
  licenseKey: string | null,
  hwid: string,
  ipAddress: string,
  status: string,
  message: string,
  geo: GeoInfo
) {
  try {
    await supabase.from('check_logs').insert({
      license_key: licenseKey,
      hwid: hwid,
      ip_address: ipAddress,
      ip_country: geo.country || null,
      ip_state: geo.state || null,
      ip_city: geo.city || null,
      status: status,
      message: message,
    })
  } catch (error) {
    console.error('Error creating check log:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CheckRequest = await request.json()
    const { license_key, hwid } = body

    // Get client IP
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1'

    // Get geo info
    const geo = await getGeoFromIP(ip)

    // Validate required fields
    if (!license_key || !hwid) {
      await createCheckLog(license_key || null, hwid || 'unknown', ip, 'error', 'Missing license_key or hwid', geo)
      return NextResponse.json(
        { valid: false, error: 'Missing license_key or hwid' },
        { status: 400 }
      )
    }

    // Find the license
    const { data: license, error: licenseError } = await supabase
      .from('licenses')
      .select('*')
      .eq('license_key', license_key)
      .single()

    if (licenseError || !license) {
      await createCheckLog(license_key, hwid, ip, 'invalid', 'License not found', geo)
      return NextResponse.json(
        { valid: false, error: 'License not found' },
        { status: 404 }
      )
    }

    // Check if license is active
    if (!license.is_active) {
      await createCheckLog(license_key, hwid, ip, 'invalid', 'License is deactivated', geo)
      return NextResponse.json(
        { valid: false, error: 'License is deactivated' },
        { status: 403 }
      )
    }

    // Check if license is expired
    if (license.expires_at) {
      const expiresAt = new Date(license.expires_at)
      if (expiresAt < new Date()) {
        await createCheckLog(license_key, hwid, ip, 'expired', 'License has expired', geo)
        return NextResponse.json(
          { valid: false, error: 'License has expired', expires_at: license.expires_at },
          { status: 403 }
        )
      }
    }

    // Check HWID binding
    if (license.hwid && license.hwid !== hwid) {
      await createCheckLog(license_key, hwid, ip, 'invalid', 'HWID mismatch', geo)
      return NextResponse.json(
        { valid: false, error: 'License is bound to a different device' },
        { status: 403 }
      )
    }

    // If no HWID bound yet, bind it
    if (!license.hwid) {
      await supabase
        .from('licenses')
        .update({
          hwid: hwid,
          activated_at: new Date().toISOString(),
          current_activations: 1,
        })
        .eq('license_key', license_key)
    }

    // Success - create log and return
    await createCheckLog(license_key, hwid, ip, 'valid', 'License is valid', geo)

    return NextResponse.json({
      valid: true,
      customer_name: license.customer_name,
      expires_at: license.expires_at,
      is_trial: license.is_trial,
      message: 'License is valid',
    })

  } catch (error) {
    console.error('Check API error:', error)
    return NextResponse.json(
      { valid: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Also support GET for simple checks
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const license_key = searchParams.get('license_key')
  const hwid = searchParams.get('hwid')

  if (!license_key || !hwid) {
    return NextResponse.json(
      { valid: false, error: 'Missing license_key or hwid query parameters' },
      { status: 400 }
    )
  }

  // Create a mock request to reuse POST logic
  const mockRequest = new NextRequest(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify({ license_key, hwid }),
  })

  return POST(mockRequest)
}
