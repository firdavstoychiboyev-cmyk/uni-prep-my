import type { SVGProps } from "react";

/**
 * Кастомные иконки предметов (не из icon-паков). Штрих currentColor + мягкая
 * заливка той же currentColor с низкой прозрачностью — чтобы на насыщенном
 * градиенте они читались как плоские иллюстрации с весом, а не тонкие линии.
 */
const base = (props: SVGProps<SVGSVGElement>): SVGProps<SVGSVGElement> => ({
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    width: 24,
    height: 24,
    ...props,
});

// Мягкая заливка «телом» иллюстрации
const FILL = { fill: "currentColor", fillOpacity: 0.18 } as const;

/** Matematika — циркуль */
export const CompassIcon = (props: SVGProps<SVGSVGElement>) => (
    <svg {...base(props)}>
        <circle cx="12" cy="4.3" r="1.9" fill="currentColor" fillOpacity={0.9} stroke="none" />
        <path d="M12 6.1 6.8 20" />
        <path d="M12 6.1 17.2 20" />
        <path d="M6.8 20l1.5-.9M17.2 20l-1.5-.9" />
        <path d="M9 15h6" />
    </svg>
);

/** Ingliz tili — глобус */
export const GlobeIcon = (props: SVGProps<SVGSVGElement>) => (
    <svg {...base(props)}>
        <circle cx="12" cy="12" r="9" {...FILL} />
        <ellipse cx="12" cy="12" rx="4" ry="9" />
        <path d="M3 12h18" />
        <path d="M4.5 7.5c4.8 2.2 10.2 2.2 15 0M4.5 16.5c4.8-2.2 10.2-2.2 15 0" />
    </svg>
);

/** O'na tili — раскрытая книга */
export const OpenBookIcon = (props: SVGProps<SVGSVGElement>) => (
    <svg {...base(props)}>
        <path d="M12 6.2C9.5 4.6 6 4.3 3.5 5.1V18c2.5-.8 6-.5 8.5 1.1" {...FILL} />
        <path d="M12 6.2c2.5-1.6 6-1.9 8.5-1.1V18c-2.5-.8-6-.5-8.5 1.1" {...FILL} />
        <path d="M12 6.2v13" />
    </svg>
);

/** Biologiya — лист */
export const LeafIcon = (props: SVGProps<SVGSVGElement>) => (
    <svg {...base(props)}>
        <path d="M20 4C10 4 4 9.5 4 19c9.5 0 15-6 16-15Z" {...FILL} />
        <path d="M5.5 17.5C9 12 13 8.5 18 6.5" />
    </svg>
);

/** Tarix — колонна */
export const ColumnIcon = (props: SVGProps<SVGSVGElement>) => (
    <svg {...base(props)}>
        <path d="M4 5h16" />
        <path d="M5.5 7.5h13V17.2h-13Z" {...FILL} />
        <path d="M8 8v9M12 8v9M16 8v9" />
        <path d="M4 20h16" />
    </svg>
);

/** Fizika — атом */
export const AtomIcon = (props: SVGProps<SVGSVGElement>) => (
    <svg {...base(props)}>
        <circle cx="12" cy="12" r="1.9" fill="currentColor" stroke="none" />
        <ellipse cx="12" cy="12" rx="9" ry="3.6" />
        <ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)" />
        <ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(120 12 12)" />
    </svg>
);

/** Kimyo — колба */
export const FlaskIcon = (props: SVGProps<SVGSVGElement>) => (
    <svg {...base(props)}>
        <path d="M9 3h6" />
        <path d="M10 3v6.2L5.2 18a2 2 0 0 0 1.8 3h10a2 2 0 0 0 1.8-3L14 9.2V3" />
        <path d="M6.7 15.5h10.6L19 19a2 2 0 0 1-1.8 2H6.8A2 2 0 0 1 5 18Z" {...FILL} />
        <path d="M7.4 15.5h9.2" />
    </svg>
);

/** Fallback — книга */
export const BookIcon = (props: SVGProps<SVGSVGElement>) => (
    <svg {...base(props)}>
        <path d="M6 4h10a2 2 0 0 1 2 2v13a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2V5a1 1 0 0 1 1-1Z" {...FILL} />
        <path d="M6 16.5h11" />
    </svg>
);
