export default function PageWrapper({
    children,
    className = "",
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            className={`flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-3xl rounded-b-2xl border border-border/45 bg-background shadow-md transition-shadow duration-300 ${className}`}
        >
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain">
                <div className="px-6 pb-8 pt-8 sm:px-8 sm:pt-10">{children}</div>
            </div>
        </div>
    );
}
