import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import nodemailer from "npm:nodemailer"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request body
    const { to, subject, html } = await req.json()

    // Set up the SMTP transporter using environment variables (Supabase Secrets)
    const transporter = nodemailer.createTransport({
      host: Deno.env.get('SMTP_HOST'),
      port: parseInt(Deno.env.get('SMTP_PORT') || '465'),
      secure: true, // true for 465, false for other ports
      auth: {
        user: Deno.env.get('SMTP_USER'),
        pass: Deno.env.get('SMTP_PASS')?.replace(/"/g, ''), // Remove quotes if present
      },
    })

    const mailOptions = {
      from: Deno.env.get('SMTP_FROM'),
      to,
      subject,
      html,
    }

    // Send the email
    const info = await transporter.sendMail(mailOptions)

    console.log('Email sent successfully:', info.messageId)

    return new Response(
      JSON.stringify({ success: true, messageId: info.messageId }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('Error sending email:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})