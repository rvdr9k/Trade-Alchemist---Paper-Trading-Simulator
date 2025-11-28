import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" />
      <path d="M16 8L8 16" />
      <path d="M16 16H8" />
      <path d="M12 12V8" />
      <path d="M12 12L16 8" />
      <path d="M10 8H16" />
      <polyline points="16 12 16 8 12 8" />
    </svg>
  );
}
