import React from 'react';
import axAcademyLogoImg from '../assets/ax_academy_clean.png';
import './AxAcademyLogo.css';

/**
 * Componente oficial de branding:
 * AX Academy | Digital Transformation
 *
 * Utiliza o asset em alta resolução com canal alfa suave extraído diretamente
 * do print oficial para a marca AX Academy, alinhado à tipografia nativa
 * "Digital Transformation" para máxima nitidez e fidelidade visual.
 */
export default function AxAcademyLogo({ className = '', style = {} }) {
  return (
    <div
      className={`ax-brand-badge ${className}`}
      style={style}
      role="img"
      aria-label="AX Academy - Digital Transformation"
      title="AX Academy | Digital Transformation"
    >
      {/* Bloco Esquerdo: Logo oficial AX ACADEMY */}
      <img
        src={axAcademyLogoImg}
        alt="AX Academy"
        className="ax-brand-logo-img"
      />

      {/* Divisor vertical */}
      <div className="ax-brand-divider" aria-hidden="true" />

      {/* Bloco Direito: Digital Transformation */}
      <span className="ax-text-digital">Digital Transformation</span>
    </div>
  );
}
