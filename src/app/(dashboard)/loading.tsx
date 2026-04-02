export default function Loading() {
    return (
        <div className="flex flex-col gap-6 py-4" style={{ animation: "pageEnter 280ms cubic-bezier(0.16,1,0.3,1) both" }}>
            {/* Header */}
            <div className="flex flex-col gap-3">
                <div className="h-9 w-72 bg-gray-100 rounded-2xl animate-pulse" />
                <div className="h-4 w-80 bg-gray-100 rounded-lg animate-pulse" />
                <div className="flex gap-3 mt-1">
                    <div className="h-10 w-32 bg-gray-100 rounded-full animate-pulse" />
                    <div className="h-10 w-36 bg-gray-100 rounded-full animate-pulse" />
                </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-2">
                {[...Array(3)].map((_, i) => (
                    <div
                        key={i}
                        className="h-32 bg-gray-100 rounded-2xl animate-pulse"
                        style={{ animationDelay: `${i * 80}ms` }}
                    />
                ))}
            </div>

            {/* Section header */}
            <div className="flex items-center justify-between mt-4">
                <div className="h-7 w-52 bg-gray-100 rounded-xl animate-pulse" />
                <div className="h-8 w-28 bg-gray-100 rounded-xl animate-pulse" />
            </div>

            {/* Content cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {[...Array(6)].map((_, i) => (
                    <div
                        key={i}
                        className="h-52 bg-gray-100 rounded-2xl animate-pulse"
                        style={{ animationDelay: `${i * 60}ms` }}
                    />
                ))}
            </div>
        </div>
    );
}
