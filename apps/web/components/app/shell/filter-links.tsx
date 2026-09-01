import Link from "next/link";

import { cn } from "@/lib/utils/cn";

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

/**
 * Filtros y pestañas como enlaces: el estado vive en la URL, no en el cliente.
 * Así toda vista del portal es compartible, recargable y renderizada en el
 * servidor — cuando entren las consultas a Supabase no hay que reescribir nada.
 */
export function FilterLinks({
  param,
  options,
  current,
  basePath,
  searchParams,
  label,
}: {
  param: string;
  options: FilterOption[];
  current: string;
  basePath: string;
  searchParams: Record<string, string | undefined>;
  label: string;
}) {
  const hrefFor = (value: string) => {
    const params = new URLSearchParams();
    for (const [key, item] of Object.entries(searchParams)) {
      if (item && key !== param) params.set(key, item);
    }
    if (value !== options[0]?.value) params.set(param, value);
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  return (
    <nav aria-label={label} className="flex flex-wrap gap-1">
      {options.map((option) => {
        const isActive = option.value === current;
        return (
          <Link
            key={option.value}
            href={hrefFor(option.value)}
            aria-current={isActive ? "true" : undefined}
            className={cn(
              "rounded-control px-2.5 py-1.5 text-small transition-colors duration-[var(--er-duration-fast)]",
              isActive ? "bg-ink text-paper" : "text-ink-soft hover:bg-mist hover:text-ink",
            )}
          >
            {option.label}
            {option.count === undefined ? null : (
              <span className="ml-1.5 tabular-nums opacity-70">{option.count}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
