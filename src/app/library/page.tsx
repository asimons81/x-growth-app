import Link from 'next/link';

export default function LibraryPage() {
  return (
    <div className="min-h-screen p-8 bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">📚 Library</h1>
        <p className="text-gray-400 mb-8">Your content assets</p>
        
        <div className="grid md:grid-cols-2 gap-4">
          <Link href="/library/ideas" 
            className="p-6 bg-gray-900 rounded-lg border border-gray-800 hover:border-gray-700 transition">
            <h2 className="text-xl font-semibold mb-2">💡 Ideas</h2>
            <p className="text-gray-400 text-sm">Brain dump content ideas</p>
          </Link>
          
          <Link href="/library/voice" 
            className="p-6 bg-gray-900 rounded-lg border border-gray-800 hover:border-gray-700 transition">
            <h2 className="text-xl font-semibold mb-2">🎤 Voice Profile</h2>
            <p className="text-gray-400 text-sm">Train AI on your writing style</p>
          </Link>
          
          <Link href="/library/hooks" 
            className="p-6 bg-gray-900 rounded-lg border border-gray-800 hover:border-gray-700 transition">
            <h2 className="text-xl font-semibold mb-2">🎣 Hooks</h2>
            <p className="text-gray-400 text-sm">Your best performing hooks</p>
          </Link>
          
          <Link href="/library/topics" 
            className="p-6 bg-gray-900 rounded-lg border border-gray-800 hover:border-gray-700 transition">
            <h2 className="text-xl font-semibold mb-2">🏷️ Topics</h2>
            <p className="text-gray-400 text-sm">Topics you post about</p>
          </Link>
          
          <Link href="/library/drafts" 
            className="p-6 bg-gray-900 rounded-lg border border-gray-800 hover:border-gray-700 transition">
            <h2 className="text-xl font-semibold mb-2">📝 Saved Drafts</h2>
            <p className="text-gray-400 text-sm">Your draft collection</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
