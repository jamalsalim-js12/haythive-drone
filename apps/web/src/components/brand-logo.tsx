import Image from "next/image";
import { cn } from "@/lib/utils";

const SIZE = {
  sm: { width: 72, height: 42, className: "h-9 w-auto" },
  md: { width: 120, height: 70, className: "h-14 w-auto" },
  lg: { width: 220, height: 128, className: "h-28 w-auto sm:h-32" },
} as const;

export function BrandLogo({
  size = "sm",
  className,
  priority = false,
}: {
  size?: keyof typeof SIZE;
  className?: string;
  priority?: boolean;
}) {
  const dims = SIZE[size];

  return (
    <Image
      src="/logo.png"
      alt="HaytHive"
      width={dims.width}
      height={dims.height}
      priority={priority}
      className={cn(
        "rounded-sm object-contain object-center",
        dims.className,
        className,
      )}
    />
  );
}
