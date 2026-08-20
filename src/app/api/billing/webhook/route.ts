import { NextResponse } from 'next/server';
import crypto from 'crypto';

// In a real application, you would store this in your environment variables
// const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

export async function POST(req: Request) {
  try {
    const bodyText = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing Razorpay signature' }, { status: 400 });
    }

    // Verify the signature
    // const expectedSignature = crypto
    //   .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET!)
    //   .update(bodyText)
    //   .digest('hex');

    // if (expectedSignature !== signature) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    // }

    const event = JSON.parse(bodyText);

    // Handle different webhook events
    switch (event.event) {
      case 'subscription.charged':
        // Update Supabase: subscriptions table status to 'active'
        console.log('Subscription charged successfully:', event.payload.subscription.entity.id);
        break;
      case 'subscription.halted':
      case 'subscription.cancelled':
        // Update Supabase: subscriptions table status to 'cancelled' or 'past_due'
        // Revoke dashboard access
        console.log('Subscription halted/cancelled:', event.payload.subscription.entity.id);
        break;
      default:
        console.log(`Unhandled event type: ${event.event}`);
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
