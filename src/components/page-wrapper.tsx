export default function PageWrapper({
    children,
    className = "",
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={`min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain ${className}`}>
            {/* Centered content column with a max-width so cards don't stretch edge-to-edge
                on wide screens; horizontal padding gives the sidebar/edge breathing room. */}
            <div className="mx-auto w-full max-w-[1360px] px-5 pb-12 pt-7 sm:px-8 sm:pt-9 lg:px-10 lg:pt-10">{children}</div>
        </div>
    );
}
