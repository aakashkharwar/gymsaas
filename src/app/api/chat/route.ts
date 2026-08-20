import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function POST(req: Request) {
  try {
    const { message, domain } = await req.json();

    if (!message || !domain) {
      return NextResponse.json({ error: 'Missing message or domain' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const slug = domain.split('.')[0]; 
    
    // Fetch gym data
    const { data: gym, error } = await supabase
      .from('organizations')
      .select('name, address, timings, services, owner_phone')
      .eq('slug', slug)
      .single();

    if (error || !gym) {
      return NextResponse.json({ reply: 'Sorry, I am having trouble accessing the gym data right now.' });
    }

    // Parse JSON fields safely
    let parsedTimings = 'Contact us for details';
    if (gym.timings) {
      try {
        parsedTimings = JSON.parse(gym.timings as string).display || gym.timings;
      } catch (e) {
        parsedTimings = String(gym.timings);
      }
    }

    let parsedServices: string[] = [];
    if (gym.services) {
      try {
        parsedServices = JSON.parse(gym.services as string);
      } catch (e) {
        // ignore
      }
    }

    const lowerMessage = message.toLowerCase();
    let reply = '';

    // Smart Keyword Matching (Mock AI Logic)
    if (lowerMessage.includes('time') || lowerMessage.includes('open') || lowerMessage.includes('close') || lowerMessage.includes('hour')) {
      reply = `We are open from ${parsedTimings}.`;
    } 
    else if (lowerMessage.includes('where') || lowerMessage.includes('location') || lowerMessage.includes('address')) {
      reply = `We are located at: ${gym.address || 'our main studio'}.`;
    } 
    else if (lowerMessage.includes('service') || lowerMessage.includes('class') || lowerMessage.includes('training') || lowerMessage.includes('offer')) {
      if (parsedServices.length > 0) {
        reply = `We offer the following services: ${parsedServices.join(', ')}.`;
      } else {
        reply = 'We offer a variety of fitness services! Contact us for specific details.';
      }
    } 
    else if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('fee')) {
      reply = 'Our pricing varies based on the plan and duration. Please chat with us on WhatsApp or visit the gym to get our latest offers!';
    } 
    else if (lowerMessage.includes('contact') || lowerMessage.includes('phone') || lowerMessage.includes('call')) {
      reply = `You can reach out directly to the owner at ${gym.owner_phone}.`;
    } 
    else {
      reply = `Hi! I'm the ${gym.name} virtual assistant. You can ask me about our location, timings, services, or pricing!`;
    }

    // Simulate AI typing delay
    await new Promise(resolve => setTimeout(resolve, 800));

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
