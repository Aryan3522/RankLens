import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  Command as CommandIcon,
  LayoutDashboard,
  Search,
  Key,
  FileText,
  Sparkles,
  Moon,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

const NAV = [
  { label: "Analyzer", href: "/analyzer", icon: Search },
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Keywords", href: "/keywords", icon: Key },
  { label: "Reports", href: "/reports", icon: FileText },
];

/** ⌘K / Ctrl-K command palette for the marketing site. */
export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [, navigate] = useLocation();
  const { setTheme, resolvedTheme } = useTheme();

  // Global ⌘K / Ctrl-K binding.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const go = (href: string) => {
    onOpenChange(false);
    navigate(href);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search RankLens — pages, actions…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigate">
          {NAV.map((item) => (
            <CommandItem key={item.href} onSelect={() => go(item.href)}>
              <item.icon className="mr-2 h-4 w-4" />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => go("/analyzer")}>
            <Sparkles className="mr-2 h-4 w-4" />
            Run a new analysis
          </CommandItem>
          <CommandItem
            onSelect={() => {
              setTheme(resolvedTheme === "light" ? "dark" : "light");
              onOpenChange(false);
            }}
          >
            {resolvedTheme === "light" ? (
              <Moon className="mr-2 h-4 w-4" />
            ) : (
              <Sun className="mr-2 h-4 w-4" />
            )}
            Toggle theme
          </CommandItem>
          <CommandItem onSelect={() => go("/")}>
            <CommandIcon className="mr-2 h-4 w-4" />
            Back to home
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
