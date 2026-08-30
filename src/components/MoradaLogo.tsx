import React from 'react';

interface MoradaLogoProps {
  className?: string;
  size?: number | string;
  color?: string;
}

/**
 * Official vector brandmark for Morada Crédito Imobiliário
 * Exact geometric double-house and 'M' shape matching company logo
 */
export const MoradaLogo: React.FC<MoradaLogoProps> = ({
  className = 'w-10 h-10',
  color = '#277D53',
}) => {
  return (
    <svg
      viewBox="0 0 1000 1000"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Exact stroke-based representation of Morada Crédito logo */}
      <g
        stroke={color === 'currentColor' ? 'currentColor' : color}
        strokeWidth="86"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Left house outer gable & wall */}
        <path d="M 152 780 L 152 468 L 348 272 L 500 392 L 678 272 L 860 468 L 860 780 L 734 780 L 734 560 L 500 392 L 290 560 L 290 780 Z" />
      </g>
      {/* Filled solid brand shape */}
      <path
        d="M 348 240 L 500 360 L 678 240 L 910 468 V 824 H 686 V 602 L 500 454 L 334 602 V 824 H 106 V 468 Z"
        fill={color === 'currentColor' ? 'currentColor' : color}
        fillRule="evenodd"
        clipRule="evenodd"
      />
      {/* Inner cutouts creating the two house openings and the central doorway */}
      <path
        d="M 194 514 L 348 376 L 442 452 L 334 538 V 740 H 194 Z"
        fill="#FFFFFF"
      />
      <path
        d="M 822 514 L 678 376 L 576 454 L 686 538 V 740 H 822 Z"
        fill="#FFFFFF"
      />
    </svg>
  );
};
