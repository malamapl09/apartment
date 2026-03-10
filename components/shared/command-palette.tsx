"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Building2,
  Clock,
  FileText,
  Megaphone,
  Package,
  Search,
  Users,
  Vote,
  Wrench,
  X,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { globalSearch, type SearchResult } from "@/lib/actions/search";

const RECENT_SEARCHES_KEY = "residencehub-recent-searches";
const MAX_RECENT_SEARCHES = 5;

const typeIcons: Record<SearchResult["type"], React.ElementType> = {
  apartment: Building2,
  owner: Users,
  maintenance: Wrench,
  visitor: Users,
  announcement: Megaphone,
  package: Package,
  poll: Vote,
  document: FileText,
};

function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  if (typeof window === "undefined" || !query.trim()) return;
  try {
    const recent = getRecentSearches().filter((s) => s !== query.trim());
    recent.unshift(query.trim());
    localStorage.setItem(
      RECENT_SEARCHES_KEY,
      JSON.stringify(recent.slice(0, MAX_RECENT_SEARCHES))
    );
  } catch {
    // ignore storage errors
  }
}

function clearRecentSearches() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {
    // ignore
  }
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const t = useTranslations("search");

  // Load recent searches when dialog opens
  useEffect(() => {
    if (open) {
      setRecentSearches(getRecentSearches());
      setQuery("");
      setResults([]);
    }
  }, [open]);

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!query || query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const { results: searchResults } = await globalSearch(query.trim());
      setResults(searchResults);
      setLoading(false);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      if (result.href) {
        saveRecentSearch(query);
        setOpen(false);
        router.push(`/${locale}${result.href}`);
      }
    },
    [router, locale, query]
  );

  const handleRecentSearch = useCallback((term: string) => {
    setQuery(term);
  }, []);

  const handleClearRecent = useCallback(() => {
    clearRecentSearches();
    setRecentSearches([]);
  }, []);

  // Group results by type
  const groupedResults = results.reduce(
    (acc, result) => {
      if (!acc[result.type]) {
        acc[result.type] = [];
      }
      acc[result.type].push(result);
      return acc;
    },
    {} as Record<string, SearchResult[]>
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <Search className="h-4 w-4" />
        <span className="hidden md:inline">{t("hint")}</span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 md:inline-flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title={t("placeholder")}
        description={t("hint")}
      >
        <CommandInput
          placeholder={t("placeholder")}
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {loading && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {t("loading")}
            </div>
          )}

          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <CommandEmpty>{t("noResults")}</CommandEmpty>
          )}

          {/* Recent searches - show when no query */}
          {!query &&
            recentSearches.length > 0 && (
              <CommandGroup
                heading={
                  <div className="flex items-center justify-between">
                    <span>{t("recentSearches")}</span>
                    <button
                      onClick={handleClearRecent}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {t("clearRecent")}
                    </button>
                  </div>
                }
              >
                {recentSearches.map((term) => (
                  <CommandItem
                    key={term}
                    value={`recent-${term}`}
                    onSelect={() => handleRecentSearch(term)}
                  >
                    <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                    {term}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

          {/* Search results grouped by type */}
          {!loading &&
            Object.entries(groupedResults).map(([type, items], idx) => {
              const Icon = typeIcons[type as SearchResult["type"]] || FileText;
              return (
                <div key={type}>
                  {idx > 0 && <CommandSeparator />}
                  <CommandGroup heading={t(`types.${type}`)}>
                    {items.map((result) => (
                      <CommandItem
                        key={`${result.type}-${result.id}`}
                        value={`${result.type}-${result.title}-${result.subtitle || ""}`}
                        onSelect={() => handleSelect(result)}
                        disabled={!result.href}
                      >
                        <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                        <div className="flex flex-col">
                          <span>{result.title}</span>
                          {result.subtitle && (
                            <span className="text-xs text-muted-foreground">
                              {result.subtitle}
                            </span>
                          )}
                        </div>
                        {!result.href && (
                          <X className="ml-auto h-3 w-3 text-muted-foreground" />
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </div>
              );
            })}
        </CommandList>
      </CommandDialog>
    </>
  );
}
