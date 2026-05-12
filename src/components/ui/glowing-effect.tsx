"use client";
 
import { memo } from "react";
import { cn } from "./utils";
 
interface GlowingEffectProps {
  variant?: "default" | "white" | "red";
  className?: string;
  disabled?: boolean;
}

const GlowingEffect = memo(
  ({
    variant = "default",
    className,
    disabled = false,
  }: GlowingEffectProps) => {
    return (
      <div
        className={cn(
          "pointer-events-none absolute inset-0 rounded-[inherit] overflow-hidden",
          className,
          disabled && "!hidden"
        )}
      >
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes orbit-laser {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .orbit-laser-layer {
            animation: orbit-laser 3.5s linear infinite;
          }
        `}} />
        
        {/* Thicker 8px Laser Layer - Using #dc2626 Red */}
        <div
          className="orbit-laser-layer absolute inset-[-200%] opacity-100"
          style={{
            background: "conic-gradient(from 0deg, transparent 0deg, #dc2626 20deg, #dc2626 70deg, transparent 90deg)",
          }}
        />
        
        {/* Inner Clipping */}
        <div 
          className="absolute inset-[4px] bg-white rounded-[inherit] z-[2]"
          style={{ backgroundColor: "white", borderRadius: "inherit" }}
        />
      </div>
    );
  }
);
 
GlowingEffect.displayName = "GlowingEffect";
 
export { GlowingEffect };
