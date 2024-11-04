export default function HomePage() {
    return (
        <div className="flex items-center justify-center h-screen bg-background">
            <div className="text-center">
                <h1 className="text-4xl font-bold mb-4 text-gray-800">Welcome to the App</h1>
                <p className="text-lg text-gray-600">Please log in or register to continue.</p>
                <div className="mt-6 space-x-4">
                    <a href="/login" className="bg-button px-4 py-2 rounded text-white hover:bg-primary transition">
                        Login
                    </a>
                    <a href="/register" className="bg-button px-4 py-2 rounded text-white hover:bg-primary transition">
                        Register
                    </a>
                </div>
            </div>
        </div>
    );
}