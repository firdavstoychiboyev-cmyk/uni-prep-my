export default function PageWrapper({
    children,
    className = "",
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={`min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain ${className}`}>
            <div className="px-5 pb-10 pt-7 sm:px-8 sm:pt-9">{children}</div>
        </div>
    );
}
