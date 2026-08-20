import { notFound } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Clock, Phone, MessageSquare } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import ChatbotWidget from '@/components/ChatbotWidget';

interface GymPageProps {
  params: {
    domain: string;
  };
}

export default async function GymPublicPage({ params }: GymPageProps) {
  const { domain } = await params;
  
  // Extract subdomain if the domain includes the full host (e.g. vgym.gymos.in)
  // For simplicity in this demo, we assume `domain` is the slug 'vgym'.
  const slug = domain.split('.')[0]; 

  const supabase = await createClient();
  
  const { data: gym, error } = await supabase
    .from('organizations')
    .select('name, slug, owner_phone, address, timings, services')
    .eq('slug', slug)
    .single();

  if (error || !gym) {
    notFound();
  }

  // Parse JSONB fields
  const timings = gym.timings ? JSON.parse(gym.timings as string).display : 'Not specified';
  const services = gym.services ? JSON.parse(gym.services as string) : [];

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <header className="bg-slate-900 text-white py-20 px-6 relative overflow-hidden">
        <div className="max-w-4xl mx-auto relative z-10 text-center sm:text-left">
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-white">{gym.name}</h1>
          <p className="mt-6 text-xl text-slate-300 max-w-2xl leading-relaxed">
            Join the best fitness community in town. State-of-the-art equipment, expert trainers, and a motivating environment.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center sm:justify-start">
             <button className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20">
               Join Now
             </button>
             <Link href={`https://wa.me/${gym.owner_phone}`} target="_blank" className="bg-white/10 border border-white/20 text-white px-8 py-4 rounded-xl font-bold hover:bg-white/20 transition-colors flex items-center justify-center gap-2 backdrop-blur-sm">
               <MessageSquare className="w-5 h-5" />
               Chat on WhatsApp
             </Link>
          </div>
        </div>
      </header>

      {/* Info Section */}
      <div className="max-w-5xl mx-auto py-16 px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          <div className="flex flex-col items-center text-center p-8 bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-5">
              <MapPin className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-lg text-slate-900">Location</h3>
            <p className="text-slate-600 mt-2 leading-relaxed">{gym.address || 'Address not provided'}</p>
          </div>
          <div className="flex flex-col items-center text-center p-8 bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-5">
              <Clock className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-lg text-slate-900">Timings</h3>
            <p className="text-slate-600 mt-2 leading-relaxed">{timings}</p>
          </div>
          <div className="flex flex-col items-center text-center p-8 bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-5">
              <Phone className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-lg text-slate-900">Contact</h3>
            <p className="text-slate-600 mt-2 leading-relaxed">{gym.owner_phone}</p>
          </div>
        </div>

        {/* Services */}
        {services.length > 0 && (
          <>
            <div className="text-center mb-10">
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Our Services</h2>
              <p className="mt-3 text-slate-500">Everything you need to reach your fitness goals.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {services.map((service: string, idx: number) => (
                <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4 hover:border-indigo-100 transition-colors">
                  <div className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span className="font-semibold text-slate-800">{service}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      
      {/* Footer */}
      <footer className="bg-slate-900 py-12 text-center text-sm border-t border-slate-800">
        <p className="text-slate-400">
          © {new Date().getFullYear()} {gym.name}. Powered by <Link href="https://gymos.in" className="text-white font-bold hover:text-indigo-400 transition-colors">GymOS</Link>.
        </p>
      </footer>

      {/* AI Chatbot Widget */}
      <ChatbotWidget domain={domain} />
    </div>
  );
}
