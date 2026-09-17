"use client";

import { MenuIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useSession } from "@/hooks/use-session";
import { useDockStore } from "@/lib/dock-store";
import { cn } from "@/lib/utils";

const baseNav = [
  { href: "/", label: "Dock" },
  { href: "/logs", label: "Logs" },
  { href: "/health", label: "Health" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, session, isAuthenticated, isLoading, signOut } = useSession();
  const { devices, activeDeviceId, setActiveDevice } = useDockStore();
  const [menuOpen, setMenuOpen] = useState(false);

  const isAdmin = user?.role === "ADMIN";
  const nav = isAdmin
    ? [...baseNav, { href: "/admin/users", label: "Users" }]
    : baseNav;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (
      !isLoading &&
      isAuthenticated &&
      pathname.startsWith("/admin") &&
      !isAdmin
    ) {
      router.replace("/");
    }
  }, [isAdmin, isAuthenticated, isLoading, pathname, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background text-sm text-muted-foreground">
        Checking session…
      </div>
    );
  }

  if (pathname.startsWith("/admin") && !isAdmin) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background text-sm text-muted-foreground">
        Redirecting…
      </div>
    );
  }

  return (
    <div className="flex h-svh flex-col overflow-hidden bg-background">
      <header className="z-20 shrink-0 border-b border-border bg-card">
        <div className="flex h-14 w-full items-center gap-3 px-4 sm:gap-4 sm:px-6">
          <Link href="/" className="flex shrink-0 items-center">
            <BrandLogo size="sm" priority />
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-md px-2.5 py-1.5 text-sm transition-colors duration-200",
                    active
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <Select
              value={activeDeviceId || undefined}
              onValueChange={(value) => {
                if (typeof value === "string") setActiveDevice(value);
              }}
              disabled={devices.length === 0}
            >
              <SelectTrigger
                className="min-w-28 bg-background sm:min-w-40"
                size="sm"
              >
                <SelectValue>
                  {(value) =>
                    devices.find((d) => d.id === value)?.name ?? "Select dock"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {devices.map((d) => (
                    <SelectItem key={d.id} value={d.id} label={d.name}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <span className="hidden font-mono text-xs text-muted-foreground lg:inline">
              {session?.email}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="hidden md:inline-flex"
              onClick={() => {
                void signOut().then(() => router.replace("/login"));
              }}
            >
              Sign out
            </Button>

            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon"
                    className="md:hidden"
                    aria-label="Open menu"
                  />
                }
              >
                <MenuIcon />
              </SheetTrigger>
              <SheetContent
                side="right"
                className="flex w-[min(100%,20rem)] flex-col gap-0 p-0"
              >
                <SheetHeader className="border-b border-border px-4 py-4 text-left">
                  <div className="flex items-center gap-3">
                    <BrandLogo size="md" />
                    <SheetTitle className="sr-only">Menu</SheetTitle>
                  </div>
                </SheetHeader>
                <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-3 scrollbar-none">
                  {nav.map((item) => {
                    const active =
                      item.href === "/"
                        ? pathname === "/"
                        : pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMenuOpen(false)}
                        className={cn(
                          "rounded-lg px-3 py-3 text-sm font-medium transition-colors",
                          active
                            ? "bg-secondary text-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
                <div className="border-t border-border p-4">
                  <p className="mb-3 truncate font-mono text-xs text-muted-foreground">
                    {session?.email}
                  </p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setMenuOpen(false);
                      void signOut().then(() => router.replace("/login"));
                    }}
                  >
                    Sign out
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
