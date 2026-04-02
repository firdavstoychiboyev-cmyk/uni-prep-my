import SettingsNav from "@/components/settings-nav";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex w-full">
            <div className="hidden lg:block w-[320px] shrink-0">
                <SettingsNav />
            </div>
            <div className="hidden lg:block w-px bg-border" />
            <div className="flex-1 min-w-0 px-0 lg:px-10">
                {children}
            </div>
        </div>
    );
}

