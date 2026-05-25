import Image from 'next/image';
import Link from 'next/link';

interface BrandLogoProps {
  href?: string;
  variant?: 'full' | 'compact';
  priority?: boolean;
  className?: string;
}

export function BrandLogo({
  href,
  variant = 'compact',
  priority = false,
  className = '',
}: BrandLogoProps) {
  const content =
    variant === 'full' ? (
      <div className={`inline-flex ${className}`.trim()}>
        <Image
          src="/spicee-street-logo.svg"
          alt="Spicee Street"
          width={220}
          height={144}
          priority={priority}
          className="h-auto w-[180px] sm:w-[220px]"
        />
      </div>
    ) : (
      <div className={`inline-flex items-center gap-3 ${className}`.trim()}>
        <div className="rounded-xl bg-white/95 p-1.5 shadow-sm ring-1 ring-black/5">
          <Image
            src="/icon.svg"
            alt="Spicee Street"
            width={36}
            height={36}
            priority={priority}
            className="h-9 w-9"
          />
        </div>
        <div className="leading-tight">
          <div className="text-base font-semibold tracking-[0.02em]">Spicee Street</div>
          <div className="text-[10px] uppercase tracking-[0.28em] opacity-80">Taste the Delicious</div>
        </div>
      </div>
    );

  if (!href) {
    return content;
  }

  return (
    <Link href={href} className="inline-flex items-center">
      {content}
    </Link>
  );
}
