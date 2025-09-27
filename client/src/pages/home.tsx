import Sidebar from "@/components/layout/Sidebar";

export default function Home() {
  // Get user from localStorage
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;


  return (
    <Sidebar>
      <div className="flex-1 overflow-auto">
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
          <div className="text-center p-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4" data-testid="text-welcome-message">
              Hello {user?.username || user?.name || "Admin"}, Welcome to Advantix Agency
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              Your business management dashboard is ready to use.
            </p>
            <div className="text-sm text-gray-500">
              Navigate using the sidebar to access all features.
            </div>
          </div>
        </div>
      </div>
    </Sidebar>
  );
}