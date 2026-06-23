import React from 'react';
import { Color, PieceType } from '../types';

interface PieceProps {
  type: PieceType;
  color: Color;
  size?: number;
}

export const ChessPiece: React.FC<PieceProps> = ({ type, color, size = 48 }) => {
  // Retro color palettes
  const fill = color === 'w' ? '#FFFFFF' : '#323C39';
  const stroke = color === 'w' ? '#323C39' : '#91A39B';
  const accent = color === 'w' ? '#CBC6B8' : '#1d2120';

  // Crisp pixel art representation inside a 16x16 grid
  // shape-rendering="crispEdges" makes it look perfectly retro and pixelated!
  const renderSVGContent = () => {
    switch (type) {
      case 'p': // PAWN
        return (
          <>
            {/* Shadow/Accent */}
            <path d="M6 13h4M7 8h2v4H7z" fill={accent} />
            {/* Outline */}
            <path d="M6 14h4v-1h1v-1h-1v-4h1V7H9V5h2V4H9V3H7v1H5v1h2v2H5v1h1v4H5v1h1z" fill={stroke} />
            {/* Fill */}
            <path d="M7 13h2v-1h1V8H9V6H7v2H6v4h1zM8 4h1v1H8z" fill={fill} />
          </>
        );
      case 'r': // ROOK
        return (
          <>
            {/* Shadow/Accent */}
            <path d="M4 13h8v-1H4zm1-5h6v4H5z" fill={accent} />
            {/* Outline */}
            <path d="M3 14h10v-1h1V8h-1V5h-1v2H9V5H7v2H5V5H4v3H3v5h1zm2-5h6v4H5z" fill={stroke} />
            {/* Fill */}
            <path d="M4 13h8v-4H4zm1-5h6V6H9v1H7V6H5zm-1-2h1v1H4zm7 0h1v1h-1z" fill={fill} />
          </>
        );
      case 'n': // KNIGHT
        return (
          <>
            {/* Shadow/Accent */}
            <path d="M5 13h6V9H6zm4-5h2V6H9z" fill={accent} />
            {/* Outline */}
            <path d="M4 14h8V11h1V8l-1-1v-2l-1-1H9l-1 1-1-1H5v3l-1 1v4h1zm1-3h6v2H5zm1-4h3V6H6z" fill={stroke} />
            {/* Fill */}
            <path d="M5 13h6v-2h1V8l-1-1v-2H9v1h1v1H6V5H5v2H4v4zm2-6h1V6H7z" fill={fill} />
          </>
        );
      case 'b': // BISHOP
        return (
          <>
            {/* Shadow/Accent */}
            <path d="M6 13h4V9H6zm1-5h2V6H7z" fill={accent} />
            {/* Outline */}
            <path d="M5 14h6v-1h1V9l-1-1V5l-1-1h-1V2H7v2H6v3l-1 1v5h1zm1-5h4v4H6zm1-4h2V3H7z" fill={stroke} />
            {/* Fill */}
            <path d="M6 13h4v-4H9V8H7v1H6zm1-5h2V5H7zm1-5h1" fill={fill} />
            <circle cx="8.5" cy="2.5" r="0.5" fill={fill} />
          </>
        );
      case 'q': // QUEEN
        return (
          <>
            {/* Shadow/Accent */}
            <path d="M4 13h8V8H4z" fill={accent} />
            {/* Outline */}
            <path d="M3 14h10v-1h1V6l-2 2-1-3-1 3-2-4-2 4-1-3-1 3-2-2v7h1zm2-5h6v4H5z" fill={stroke} />
            {/* Fill */}
            <path d="M4 13h8v-5l-1 1V6l-1 3-2-4-2 4L5 6v3L4 8zm4-5h1" fill={fill} />
          </>
        );
      case 'k': // KING
        return (
          <>
            {/* Shadow/Accent */}
            <path d="M4 13h8V8H4z" fill={accent} />
            {/* Outline */}
            <path d="M3 14h10v-1h1V8l-1-2h-2V4h2V3H9V1H7v2H4v1h2v2H4L3 8v5h1zm2-5h6v4H5z" fill={stroke} />
            {/* Fill */}
            <path d="M4 13h8V8L9 6h-2h1V4H4v2L4 8zm4-9h1" fill={fill} />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      style={{ shapeRendering: 'crispEdges' }}
      className="select-none pointer-events-none transition-transform duration-200 active:scale-95"
    >
      {renderSVGContent()}
    </svg>
  );
};
