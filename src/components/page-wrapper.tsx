export default function PageWrapper({
    children,
    className = "",
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={`min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain ${className}`}>
            <div className="px-5 pb-12 pt-7 sm:px-10 sm:pt-9 lg:px-12 lg:pt-10">{children}</div>
        </div>
    );
}
