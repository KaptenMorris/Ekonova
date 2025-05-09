import { Coins } from 'lucide-react';
import Link from 'next/link';

interface LogoProps {
  className?: string;
  iconSize?: number;
  textSize?: string;
  showText?: boolean;
}

export function Logo({ className, iconSize = 28, textSize = "text-2xl", showText = true }: LogoProps) {
  return (
    <Link href="/" className={`flex items-center gap-2 font-bold text-primary ${className}`}>
      <Coins size={iconSize} className="text-accent" />
      {showText && <span className={`${textSize}`}>Ekonova</span>}
    </Link>
  );
}
