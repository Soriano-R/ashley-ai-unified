export default function HomePage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-4xl font-bold mb-6">Ashley AI - Unified App</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">Frontend Status</h2>
          <p className="text-green-400">✅ Next.js 15 + React 19 + TypeScript</p>
          <p className="text-green-400">✅ Tailwind CSS 4</p>
          <p className="text-yellow-400">🚧 Components migration in progress</p>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">Backend Status</h2>
          <p className="text-yellow-400">🚧 Python microservice setup</p>
          <p className="text-yellow-400">🚧 FastAPI integration</p>
          <p className="text-yellow-400">🚧 AI logic migration</p>
        </div>
      </div>
      
      <div className="mt-8 bg-blue-900/20 p-6 rounded-lg border border-blue-500/30">
        <h2 className="text-xl font-semibold mb-4">Architecture Benefits</h2>
        <ul className="space-y-2">
          <li>✅ Single codebase and deployment</li>
          <li>✅ No CORS complexity</li>
          <li>✅ Easier development workflow</li>
          <li>✅ Better performance (internal API calls)</li>
          <li>✅ Simplified authentication</li>
        </ul>
      </div>
    </div>
  );
}