import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen p-8 bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">X Growth App</h1>
        <p className="text-gray-400 mb-8">Your AI-powered X content operating system</p>
        
        <div className="grid md:grid-cols-2 gap-4">
          <Link href="/dashboard" 
            className="p-6 bg-gray-900 rounded-lg border border-gray-800 hover:border-gray-700 transition">
            <h2 className="text-xl font-semibold mb-2">📊 Dashboard</h2>
            <p className="text-gray-400 text-sm">View your stats and performance</p>
          </Link>
          
          <Link href="/compose" 
            className="p-6 bg-gray-900 rounded-lg border border-gray-800 hover:border-gray-700 transition">
            <h2 className="text-xl font-semibold mb-2">✍️ Compose</h2>
            <p className="text-gray-400 text-sm">Generate and edit drafts with AI</p>
          </Link>
          
          <Link href="/schedule" 
            className="p-6 bg-gray-900 rounded-lg border border-gray-800 hover:border-gray-700 transition">
            <h2 className="text-xl font-semibold mb-2">📅 Schedule</h2>
            <p className="text-gray-400 text-sm">Manage your posting queue</p>
          </Link>
          
          <Link href="/ideas" 
            className="p-6 bg-gray-900 rounded-lg border border-gray-800 hover:border-gray-700 transition">
            <h2 className="text-xl font-semibold mb-2">💡 Ideas</h2>
            <p className="text-gray-400 text-sm">Brain dump and expand ideas</p>
          </Link>
          
          <Link href="/library" 
            className="p-6 bg-gray-900 rounded-lg border border-gray-800 hover:border-gray-700 transition">
            <h2 className="text-xl font-semibold mb-2">📚 Library</h2>
            <p className="text-gray-400 text-sm">Your hooks, topics, and voice profile</p>
          </Link>
          
          <Link href="/settings" 
            className="p-6 bg-gray-900 rounded-lg border border-gray-800 hover:border-gray-700 transition">
            <h2 className="text-xl font-semibold mb-2">⚙️ Settings</h2>
            <p className="text-gray-400 text-sm">API keys and preferences</p>
          </Link>
        </div>
        
        <div className="mt-8 p-4 bg-gray-900 rounded-lg border border-gray-800">
          <h3 className="font-semibold mb-2">Quick Start</h3>
          <ol className="text-gray-400 text-sm space-y-1 list-decimal list-inside">
            <li>Go to Settings → Add your Gemini API key</li>
            <li>Go to Library → Set up your voice profile (paste your best posts)</li>
            <li>Start creating content with Compose or Ideas</li>
          </ol>
        </div>
      </div>
    </main>
  );
}
